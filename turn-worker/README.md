# kagome-turn — TURN credential Worker

Утас (мобайл дата, оператор CGNAT) ↔ лаптоп (Wi-Fi) хооронд WebRTC шууд холбогдож чаддаггүй тул
Cloudflare Realtime TURN relay ашиглана. Энэ Worker нь TURN key-ээр 24 цагийн түр credential үүсгэж
зөвхөн тоглоомын origin-д өгнө (`src/net/ice.js` үүнийг дуудна).

## Нэг удаагийн тохиргоо
1. https://dash.cloudflare.com/?to=/:account/calls → **TURN** → *Create TURN key* → `Key ID` + `API Token` хуулах.
2. `cd turn-worker && npx wrangler login`
3. `npx wrangler secret put TURN_KEY_ID`, `npx wrangler secret put TURN_KEY_TOKEN`
4. `npx wrangler deploy` (workers.dev subdomain: abico-kagome) → `https://kagome-turn.abico-kagome.workers.dev` — энэ URL-ийг `src/net/ice.js`-ийн `TURN_URL`-д бичнэ.

Үнэгүй хязгаар: 1 TB/сар relay траффик, Worker 100k хүсэлт/өдөр.
