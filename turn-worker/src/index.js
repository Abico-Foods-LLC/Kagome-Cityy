// Kagome City TURN credential Worker.
// GET / → { iceServers: [ { urls: [stun…] }, { urls: [turn…], username, credential } ] } (Cloudflare Realtime TURN, 24ц хүчинтэй).
// Нууц: TURN_KEY_ID, TURN_KEY_TOKEN (wrangler secret) — browser-т хэзээ ч очихгүй. Зөвхөн тоглоомын origin-д CORS зөвшөөрнө.
const ALLOWED = [/^https:\/\/abico-foods-llc\.github\.io$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/, /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/];
const TTL = 86400, CACHE_MS = 3600e3;
let cache = null;   // { at, body } — isolate бүрт 1 цаг: бүх тоглогч нэг credential хуваалцаж болно

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const ok = ALLOWED.some((r) => r.test(origin));
    const cors = { 'Access-Control-Allow-Origin': ok ? origin : 'null', 'Access-Control-Allow-Methods': 'GET, OPTIONS', Vary: 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!ok) return new Response('forbidden', { status: 403, headers: cors });
    if (req.method !== 'GET') return new Response('method', { status: 405, headers: cors });
    if (!env.TURN_KEY_ID || !env.TURN_KEY_TOKEN) return new Response('TURN_KEY_ID/TURN_KEY_TOKEN secret тохируулаагүй', { status: 500, headers: cors });
    if (!cache || Date.now() - cache.at > CACHE_MS) {
      const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
        method: 'POST', headers: { Authorization: `Bearer ${env.TURN_KEY_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl: TTL }),
      });
      if (!r.ok) return new Response('turn api ' + r.status, { status: 502, headers: cors });
      cache = { at: Date.now(), body: await r.text() };
    }
    return new Response(cache.body, { headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  },
};
