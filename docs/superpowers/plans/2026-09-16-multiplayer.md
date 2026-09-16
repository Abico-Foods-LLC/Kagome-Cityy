# Хамтдаа тоглох (P2P) — хэрэгжүүлэх төлөвлөгөө

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Линкээр нэгдэж 8 хүртэл хүн нэг хотод хамт тоглоно — бие биеэ харна/өргөнө/шиднэ, иргэд/эвдрэл/машин/цаг ижил, бэлэн үгийн чат, амжилтын toast.

**Architecture:** Trystero (Nostr signaling, WebRTC data channel) — сервергүй. `src/net/` 5 модуль: `proto.js` (цэвэр функц: pack/unpack, host сонголт, interpolation), `room.js` (Net), `remote.js` (RemotePlayers), `sync.js` (WorldSync: host→guest иргэд, event-ууд), `chat.js`. TownScene-д hook-ууд. Host = хамгийн эрт нэгдсэн peer.

**Tech Stack:** trystero ^0.25, Three.js, Vitest, Playwright (2 tab).

**Spec:** `docs/superpowers/specs/2026-09-16-multiplayer-design.md`

## Global Constraints

- Action нэр ≤ 12 тэмдэгт (Trystero). `appId: 'kagome-city-v1'`, өрөө `'kc-' + code`.
- Өрөөнд ороогүй үед тоглоом яг өмнөх шигээ ажиллана (`net.active === false` → бүх hook no-op).
- Тоглогч бүр өөрийн save; сүлжээгээр од/ахиц дамжихгүй.
- Хэрэглэгчийн текст монголоор; commit тус бүр; `Co-Authored-By` байхгүй.

---

### Task 1: `proto.js` — цэвэр функцууд + Vitest

**Files:** Create `src/net/proto.js`, Test `tests/net.test.js`

**Interfaces:**
- `PROTO_VER = 1`
- `packState(p) → number[]` / `unpackState(arr) → p` — `p = { x, y, z, h, anim, speed, inCar, carX, carZ, carH, carSpeed, runner }`; anim нэрийг `ANIMS = ['idle','walk','run','jump','fall','swim','roll','sit','carried','flung']` индексээр.
- `pickHost(peers: {id, joinedAt}[]) → id` — хамгийн бага joinedAt, тэнцвэл id үсгээр.
- `class Interp { push(sample, now); sample(now, delay = 100) → {x,y,z,h} }` — сүүлийн 2 sample хооронд lerp (heading atan2-оор).
- `roomCode() → 6 тэмдэгт [a-z0-9]`.

- [ ] Тест: pack/unpack round-trip (тоон нарийвчлал 2 орон), pickHost (joinedAt, тэнцвэл id), Interp (2 sample дунд нь = дундаж; heading π/−π дамнах), roomCode урт/тэмдэгт.
- [ ] Хэрэгжүүлж PASS. Commit: `"Net proto: state pack/unpack, host сонголт, interpolation, өрөөний код (Vitest)"`

### Task 2: `room.js` — Net (Trystero wrapper), нэр, өрөөний модал, HUD

**Files:** Create `src/net/room.js`; Modify `src/core/state.js` (`settings.name`), `src/town/TownScene.js` (цэс товч, HUD `👥`, start-ийн дараа auto-join), `index.html` (`<button id="netButton" class="icon hidden">👥 <b id="netCount">1</b></button>`), `src/style.css`

**Interfaces:**
- `class Net { constructor(scene); get active; get isHost; selfId; peers: Map<id, {name, avatar, equipped, joinedAt}>; join(code); leave(); on(evt, fn) — 'hello'|'state'|'event'|'world'|'peerLeave'; sendState(arr); sendEvent(obj, target?); sendWorld(obj); sendHello(); }`
- Trystero: `import { joinRoom, selfId } from 'trystero'`; action-ууд `hello`, `state`, `event`, `world`. `onPeerJoin` → `sendHello()` (target); `onPeerLeave` → peers.delete, `recomputeHost()`, emit `peerLeave`.
- `hello` авахад `ver !== PROTO_VER` бол toast + ignore; peers.set; `recomputeHost()`; emit.
- Холболт хугацаа: guest 15с-д peer-гүй → toast алдаа, `leave()`.
- Модал `roomModal()`: код, линк (`location.origin + location.pathname + '?room=' + code`), «Линк хуулах» (`navigator.clipboard`), тоглогчдын нэр (host ⭐), «Өрөөнөөс гарах». Нэр асуух `askName(cb)` модал (input maxlength 12).
- TownScene: `pauseMenu`-д «👥 Хамт тоглох»; `start()` дараа `?room=` байвал `askName` → `net.join(code)`; `netButton` харагдана, `netCount` = peers.size + 1.

- [ ] Хэрэгжүүлэх; browser: 2 tab (`?room=test01`) — хоёулаа `net.peers.size === 1`, `isHost` нэг л tab дээр true, tab хаахад нөгөө нь host болно. Commit: `"Net: Trystero өрөө, линк/код, нэр, тоглогчдын жагсаалт, host сонголт"`

### Task 3: `remote.js` — бусад тоглогчид харагдана

**Files:** Create `src/net/remote.js`; Modify `TownScene.js` (`state` илгээх 15Hz, `remote.update`), `src/world/character.js`/`mascot.js` (`carried`/`flung` анимаци — mascot-д `carried` бий; `flung` = roll + hurt; character.js-д `carried` нэмнэ)

**Interfaces:**
- `class RemotePlayers { constructor(scene); add(id, hello); remove(id); onState(id, arr); update(dt); get(id) → { avatar, label, interp, anim, carriedBy, car } ; nearest(pos, r) → id|null }`
- Avatar: `createAvatar(kind)` (avatar.js) → `wear(equipped)`; label sprite `textTexture(name)` толгойноос 2.6 дээр.
- `update`: `interp.sample(now)` → root байрлал/heading; `avatar.update(dt, { state: anim, speed })`; runner=true → visible=false.
- Машинд суусан remote: `scene.town.car` байрлал/heading = тэр peer-ийнх (локал жолоочгүй үед), `scene.driver` avatar-ыг түүнийхээр (driver-ийг remote avatar-аар түр солино: remote avatar-ыг машины суудалд `sit`).
- TownScene: `netTick` 66мс тутам `net.sendState(packState({...}))`; локал `player.state` → anim; `carriedBy` бол `carried`, `flung` бол `flung`.

- [ ] Browser 2 tab: нөгөө tab-ын тоглогч харагдаж хөдөлнө (WASD дарж), нэр label, машинд суухад машин хөдөлнө. Commit: `"Бусад тоглогчид: avatar, нэр, interpolation, машин"`

### Task 4: Бие биеэ өргөх / шидэх

**Files:** Modify `TownScene.js` (`clickAction` remote сонголт, `updateCarry`, `putDown`, `throwCarry`, `updatePlayer` carriedBy/flung), `remote.js` (carriedBy байрлал)

- `clickAction`: `remote.nearest(pp, 2.4)` ч өрсөлдөнө → `carry = { remote: id }`, `net.sendEvent({ t: 'carry', target: id })`.
- `updateCarry` remote: avatar-ыг өөрийн толгой дээр (remote.js `carriedBy = selfId` → байрлал өргөгчөөс). `putDown` → `drop`; `throwCarry` → `throw {vx, vz, vy}`.
- Хүлээн авах (`event` target === selfId): `carry` → `player.carriedBy = from`; `drop` → cleanup, байрлал өргөгчийн урд; `throw` → `player.flung`.
- `updatePlayer`: `carriedBy` бол input алгасаж байрлал = remote(from).pos + (0, 2.0, 0), anim carried; `flung` бол физик (`vx,vz` blocked, `vy` gravity 24), `character.roll(0.7)` эхэнд, газардахад 😵 бөмбөлөг, `t` дуусахад хэвийн.
- Бусад peer-үүд: `event carry/drop/throw` бүгдэд явна → remote.js `carriedBy[target] = from` — target-ийн avatar-ыг from-ын толгой дээр (from = selfId бол өөрийн толгой).
- `peerLeave`: carriedBy цэвэрлэх (хоёр талд).

- [ ] Browser 2 tab: A B-г өргөхөд B-ийн дэлгэц дээр өөрийнх нь дүр А-ийн толгой дээр, B хөдөлж чадахгүй; Q → B ниснэ; drop → урд нь. Commit: `"Хамт тоглох: бие биеэ өргөх, буулгах, шидэх"`

### Task 5: `sync.js` — иргэд, цаг, эвдрэл, машин, иргэн өргөх event

**Files:** Create `src/net/sync.js`; Modify `TownScene.js` (updateCitizens host/guest салаа, knock/wreck/tree/car enter-exit hook, `npcCarry/Drop/Throw`), `src/town/wreck.js` (`breakAt(id, dx, dz)`, `repair(id)` public, `id` = index)

**Interfaces:**
- `class WorldSync { constructor(scene); update(dt); onWorld(data); onEvent(data, from); npcPack() → array; npcApply(arr) }`
- Host: 200мс тутам `sendWorld({ day: dayTime, season, npc })`. Guest: `updateCitizens` → `sync.applyNpc(dt)` (interp 200мс; st: 0 idle,1 walk,2 knock (rotation.x −π/2, y 0), 3 carried (өргөгчийн толгой дээр — `by` peer), 4 idle).
- Event → `TownScene` шийдэл: `npcKnock` (host л хүлээж авна → `knock`), `npcCarry {i}` (бүгд: `c.carriedBy = from`; host: `c.carried = true`), `npcDrop {i, x, z}`, `npcThrow {i, vx, vz, vy}` (host knock), `wreck {id, broken, dx, dz}`, `tree`, `carEnter {at}` / `carExit`, `feat {text, icon}` → toast.
- TownScene илгээх цэгүүд: `knock()` (guest → host), `wreck.break/repair`, `treeHit`, `enterCar/exitCar`, `clickAction` иргэн, `putDown`, `throwCarry`, амжилтууд (`fishCaught`, farm harvest, delivery done, carrot collect, juice made, quiz correct) → `net.sendEvent({t:'feat', text, icon})`.
- Guest дээр `dayTime` → host-ынх руу lerp (0.5/с), `season` host-ынх.

- [ ] Browser 2 tab: host дээр иргэд алхахад guest дээр ижил; guest иргэн өргөхөд host дээр харагдана; хашаа эвдэхэд нөгөө дээр эвдэрнэ; амжилт toast. Commit: `"Ертөнц sync: иргэд (host), өдрийн цаг, эвдрэл, машин, иргэн өргөх/шидэх, амжилтын toast"`

### Task 6: `chat.js` — бэлэн үг/emoji

**Files:** Create `src/net/chat.js`; Modify `index.html` (`chatButton` icon, `#chatBox`, `#chatLog`), `src/style.css`, `src/core/input.js` (`KeyT: 'chat'`), `TownScene.js`

- `class Chat { constructor(scene); toggle(); send(text); receive(from, text); update(dt) }` — `PHRASES` 12, `EMOJIS` 12 (spec). Бөмбөлөг: emoji → `bubbles.show(root, emoji)`; үг → `textBubble(root, text)` (canvas sprite 3с; bubble.js-д `showText(target, text)` нэмнэ). Лог `#chatLog` сүүлийн 5 мөр, 8с fade. Өөрийн үг ч өөрт харагдана.
- [ ] Browser 2 tab: T → цонх, товч → хоёр дэлгэц дээр бөмбөлөг + лог. Commit: `"Чат: бэлэн үг/emoji, толгой дээрх бөмбөлөг, лог"`

### Task 7: Алдаа, README, эцсийн шалгалт

- `onJoinError`/timeout toast; `ver` шалгалт; runner-т орсон peer нуугдана; photo mode локал.
- README: «Хамт тоглох» хэсэг (линк, 8 хүртэл, P2P хязгаар, T чат, өргөх), Бүтэц `net/`.
- `npm test`, build, 2 tab бүрэн тест, өрөөгүй тоглоом өмнөх шигээ (regression).
- Commit: `"README: хамт тоглох; net алдааны мессеж"`
