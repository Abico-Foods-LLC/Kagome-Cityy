// TURN relay: Cloudflare Realtime TURN-ийн түр credential-ийг turn-worker/ (Cloudflare Worker)-оос авна.
// Утас мобайл дата (оператор CGNAT) ↔ Wi-Fi хооронд STUN-аар шууд P2P тогтдоггүй тул TURN заавал хэрэгтэй.
// Worker хүрэхгүй бол STUN-оор үргэлжилнэ (нэг сүлжээнд/энгийн NAT-д ажиллана). Credential 24ц хүчинтэй → 12ц cache.
export const TURN_URL = import.meta.env?.VITE_TURN_URL ?? 'https://kagome-turn.abico-kagome.workers.dev/';
export const CACHE_KEY = 'kagome-ice-v1';
export const CACHE_MS = 12 * 3600e3;    // энэ хугацаанд Worker-оос дахин асуухгүй
export const STALE_MS = 22 * 3600e3;    // Worker хүрэхгүй үед хуучин credential-ийг хэр удаан хэрэглэж болох (24ц-аас бага)
export const STUN_ONLY = 'stun';

const isTurn = (s) => s && typeof s.username === 'string' && typeof s.credential === 'string' && (Array.isArray(s.urls) ? s.urls : [s.urls]).some((u) => /^turns?:/i.test(u));
const readCache = (storage) => { try { const c = JSON.parse(storage?.getItem(CACHE_KEY) || 'null'); return c && Array.isArray(c.turn) && c.turn.every(isTurn) ? c : null; } catch { return null; } };
const writeCache = (storage, at, turn) => { try { storage?.setItem(CACHE_KEY, JSON.stringify({ at, turn })); } catch { /* private mode г.м */ } };

/**
 * @returns {Promise<{ turn: RTCIceServer[], source: 'cache'|'turn'|'stun' }>} — `turn` Trystero-ийн `turnConfig`-д шууд өгнө (default STUN дээр нэмэгдэнэ)
 */
export async function getTurnServers({ url = TURN_URL, fetchFn = globalThis.fetch, storage = globalThis.localStorage, now = Date.now, timeoutMs = 4000 } = {}) {
  if (!url) return { turn: [], source: STUN_ONLY };
  const t = now(), cached = readCache(storage);
  if (cached && t - cached.at < CACHE_MS) return { turn: cached.turn, source: 'cache' };
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, { signal: ctl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const turn = ((await res.json())?.iceServers || []).filter(isTurn);
    if (!turn.length) throw new Error('TURN entry алга');
    writeCache(storage, t, turn);
    return { turn, source: 'turn' };
  } catch (e) {
    if (cached && t - cached.at < STALE_MS) return { turn: cached.turn, source: 'cache' };
    return { turn: [], source: STUN_ONLY };
  } finally { clearTimeout(timer); }
}
