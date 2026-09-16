# Хамтдаа тоглох (P2P multiplayer) — дизайн

Огноо: 2026-09-16

## Зорилго

Нэг хүн линк үүсгэж, бусад нь линкээр орж ирээд нэг хотод хамт тоглоно: бие биеэ харна, өргөж шидэнэ, иргэд/эвдрэл/машин/өдрийн цаг бүгдэд ижил, emoji/бэлэн үгийн чат, бусдын амжилт toast-оор харагдана. Сервергүй (P2P, Trystero — Nostr signaling, WebRTC data channel), GitHub Pages дээр шууд ажиллана. Тоглогч бүр өөрийн save-тэй (од, ахиц локал).

**Хязгаар:** нэг өрөөнд 8 хүртэл (WebRTC mesh). Зарим сүлжээнд (TURN-гүй хатуу NAT) холбогдохгүй байж болно — тийм үед ойлгомжтой мессеж.

## Бүтэц

```
src/net/room.js     Net       — Trystero өрөө, суваг (action), host сонголт, peer жагсаалт
src/net/remote.js   RemotePlayers — бусад тоглогчдын avatar, нэр label, interpolation, өргөх/шидэх дүрслэл
src/net/sync.js     WorldSync — host→guest иргэд/цаг/улирал; event-ууд (эвдрэл, машин, иргэн өргөх, амжилт)
src/net/chat.js     Chat      — бэлэн үг/emoji цонх (T / 💬), толгой дээрх бөмбөлөг, жижиг лог
```

TownScene-д: `this.net`, `this.remote`, `this.sync`, `this.chat` (update/hook-ууд), `player.carriedBy` (өргөгдсөн үед хөдөлгөөн хаагдана), `player.flung` (шидэгдсэн нисэлт).

## Өрөө, линк, нэр

- Цэс (pause) → «👥 Хамт тоглох»: өрөөгүй бол 6 тэмдэгт код (`a-z0-9`) үүсгэж `history.replaceState` → `?room=abc123`, модал: линк + «Хуулах», тоглогчдын жагсаалт. Өрөөтэй бол ижил модал (гарах товчтой).
- URL-д `?room=` байвал `start()`-ийн дараа автоматаар нэгдэнэ. Нэгдэхээс өмнө нэр асууна (`settings.name`, default `Тоглогч`; 1–12 тэмдэгт; дараа нь цэснээс солино).
- HUD: `👥 N` товч (баруун дээд) — дарвал өрөөний модал. Нэгдэх/гарах toast.
- `appId: 'kagome-city-v1'`. `joinRoom(config, 'kc-' + code, { onJoinError })`.

## Сувгууд (action нэр ≤ 12 тэмдэгт)

| action | чиглэл | давтамж | агуулга |
|---|---|---|---|
| `hello` | шинэ peer ↔ бүгд | нэгдэхэд, хувцас солиход | `{ name, avatar, equipped, joinedAt, ver }` |
| `state` | бүгд | 15 Hz (66мс) | `[x, y, z, heading, animState, speedNorm, carX, carZ, carH, carSpeed, inCar]` — машинд суусан бол машины байрлал ч дамжина |
| `event` | бүгд (reliable) | үйлдэлд | `{ t: 'emote'|'bubble'|'carry'|'drop'|'throw'|'carEnter'|'carExit'|'npcCarry'|'npcDrop'|'npcThrow'|'wreck'|'tree'|'chat'|'feat', ... }` |
| `world` | host → бүгд | 5 Hz | `{ day, season, npc: [[x, z, h, st, by]...] }` — st: 0 idle, 1 walk, 2 knock, 3 carried, 4 chat/dodge (idle-тэй ижил дүрслэл) |

Peer ID (Trystero `selfId`) — тоглогчийн түлхүүр.

## Host

- `joinedAt = Date.now()` hello-д; хамгийн бага `joinedAt` (тэнцвэл peerId-аар) = host. `Net.isHost` тооцоолол peer нэгдэх/гарах бүрд шинэчлэгдэнэ. Host солигдоход toast-гүй (нууц), зөвхөн иргэдийн эрх шилжинэ.
- Host: `updateCitizens` хэвийн ажиллаж, 5Hz `world` түгээнэ. Guest: `updateCitizens`-ийн оронд `sync.applyNpc()` — байрлал/heading-ийг 5Hz-с interpolate (lerp 0.2с), `st`-д тохирсон анимаци (walk/idle/knock хэвтэх/carried). Guest дээр яриа/dodge/chat-ийн локал логик ажиллахгүй (host шийднэ), харин ярилцах/хүсэлт/уучлалт модал локал.
- Guest машинаар иргэн мөргөх: guest `carHitsPeople` локал → host-д `npcKnock {i, dx, dz, speed}` event → host `knock()` → world-оор бүгдэд. Guest дээр шууд локал knock ч тоглуулна (латенси нуух); host-ын state ирэхэд давхцана.
- Өдрийн цаг/улирал: guest `dayTime`-аа host руу зөөлөн (lerp) тааруулна; `updateSeason` playtime-ын оронд host-ын `season`-ыг ашиглана (өрөөнд байхад).

## Бусад тоглогч (RemotePlayer)

- `hello` ирэхэд `createAvatar(avatar)` + `wear(equipped)` + нэрийн sprite (textTexture, толгойноос 2.6 дээр). Гарахад устгана.
- `state` буфер (сүүлийн 2 sample), 100мс хоцролттой interpolate; `character.update(dt, { state, speed })` — animState: idle/walk/run/jump/fall/swim/roll/sit(машинд)/carried/flung.
- Машинд суусан peer: машины mesh-ийг тэр peer-ийн `car*` утгаар байрлуулж, `driver` mascot-ыг тэр peer-ийн avatar-аар. `carEnter` авсан бол локал «машинд суух» interactable `visible:false` («Батын машин» label). Гарахад чөлөөлнө. Хоёр хүн зэрэг суух race: `carEnter`-ийг эрт илгээсэн нь (event-д `at` цаг) ялна; ялагдсан нь `exitCar()`.
- Тоглогчид хоорондоо collider-гүй.

## Бие биеэ өргөх / шидэх

- Товшилт: ойрын (2.4м) объектуудаас хамгийн ойрыг сонгоно: иргэн / нохой / **remote тоглогч** (`carriedBy`-гүй, машингүй).
- Өргөгч → `event {t:'carry', target: peerId}`. Бүгд: тухайн remote avatar-ыг өргөгчийн толгой дээр локал байрлуулна (`carriedBy` map). Өргөгдсөн тоглогчийн client: `player.carriedBy = peerId` → хөдөлгөөний input хаагдана, өөрийн байрлал = өргөгчийн remote байрлал + толгойн offset (камер дагана), анимаци `carried` (хөл савчих), 😮 → 4с дараа 😄. Өөрийн `state`-д `animState: carried` явуулна.
- `drop` → өргөгдсөн client: `carriedBy = null`, байрлал өргөгчийн урд 1.3м, ❤️.
- `throw {vx, vz, vy}` → өргөгдсөн client: `player.flung = { vx, vz, vy, t: 1.6 }` — өөрийн физик (blocked-той), эргэлдэх (`character.roll`), газардахад 😵, босно, input буцна. Бусад: `state`-ээс `flung` анимаци.
- Өргөгч гарвал (`onPeerLeave`) → carriedBy цэвэрлэнэ.

## Иргэн/нохой/эвдрэл event

- Иргэн өргөх: `npcCarry {i}` → бүгд тухайн иргэнийг өргөгчийн (remote/local) толгой дээр локал байрлуулна; host world-д `by = peerId` тэмдэглэнэ. `npcDrop {i}` / `npcThrow {i, vx, vz, vy}` → host физик (knock) → world. Guest өргөх үед host `updateCitizens` тухайн иргэнийг `carried` гэж алгасна.
- Нохой: локал (тоглогч бүр өөрийн Луувсайтай; бусдын нохой харагдахгүй — v1 хялбарчлал).
- Эвдрэл: `wreck {id, broken: bool, dx, dz}` — `Wreckables.breakAt(id, dx, dz)`/`repair(id)` бүгдэд; мод: `tree {x, z, dx, dz}` → `treeHit`. Муур зугтах нь сандлын эвдрэлээс локал үүснэ.
- Амжилт `feat {kind, text}` → бусдад toast «Бат 🐟 загас барилаа!» (загас, ургац хураах, хүргэлт, алтан лууван, шүүс, сорил зөв).

## Чат

- `T` / 💬 HUD товч → жижиг цонх (модал биш, доод төвд): 12 бэлэн үг + 12 emoji товч, Esc/💬 хаана. Сонгоход `chat {text}` → бүгд: тухайн тоглогчийн толгой дээр бөмбөлөг (emoji бол бөмбөлөг; үг бол `textTexture` sprite 3с) + зүүн доод лог (сүүлийн 5 мөр, 8с дараа бүдгэрнэ). Чөлөөт бичих байхгүй.
- Бэлэн үг: «Сайн уу! 👋», «Ирээрэй!», «Хөөх! 😮», «Баярлалаа 🙏», «Хамт машинаар явъя 🚗», «Намайг өргөөч 🙌», «Буулгаач! 😅», «Загас барья 🎣», «Талбай руу 🌱», «Ширэнгэ рүү 🌴», «Баяртай 👋», «Ха-ха 😂». Emoji: 😀 😂 😮 😍 😎 🎉 👍 👋 ❤️ 🥕 🍎 🐶.

## Хязгаарлалт / алдаа

- `onJoinError` эсвэл 15с дотор ямар ч peer ирэхгүй (host биш линкээр орсон бол) → toast «Холбогдож чадсангүй — өөр сүлжээ/утасны интернет туршаад дахин оролдоорой», өрөөнөөс гарна.
- `ver` таарахгүй hello → тэр peer-ийг үл тоомсорлож toast «X-ийн тоглоомын хувилбар өөр байна».
- Runner горимд орсон тоглогч `state`-даа `inRunner: true` явуулна → бусдад харагдахгүй (avatar нуугдана), буцахад гарна. Runner sync хийхгүй.
- Photo mode: локал; бусад хөдөлж байгаа хэвээр харагдана (царцаахгүй).

## Тест

- Vitest: host сонголт (`pickHost(peers)`), `state` pack/unpack, interpolation буфер (цэвэр функцууд `src/net/proto.js`).
- Browser: Playwright-аар 2 tab (нэг context — Trystero Nostr-оор холбогдоно; localhost дээр ч гарах ёстой): нэг нь өрөө үүсгэж, нөгөө нь линкээр орно; бие биеэ харах, өргөх/шидэх, машин, иргэн sync, чат, host солигдох (tab хаах).
