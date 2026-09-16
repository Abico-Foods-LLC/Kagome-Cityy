# Байшингийн хаалга → «Хортон хамгаалалт» — хэрэгжүүлэх төлөвлөгөө

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Хулууны гэрийн хаалгаар орж шөнийн фермд давалгаагаар дайрах хортонг шүүсний цацуураар буудан base-ээ хамгаалах, оноогоор хашаа/цацуур/хамгаалагч авах, өрөөнийхөнтэй co-op тоглох.

**Architecture:** `DefenseCore` (цэвэр логик, Vitest) + `DefenseScene` (RunnerScene API) + `defenseWorld`/`pests` (procedural дүрслэл). Хот ↔ байшин `app.switchTo`. Co-op: host Core, `defense` суваг 10Hz, guest дүрслэл; `remote.js` scene-ээс хамааралгүй болгож дахин ашиглана.

**Tech Stack:** Three.js, Vitest, Trystero, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-16-house-defense-design.md`

## Global Constraints

- Цус/буу байхгүй; хортон онохоор конфетти. Монгол текст. Commit тус бүр; `Co-Authored-By` байхгүй.
- Өрөөгүй/хотод байхад юу ч өөрчлөгдөхгүй (regression).

---

### Task 1: `DefenseCore` + Vitest
**Files:** Create `src/defense/DefenseCore.js`, `tests/defense.test.js`
**Interfaces:** `new DefenseCore({ rand })`; `PESTS = { WORM, CROW, MOLE, SLIME }` (hp, speed, reward, flying, burrow); `SHOP = { FENCE, SPRAYER, GUARD, POWER, REPAIR }` (price, label, emoji); `startWave()`, `tick(dt)`, `shoot(x, z, dx, dz, dmg) → hitId|null`, `buy(kind) → { ok, reason? }`, `events` (массив, Scene уншаад хоослоно), `snapshot()`, `load(snap)`, `result() → { score, wave, stars }`, `slots` (8: angle, fence?, sprayer?).
- [ ] Тест: давалгаа 1 = 6 хортон (worm л); tick-ээр хортон base руу ойртоно; base-д хүрвэл hp −4 + арилна; FENCE авбал хортон slot дээр зогсоод хашаа hp буурна, 0 болоход үргэлжилнэ; CROW хашаа давна; `shoot` онолт (шулуун дээр) → hp −1, үхвэл coins/score; `buy` зоос дутуу → ok:false; slot дүүрэн → reason 'slot'; SPRAYER 0.9с тутам ойрын хортонд dmg; давалгаа дуусахад бонус зоос + prep; base 0 → over, `result().stars === floor(score/25)`; `snapshot/load` round-trip.
- [ ] Хэрэгжүүлж PASS. Commit: `"DefenseCore: давалгаа, хортон, base, хашаа/цацуур/хамгаалагч, дэлгүүр, оноо (Vitest)"`

### Task 2: Ертөнц + хортоны дүрслэл
**Files:** Create `src/defense/defenseWorld.js` (`buildDefenseWorld(scene) → { base, baseFace, slots[], lamps, ground }`), `src/defense/pests.js` (`createPest(type) → Group` + `updatePest(g, dt, t, moving)`, `createSprayer()`, `createGuard()`), Modify `src/world/mascot.js`/`props.js` дахин ашиглана.
- [ ] Шөнийн тэнгэр (сар, одод), газар 60×60, base хулуу (glow, царай canvas: 3 mood), 4 замын мөр, 8 slot тойрог, 4 дэнлүү, талбайн мөр/хашаа.
- [ ] Хортон 4 төрөл + анимаци; цацуур цамхаг; хамгаалагч (Mascot broccoli + цацуур).
- [ ] Browser: `app.scenes.defense` түр scene-д ертөнцийг харах screenshot. Commit: `"Хортон хамгаалалт: шөнийн фермийн ертөнц, base хулуу, 4 хортон, цацуур, хамгаалагч"`

### Task 3: `DefenseScene` — тоглолт (ганцаараа)
**Files:** Create `src/defense/DefenseScene.js`; Modify `src/main.js` (scene бүртгэх, HUD), `index.html` (`#defHud`: hp bar, wave, coins, score, `#defShop`, `#defOver`), `src/style.css`
- [ ] Хөдөлгөөн (камерын чиглэлээр, joystick), камер орбит, авто чиглүүлэлт + буудалт (E/Space/actionBtn/товшилт), сум дүрслэл/онолт, Core events → эффект (spawn poof, die confetti, base hit shake), HUD, дэлгүүр (prep), over цонх (од → `state.stars`, `state.defense.best`), «Дахин»/«Хот руу».
- [ ] Browser: 3 давалгаа тоглож дэлгүүрээс авах; over → од. Commit: `"DefenseScene: хөдөлгөөн, авто чиглүүлэлт буудалт, HUD, дэлгүүр, дуусгал"`

### Task 4: Байшингийн хаалга (хот)
**Files:** Modify `src/world/props.js` (`fruitHouse` хаалга `userData.door`, `doorPos`), `src/world/town.js` (`out.houses`), `src/town/TownScene.js` (interactable + хаалга нээх анимаци + `enterDefense`/буцах)
- [ ] 5 байшин: хаалга ойртоход нээгдэнэ; Хулууны гэр → defense; бусад → 🔒 toast. Буцахад хаалганы урд. Commit: `"Байшингийн хаалга: ойртоход нээгдэнэ, Хулууны гэр → Хортон хамгаалалт, бусад 🔒 удахгүй"`

### Task 5: Co-op
**Files:** Modify `src/net/proto.js` (`zone`), `src/net/remote.js` (scene-independent: `new RemotePlayers(sceneObj, three.Scene)`), `src/net/room.js` (`defense` action), `src/defense/DefenseScene.js` (host/guest, `def` snapshot 10Hz, `defShot/defBuy/defStart` event), `src/town/TownScene.js` (zone 2 → хотод нуугдана)
- [ ] Vitest: `packState` zone round-trip.
- [ ] 2 tab: хоёулаа байшинд орж бие биеэ харах, guest буудахад host-д хортон үхэх, guest дэлгүүр, host гарахад guest үргэлжлүүлэх. Commit: `"Хортон хамгаалалт co-op: host Core, guest дүрслэл, буудалт/дэлгүүр event, host шилжилт"`

### Task 6: README, өдрийн даалгавар, эцсийн шалгалт
- [ ] DAILY_POOL `defense` («Хортон хамгаалалтад 3 давалгаа дав»), README (байшин, удирдлага), regression (хот, өрөө), push+deploy.
