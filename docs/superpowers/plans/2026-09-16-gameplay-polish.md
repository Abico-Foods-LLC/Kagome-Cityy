# Gameplay ба polish багц — хэрэгжүүлэх төлөвлөгөө

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Од зарцуулах маркет (машин/нохой/trail/гэр), алтан лууван ×20, 45 асуулт + түвшин, иргэдийн өдрийн хүсэлт, нохойн бөмбөг/өргөх, хөгжмийн 4 хувилбар, photo mode, утасны гүйцэтгэл.

**Architecture:** Логик `GameState` (Vitest), дүрслэл activity модулиуд (`constructor(scene) → setup() → update(dt)`) `src/town/`-д, procedural prop-ууд `src/world/props.js`/`animals.js`. TownScene-д зөвхөн `new` + `update` дуудлага, товчны холболт нэмэгдэнэ.

**Tech Stack:** Vite, Three.js (JS modules), Vitest, Playwright (харагдах browser).

**Spec:** `docs/superpowers/specs/2026-09-16-gameplay-polish-design.md`

## Global Constraints

- Бүх дүрслэл procedural — гадны модел/texture нэмэхгүй.
- Хуучин save `kagome-city-v2` default утгуудаар ачаалагдана; solved key `type+index` хэвээр.
- Хэрэглэгчтэй харилцах текст бүгд монголоор; commit message монголоор, `Co-Authored-By` мөр нэмэхгүй.
- Тест: `npm test` (Vitest) ногоон; 3D зүйлсийг Playwright-аар `http://localhost:5173` дээр `window.KagomeCity.scenes.town` ашиглан шалгана (tool дуудлагын хооронд тоглоом үргэлжилдэг тул нэг `evaluate` дотор setup + шалгалт хийнэ).
- Ажил бүр дууссаны дараа тусдаа commit.

---

### Task 1: State — SHOP каталог, ерөнхий buy/equip/unequip

**Files:**
- Modify: `src/core/content.js` (SHOP export нэмнэ), `src/core/state.js:129-138`, `src/world/mascot.js:431-444` (ACCESSORIES-д `goldcrown`)
- Test: `tests/state.test.js`

**Interfaces:**
- Produces: `SHOP: [{ id, cat: 'wear'|'car'|'dog'|'trail'|'home', name, emoji, price, slot?, data?, secret? }]`, `SHOP_TABS = [{ cat, label, emoji }]`; `GameState.buy(id, price) → bool`, `equip(id, slot)` (toggle, хэвээр), `unequip(slot)`, `owns(id) → bool`, `equipped(slot) → id|undefined`. `buyAccessory` = `buy`-ийн alias (хуучин дуудлагууд).

- [ ] **Step 1: Тест бичих** (`tests/state.test.js`-д нэмнэ)

```js
describe('GameState — маркет', () => {
  it('buy: од хасаж owned-д нэмнэ, дахин авахад од хасахгүй', () => {
    const s = new GameState({ stars: 200 });
    expect(s.buy('car.paint.red', 120)).toBe(true); expect(s.stars).toBe(80);
    expect(s.buy('car.paint.red', 120)).toBe(true); expect(s.stars).toBe(80);
    expect(s.buy('trail.stars', 300)).toBe(false);
  });
  it('equip/unequip slot', () => {
    const s = new GameState({ stars: 200 });
    s.buy('car.paint.red', 120); s.equip('car.paint.red', 'carPaint');
    expect(s.equipped('carPaint')).toBe('car.paint.red');
    s.unequip('carPaint'); expect(s.equipped('carPaint')).toBeUndefined();
  });
  it('хуучин save-ийн owned/equipped хэвээр', () => {
    const s = new GameState({ wardrobe: { owned: ['cap'], equipped: { hat: 'cap' } } });
    expect(s.owns('cap')).toBe(true); expect(s.equipped('hat')).toBe('cap');
  });
});
```

- [ ] **Step 2:** `npx vitest run` → FAIL (`buy is not a function`).
- [ ] **Step 3: Хэрэгжүүлэх** — `state.js`: `buy(id, price)` (одоогийн buyAccessory бие), `buyAccessory = buy` alias, `owns(id) { return this.wardrobe.owned.includes(id); }`, `equipped(slot) { return this.wardrobe.equipped[slot]; }`, `unequip(slot) { delete this.wardrobe.equipped[slot]; }`.
  `content.js`: `SHOP_TABS = [{cat:'wear',label:'Хувцас',emoji:'🧢'},{cat:'car',label:'Машин',emoji:'🚗'},{cat:'dog',label:'Луувсай',emoji:'🐶'},{cat:'trail',label:'Эффект',emoji:'✨'},{cat:'home',label:'Гэр',emoji:'🏡'}]`;
  `SHOP` = car: `car.paint.red` (0xe83a4a/0xb9243a), `.blue` (0x3d8bff/0x2a63c4), `.green` (0x4fbf5a/0x35913f), `.pink` (0xff7ab8/0xd9548f), `.purple` (0x9b6bff/0x6f46c9) — 120, slot `carPaint`, data `{ body, dark }`; `car.flag` 80, `car.antenna` 60, `car.crate` 100 — slot `carDecor`; dog: `dog.collar.blue` 0x3d8bff, `.green` 0x4fbf5a, `.gold` 0xffc93c — 40, slot `dogCollar`; `dog.bandana` 70 slot `dogExtra`; `dog.hat` 90 slot `dogHat`; trail: `trail.stars` 300, `trail.petals` 350, `trail.rainbow` 500 slot `trail`; home: `home.flowers` 80, `home.lamp` 100, `home.bunting` 120, `home.scarecrow` 150, `home.mailbox` 60, `home.bench` 90 (slot байхгүй). wear: `Object.entries(ACCESSORIES).map(([id,a]) => ({ id, cat:'wear', ...a }))` — content.js mascot.js-ийг import хийхгүй (circular): ACCESSORIES-ийг `content.js` руу зөөж, `mascot.js` тэндээс re-export.
  `ACCESSORIES.goldcrown = { name: 'Алтан титэм', emoji: '👑', slot: 'hat', price: 0, secret: true }` — mascot `crown` builder-ийг алтан өнгөөр (`crown(h, y, R, 0xffd24d)` параметр нэмнэ).
- [ ] **Step 4:** `npx vitest run` → PASS. `npx vite build` → OK.
- [ ] **Step 5: Commit** — `git commit -m "State: маркетын ерөнхий buy/equip/unequip, SHOP каталог (машин, нохой, trail, гэр), алтан титэм аксессуар"`

---

### Task 2: Маркет UI (`src/town/shop.js`) + tab

**Files:**
- Create: `src/town/shop.js`
- Modify: `src/town/TownScene.js:795-812` (`shop()` → `this.shopUI.open()`), `src/style.css` (`.tabs`, `.tab.on`)

**Interfaces:**
- Produces: `class ShopUI { constructor(scene); open(cat = 'wear'); }` — `scene.state`, `scene.audio`, `scene.updateHUD()`, `scene.applyEquipment()` (Task 3-д бий болно; одоохондоо `scene.refreshWear()` дуудна).

- [ ] **Step 1:** `shop.js` бичих: `open(cat)` → modal: eyebrow `KAGOME МАРКЕТ`, `⭐ <b>${stars}</b>`, tab мөр (`SHOP_TABS`), `SHOP.filter(i => i.cat === cat && (!i.secret || owns))` карт: үнэ товч (`disabled` бол од дутуу) / `Өмсөх` / `Өмссөн ✓` (дарвал unequip) / home: `Байрлуулсан ✓`. Худалдан авалт: `state.buy` → `equip` (slot байвал) → `save` → `scene.applyEquipment()` → `audio.correct()`, toast → `open(cat)`. Доод мөр: `🧃 Цуглуулга`, `Хаах`.
- [ ] **Step 2:** TownScene: `this.shopUI = new ShopUI(this)`; `shop(cat) { this.shopUI.open(cat); }`; `applyEquipment() { this.refreshWear(); }` (Task 3-д өргөтгөнө). Маркетын interactable label `'Kagome маркет — дэлгүүр'` хэвээр.
- [ ] **Step 3: Browser** — `town.shop('car')` → tab-ууд харагдана, од хүрэлцэхгүй бараа disabled; `town.state.stars = 999` → авахад owned/equipped, HUD од шинэчлэгдэнэ.
- [ ] **Step 4: Commit** — `"Маркет UI: 5 tab (хувцас/машин/Луувсай/эффект/гэр), тайлах товч, тусдаа shop.js модуль"`

---

### Task 3: Машин будаг/чимэг, нохойн аксессуар, trail, гэрийн чимэглэл дүрслэл

**Files:**
- Modify: `src/world/props.js` (`buggy` → `g.userData.chassis = chassis`; шинэ `carDecor(chassis, kind)`, `homeDecor(parent, kind, x, z)`), `src/world/animals.js` (`Dog.wear({ collar, extra, hat })`), `src/town/TownScene.js` (`applyEquipment`, `updateTrail`), `src/town/home.js` (Create: `HomeDecor`)

**Interfaces:**
- `carDecor(chassis, kind: 'flag'|'antenna'|'crate') → Group` (`chassis.userData.decor` хуучныг устгана; `null` → зөвхөн устгана). `flag`: шон (0.04×1.4 цилиндр, x −1.1, z 1.6) + гурвалжин plane улаан; `userData.wave = true` → TownScene машины update-д `rotation.z = sin(clock*8)*0.15`. `antenna`: цилиндр 0.02×1.2 (x 1.2, z −1.4) + `glow(0xffd24d)` сфер 0.12. `crate`: RoundedBox 1.2×0.4×0.8 дээвэр дээр (y 2.45, z 1.2) + 3 сфер жимс (улаан/улбар/нил).
- `Dog.wear({ collar = 0xe83a4a, extra = null, hat = null })`: `this.collarMat.color.set(collar)`; extra `'bandana'` → гурвалжин plane (0.5) хүзүүний урд доош; hat `'hat'` → жижиг cap (cylinder 0.16 + сав) толгой дээр. `this.wearGroup`-ыг цэвэрлээд дахин барина.
- `homeDecor(parent, kind, x, z)` — `flowers` → `flowerField` 12 цэг; `lamp` → `lamp`; `bunting` → 2 шон + 8 гурвалжин туг (өнгө ээлжилнэ); `scarecrow` → шон + сүрлэн малгайтай бөөрөнхий толгой + хөндлөн гар; `mailbox` → жижиг box улаан + туг; `bench` → `bench`.
- `class HomeDecor { constructor(scene); setup(); refresh(); }` — `HOME_SPOTS = { flowers:[62,-40], lamp:[60,-44], bunting:[62,-36], scarecrow:[64,-40], mailbox:[59,-34], bench:[62,-44] }` (browser дээр талбайн баруун талд хоосон, замгүй эсэхийг шалгаад засна); `refresh()` owned бүрийг нэг удаа барина, bench/lamp-д collider push. Талбайн дэргэд `sign` "МИНИЙ БУЛАН".
- TownScene `applyEquipment()`: `refreshWear()`; `carPaint` → `toon(0xff9f2e,{key:'buggyBody'}).color.set(data.body)`, `buggyD` мөн адил (equipped байхгүй бол default 0xff9f2e/0xe07f16); `carDecor(town.car.userData.chassis, kind)`; `dog.wear({...})` (SHOP data-аас); `this.trailKind = equipped('trail')`; `home.refresh()`.
- `updateTrail(dt)`: `trailKind` байгаа ба (`player.state` walk/run эсвэл vehicle хурд > 2) → `trailT += dt`; 0.08с тутам (`low` чанарт 0.16) хөлний ард 0.6м-т: stars → `particles.burst(pos, 0xffe066, 1, {speed:0.3, up:1, size:0.16, life:0.7, gravity:0})`; petals → `0xffb3cc`, `{speed:0.5, up:0.6, size:0.18, life:1.4, gravity:1.5}`; rainbow → `[0xff5c5c,0xffb03a,0xfff05a,0x5ee07a,0x5aa8ff,0xb37aff][i++%6]`, `{speed:0.2, up:0.8, size:0.2, life:0.9, gravity:0}`.
- [ ] **Step 1:** props/animals функцуудыг бичих; `build()`-д `this.home = new HomeDecor(this); this.home.setup()`; `start()`/`build` төгсгөлд `applyEquipment()`; `updateWorld`-д `updateTrail(dt)`.
- [ ] **Step 2: Browser** — бүх машины будаг/чимэг, нохойн 3 аксессуар, 3 trail, 6 гэрийн зүйл тус бүрийг equip хийж screenshot-оор харна; гэрийн байрлал зам/талбайтай давхцахгүй.
- [ ] **Step 3: Commit** — `"Маркетын бараа дүрслэл: машины будаг/чимэг, Луувсайн хүзүүвч/бандана/малгай, алхахад trail эффект, талбайн дэргэдэх «Миний булан» чимэглэл"`

---

### Task 4: Алтан лууван ×20 — state + модуль

**Files:**
- Modify: `src/core/state.js` (`carrots`, `collectCarrot`), `src/town/TownScene.js` (HUD `🥕`, collection modal мөр, `new GoldenCarrots`), `index.html:33` (`<span id="carrotCount" class="stat">🥕 0/20</span>`)
- Create: `src/town/carrots.js`
- Test: `tests/state.test.js`

**Interfaces:** `state.carrots: Set<string>`; `collectCarrot(id) → { count, done, reward }` (давхардал → `null`; 20 дахь → `done: true`, `stars += 300`, `wardrobe.owned` `goldcrown` нэмнэ, `carrotsDone: true` нэг удаа). `CARROT_TOTAL = 20`.

- [ ] **Step 1: Тест**

```js
describe('GameState — алтан лууван', () => {
  it('нэг удаа тоолж 10 од өгнө', () => {
    const s = new GameState(); expect(s.collectCarrot('c1')).toEqual({ count: 1, done: false, reward: 10 }); expect(s.stars).toBe(10);
    expect(s.collectCarrot('c1')).toBeNull(); expect(s.stars).toBe(10);
  });
  it('20 дахь → 300 од + алтан титэм, дахин авахгүй', () => {
    const s = new GameState({ carrots: Array.from({ length: 19 }, (_, i) => 'c' + i) });
    const r = s.collectCarrot('c19'); expect(r.done).toBe(true); expect(s.stars).toBe(310); expect(s.owns('goldcrown')).toBe(true);
    const t = s.toJSON(); expect(new GameState(t).carrots.size).toBe(20);
  });
});
```
- [ ] **Step 2:** FAIL → хэрэгжүүлж PASS (`toJSON`-д `carrots: [...this.carrots], carrotsDone`).
- [ ] **Step 3: `carrots.js`** — `CARROT_SPOTS` 20 `{ id:'c0'.., x, y, z, hint }` (эхний санал: усан оргилуурын хөшөөний дээр, маркетын дээвэр, лабораторийн ар, 3 гүүрний доор (y −0.2, сэлж), арал, сувгийн эрэг, талбайн модны ар, хүрдний дээр, самбарын ард, ширэнгийн хаалганы дэргэд, номын булан, захын лангууны доор, зүүн/баруун/хойд захын мод, m0/m4 замын үзүүр); mesh: `ConeGeometry(0.22, 0.7, 8)` `glow(0xffc93c, 0.8)` + 2 навч `soft(0x5fbb5a)`; `update(dt)`: эргэлт, хөвөлт, 0.5с тутам `particles.sparkle`; тоглогч/машин 1.3м дотор → `state.collectCarrot` → `audio.correct()`, burst 0xffd24d, toast `🥕 ${count}/20 — ${hint}`; done → `audio.fanfare()`, toast `Бүх алтан лууван олдлоо! +300 од, Алтан титэм 👑`. Ойртох чимээ: 12м дотор хамгийн ойрын аваагүй → 2с тутам `audio.tone({ f: 600 + (12 - d) * 60, type:'sine', dur:0.12, vol:0.05 })`.
- [ ] **Step 4: Browser** — `town.carrots.spots` бүрийн `blocked(x,z)` false, тоглогчийг байрлуулж хүрч болох (дээвэр: `y` ≤ давхар үсрэлтийн өндөр ~3.2; өндөр бол сандал/хайрцаг дээрээс) эсэхийг шалгаж байрлалаа засна; HUD тоо шинэчлэгдэнэ.
- [ ] **Step 5: Commit** — `"Алтан лууван ×20: хотоор нуусан, дээгүүр алхахад +10 од, ойртоход чимээ, бүгдийг олбол 300 од + Алтан титэм; HUD 🥕 тоолуур"`

---

### Task 5: Асуултын сан 45 + түвшин

**Files:**
- Modify: `src/core/content.js:34-` (QUESTIONS), `src/core/state.js` (`settings.level`, `nextQuestion`), `src/town/TownScene.js:738-` (`ask` eyebrow), `TownScene.js:835-852` (цэсний select)
- Test: `tests/state.test.js`

- [ ] **Step 1: Тест**

```js
describe('GameState — сорилын түвшин', () => {
  it('nextQuestion зөвхөн сонгосон түвшний асуулт', () => {
    const s = new GameState(); s.settings.level = 2;
    const i = s.nextQuestion('math'); expect(QUESTIONS.math[i].level).toBe(2);
  });
  it('төрөл бүр 15 асуулт, түвшин бүрд ≥7', () => {
    for (const t of ['math', 'read', 'logic']) { expect(QUESTIONS[t].length).toBe(15); expect(QUESTIONS[t].filter((q) => q.level === 1).length).toBeGreaterThanOrEqual(7); }
  });
  it('хуучин solved index хэвээр', () => { const s = new GameState({ solved: ['math0'] }); expect(s.nextQuestion('math')).not.toBe(0); });
});
```
- [ ] **Step 2:** Асуултууд бичих — одоогийн 15-д `level` (math: 0,1,3 → 1; 2,4,5 → 2; read: 0,2 → 1; 1,3 → 2; logic: хялбар 3 → 1, 2 → 2). Шинэ: math 9 (нэмэх/хасах 20 дотор, цаг, хэмжих, үржих/хуваах, %-ийн энгийн), read 11 (3–4 өгүүлбэрийн Kagome/жимсний богино эх + асуулт), logic 10 (дараалал, ялгаатай нь аль, харьцуулалт, энгийн таавар). Бүгд `{ q, options[4], a, h, level, passage? }`.
- [ ] **Step 3:** `settings.level` default 1; `nextQuestion(type) { const L = this.settings.level || 1; return QUESTIONS[type].findIndex((q, i) => (q.level || 1) === L && !this.solved.has(type + i)); }`; `ask()`: `remaining` тухайн түвшнийх, eyebrow `${title} · ${L===1?'Бага':'Ахлах'} · ${remaining} үлдсэн`; цэс: `<label>Сорилын түвшин <select id="sLevel"><option value="1">Бага (6–8)</option><option value="2">Ахлах (9–12)</option></select></label>`.
- [ ] **Step 4:** PASS, browser: түвшин солиод асуулт солигдоно. Commit — `"Сорилын асуулт 45 болов (төрөл бүр 15), Бага/Ахлах түвшин цэснээс сонгоно"`

---

### Task 6: Иргэдийн өдрийн хүсэлт

**Files:**
- Modify: `src/core/state.js` (`requests`, `ensureRequests`, `fulfillRequest`, DAILY_POOL `request`), `src/town/TownScene.js` (`talkCitizen`, interactable icon/label, `buildCitizens` дараа `new CitizenRequests`)
- Create: `src/town/requests.js`
- Test: `tests/state.test.js`

**Interfaces:** `state.ensureRequests(n, rand = Math.random)` → `requests = { date, list: [{ c, type, fruit, n, done }] }` (2 өөр иргэн); `state.requestFor(c) → req|null` (биелээгүй); `state.fulfillRequest(req, { dogNear }) → { ok, reason? }` — fruit: `inventory[fruit] >= n` шалгаад хасна; dog: `dogNear` шаардана; ok → `stars += 30`, `done = true`, `dailyProgress('request')`.

- [ ] **Step 1: Тест**

```js
describe('GameState — иргэдийн хүсэлт', () => {
  it('өдөрт 2 өөр иргэн', () => { const s = new GameState(); s.ensureRequests(6); expect(s.requests.list).toHaveLength(2); expect(s.requests.list[0].c).not.toBe(s.requests.list[1].c); });
  it('fruit: дутуу бол ok:false, хүрвэл хасаж 30 од', () => {
    const s = new GameState(); s.ensureRequests(6, () => 0); const r = s.requests.list[0]; r.type = 'fruit'; r.fruit = 0; r.n = 2;
    expect(s.fulfillRequest(r, {}).ok).toBe(false); s.inventory[0] = 3;
    expect(s.fulfillRequest(r, {}).ok).toBe(true); expect(s.inventory[0]).toBe(1); expect(s.stars).toBe(30); expect(r.done).toBe(true);
  });
  it('dog: нохой ойр байх ёстой', () => { const s = new GameState(); s.ensureRequests(6); const r = s.requests.list[0]; r.type = 'dog'; expect(s.fulfillRequest(r, { dogNear: false }).ok).toBe(false); expect(s.fulfillRequest(r, { dogNear: true }).ok).toBe(true); });
  it('өдөр солигдвол шинэчлэнэ', () => { const s = new GameState({ requests: { date: '2000-01-01', list: [] } }); s.ensureRequests(6); expect(s.requests.list).toHaveLength(2); });
});
```
- [ ] **Step 2:** FAIL → хэрэгжүүлэх (date = `new Date().toDateString()`-тэй ижил формат ensureDaily-тэй). PASS.
- [ ] **Step 3: `requests.js`** — `CitizenRequests { constructor(scene); setup(); update(dt); text(req) }`; `setup`: `state.ensureRequests(citizens.length)`; `update`: хүсэлттэй, биелээгүй иргэн бүрд 6с тутам `bubbles.show(root, '❗')`; `text(req)`: fruit → `«${FRUITS[f].emoji} ${FRUITS[f].name} ${n} ширхэг олж өгөөч!»`, dog → `«Луувсайтай уулзмаар байна, дагуулж ирээч!»`. TownScene interactable: `icon: () => req ? '❗' : '💬'` (`updateInteractables` icon функц дэмжих — label функц дэмждэг шиг), `talkCitizen`: req байвал modal-д хүсэлт + товч `Өгөх (🍎 ×2)` / `Луувсай энд байна!` (`disabled` + шалтгаан), амжилт → `character.cheer()`, `c.m.cheer()`, ❤️ бөмбөлөг, burst, toast `+30 од`, `updateHUD`, `commit()`.
- [ ] **Step 4: Browser** — хүсэлттэй иргэн ❗, ярилцаж биелүүлэх (inventory тохируулж). Commit — `"Иргэдийн өдрийн хүсэлт: 2 иргэн жимс/Луувсай хүснэ (❗), биелүүлбэл 30 од; өдрийн даалгаварт нэмэгдэв"`

---

### Task 7: Нохойтой тоглох — бөмбөг, өргөх

**Files:**
- Modify: `src/world/animals.js` (`Dog.mode`, `carryBall(ball)`), `src/core/input.js:7-8` (`KeyF: 'ball'`, `KeyP: 'photo'` — Esc л pause), `index.html` (touch: `<button id="ballBtn" class="act hidden">🎾<small>Бөмбөг</small></button>`), `src/town/TownScene.js`
- Create: `src/town/ball.js`

**Interfaces:** `class FetchBall { constructor(scene); setup(); throw(); update(dt); state: 'idle'|'air'|'ground'|'mouth'|'return' }`; `scene.dogMode` = `null | 'fetch' | 'return'` — `updateAnimals` нохойн target-ыг: fetch → бөмбөг (stopDist 0.6), return → тоглогч (1.4).

- [ ] **Step 1:** `ball.js`: mesh сфер 0.18 `toon(0xffe35a)` + улаан судал; `throw()`: тоглогч хөл дээрээ, `state.pet`, ball idle/ground(тоглогчийн дэргэд) → pos = тоглогчийн урд 0.6/1.4 өндөр, `v = (sin h·9, 6, cos h·9)`, `character.play('pick',0.4)`, `audio.whoosh()`, `bubbles.show(dog.root,'🎾')`, `dogMode='fetch'`; `update`: air → gravity 20, blocked → `vx,vz *= -0.4`, газар (y≤0.18) → нэг удаа `vy*=-0.45` дараа нь `ground` (эргэлт `rotation.x += speed*dt`); fetch дээр нохой 0.9м дотор → `mouth` (ball → `dog.head`-д attach, position (0,-0.1,0.45)), `dogMode='return'`; return дээр нохой тоглогч 1.6м дотор → `ground` урд нь, `dog.happy=2`, ❤️, `dogMode=null`; `ground` дээр тоглогч 1.2м дотор → `idle` (авав, toast нэг удаа `F — бөмбөг шид`).
- [ ] **Step 2:** TownScene: `input.on('ball', () => this.ball.throw())`, `ballBtn` touch → мөн адил; `ballBtn` `state.pet` үед `hidden` арилна. `clickAction`: `state.pet` ба нохой ойр (2.4) бол `carry = { dog: true, m: this.dog }` — `Dog`-д `m`-тэй ижил `root`, `update(dt, {state})` API байхгүй тул `updateCarry`-д `if (e.dog) { root байрлуул; dog.tail savchina; dog.happy=1; return }`; `putDown`: dog → урд нь тавина, ❤️; `throwCarry`: dog → `dog.knockV = {vx,vz,vy}` богино нисэлт (`Dog.update`-д `knockV` байвал 0.9с физик + `rotation.x` тонгорно, дуусахад ❤️).
- [ ] **Step 3: Browser** — `town.ball.throw()` → нохой очиж авчирна; click-ээр нохой өргөх/буулгах/шидэх. Commit — `"Луувсайтай тоглох: F/🎾 бөмбөг шидэхэд гүйж очоод амандаа зуугаад авчирна; нохойг өргөж, буулгаж, шидэж болно"`

---

### Task 8: Хөгжмийн 4 хувилбар

**Files:**
- Modify: `src/core/audio.js:170-205` (`startMusic(mood)` хувилбар, `setMood`), `src/town/TownScene.js` `updateWorld` (mood сонголт)

- [ ] **Step 1:** `MUSIC = { town: {chords:[[0,4,7,11],[5,9,12,16],[7,11,14,17],[2,5,9,12]], root:261.63, bpm:96, type:'triangle', vol:0.09}, night: {chords:[[0,3,7,10],[-4,0,3,7],[5,8,12,15],[-2,2,5,9]], root:196, bpm:72, type:'sine', vol:0.06, bassVol:0.1}, car: {chords: town-ийнх, root:261.63, bpm:124, type:'square', vol:0.05, hat:true, bass8:true}, winter: {chords: town-ийнх, root:523.25, bpm:84, type:'triangle', vol:0.07, dur:1.6, bass:false}, runner: {одоогийнх} }`; `schedule` эдгээрийг уншина. `setMood(mood) { if (this.mood === mood) return; this.mood = mood; if (this.music) this.stopMusic(); this.startMusic(mood); }` (`stopMusic` 0.6с fade). `startMusic` дуудлагууд `this.mood = mood` тохируулна.
- [ ] **Step 2:** TownScene `updateWorld`-д `day` тооцсоны дараа: `const mood = this.vehicle ? 'car' : day < 0.3 ? 'night' : this.season === 3 ? 'winter' : 'town'; if (mood !== this.moodWant) { this.moodWant = mood; this.moodT = 0; } this.moodT += dt; if (this.moodT > 2 && this.started) this.audio.setMood(mood);`.
- [ ] **Step 3: Browser** — `town.audio.mood` машинд суухад `car`, `town.dayTime = 0.9` → `night`, `town.season = 3` → `winter`. Commit — `"Хөгжим: өдөр/шөнө/машин/өвөл 4 хувилбар, crossfade-тэй солигдоно"`

---

### Task 9: Photo mode

**Files:**
- Create: `src/town/photo.js`
- Modify: `src/town/TownScene.js` (`update` эхэнд `if (this.photo.active) return this.photo.update(dt)`, `render` хэвээр), `index.html` (📷 icon товч header-т, `<div id="photoBar" class="hidden"><button id="photoSave">📷 Хадгалах</button><button id="photoReset">🔄 Камер</button><button id="photoExit">✕ Гарах (Esc)</button></div>`), `src/style.css` (`body.photo #townHud > *:not(#photoBar) { display:none }`, photoBar доод төвд)

**Interfaces:** `class PhotoMode { constructor(scene); enter(); exit(); update(dt); save(); active }`.

- [ ] **Step 1:** `enter()`: `active=true`, `saved = {yaw,pitch,dist}`, `document.body.classList.add('photo')`, `photoBar` харуулна, `camPos = camera.position.clone()`, `target = player.pos + (0,1.2,0)`; `update(dt)`: чирэх → yaw/pitch; `input.zoom` → dist 2..30; `WASD`/`QE` → target-ыг камерын forward/right/up дагуу 6м/с (Shift ×2.5) хөдөлгөнө; камер = target + орбит; `camera.lookAt(target)`; `input.justPressed('pause')` → exit. `save()`: `scene.render(); const c = scene.app.renderer.domElement; c.toBlob ? c.toBlob(b => download(URL.createObjectURL(b))) : download(c.toDataURL())`, нэр `kagome-city-${YYYYMMDD-HHMM}.png`, toast `Зураг хадгалагдлаа 📷`, `audio.ui()`. `exit()`: сэргээнэ.
- [ ] **Step 2:** TownScene: `input.on('photo', ...)`, `photoButton` click; `update()`-ийн эхэнд `if (this.photo.active) { this.photo.update(dt); return; }` (clock/playtime нэмэгдэхгүй, иргэд царцана, render үргэлжилнэ).
- [ ] **Step 3: Browser** — P дарахад HUD нуугдаж камер чөлөөтэй, `photoSave` PNG татна (Playwright download event), Esc буцна. Commit — `"Photo mode: P/📷 — HUD нуугдаж тоглоом царцана, чөлөөт камер (чирэх, zoom, WASD/QE), PNG хадгална"`

---

### Task 10: Утасны гүйцэтгэл + `?fps` overlay

**Files:**
- Modify: `src/main.js` (`get quality()`, fps overlay), `src/town/TownScene.js` (low чанарын хэмнэлт: trail 0.16с, иргэдийн `near`/chat шалгалт `this.lowTick` 0.25с кэш, нугасны threats 0.2с тутам, лууван sparkle 1с), `src/world/bubble.js` (size ×0.9 low үед — `Bubbles.scale` талбар)

- [ ] **Step 1:** `main.js`: `get quality() { return this.state.settings.quality === 'auto' ? this.autoQuality : this.state.settings.quality; }`; `location.search.includes('fps')` → `<div id="fps">` зүүн доод, 1с тутам median FPS + quality.
- [ ] **Step 2:** TownScene `updateCitizens`: `const low = this.app.quality === 'low'; this.lowTick = (this.lowTick || 0) + dt; const doNear = !low || this.lowTick > 0.25;` — near/lookAt/чат шалгалтыг `doNear` үед л хийж, үр дүнг `c.nearCache`-д хадгална; `startChats` мөн `doNear`; loop төгсгөлд `if (doNear) this.lowTick = 0`. Нугас: `updateAnimals`-д threats шалгалтыг `low` бол 0.2с тутам. Лууван sparkle интервал `low ? 1 : 0.5`. Trail интервал `low ? 0.16 : 0.08`.
- [ ] **Step 3: Browser** — `?fps` overlay харагдана; `town.app.state.settings.quality='low'; app.applyQuality()` алдаагүй ажиллана. Commit — `"Утасны гүйцэтгэл: бага чанарт иргэд/нугас/particle шалгалт сийрэгжинэ; ?fps overlay"`

---

### Task 11: README, эцсийн шалгалт

- [ ] README: Онцлог (маркет 5 tab, алтан лууван, түвшин, хүсэлт, бөмбөг, хөгжим, photo mode), Удирдлага (`F` бөмбөг, `P` photo, хулгана нохой өргөх), Бүтэц (shop/carrots/requests/ball/photo/home.js), `?fps`.
- [ ] `npm test`, `npx vite build`, browser дээр бүхэл тоглолт (шинэ save + хуучин save) — console алдаагүй.
- [ ] Commit — `"README: маркет, алтан лууван, түвшин, хүсэлт, нохойн бөмбөг, хөгжим, photo mode, ?fps"`

## Self-review

- Spec coverage: A → Task 1–3; B → 4; C → 5; D → 6; E → 7; F → 8; G → 9; H → 10; тест/README → 11. ✓
- Interface нэрс: `buy/owns/equipped/unequip` (T1) ↔ shop.js (T2) ↔ `applyEquipment` (T3); `collectCarrot` (T4); `ensureRequests/requestFor/fulfillRequest` (T6); `dogMode` (T7); `setMood` (T8); `app.quality` (T10). ✓
- `KeyP` pause → photo болж байгааг README-д тэмдэглэнэ (Esc хэвээр). ✓
