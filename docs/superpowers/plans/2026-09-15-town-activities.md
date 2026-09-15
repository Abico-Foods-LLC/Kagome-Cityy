# Хотын activity (загас / талбай / хүргэлт) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kagome City-ийн 3D хотод гурван хажуугийн activity нэмэх — 🎣 загас барих (3D timing), 🌱 өөрийн талбай (тарих/услах/хураах), 📬 хүргэлтийн даалгавар (хугацаатай).

**Architecture:** `src/town/juice.js`-ийн загварыг дагаж activity бүр тусдаа модуль (`fishing.js`, `farm.js`, `delivery.js`), `constructor(scene)`-д prop + interactable-аа бүртгэж, `update(dt)`-ээ TownScene-ээс дуудуулна. Логик (`GameState`) DOM/3D-ээс тусдаа тул Vitest-ээр unit test хийнэ; 3D хэсгийг browser дээр гараар шалгана.

**Tech Stack:** Vite 6, Three.js 0.170, vanilla JS modules, Vitest (шинэ devDependency), localStorage.

**Spec:** `docs/superpowers/specs/2026-09-15-town-activities-design.md`

## Global Constraints

- Бүх дүрслэл procedural (Three.js) — гадны модел/texture нэмэхгүй.
- Хэрэглэгчид харагдах бүх текст монголоор; код/тайлбар одоогийн файлуудын хэв маягаар (монгол тайлбар, компакт мөр).
- Хуучин save (`localStorage` түлхүүр `kagome-city-v2`) default утгуудаар эвдрэлгүй ачаалагдана.
- 6 бүлэгт аялал (`CHAPTERS`) болон түүний `landmark` индексүүд өөрчлөгдөхгүй — `LANDMARKS`-д зөвхөн төгсгөлд нэмнэ.
- Шинэ дуу/хөгжим нэмэхгүй — `audio.splash / pickup / correct / wrong / fanfare / ui / whoosh` ашиглана.
- Материал runtime-д үүсгэвэл `applyCurve` (эсвэл аль хэдийн curved cached `key`-тэй `toon`) ашиглана — үгүй бол дугуй ертөнцөөс "хөндийрнө".
- Commit message монголоор, `Co-Authored-By` мөр НЭМЭХГҮЙ (хэрэглэгчийн дүрэм).

---

## Файлын бүтэц

| Файл | Үүрэг |
|---|---|
| `src/core/state.js` (modify) | `counts.fish/farm/delivery`, `farm[6]`, `delivery`, шинэ method-ууд, `DAILY_POOL` 3 нэмэлт |
| `src/core/content.js` (modify) | `LANDMARKS` 2 нэмэлт |
| `src/world/town.js` (modify) | Бобогийн яриа, `freeSpot` талбайн хориг |
| `src/town/farm.js` (create) | `FarmPlot` — талбайн 3D + modal + interactable |
| `src/town/fishing.js` (create) | `FishingGame` — загас барих төлөв машин + 3D |
| `src/town/delivery.js` (create) | `DeliveryBoard` — самбар, захиалга, HUD, хүргэлт |
| `src/town/TownScene.js` (modify) | модулиудыг үүсгэх/update, `interact` давуу эрх, prompt override, label/icon функц, NPC хүргэлтийн hook, цуглуулгын мөр |
| `index.html`, `src/style.css` (modify) | `#deliveryHud` |
| `tests/state.test.js` (create) | GameState unit test |
| `package.json` (modify) | `vitest`, `"test": "vitest run"` |
| `README.md` (modify) | Онцлог, бүтцийн жагсаалт |

---

### Task 1: GameState — загас / талбай / хүргэлтийн логик + Vitest

**Files:**
- Modify: `package.json`
- Modify: `src/core/state.js`
- Test: `tests/state.test.js`

**Interfaces:**
- Produces (дараагийн task-ууд ашиглана):
  - `GameState.SEED_PRICE = 10`, `GameState.STAGE_MS = 60000`
  - `state.counts.fish | farm | delivery` (number)
  - `state.farm: Array<{type: number|null, stage: 0|1|2|3|4, since: number|null}>` (урт 6)
  - `state.delivery: {done: number}`
  - `fishCaught(): void` — counts.fish++, stars += 8
  - `plant(i, type): boolean` — нүх хоосон ба од ≥ 10 бол тарина
  - `water(i, now = Date.now()): boolean` — stage 1..3, since===null бол since=now
  - `farmTick(now = Date.now()): number[]` — шат ахисан нүхний индексүүд
  - `farmHarvest(i): boolean` — stage 4 бол inventory[type]+=2, counts.farm++, counts.harvest+=2, stars+=15, нүх хоосорно
  - `deliveryDone(onTime: boolean): void` — delivery.done++, counts.delivery++, stars += onTime ? 30 : 15
  - `DAILY_POOL` id: `'fish'` (goal 3), `'farm'` (goal 1), `'delivery'` (goal 2)

- [ ] **Step 1: Vitest суулгаж `test` script нэмэх**

```bash
npm install -D vitest
```

`package.json`-ийн `scripts`-д нэмнэ:

```json
"test": "vitest run"
```

- [ ] **Step 2: Failing test бичих**

`tests/state.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { GameState } from '../src/core/state.js';

const MIN = 60 * 1000;

describe('GameState — загас', () => {
  it('fishCaught тоолж од өгнө', () => {
    const s = new GameState();
    s.fishCaught();
    expect(s.counts.fish).toBe(1);
    expect(s.stars).toBe(8);
  });
});

describe('GameState — талбай', () => {
  it('default 6 хоосон нүхтэй', () => {
    const s = new GameState();
    expect(s.farm).toHaveLength(6);
    expect(s.farm[0]).toEqual({ type: null, stage: 0, since: null });
  });

  it('plant: од хүрэлцэхгүй бол false', () => {
    const s = new GameState({ stars: 5 });
    expect(s.plant(0, 4)).toBe(false);
    expect(s.farm[0].stage).toBe(0);
  });

  it('plant: амжилттай бол од хасаж stage 1 болно', () => {
    const s = new GameState({ stars: 25 });
    expect(s.plant(0, 4)).toBe(true);
    expect(s.stars).toBe(15);
    expect(s.farm[0]).toEqual({ type: 4, stage: 1, since: null });
  });

  it('plant: хоосон бус нүхэнд false', () => {
    const s = new GameState({ stars: 50 });
    s.plant(1, 5);
    expect(s.plant(1, 6)).toBe(false);
    expect(s.stars).toBe(40);
  });

  it('water: тарьсан нүхийг услахад since тавигдана; давхар услахгүй', () => {
    const s = new GameState({ stars: 50 });
    s.plant(0, 4);
    expect(s.water(0, 1000)).toBe(true);
    expect(s.farm[0].since).toBe(1000);
    expect(s.water(0, 2000)).toBe(false);
    expect(s.farm[0].since).toBe(1000);
  });

  it('water: хоосон нүх ба ургац бэлэн нүхийг услахгүй', () => {
    const s = new GameState({ stars: 50, farm: [{ type: 4, stage: 4, since: null }] });
    expect(s.water(0, 1)).toBe(false);
    expect(s.water(1, 1)).toBe(false);
  });

  it('farmTick: услаагүй бол хөдлөхгүй', () => {
    const s = new GameState({ stars: 50 });
    s.plant(0, 4);
    expect(s.farmTick(10 * MIN)).toEqual([]);
    expect(s.farm[0].stage).toBe(1);
  });

  it('farmTick: 60 сек дараа нэг шат ахиж, дахин услах шаардлагатай болно', () => {
    const s = new GameState({ stars: 50 });
    s.plant(0, 4); s.water(0, 0);
    expect(s.farmTick(MIN - 1)).toEqual([]);
    expect(s.farmTick(MIN)).toEqual([0]);
    expect(s.farm[0]).toEqual({ type: 4, stage: 2, since: null });
    // Удаан хугацаа өнгөрсөн ч услаагүй тул дахин ахихгүй
    expect(s.farmTick(10 * MIN)).toEqual([]);
  });

  it('farmTick: 3 удаа услахад stage 4 (ургац), цаашид ахихгүй', () => {
    const s = new GameState({ stars: 50 });
    s.plant(2, 7);
    let now = 0;
    for (let k = 0; k < 3; k++) { s.water(2, now); now += MIN; s.farmTick(now); }
    expect(s.farm[2].stage).toBe(4);
    expect(s.water(2, now)).toBe(false);
    expect(s.farmTick(now + 10 * MIN)).toEqual([]);
  });

  it('farmHarvest: stage 4 биш бол false', () => {
    const s = new GameState({ stars: 50 });
    s.plant(0, 4);
    expect(s.farmHarvest(0)).toBe(false);
  });

  it('farmHarvest: ургац 2, од 15, тоолуур, нүх хоосорно', () => {
    const s = new GameState({ farm: [{ type: 5, stage: 4, since: null }] });
    expect(s.farmHarvest(0)).toBe(true);
    expect(s.inventory[5]).toBe(2);
    expect(s.counts.farm).toBe(1);
    expect(s.counts.harvest).toBe(2);
    expect(s.stars).toBe(15);
    expect(s.farm[0]).toEqual({ type: null, stage: 0, since: null });
  });
});

describe('GameState — хүргэлт', () => {
  it('deliveryDone хугацаанд нь +30, хоцорвол +15', () => {
    const s = new GameState();
    s.deliveryDone(true);
    s.deliveryDone(false);
    expect(s.delivery.done).toBe(2);
    expect(s.counts.delivery).toBe(2);
    expect(s.stars).toBe(45);
  });
});

describe('GameState — хадгалалт нийцтэй', () => {
  it('хуучин save (шинэ талбаргүй) default утгуудаар ачаалагдана', () => {
    const old = { counts: { harvest: 3, math: 1, read: 0, logic: 0, drive: 0, runner: 0 }, stars: 40, chapter: 1 };
    const s = new GameState(old);
    expect(s.counts.fish).toBe(0);
    expect(s.counts.farm).toBe(0);
    expect(s.counts.delivery).toBe(0);
    expect(s.counts.harvest).toBe(3);
    expect(s.farm).toHaveLength(6);
    expect(s.delivery).toEqual({ done: 0 });
  });

  it('toJSON → шинэ GameState тойрог хадгална', () => {
    const s = new GameState({ stars: 50 });
    s.plant(3, 6); s.water(3, 123); s.fishCaught(); s.deliveryDone(true);
    const r = new GameState(JSON.parse(JSON.stringify(s.toJSON())));
    expect(r.farm[3]).toEqual({ type: 6, stage: 1, since: 123 });
    expect(r.counts.fish).toBe(1);
    expect(r.delivery.done).toBe(1);
  });
});

describe('GameState — өдрийн даалгавар', () => {
  it('fish / farm / delivery id-ууд pool-д байна', () => {
    const ids = GameState.DAILY_POOL.map((q) => q.id);
    expect(ids).toEqual(expect.arrayContaining(['fish', 'farm', 'delivery']));
    expect(GameState.DAILY_POOL.find((q) => q.id === 'fish').goal).toBe(3);
    expect(GameState.DAILY_POOL.find((q) => q.id === 'farm').goal).toBe(1);
    expect(GameState.DAILY_POOL.find((q) => q.id === 'delivery').goal).toBe(2);
  });

  it('dailyProgress шинэ id-тай ажиллана', () => {
    const s = new GameState();
    s.daily = { date: s.daily.date, quests: [{ id: 'fish', goal: 3, progress: 0, done: false }] };
    expect(s.dailyProgress('fish', 1)).toBeNull();
    expect(s.dailyProgress('fish', 2)).toMatchObject({ id: 'fish', done: true });
    expect(s.stars).toBe(30);
  });
});
```

- [ ] **Step 3: Test унаж байгааг батлах**

Run: `npm test`
Expected: FAIL — `s.fishCaught is not a function`, `s.farm` undefined г.м.

- [ ] **Step 4: `state.js`-д хэрэгжүүлэх**

`constructor`-т (`this.counts` мөрийг солино, `this.pet` мөрийн дараа нэмнэ):

```js
    this.counts = { harvest: 0, math: 0, read: 0, logic: 0, drive: 0, runner: 0, fish: 0, farm: 0, delivery: 0, ...(data.counts || {}) };
```

```js
    this.farm = Array.from({ length: 6 }, (_, i) => ({ type: null, stage: 0, since: null, ...((data.farm || [])[i] || {}) }));   // Миний талбай — 6 нүх
    this.delivery = { done: 0, ...(data.delivery || {}) };
```

`DAILY_POOL` массивын төгсгөлд:

```js
    { id: 'fish', goal: 3, text: '3 загас барь', reward: 30, icon: '🐟' },
    { id: 'farm', goal: 1, text: 'Талбайгаас 1 ургац хураа', reward: 35, icon: '🌱' },
    { id: 'delivery', goal: 2, text: '2 хүргэлт хий', reward: 40, icon: '📬' },
```

`// ---------- Хувцас ----------` хэсгийн өмнө шинэ method-ууд:

```js
  // ---------- Загас ----------
  fishCaught() { this.counts.fish++; this.stars += 8; }

  // ---------- Миний талбай ----------
  static SEED_PRICE = 10;
  static STAGE_MS = 60 * 1000;   // нэг шат (услах бүрт)
  static RIPE = 4;               // stage 0 хоосон · 1 тарьсан · 2 соёо · 3 навч · 4 ургац
  plant(i, type) {
    const c = this.farm[i];
    if (!c || c.stage !== 0 || this.stars < GameState.SEED_PRICE) return false;
    this.stars -= GameState.SEED_PRICE;
    c.type = type; c.stage = 1; c.since = null;
    return true;
  }
  water(i, now = Date.now()) {
    const c = this.farm[i];
    if (!c || c.stage < 1 || c.stage >= GameState.RIPE || c.since !== null) return false;
    c.since = now;
    return true;
  }
  /** Услаад STAGE_MS өнгөрсөн нүхнүүдийг нэг шат ахиулна; ахисан индексүүдийг буцаана (дүрслэл шинэчлэхэд) */
  farmTick(now = Date.now()) {
    const changed = [];
    this.farm.forEach((c, i) => {
      if (c.stage < 1 || c.stage >= GameState.RIPE || c.since === null) return;
      if (now - c.since >= GameState.STAGE_MS) { c.stage++; c.since = null; changed.push(i); }
    });
    return changed;
  }
  farmHarvest(i) {
    const c = this.farm[i];
    if (!c || c.stage !== GameState.RIPE) return false;
    this.inventory[c.type] = (this.inventory[c.type] || 0) + 2;
    this.counts.farm++; this.counts.harvest += 2; this.stars += 15;
    c.type = null; c.stage = 0; c.since = null;
    return true;
  }

  // ---------- Хүргэлт ----------
  deliveryDone(onTime) { this.delivery.done++; this.counts.delivery++; this.stars += onTime ? 30 : 15; }

```

`toJSON`-ийн объектод нэмнэ (`pet: this.pet` дараа):

```js
      farm: this.farm, delivery: this.delivery,
```

- [ ] **Step 5: Test давж байгааг батлах**

Run: `npm test`
Expected: PASS (бүх test ногоон).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/core/state.js tests/state.test.js
git commit -m "State: загас/талбай/хүргэлтийн ахиц, өдрийн даалгавар 3 нэмэлт; Vitest unit test"
```

---

### Task 2: Агуулга, байршил, TownScene туслах өргөтгөл

**Files:**
- Modify: `src/core/content.js` (LANDMARKS)
- Modify: `src/world/town.js` (Бобогийн яриа, `freeSpot`)
- Modify: `src/town/TownScene.js` (`updateInteractables`, `collection`)

**Interfaces:**
- Produces: interactable-ийн `label` ба `icon` талбар **функц** байж болно (`() => string`); `LANDMARKS[9]` = самбар, `LANDMARKS[10]` = талбай.

- [ ] **Step 1: `content.js` — LANDMARKS төгсгөлд 2 нэмэх**

`{ name: 'Хотын төв', ... }` мөрийн дараа:

```js
  { name: 'Захиалгын самбар', emoji: '📬', x: 5, z: -19, color: '#e07a3f' },
  { name: 'Миний талбай', emoji: '🌱', x: 56, z: -38, color: '#61a148' },
```

- [ ] **Step 2: `town.js` — Бобогийн яриа + талбайн хориг**

`npcDefs` дахь Брокколи Бобогийн `lines`-ийг солино:

```js
    { type: 6, x: 30, z: -27, name: 'Брокколи Бобо', lines: 'Манай фермд лууван, улаан лооль, брокколи, хулуу ургаж байна. Фермийн зүүн талд чиний өөрийн талбай бий — үрийн савнаас үр аваад тарь, услаад ургацаа хураагаарай!' },
```

`freeSpot` функцэд `// ферм` мөрийн дараа:

```js
    if (x > 52 && x < 60 && z > -43 && z < -33) return false;      // миний талбай
```

- [ ] **Step 3: `TownScene.updateInteractables` — label/icon функц дэмжих**

Одоогийн:

```js
      this.hint.material.map = this.hintTexture(best.icon || '✨'); this.hint.material.needsUpdate = true;
```
→
```js
      const icon = typeof best.icon === 'function' ? best.icon() : best.icon;
      this.hint.material.map = this.hintTexture(icon || '✨'); this.hint.material.needsUpdate = true;
```

Одоогийн:

```js
      $('promptText').textContent = this.vehicle ? 'Машинаас буух' + (this.state.chapter === 4 ? ' · Алтан хаалгаар дарааллаар яв' : '') : best.icon + ' ' + best.label;
```
→
```js
      const icon = typeof best?.icon === 'function' ? best.icon() : best?.icon, label = typeof best?.label === 'function' ? best.label() : best?.label;
      $('promptText').textContent = this.vehicle ? 'Машинаас буух' + (this.state.chapter === 4 ? ' · Алтан хаалгаар дарааллаар яв' : '') : icon + ' ' + label;
```

- [ ] **Step 4: `TownScene.collection` — шинэ тоолуурын мөр**

`<p>Цуглуулсан од: ...` мөрийн `</p>` дараа шинэ параграф:

```js
<p>🐟 Загас: <b>${s.counts.fish}</b> · 🌱 Талбайн ургац: <b>${s.counts.farm}</b> · 📬 Хүргэлт: <b>${s.counts.delivery}</b></p>
```

- [ ] **Step 5: Build шалгах**

Run: `npm run build`
Expected: амжилттай, алдаагүй.

- [ ] **Step 6: Commit**

```bash
git add src/core/content.js src/world/town.js src/town/TownScene.js
git commit -m "Агуулга: самбар/талбайн landmark, Бобогийн яриа, interactable label функц, цуглуулгын тоолуур"
```

---

### Task 3: FarmPlot — Миний талбай

**Files:**
- Create: `src/town/farm.js`
- Modify: `src/town/TownScene.js` (import, `setupInteractables`, `update`)

**Interfaces:**
- Consumes: `GameState.plant/water/farmTick/farmHarvest`, `GameState.SEED_PRICE/STAGE_MS/RIPE`; interactable label/icon функц (Task 2).
- Produces: `class FarmPlot { constructor(scene); update(dt); }` — `scene.farm`.

- [ ] **Step 1: `src/town/farm.js` үүсгэх**

```js
// Миний талбай: 6 нүхтэй өөрийн талбай — тарих → услах → хураах. State (GameState.farm) ↔ 3D дүрслэл.
import * as T from 'three';
import * as P from '../world/props.js';
import { toon, glow, applyCurve, PALETTE } from '../gfx/materials.js';
import { FRUITS } from '../core/content.js';
import { GameState } from '../core/state.js';
import { $, modal, closeModal, toast, pop } from '../core/ui.js';

const CENTER = { x: 56, z: -38 }, STEP = 1.8, COLS = 2, ROWS = 3;
const CRATE = { x: 53.5, z: -38 };
const SEED_TYPES = [4, 5, 6, 7];   // лууван, улаан лооль, брокколи, хулуу

export class FarmPlot {
  constructor(scene) {
    this.scene = scene; this.state = scene.state;
    this.cells = [];
    this.tickT = 0;
    this.geo = { cone: new T.ConeGeometry(1, 1, 8) };
    this.mats = {
      soil: toon(0xa5744c, { key: 'soil' }),
      wet: toon(0x7a5334, { key: 'soilWet' }),
      seed: toon(0x8a6a3c, { key: 'seedB' }),
      sprout: toon(PALETTE.leafLight, { key: 'leafL' }),
      leaf: toon(PALETTE.leaf, { key: 'leaf' }),
      crate: toon(0xb2743c, { key: 'crate' }),
    };
    Object.values(this.mats).forEach(applyCurve);   // runtime-д үүсэх mesh-үүд дугуй ертөнцөд нийцнэ
    this.setup();
  }

  cellPos(i) { return { x: CENTER.x + ((i % COLS) - (COLS - 1) / 2) * STEP, z: CENTER.z + (Math.floor(i / COLS) - (ROWS - 1) / 2) * STEP }; }

  setup() {
    const { scene, town, interactables } = this.scene;
    // Суурь хөрс + тэмдэг
    P.box(this.mats.soil, scene, CENTER.x, 0.03, CENTER.z, COLS * STEP + 1.2, 0.06, ROWS * STEP + 1.2);
    P.sign(scene, 'МИНИЙ ТАЛБАЙ', CENTER.x, 3.0, CENTER.z - ROWS * STEP / 2 - 1.1, { width: 4.4, bg: '#fff7d7', fg: '#306e46', border: '#61a148', post: true });
    // Үрийн сав
    P.box(this.mats.crate, scene, CRATE.x, 0.5, CRATE.z, 1.1, 1, 1.1);
    P.box(this.mats.crate, scene, CRATE.x + 0.1, 1.4, CRATE.z - 0.1, 0.9, 0.8, 0.9);
    town.colliders.push({ x: CRATE.x, z: CRATE.z, r: 0.8 });
    interactables.push({ x: CRATE.x, z: CRATE.z, r: 2.2, label: 'Үрийн сав', icon: '📦', action: () => this.seedInfo() });
    // 6 нүх
    for (let i = 0; i < COLS * ROWS; i++) {
      const { x, z } = this.cellPos(i);
      const g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
      const soil = P.box(this.mats.soil, g, 0, 0.07, 0, 1.4, 0.14, 1.4);
      const plant = new T.Group(); g.add(plant);
      const ring = P.mesh(new T.TorusGeometry(0.55, 0.04, 6, 24), glow(0x9be36a, 1.4), g, 0, 0.16, 0);
      ring.rotation.x = Math.PI / 2; ring.castShadow = false; ring.visible = false;
      this.cells.push({ g, soil, plant, ring, stage: -1, type: null });
      interactables.push({ x, z, r: 1.4, hintY: 1.9, label: () => this.label(i), icon: () => this.icon(i), action: () => this.act(i) });
      this.rebuild(i);
    }
  }

  // ---------- Prompt ----------
  label(i) {
    const c = this.state.farm[i], def = c.type !== null ? FRUITS[c.type] : null;
    if (c.stage === 0) return `Тарих (${GameState.SEED_PRICE} од)`;
    if (c.stage >= GameState.RIPE) return def.name + ' хураах';
    if (c.since === null) return def.name + ' услах';
    const s = Math.max(0, Math.ceil((GameState.STAGE_MS - (Date.now() - c.since)) / 1000));
    return `${def.name} ургаж байна · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  icon(i) {
    const c = this.state.farm[i];
    return c.stage === 0 ? '🌱' : c.stage >= GameState.RIPE ? FRUITS[c.type].emoji : c.since === null ? '💧' : '⏳';
  }
  act(i) {
    const c = this.state.farm[i];
    if (c.stage === 0) this.plantModal(i);
    else if (c.stage >= GameState.RIPE) this.harvest(i);
    else if (c.since === null) this.water(i);
    else toast('Ургаж байна — түр хүлээгээрэй', 2000, '⏳');
  }

  // ---------- Үйлдлүүд ----------
  seedInfo() {
    modal(`<div class="eyebrow">МИНИЙ ТАЛБАЙ</div><h2>Үрийн сав</h2><p>4 төрлийн ногооны үр: 🥕 Лууван · 🍅 Улаан лооль · 🥦 Брокколи · 🎃 Хулуу — тус бүр <b>${GameState.SEED_PRICE} од</b>.</p><p class="hint">Талбайн нүх дээр E дарж тарь → 💧 услаарай → 1 минутын дараа шат ахина (услах бүрт). 3 удаа услахад ургац бэлэн: 2 ширхэг ургац + 15 од. Ургац шүүсний лабораторид орно.</p><div class="row"><button id="seedInfoClose" class="primary">Ойлголоо</button></div>`);
    $('seedInfoClose').onclick = () => closeModal();
  }

  plantModal(i) {
    const s = this.state, poor = s.stars < GameState.SEED_PRICE;
    const cards = SEED_TYPES.map((t) => `<button data-seed="${t}" ${poor ? 'disabled' : ''}><span>${FRUITS[t].emoji}</span><small>${FRUITS[t].name}</small><b>${GameState.SEED_PRICE} од</b></button>`).join('');
    modal(`<div class="eyebrow">МИНИЙ ТАЛБАЙ · нүх ${i + 1}</div><h2>Юу тарих вэ?</h2><div class="ings" style="grid-template-columns:repeat(4,1fr)">${cards}</div><p class="hint">${poor ? 'Од хүрэлцэхгүй байна — жимс түүж од цуглуулаарай.' : 'Тарьсны дараа услаарай. Услах бүрт 1 минут ургаж, 3 удаа услахад ургац бэлэн болно.'}</p><div class="row"><button id="seedClose" class="ghost">Хаах</button></div>`);
    document.querySelectorAll('[data-seed]').forEach((b) => b.onclick = () => {
      const t = +b.dataset.seed, sc = this.scene;
      if (!s.plant(i, t)) { sc.audio.wrong(); return; }
      closeModal();
      sc.audio.pickup(t); sc.character.play('pick', 0.7);
      this.rebuild(i); sc.particles.dust(this.cells[i].g.position, 6);
      toast(`${FRUITS[t].name} тарилаа! Одоо услаарай 💧`, 2600, '🌱');
      pop($('starCount')); sc.commit();
    });
    $('seedClose').onclick = () => closeModal();
  }

  water(i) {
    if (!this.state.water(i)) return;
    const sc = this.scene, { g } = this.cells[i];
    sc.character.play('pick', 0.7); sc.audio.splash();
    sc.particles.burst(new T.Vector3(g.position.x, 1.2, g.position.z), 0x8fdcf5, 14, { speed: 1.2, up: 1, size: 0.16, life: 0.6, gravity: 9 });
    this.rebuild(i);
    toast('Услалаа — 1 минутын дараа ургана', 2200, '💧');
    sc.commit();
  }

  harvest(i) {
    const type = this.state.farm[i].type, { g } = this.cells[i];
    if (!this.state.farmHarvest(i)) return;
    const sc = this.scene;
    sc.character.play('pick', 0.7); sc.audio.pickup(type);
    sc.particles.burst(new T.Vector3(g.position.x, 1, g.position.z), FRUITS[type].color, 20);
    toast(`${FRUITS[type].name} ×2 хураалаа! +15 од`, 2600, FRUITS[type].emoji);
    this.rebuild(i);
    sc.progress('farm', 1); sc.progress('harvest', 2);
    pop($('fruitCount')); sc.commit();
  }

  // ---------- Дүрслэл ----------
  /** Нүхний 3D-г state-ийн шатнаас дахин бүтээнэ (шат/төрөл өөрчлөгдөөгүй бол зөвхөн чийг) */
  rebuild(i) {
    const c = this.state.farm[i], cell = this.cells[i];
    cell.soil.material = c.since !== null ? this.mats.wet : this.mats.soil;
    if (cell.stage === c.stage && cell.type === c.type) return;
    cell.stage = c.stage; cell.type = c.type;
    cell.plant.clear();
    cell.ring.visible = c.stage >= GameState.RIPE;
    const p = cell.plant, cone = this.geo.cone;
    if (c.stage === 1) for (let k = 0; k < 3; k++) P.sphere(this.mats.seed, p, (k - 1) * 0.3, 0.16, (k % 2) * 0.2 - 0.1, 0.07);
    else if (c.stage === 2) for (let k = 0; k < 3; k++) P.mesh(cone, this.mats.sprout, p, (k - 1) * 0.3, 0.32, (k % 2) * 0.2 - 0.1, 0.1, 0.35, 0.1);
    else if (c.stage === 3) for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; P.mesh(cone, this.mats.leaf, p, Math.cos(a) * 0.3, 0.44, Math.sin(a) * 0.3, 0.16, 0.6, 0.16).rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4); }
    else if (c.stage >= GameState.RIPE) P.fruit(c.type, p, 0, 0.75, 0, 0.75);
  }

  update(dt) {
    this.tickT -= dt;
    if (this.tickT > 0) return;
    this.tickT = 0.5;
    const changed = this.state.farmTick();
    if (!changed.length) return;
    for (const i of changed) {
      this.rebuild(i);
      const c = this.state.farm[i], { g } = this.cells[i];
      this.scene.particles.burst(new T.Vector3(g.position.x, 0.6, g.position.z), 0x9be36a, 10, { speed: 1.5, up: 2, size: 0.18, life: 0.7 });
      if (c.stage >= GameState.RIPE) toast(`${FRUITS[c.type].name} ургац бэлэн боллоо! Талбай руу яв`, 3200, '🌱');
      else toast(`${FRUITS[c.type].name} ургалаа — дахин услаарай`, 2600, '💧');
    }
    this.scene.audio.pickup(0);
    this.state.save();
  }
}
```

- [ ] **Step 2: TownScene-д холбох**

Import (`JuiceGame` мөрийн дараа):

```js
import { FarmPlot } from './farm.js';
```

`setupInteractables()`-ийн төгсгөлд (`enterJungle` мөрийн дараа):

```js
    this.farm = new FarmPlot(this);
```

`update(dt)`-д `this.updateWorld(dt);` мөрийн дараа:

```js
    this.farm.update(dt);
```

- [ ] **Step 3: Build + гар тест**

Run: `npm run build` → амжилттай.
Run: `npm run dev` → browser: фермийн зүүн талд (56, −38) хөрс + "МИНИЙ ТАЛБАЙ" самбар + үрийн сав харагдана; нүх дээр "🌱 Тарих (10 од)" prompt; тарих → "💧 услах" → 60 сек дараа toast + соёо → давтаж 3 удаа → ургац + цагираг → "хураах" → inventory +2 (цуглуулгад харагдана). Reload → шат хадгалагдсан. Од < 10 бол картууд disabled.

- [ ] **Step 4: Commit**

```bash
git add src/town/farm.js src/town/TownScene.js
git commit -m "Миний талбай: 6 нүхтэй өөрийн талбай — үр авах, тарих, услах, 3 шат ургаж хураах"
```

---

### Task 4: FishingGame — загас барих

**Files:**
- Create: `src/town/fishing.js`
- Modify: `src/town/TownScene.js` (import, `setupInteractables`, `interact`, `update`, `updateInteractables`)

**Interfaces:**
- Consumes: `GameState.fishCaught()`, `scene.player {pos, vel, heading, grounded}`, `scene.active`, `scene.vehicle`, `scene.clock`.
- Produces: `class FishingGame { active: boolean; promptText: string; start(); press(); cancel(); update(dt) }` — `scene.fishing`.

- [ ] **Step 1: `src/town/fishing.js` үүсгэх**

```js
// Загас барих: сувгийн эрэг дээр timing mini-game — modal-гүй, бүгд 3D ертөнцөд болно.
// Төлөв: idle → cast → wait → bite → caught | missed → cast …
import * as T from 'three';
import * as P from '../world/props.js';
import { toon, applyCurve, PALETTE } from '../gfx/materials.js';
import { $, toast, pop } from '../core/ui.js';

const SPOT = { x: 16, z: -25, r: 3 };       // эрэг дээрх зогсох цэг (загасчны хажууд)
const TARGET = { x: 21, z: -25 };            // хөвүүр буух цэг (сувгийн гол)
const CAST_DUR = 0.5, BITE_WINDOW = 1.0, MISS_DUR = 0.8, CAUGHT_DUR = 1.2;

export class FishingGame {
  constructor(scene) {
    this.scene = scene; this.state = scene.state;
    this.active = false; this.phase = 'idle'; this.t = 0; this.waitFor = 0;
    this.promptText = '';
    this.setup();
  }

  setup() {
    const { scene, interactables } = this.scene;
    this.mats = { float: toon(0xe83a4a, { key: 'floatR' }), fish: toon(0x7fc8ff, { key: 'fishB' }), fin: toon(0x4f8fd0, { key: 'fishD' }) };
    Object.values(this.mats).forEach(applyCurve);
    // Хөвүүр + шугам (идэвхгүй үед нуугдана)
    this.float = P.sphere(this.mats.float, scene, TARGET.x, -0.3, TARGET.z, 0.12); this.float.visible = false;
    P.sphere(toon(0xffffff, { key: 'white' }), this.float, 0, 0.6, 0, 0.7);
    this.lineGeo = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]);
    this.line = new T.Line(this.lineGeo, new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
    this.line.visible = false; this.line.frustumCulled = false; scene.add(this.line);
    // Загас (барихад дүр рүү нисдэг)
    this.fish = new T.Group(); this.fish.visible = false; scene.add(this.fish);
    P.sphere(this.mats.fish, this.fish, 0, 0, 0, 0.18, 0.11, 0.09);
    P.mesh(new T.ConeGeometry(1, 1, 6), this.mats.fin, this.fish, -0.22, 0, 0, 0.08, 0.16, 0.05).rotation.z = Math.PI / 2;
    // Эрэг дээрх хувин + самбар
    P.cyl(toon(0x6d8fa8, { key: 'bucket' }), scene, SPOT.x - 0.9, 0.3, SPOT.z + 1.2, 0.3, 0.6, 0.25);
    P.sign(scene, 'ЗАГАСНЫ ЦЭГ', SPOT.x - 0.6, 2.6, SPOT.z - 1.6, { width: 3.2, bg: '#e6f6ff', fg: '#1f5f8a', border: '#4fb3e8', post: true });
    interactables.push({ x: SPOT.x, z: SPOT.z, r: SPOT.r, label: 'Загас барих', icon: '🎣', visible: () => !this.active, action: () => this.start() });
  }

  // ---------- Төлөв ----------
  start() {
    if (this.active) return;
    this.active = true;
    this.scene.player.heading = Math.PI / 2;   // суваг руу (+x) харна
    this.cast();
  }

  cast() {
    this.phase = 'cast'; this.t = 0;
    const pp = this.scene.player.pos;
    this.from = new T.Vector3(pp.x + 0.4, 1.4, pp.z);
    this.to = new T.Vector3(TARGET.x + (Math.random() - 0.5) * 2, -0.3, TARGET.z + (Math.random() - 0.5) * 2);
    this.float.visible = this.line.visible = true;
    this.float.position.copy(this.from);
    this.promptText = '🎣 Шидэж байна…';
    this.scene.audio.whoosh();
  }

  /** E дарахад (TownScene.interact-аас давуу эрхтэй дуудагдана) */
  press() {
    if (this.phase === 'bite') this.caught();
    else if (this.phase === 'wait') { toast('Хараахан хазаагүй… тэвчээртэй хүлээ', 1800, '🎣'); this.scene.audio.wrong(); this.cast(); }
  }

  caught() {
    this.phase = 'caught'; this.t = 0;
    const sc = this.scene;
    this.state.fishCaught();
    sc.character.cheer(); sc.audio.correct();
    sc.particles.burst(this.float.position.clone(), 0xffd24d, 16, { speed: 2.5, up: 4, size: 0.2, life: 0.7 });
    this.fishFrom = this.float.position.clone();
    this.fishTo = new T.Vector3(sc.player.pos.x, 1.6, sc.player.pos.z);
    this.fish.visible = true; this.fish.position.copy(this.fishFrom);
    this.float.visible = this.line.visible = false;
    this.promptText = '🐟 Барилаа!';
    toast('Загас барилаа! +8 од', 2200, '🐟');
    sc.progress('fish', 1); pop($('starCount')); sc.commit();
  }

  cancel() {
    this.active = false; this.phase = 'idle';
    this.float.visible = this.line.visible = this.fish.visible = false;
    this.promptText = '';
  }

  update(dt) {
    if (!this.active) return;
    const sc = this.scene, pl = sc.player, fl = this.float.position;
    // Хөдөлбөл / үсэрвэл / машинд суувал / цэс нээгдвэл / цэгээс холдвол зогсоно
    if (sc.vehicle || !sc.active || !pl.grounded || Math.hypot(pl.vel.x, pl.vel.z) > 0.5 || Math.hypot(pl.pos.x - SPOT.x, pl.pos.z - SPOT.z) > SPOT.r + 0.5) { this.cancel(); return; }
    this.t += dt;
    if (this.phase === 'cast') {
      const k = Math.min(1, this.t / CAST_DUR);
      fl.lerpVectors(this.from, this.to, k); fl.y += Math.sin(k * Math.PI) * 1.6;
      if (k >= 1) { this.phase = 'wait'; this.t = 0; this.waitFor = 2 + Math.random() * 4; this.promptText = '🎣 Хүлээ…'; sc.audio.splash(); sc.particles.burst(fl.clone(), 0xbff3ff, 8, { speed: 1.5, up: 2, size: 0.14, life: 0.5, gravity: 8 }); }
    } else if (this.phase === 'wait') {
      fl.y = -0.3 + Math.sin(sc.clock * 2.5) * 0.05;
      if (this.t >= this.waitFor) { this.phase = 'bite'; this.t = 0; this.promptText = '🎣 E — ТАТ!'; sc.audio.splash(); sc.particles.burst(fl.clone(), 0xbff3ff, 14, { speed: 2.5, up: 3, size: 0.18, life: 0.6, gravity: 8 }); }
    } else if (this.phase === 'bite') {
      fl.y = -0.65 + Math.sin(sc.clock * 18) * 0.06;
      if (this.t >= BITE_WINDOW) { this.phase = 'missed'; this.t = 0; this.promptText = '💨 Мултарлаа…'; toast('Загас мултарлаа… дахин оролд', 1800, '🎣'); sc.audio.wrong(); }
    } else if (this.phase === 'missed') {
      fl.y = -0.3;
      if (this.t >= MISS_DUR) this.cast();
    } else if (this.phase === 'caught') {
      const k = Math.min(1, this.t / 0.6);
      this.fish.position.lerpVectors(this.fishFrom, this.fishTo, k); this.fish.position.y += Math.sin(k * Math.PI) * 2;
      this.fish.rotation.y = sc.clock * 6;
      if (k >= 1) this.fish.visible = false;
      if (this.t >= CAUGHT_DUR) this.cast();
    }
    // Шугам: дүрийн гараас хөвүүр хүртэл
    const pos = this.lineGeo.attributes.position;
    pos.setXYZ(0, pl.pos.x + Math.sin(pl.heading) * 0.4, 1.5, pl.pos.z + Math.cos(pl.heading) * 0.4);
    pos.setXYZ(1, fl.x, fl.y, fl.z);
    pos.needsUpdate = true;
  }
}
```

- [ ] **Step 2: TownScene-д холбох**

Import:

```js
import { FishingGame } from './fishing.js';
```

`setupInteractables()` төгсгөлд (`this.farm = ...` дараа):

```js
    this.fishing = new FishingGame(this);
```

`interact()`:

```js
  interact() {
    if (!this.active) return;
    if (this.vehicle) { this.exitCar(); return; }
    if (this.fishing.active) { this.fishing.press(); return; }
    if (this.near) { this.audio.ui(); this.near.action(); }
  }
```

`update(dt)`-д `this.farm.update(dt);` дараа:

```js
    this.fishing.update(dt);
```

`updateInteractables(active)` — `this.near = best;` мөрөөс хойшхи бүх хэсгийг доорхоор солино (Task 2-ийн label/icon функц дэмжлэг энд багтсан):

```js
    this.near = best;
    const ov = this.fishing?.active ? this.fishing.promptText : null;   // загас барих үед prompt-ыг дарна, hint нуугдана
    // Хөвөх icon + цагираг pulse
    if (best && !this.vehicle && !ov) {
      const pos = best.dynamic ? best.dynamic() : best;
      const icon = typeof best.icon === 'function' ? best.icon() : best.icon;
      this.hint.visible = true;
      this.hint.material.map = this.hintTexture(icon || '✨'); this.hint.material.needsUpdate = true;
      this.hint.position.set(pos.x, (best.hintY ?? 2.6) + Math.sin(this.clock * 4) * 0.12, pos.z);
      this.hint.scale.setScalar(1.25 + Math.sin(this.clock * 4) * 0.08);
    } else this.hint.visible = false;
    const pr = $('prompt');
    const showP = active && (best || this.vehicle || ov);
    pr.classList.toggle('on', !!showP);
    if (showP) {
      const icon = typeof best?.icon === 'function' ? best.icon() : best?.icon, label = typeof best?.label === 'function' ? best.label() : best?.label;
      $('promptText').textContent = ov ?? (this.vehicle ? 'Машинаас буух' + (this.state.chapter === 4 ? ' · Алтан хаалгаар дарааллаар яв' : '') : icon + ' ' + label);
    }
  }
```

- [ ] **Step 3: Build + гар тест**

Run: `npm run build` → амжилттай.
Browser: сувгийн эрэг (16, −25) "ЗАГАСНЫ ЦЭГ" самбар, хувин; E → хөвүүр сувагт нисч буун "Хүлээ…"; эрт E → "Хараахан хазаагүй"; хазахад хөвүүр живж "E — ТАТ!" → 1 сек дотор E → загас дүр рүү нисч +8 од, цуглуулгад 🐟 1; хоцорвол "мултарлаа" → автоматаар дахин шидэнэ; WASD дарвал бүх зүйл алга болж prompt хэвийн. Esc цэс нээхэд цуцлагдана.

- [ ] **Step 4: Commit**

```bash
git add src/town/fishing.js src/town/TownScene.js
git commit -m "Загас барих: сувгийн эрэг дээр timing mini-game — шидэх, хүлээх, хазахад 1 сек дотор татах"
```

---

### Task 5: DeliveryBoard — хүргэлтийн даалгавар + HUD

**Files:**
- Create: `src/town/delivery.js`
- Modify: `index.html` (`#deliveryHud`), `src/style.css`
- Modify: `src/town/TownScene.js` (import, NPC action hook, `setupInteractables`, `update`)

**Interfaces:**
- Consumes: `GameState.deliveryDone(onTime)`, `scene.setGoal({x,z})`, `scene.setGoalForChapter()`, `town.npcs[] {name, type, x, z, m}`.
- Produces: `class DeliveryBoard { active: object|null; open(); deliver(npc): boolean; update(dt) }` — `scene.delivery`.

- [ ] **Step 1: HUD элемент + CSS**

`index.html` — `<div id="compass">…</div>` мөрийн дараа:

```html
    <div id="deliveryHud" class="hidden"></div>
```

`src/style.css` — `#compass i { … }` мөрийн дараа:

```css
#deliveryHud { position: absolute; top: 200px; right: 20px; background: var(--card); border: 3px solid #e07a3f; border-radius: 16px; padding: 10px 14px; font-size: 14px; font-weight: 900; box-shadow: var(--shadow); max-width: 46vw; }
#deliveryHud.urgent { border-color: var(--red); animation: urgent .6s infinite alternate; }
@keyframes urgent { from { background: var(--card); } to { background: #ffd9d9; } }
```

- [ ] **Step 2: `src/town/delivery.js` үүсгэх**

```js
// Хүргэлтийн даалгавар: хотын төвийн захиалгын самбараас хугацаатай захиалга авч, NPC-д жимс хүргэнэ.
// Идэвхтэй захиалга session-д л амьдарна (хадгалахгүй).
import * as T from 'three';
import * as P from '../world/props.js';
import { toon, PALETTE } from '../gfx/materials.js';
import { FRUITS } from '../core/content.js';
import { $, modal, closeModal, toast, pop } from '../core/ui.js';

const BOARD = { x: 5, z: -19 };
const MIN_DIST = 25;   // самбараас дор хаяж ийм зайтай NPC л хүлээн авагч болно

export class DeliveryBoard {
  constructor(scene) {
    this.scene = scene; this.state = scene.state;
    this.active = null;   // { npc, type, count, sec, start }
    this.offer = null;    // самбар дээр санал болгож буй захиалга
    this.hud = $('deliveryHud');
    this.setup();
  }

  setup() {
    const { scene, town, interactables } = this.scene;
    P.cyl(toon(PALETTE.woodDark, { key: 'woodD' }), scene, BOARD.x, 1.3, BOARD.z, 0.09, 2.6);
    P.sign(scene, 'ЗАХИАЛГА', BOARD.x, 2.5, BOARD.z, { width: 3.4, bg: '#fff1d6', fg: '#8a4a12', border: '#e07a3f' });
    P.box(toon(0xe07a3f, { key: 'boardOr' }), scene, BOARD.x, 0.9, BOARD.z + 0.16, 0.5, 0.36, 0.06);   // дугтуй
    town.colliders.push({ x: BOARD.x, z: BOARD.z, r: 0.3 });
    interactables.push({ x: BOARD.x, z: BOARD.z, r: 3, label: 'Захиалгын самбар', icon: '📬', action: () => this.open() });
  }

  dist(npc) { return Math.hypot(npc.x - BOARD.x, npc.z - BOARD.z); }

  newOffer() {
    const npcs = this.scene.town.npcs.filter((n) => this.dist(n) >= MIN_DIST);
    const npc = npcs[Math.floor(Math.random() * npcs.length)];
    const type = Math.floor(Math.random() * FRUITS.length);
    const count = Math.random() < 0.6 ? 2 : 3;
    const sec = Math.round(30 + this.dist(npc) * 1.2);
    this.offer = { npc, type, count, sec };
    return this.offer;
  }

  // ---------- Самбарын modal ----------
  open() {
    if (this.active) return this.activeModal();
    if (!this.offer) this.newOffer();
    const o = this.offer, f = FRUITS[o.type], have = this.state.inventory[o.type] || 0, ok = have >= o.count;
    modal(`<div class="eyebrow">ЗАХИАЛГЫН САМБАР</div><h2>Хүргэлтийн даалгавар</h2>
      <div class="npc-head"><div class="reward">${FRUITS[o.npc.type].emoji}</div><div><div class="eyebrow">ХҮЛЭЭН АВАГЧ</div><h2 style="margin:0">${o.npc.name}</h2></div></div>
      <p>«${f.emoji} ${f.name} ×${o.count} хэрэгтэй байна — <b>${o.sec} секунд</b> дотор авчирч өгөөч!»</p>
      <p>Зай: <b>${Math.round(this.dist(o.npc))} м</b> · Хугацаанд нь хүрвэл <b>+30 од</b>, хоцорвол +15 од. Жимсэн машинаар хурдан хүрнэ 🚗</p>
      ${ok ? '' : `<p class="hint">${f.emoji} ${o.count} хэрэгтэй, чамд ${have} байна — цэцэрлэг эсвэл фермээс түүгээд ир.</p>`}
      <div class="row"><button id="dlAccept" class="primary" ${ok ? '' : 'disabled'}>Хүлээн авах</button><button id="dlOther" class="ghost">Өөр захиалга</button><button id="dlClose" class="ghost">Хаах</button></div>`);
    $('dlAccept').onclick = () => this.accept();
    $('dlOther').onclick = () => { this.newOffer(); this.scene.audio.ui(); this.open(); };
    $('dlClose').onclick = () => closeModal();
  }

  activeModal() {
    const a = this.active, f = FRUITS[a.type];
    modal(`<div class="eyebrow">ЗАХИАЛГЫН САМБАР</div><h2>Идэвхтэй хүргэлт</h2><p>${f.emoji} ${f.name} ×${a.count} → <b>${a.npc.name}</b> · үлдсэн <b>${this.fmtLeft()}</b></p><div class="row"><button id="dlCancel">Цуцлах</button><button id="dlClose" class="ghost">Хаах</button></div>`);
    $('dlCancel').onclick = () => { this.finish(); closeModal(); toast('Захиалга цуцлагдлаа', 2000, '📬'); };
    $('dlClose').onclick = () => closeModal();
  }

  accept() {
    const o = this.offer; this.offer = null;
    this.active = { ...o, start: performance.now() };
    closeModal();
    this.scene.setGoal({ x: o.npc.x, z: o.npc.z });
    this.hud.classList.remove('hidden', 'urgent');
    this.scene.audio.ui();
    toast(`Захиалга авлаа! ${o.npc.name} руу алтан тэмдгийг дагаарай`, 3000, '📬');
    this.render();
  }

  elapsed() { return (performance.now() - this.active.start) / 1000; }
  left() { return this.active.sec - this.elapsed(); }
  fmtLeft() { const s = Math.max(0, Math.ceil(this.left())); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

  finish() {
    this.active = null;
    this.hud.classList.add('hidden');
    this.scene.setGoalForChapter();
  }

  // ---------- Хүргэх ----------
  /** NPC-д E дарахад TownScene дуудна. Идэвхтэй захиалгын хүлээн авагч биш бол false (энгийн яриа үргэлжилнэ). */
  deliver(npc) {
    const a = this.active;
    if (!a || a.npc !== npc) return false;
    const sc = this.scene, f = FRUITS[a.type], have = this.state.inventory[a.type] || 0;
    if (have < a.count) {
      sc.audio.wrong();
      modal(`<div class="npc-head"><div class="reward">${FRUITS[npc.type].emoji}</div><div><div class="eyebrow">ХҮРГЭЛТ</div><h2>${npc.name}</h2></div></div><p>«${f.emoji} ${f.name} ${a.count} хэрэгтэй, чамд ${have} л байна. Түүгээд дахин ирээрэй!»</p><div class="row"><button id="dlOk" class="primary">За</button></div>`);
      $('dlOk').onclick = () => closeModal();
      return true;
    }
    const onTime = this.elapsed() <= a.sec;
    this.state.inventory[a.type] -= a.count;
    this.state.deliveryDone(onTime);
    npc.m.cheer(); sc.character.play('wave', 1.1);
    sc.particles.burst(new T.Vector3(npc.x, 1.8, npc.z), 0xffd24d, 26, { speed: 4, up: 4 });
    if (onTime) sc.audio.fanfare(); else sc.audio.correct();
    modal(`<div class="npc-head"><div class="reward">${FRUITS[npc.type].emoji}</div><div><div class="eyebrow">ХҮРГЭЛТ ${onTime ? 'АМЖИЛТТАЙ' : 'ХОЦОРСОН'}</div><h2>${npc.name}</h2></div></div><p>«${onTime ? 'Яг цагтаа! Маш их баярлалаа!' : 'Жаахан хоцорсон ч баярлалаа!'}» ${f.emoji}×${a.count}</p><p><b>+${onTime ? 30 : 15} од ⭐</b></p><div class="row"><button id="dlOk" class="primary">Үргэлжлүүлэх</button></div>`);
    $('dlOk').onclick = () => closeModal();
    this.finish();
    sc.progress('delivery', 1); pop($('starCount')); sc.commit();
    return true;
  }

  // ---------- HUD ----------
  render() {
    const a = this.active, l = this.left();
    this.hud.textContent = `📬 ${a.npc.name} · ${FRUITS[a.type].emoji}×${a.count} · ${this.fmtLeft()}${l < 0 ? ' · хоцорч байна' : ''}`;
    this.hud.classList.toggle('urgent', l <= 10);
  }

  update() { if (this.active) this.render(); }
}
```

- [ ] **Step 3: TownScene-д холбох**

Import:

```js
import { DeliveryBoard } from './delivery.js';
```

`setupInteractables()`: NPC-ийн interactable `action`-ыг солино (`for (const n of town.npcs)` доторх):

```js
      add({ x: n.x, z: n.z, r: 3.6, label: n.name + 'тай ярилцах', icon: FRUITS[n.type].emoji, action: () => {
        this.player.heading = Math.atan2(n.x - this.player.pos.x, n.z - this.player.pos.z);
        if (this.delivery.deliver(n)) return;   // идэвхтэй захиалгын хүлээн авагч бол хүргэлт
        this.character.play('wave', 1.1); n.m.play('wave', 1.4);
        if (!n.talked) { n.talked = true; this.progress('talk', 1); }
        this.talk(n);
      } });
```

Төгсгөлд (`this.fishing = ...` дараа):

```js
    this.delivery = new DeliveryBoard(this);
```

`update(dt)`-д `this.fishing.update(dt);` дараа:

```js
    this.delivery.update(dt);
```

- [ ] **Step 4: Build + гар тест**

Run: `npm run build` → амжилттай.
Browser: усан оргилуурын зүүн урд "ЗАХИАЛГА" самбар; E → захиалга (NPC, жимс×N, секунд, зай); жимс дутуу бол "Хүлээн авах" disabled + hint; "Өөр захиалга" шинэ санал; хүлээн авахад HUD баруун дээд буланд тоолж, алтан тэмдэг NPC дээр, луужин заана; NPC-д E → "+30 од" (хугацаанд) / "+15 од" (хоцорсон, HUD "хоцорч байна"); inventory хасагдсан (цуглуулга); goal бүлгийнхээ рүү буцна; самбар дээр буцаж "Цуцлах" ажиллана; сүүлийн 10 сек HUD улаан анивчина. Захиалгын дараа лабораторид жимсээ зарцуулаад NPC-д очвол "дутуу байна" modal, захиалга хэвээр.

- [ ] **Step 5: Commit**

```bash
git add src/town/delivery.js src/town/TownScene.js index.html src/style.css
git commit -m "Хүргэлтийн даалгавар: хотын төвийн захиалгын самбар, хугацаатай HUD, NPC-д жимс хүргэж од авах"
```

---

### Task 6: README + эцсийн шалгалт

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README шинэчлэх**

"Онцлог" хэсгийн `**Жимсний хот**` мөрийн дараа:

```md
- **Хотын activity** — 🎣 загас барих (сувгийн эрэг, timing), 🌱 миний талбай (үр авах → тарих → услах → хураах, реал цаг), 📬 хүргэлтийн даалгавар (захиалгын самбараас хугацаатай, машинаар хурдан)
```

"Бүтэц" хэсэгт `town/    TownScene.js …` мөрийн дараа:

```
           juice.js     шүүсний лаборатори mini-game
           fishing.js   загас барих (3D timing)
           farm.js      миний талбай (тарих/услах/хураах)
           delivery.js  хүргэлтийн даалгавар + HUD
```

"Ажиллуулах" хэсэгт `npm run preview` мөрийн дараа:

```bash
npm test           # GameState unit test (Vitest)
```

- [ ] **Step 2: Бүх шалгалт**

Run: `npm test` → PASS. Run: `npm run build` → амжилттай.
Browser: хуучин save-тэй (өмнөх session-ий localStorage) ачаалахад алдаагүй; minimap/газрын зурагт 📬 ба 🌱 landmark; өдрийн даалгаварт шинэ id-ууд гарч болно (огнооноос хамаарна).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "README: хотын activity (загас, талбай, хүргэлт), npm test"
```
