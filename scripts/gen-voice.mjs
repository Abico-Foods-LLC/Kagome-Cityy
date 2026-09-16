#!/usr/bin/env node
// Бүх яриаг Azure Speech (mn-MN-YesuiNeural, хүүхдийн аялга: pitch +18%, rate 0.95)-ээр mp3 болгоно.
// Хэрэглээ: AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=eastus node scripts/gen-voice.mjs [--voice Bataa] [--force]
// Гаралт: public/assets/voice/<hash>.mp3 + index.json (hash → текст). Байгаа clip-ийг алгасна (--force бол дахин).
import { writeFile, readFile, mkdir, access } from 'node:fs/promises';
import { CITIZEN_LINES, CITIZEN_CHAT, NPC_DEFS, LINES, FRUITS, CHAT_PHRASES as PHRASES } from '../src/core/content.js';
import { normalizeLine, lineHash } from '../src/core/voiceHash.js';

// Түлхүүр: env эсвэл .azure-speech.json ({ key, region }) — gitignore-д орсон, repo-д орохгүй
let cfg = {}; try { cfg = JSON.parse(await readFile(new URL('../.azure-speech.json', import.meta.url), 'utf8')); } catch { /* env ашиглана */ }
const KEY = process.env.AZURE_SPEECH_KEY || cfg.key, REGION = process.env.AZURE_SPEECH_REGION || cfg.region || 'eastus';
const args = process.argv.slice(2), force = args.includes('--force');
const voice = 'mn-MN-' + (args.includes('--voice') ? args[args.indexOf('--voice') + 1] : 'Yesui') + 'Neural';
const OUT = new URL('../public/assets/voice/', import.meta.url);

function collect() {
  const all = new Set();
  const add = (t) => { const n = normalizeLine(t); if (n) all.add(n); };
  CITIZEN_LINES.forEach(add); CITIZEN_CHAT.flat().forEach(add); NPC_DEFS.forEach((n) => add(n.lines)); PHRASES.forEach(add);
  for (const v of Object.values(LINES)) { if (typeof v === 'string') add(v); else if (Array.isArray(v)) v.forEach(add); else if (typeof v === 'object') Object.values(v).forEach(add); }
  for (const f of FRUITS) for (const n of [2, 3]) add(LINES.requestFruit(f.emoji, f.name, n));
  return [...all];
}
async function exists(p) { try { await access(p); return true; } catch { return false; } }
async function tts(text) {
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="mn-MN"><voice name="${voice}"><prosody pitch="+18%" rate="0.95">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</prosody></voice></speak>`;
  const r = await fetch(`https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': KEY, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'kagome-city' }, body: ssml });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}
async function main() {
  const lines = collect();
  console.log(`Нийт ${lines.length} мөр, ${lines.reduce((a, l) => a + l.length, 0)} тэмдэгт. Хоолой: ${voice}`);
  if (!KEY) { console.log('AZURE_SPEECH_KEY байхгүй — зөвхөн жагсаалт:'); lines.forEach((l) => console.log(' ', lineHash(l), l)); return; }
  if (!/^[A-Za-z0-9]{20,}$/.test(KEY)) { console.error(`AZURE_SPEECH_KEY буруу байна ("${KEY.slice(0, 8)}…"): Azure portal → Speech resource → "Keys and Endpoint" → KEY 1 (32 орчим латин үсэг/тоо) гэснийг хуулж тавина.`); process.exit(1); }
  // Түлхүүр зөв эсэхийг нэг богино хүсэлтээр шалгана
  try { await tts('Сайн уу'); } catch (e) { console.error('Azure хариу:', e.message, '\n→ Түлхүүр эсвэл REGION (AZURE_SPEECH_REGION) буруу байж магадгүй.'); process.exit(1); }
  await mkdir(OUT, { recursive: true });
  const idxPath = new URL('index.json', OUT); let index = {};
  try { index = JSON.parse(await readFile(idxPath, 'utf8')); } catch { /* шинэ */ }
  let made = 0;
  for (const line of lines) {
    const h = lineHash(line), file = new URL(h + '.mp3', OUT);
    if (!force && await exists(file)) { index[h] = line; continue; }
    process.stdout.write(`  ${h} ${line.slice(0, 50)} … `);
    try { await writeFile(file, await tts(line)); index[h] = line; made++; console.log('ok'); } catch (e) { console.log('АЛДАА', e.message); }
    await new Promise((r) => setTimeout(r, 150));   // F0 багцын хязгаар: секундэд 20 хүсэлт
  }
  await writeFile(idxPath, JSON.stringify(index, null, 0));
  console.log(`Дууслаа: ${made} шинэ clip, index ${Object.keys(index).length} мөр → public/assets/voice/`);
}
main().catch((e) => { console.error(e); process.exit(1); });
