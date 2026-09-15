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
    P.box(this.mats.soil, scene, CENTER.x, 0.07, CENTER.z, COLS * STEP + 1.2, 0.14, ROWS * STEP + 1.2);   // дээд тал 0.14 — замын гадаргуу (0.06)-аас дээш, z-fighting гарахгүй
    // Хашаа: хойд, урд, зүүн тал (баруун тал — үрийн савтай орц); самбар урд хашааны гадна
    const fx = CENTER.x - COLS * STEP / 2 - 0.6, fz0 = CENTER.z - ROWS * STEP / 2 - 0.6, fz1 = CENTER.z + ROWS * STEP / 2 + 0.6, fl = COLS * STEP + 1.2;
    P.fence(scene, fx, fz0, fl); P.fence(scene, fx, fz1, fl); P.fence(scene, fx + fl, fz0, fz1 - fz0, 'z');
    town.boxColliders.push({ minX: fx, maxX: fx + fl, minZ: fz0 - 0.2, maxZ: fz0 + 0.2 }, { minX: fx, maxX: fx + fl, minZ: fz1 - 0.2, maxZ: fz1 + 0.2 }, { minX: fx + fl - 0.2, maxX: fx + fl + 0.2, minZ: fz0, maxZ: fz1 });
    P.sign(scene, 'МИНИЙ ТАЛБАЙ', CENTER.x, 2.6, fz0 - 0.5, { width: 4.0, bg: '#fff7d7', fg: '#306e46', border: '#61a148', post: true });
    // Үрийн сав
    P.box(this.mats.crate, scene, CRATE.x, 0.5, CRATE.z, 1.1, 1, 1.1);
    P.box(this.mats.crate, scene, CRATE.x + 0.1, 1.4, CRATE.z - 0.1, 0.9, 0.8, 0.9);
    town.colliders.push({ x: CRATE.x, z: CRATE.z, r: 0.8 });
    interactables.push({ x: CRATE.x, z: CRATE.z, r: 2.2, label: 'Үрийн сав', icon: '📦', action: () => this.seedInfo() });
    // 6 нүх
    for (let i = 0; i < COLS * ROWS; i++) {
      const { x, z } = this.cellPos(i);
      const g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
      const soil = P.box(this.mats.soil, g, 0, 0.14, 0, 1.4, 0.24, 1.4);   // дээд тал 0.26
      const plant = new T.Group(); plant.position.y = 0.12; g.add(plant);
      const ring = P.mesh(new T.TorusGeometry(0.55, 0.04, 6, 24), glow(0x9be36a, 1.4), g, 0, 0.28, 0);
      ring.rotation.x = Math.PI / 2; ring.castShadow = false; ring.visible = false;
      applyCurve(ring.material);
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
      const { g } = this.cells[i];
      this.scene.particles.burst(new T.Vector3(g.position.x, 0.6, g.position.z), 0x9be36a, 10, { speed: 1.5, up: 2, size: 0.18, life: 0.7 });
    }
    const ripe = changed.filter((i) => this.state.farm[i].stage >= GameState.RIPE);
    if (this.scene.started) {
      if (ripe.length) toast(ripe.length === 1 ? `${FRUITS[this.state.farm[ripe[0]].type].name} ургац бэлэн боллоо! Талбай руу яв` : `${ripe.length} нүхний ургац бэлэн боллоо! Талбай руу яв`, 3200, '🌱');
      else toast(changed.length === 1 ? `${FRUITS[this.state.farm[changed[0]].type].name} ургалаа — дахин услаарай` : `${changed.length} нүх ургалаа — дахин услаарай`, 2600, '💧');
      this.scene.audio.pickup(0);
    }
    this.state.save();
  }
}
