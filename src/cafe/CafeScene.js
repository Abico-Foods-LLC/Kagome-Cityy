// «Манго кафе» scene: гал тогоонд алхаж станцууд дээр E (дарах / дараалан дарах / барих), захиалагч mascot-ууд лангуунд, HUD, өдрийн үр дүн.
import * as T from 'three';
import { CafeCore, RECIPES, INGREDIENTS, CHOP_TAPS, PATIENCE } from './CafeCore.js';
import { buildCafeWorld, STATION_POS, ROOM, dishColor } from './cafeWorld.js';
import { createAvatar } from '../world/avatar.js';
import { Mascot } from '../world/mascot.js';
import { Particles } from '../gfx/particles.js';
import { curveTree, toon, glow } from '../gfx/materials.js';
import { Bubbles } from '../world/bubble.js';
import * as P from '../world/props.js';
import { textTexture } from '../gfx/textures.js';
import { $, toast, modal, closeModal, isModalOpen, show } from '../core/ui.js';

const WALK = 5.2, RUN = 8, ACCEL = 34, DECEL = 42;
const ING_COLOR = { carrot: 0xff7f2a, orange: 0xff9a1f, apple: 0xf0464f, grape: 0x8f5cd6, mango: 0xffc02e, tomato: 0xf5453a, broccoli: 0x3ea757, peach: 0xffb0a0 };

export class CafeScene {
  constructor(app) {
    this.app = app; this.state = app.state; this.input = app.input; this.audio = app.audio;
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(50, innerWidth / innerHeight, 0.3, 200);
    this.entered = false; this.clock = 0;
    this.player = { pos: new T.Vector3(0, 0, 1), vel: new T.Vector3(), heading: Math.PI, state: 'idle' };
    this.cam = { yaw: 0, pitch: 0.55, dist: 12 };   // камер урд талаас (лангууны талаас) гал тогоо руу харна
    this.customers = new Map(); this.build();
  }
  build() {
    this.world = buildCafeWorld(this.scene);
    this.particles = new Particles(this.scene, 400);
    this.bubbles = new Bubbles(this.scene, (icon) => this.app.scenes.town.hintTexture(icon));
    this.hint = new T.Sprite(new T.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); this.hint.scale.set(1.3, 1.3, 1); this.hint.visible = false; this.scene.add(this.hint);
    this.handMesh = new T.Group(); this.scene.add(this.handMesh);
    // Станц бүрийн дээр төлөвийн label (text sprite) + тавьсан орцын дүрсүүд
    this.labels = {}; this.itemGroups = {};
    for (const [k, s] of Object.entries(STATION_POS)) {
      const sp = new T.Sprite(new T.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); sp.scale.set(k === 'counter' ? 1.8 : 3.2, k === 'counter' ? 0.52 : 0.94, 1); sp.position.set(s.x, k === 'counter' ? 2.2 : 3.6, s.z - 0.3); sp.visible = false; this.scene.add(sp); this.labels[k] = { sp, text: '' };
      const g = new T.Group(); g.position.set(s.x, 1.05, s.z - 0.3); this.scene.add(g); this.itemGroups[k] = g;
    }
    // Дараагийн алхмыг заах цагираг + сум
    this.guide = new T.Group(); this.scene.add(this.guide);
    const ring = P.mesh(new T.TorusGeometry(1.3, 0.08, 8, 40), glow(0xffe38a, 1.3), this.guide, 0, 0.06, 0); ring.rotation.x = Math.PI / 2; ring.castShadow = false; this.guideRing = ring;
    const arrow = P.mesh(new T.ConeGeometry(0.3, 0.7, 4), glow(0xffe38a, 1.3), this.guide, 0, 3.9, 0); arrow.rotation.x = Math.PI; arrow.castShadow = false; this.guideArrow = arrow;
    this.guide.visible = false;
    this.buildAvatar(this.state.settings.avatar);
    $('cafeExit').onclick = () => this.leave(); $('cafeRecipes').onclick = () => this.recipesModal(); $('cafePrompt').onclick = () => this.pressE();
    this.input.on('interact', () => { if (this.entered) this.pressE(); });
  }
  buildAvatar(kind) {
    if (this.character) this.scene.remove(this.character.root);
    this.character = createAvatar(kind, {}, this.state.wardrobe.equipped);
    this.scene.add(this.character.root); curveTree(this.character.root);
    this.character.onStep = () => this.audio.step(0, true);
  }
  enter() {
    this.entered = true; show('cafeHud', true); show('touchHud', true); document.body.classList.add('cafe');
    this.app.post.setScene(this.scene); this.app.post.setCamera(this.camera); this.resize();
    this.audio.startMusic('town'); this.newDay();
    toast('Захиалагчид лангуунд ирнэ — цэснээс хоолыг нь бэлдэж өг! E: авах/тавих/зүсэх/барих', 4500, '🍳');
  }
  exit() { this.entered = false; show('cafeHud', false); show('touchHud', false); document.body.classList.remove('cafe'); this.audio.stopMusic(); closeModal(); }
  resize() { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); }
  async leave() { await this.app.switchTo('town'); }
  newDay() {
    this.core = new CafeCore();
    for (const c of this.customers.values()) c.m.root.removeFromParent(); this.customers.clear();
    this.player.pos.set(0, 0, 1); this.player.vel.set(0, 0, 0); this.done = false; this.updateHand(); this.updateHud();
  }

  // ---------------------------------------------------------------- E товч
  nearestStation() {
    const p = this.player.pos; let best = null, bd = 2.3;
    for (const [k, s] of Object.entries(STATION_POS)) { const d = Math.hypot(p.x - s.x, p.z - s.z); if (d < bd) { bd = d; best = k; } }
    return best;
  }
  pressE() {
    if (!this.entered || isModalOpen() || this.done) return;
    const st = this.nearestStation(); if (!st) return;
    const c = this.core, h = c.hand;
    if (st === 'fridge') {
      if (h) { toast('Гар дүүрэн байна — эхлээд тавь', 1200, '✋'); this.audio.wrong(); return; }
      const need = c.neededIngredient();
      const id = need || 'carrot';
      c.takeIngredient(id); this.audio.pickup(2); this.updateHand();
      toast(`${INGREDIENTS[id].emoji} ${INGREDIENTS[id].name} авлаа${need ? '' : ' (захиалга алга)'}`, 1200, '🧊');
      return;
    }
    if (st === 'trash') { if (c.trash()) { this.audio.whoosh(); this.updateHand(); } return; }
    const before = JSON.stringify([c.hand, c.st[st]?.state, c.st[st]?.taps]);
    const ok = c.act(st);
    if (!ok) { this.audio.wrong(); this.hintWhy(st); return; }
    if (JSON.stringify([c.hand, c.st[st]?.state, c.st[st]?.taps]) !== before) this.audio.ui();
    this.applyEvents(); this.updateHand();
  }
  hintWhy(st) {
    const c = this.core, h = c.hand;
    if (c.events.some((e) => e.t === 'nofit')) { c.events = c.events.filter((e) => e.t !== 'nofit'); toast('Энэ орц энд таарахгүй — 📖 жор хар', 1500, '🤔'); return; }
    const msg = st === 'counter' ? (h?.kind === 'dish' ? 'Энэ хоолыг хэн ч захиалаагүй' : 'Гартаа бэлэн хоол байхгүй') : st === 'chop' ? (h ? 'Самбар дүүрэн' : 'Зүсэх орц тавь') : st === 'plate' ? 'Зүссэн орцоо энд тавь' : (st === 'stove' || st === 'oven') ? (h ? 'Эхлээд зүс (самбар дээр)' : 'Хүлээж байна…') : 'Орц тавиад E барь';
    toast(msg, 1300, '💡');
  }

  // ---------------------------------------------------------------- Update
  update(dt) {
    if (!this.entered) return;
    this.clock += dt; const t = this.clock;
    const active = !isModalOpen(), input = this.input, P = this.player, c = this.core;
    if (active) { this.cam.yaw = T.MathUtils.clamp(this.cam.yaw - input.look.dx * 0.6, -0.7, 0.7); this.cam.pitch = T.MathUtils.clamp(this.cam.pitch + input.look.dy * 0.6, 0.35, 1.1); }
    const axis = active && !this.done ? input.axis() : { x: 0, y: 0 }, len = Math.hypot(axis.x, axis.y);
    const run = active && (input.held('run') || (input.isTouch && len > 0.92));
    let wx = 0, wz = 0;
    if (len > 0.05) { wx = axis.x * Math.cos(this.cam.yaw) + axis.y * Math.sin(this.cam.yaw); wz = -axis.x * Math.sin(this.cam.yaw) + axis.y * Math.cos(this.cam.yaw); const l = Math.hypot(wx, wz); wx /= l; wz /= l; }
    const maxSpeed = run ? RUN : WALK, want = Math.min(1, len) * maxSpeed, ka = Math.min(1, (len > 0.05 ? ACCEL : DECEL) * dt / maxSpeed * 2.2);
    P.vel.x += (wx * want - P.vel.x) * ka; P.vel.z += (wz * want - P.vel.z) * ka;
    P.pos.x = T.MathUtils.clamp(P.pos.x + P.vel.x * dt, ROOM.minX, ROOM.maxX); P.pos.z = T.MathUtils.clamp(P.pos.z + P.vel.z * dt, ROOM.minZ, ROOM.maxZ);
    const sp = Math.hypot(P.vel.x, P.vel.z);
    const st = this.nearestStation();
    if (sp > 0.4) { const h = Math.atan2(P.vel.x, P.vel.z); P.heading += Math.atan2(Math.sin(h - P.heading), Math.cos(h - P.heading)) * Math.min(1, dt * 12); }
    else if (st) { const s = STATION_POS[st], h = Math.atan2(s.x - P.pos.x, s.z - P.pos.z); P.heading += Math.atan2(Math.sin(h - P.heading), Math.cos(h - P.heading)) * Math.min(1, dt * 8); }
    P.state = sp > 0.4 ? (sp > WALK + 0.6 ? 'run' : 'walk') : 'idle';
    // E барих: шахагч/блендер
    if (active && st && (st === 'juicer' || st === 'blender') && input.held('interact')) { if (c.holdTick(st, dt)) { this.holdFx(st, dt); } }
    c.tick(dt); this.applyEvents();
    this.character.update(dt, { state: P.state, speed: sp / RUN, lookAt: st ? new T.Vector3(STATION_POS[st].x, 1, STATION_POS[st].z) : null });
    this.character.root.position.copy(P.pos); this.character.root.rotation.y = P.heading;
    this.handMesh.position.set(P.pos.x, 2.5 + Math.sin(t * 4) * 0.05, P.pos.z); this.handMesh.rotation.y = t;
    // Станцын анимаци
    const W = this.world.stations;
    W.juicer.userData.spin.rotation.z += dt * (c.st.juicer.state === 'working' ? 12 : 0);
    W.blender.userData.jar.material.color.setHex(c.st.blender.items.length ? 0xffd27a : 0xc8f0ff);
    W.stove.userData.flame.visible = c.st.stove.state === 'working' || c.st.stove.state === 'ready'; W.stove.userData.flame.scale.y = 0.12 + Math.abs(Math.sin(t * 9)) * 0.08;
    W.oven.userData.glow.visible = c.st.oven.state === 'working' || c.st.oven.state === 'ready';
    if (c.st.stove.state === 'working' && Math.random() < dt * 6) this.particles.sparkle(new T.Vector3(STATION_POS.stove.x - 0.6, 1.9, STATION_POS.stove.z - 0.3), 0xffffff);
    if (c.st.chop.state === 'working') W.chop.userData.knife.position.y = 1.05 + Math.abs(Math.sin(t * 14)) * 0.1;
    // Захиалагчид
    this.updateCustomers(dt);
    this.labelT = (this.labelT || 0) + dt; if (this.labelT > 0.15) { this.labelT = 0; this.updateLabels(); }
    this.updateGuide(dt);
    // Hint sprite: ойрын станц
    if (st && !this.done) { const s = STATION_POS[st]; this.hint.visible = true; this.hint.material.map = this.app.scenes.town.hintTexture(s.icon); this.hint.material.needsUpdate = true; this.hint.position.set(s.x, 2.6 + Math.sin(t * 4) * 0.1, s.z); $('cafePrompt').querySelector('span').textContent = this.promptFor(st); $('cafePrompt').classList.add('on'); }
    else { this.hint.visible = false; $('cafePrompt').classList.remove('on'); }
    // Камер
    const h = Math.sin(this.cam.pitch) * this.cam.dist, r = Math.cos(this.cam.pitch) * this.cam.dist;
    const desired = new T.Vector3(P.pos.x * 0.6 + Math.sin(this.cam.yaw) * r, 1.6 + h, P.pos.z * 0.6 + Math.cos(this.cam.yaw) * r);
    this.camera.position.lerp(desired, Math.min(1, dt * 6)); this.camera.lookAt(P.pos.x * 0.6, 1.0, P.pos.z * 0.6);
    this.particles.update(dt, this.camera); this.bubbles.update(dt);
    this.hudT = (this.hudT || 0) + dt; if (this.hudT > 0.15) { this.hudT = 0; this.updateHud(); }
  }
  /** Станц бүрийн төлөвийн текст (label) */
  stationText(st) {
    const c = this.core, s = c.st[st], E = (i) => INGREDIENTS[i.id].emoji;
    if (st === 'fridge') { const n = c.neededIngredient(); return n ? `Дараах: ${INGREDIENTS[n].emoji} ${INGREDIENTS[n].name}` : ''; }
    if (st === 'counter') return c.queue.length ? `${c.queue.map((q) => RECIPES[q.recipe].emoji).join(' ')} хүлээж байна` : '';
    if (st === 'trash') return '';
    const bar = (k) => { const n = Math.round(k * 8); return '▓'.repeat(n) + '░'.repeat(8 - n); };
    if (st === 'chop') return s.state === 'working' ? `🔪 Зүсэж байна ${s.taps}/${CHOP_TAPS} — E дар!` : s.state === 'ready' ? `✅ Зүссэн ${E(s.items[0])} — авах` : '';
    if (st === 'juicer' || st === 'blender') { if (s.state === 'ready') return `✅ ${RECIPES[s.recipe].emoji} Бэлэн — авах`; if (s.items.length) { const r = this.recipeFor(st, s.items); return `${s.items.map(E).join('+')}${r ? ' — E барь ' + bar(s.progress) : ' + ' + this.missingFor(st, s.items)}`; } return ''; }
    if (st === 'stove' || st === 'oven') { if (s.state === 'burnt') return '🔥 Түлэгдлээ… авч хая'; if (s.state === 'ready') return `✅ ${RECIPES[s.recipe].emoji} Бэлэн — хурдан ав!`; if (s.state === 'working') return `${RECIPES[s.recipe].emoji} Болж байна ${bar(s.progress)}`; if (s.items.length) return `${s.items.map(E).join('+')} + ${this.missingFor(st, s.items)}`; return ''; }
    if (st === 'plate') { if (s.state === 'ready') return `✅ ${RECIPES[s.recipe].emoji} Бэлэн — авах`; if (s.items.length) return `${s.items.map(E).join('+')} + ${this.missingFor('chop', s.items)}`; return ''; }
    return '';
  }
  recipeFor(station, items) { return this.core.matchRecipe(station, items); }
  /** Тухайн станцад тавьсан орцоор бүтэх жорын дутуу орц */
  missingFor(station, items) {
    const ids = items.map((i) => i.id);
    for (const r of Object.values(RECIPES)) if (r.station === station && ids.every((i) => r.items.includes(i))) { const miss = r.items.filter((i) => !ids.includes(i)); return miss.length ? miss.map((i) => INGREDIENTS[i].emoji).join('') + ' дутуу' : ''; }
    return '❓ буруу орц — хая';
  }
  updateLabels() {
    const c = this.core;
    for (const [k, L] of Object.entries(this.labels)) {
      const text = this.stationText(k);
      if (text !== L.text) { L.text = text; if (text) { L.sp.material.map?.dispose(); L.sp.material.map = textTexture(text, { bg: 'rgba(255,255,255,0.94)', fg: '#1e6b45', font: '800 76px Arial, sans-serif', w: 1024, h: 300, radius: 60 }); L.sp.material.needsUpdate = true; } L.sp.visible = !!text; }
      // Тавьсан орцын дүрс
      const g = this.itemGroups[k], items = c.st[k]?.items || [];
      if (g.userData.n !== items.length || g.userData.sig !== items.map((i) => i.id + i.kind).join()) {
        g.userData.n = items.length; g.userData.sig = items.map((i) => i.id + i.kind).join(); while (g.children.length) g.children[0].removeFromParent();
        items.forEach((it, i) => { const x = (i - (items.length - 1) / 2) * 0.45; P.sphere(toon(ING_COLOR[it.id], { key: 'cafeIng_' + it.id }), g, x, 0.18, 0, it.kind === 'prep' ? 0.16 : 0.22); if (it.kind === 'prep') P.sphere(toon(ING_COLOR[it.id], { key: 'cafeIng_' + it.id }), g, x + 0.2, 0.12, 0.15, 0.1); });
      }
    }
  }
  /** Дараа нь очих станц: гарт юу байгаагаас + станцын төлөвөөс */
  nextStation() {
    const c = this.core, h = c.hand, q = c.queue[0];
    if (h?.kind === 'dish') return 'counter';
    if (h?.kind === 'ing') { const r = q ? RECIPES[q.recipe] : null; if (r && (r.prep === 'chop' || r.station === 'chop')) return 'chop'; return r ? r.station : 'chop'; }
    if (h?.kind === 'prep') { const r = q ? RECIPES[q.recipe] : null; return r ? (r.station === 'chop' ? 'plate' : r.station) : 'plate'; }
    for (const k of ['stove', 'oven', 'juicer', 'blender', 'plate', 'chop']) if (c.st[k].state === 'ready' || c.st[k].state === 'burnt') return k;
    if (c.st.chop.state === 'working') return 'chop';
    for (const k of ['juicer', 'blender']) if (c.st[k].items.length && this.recipeFor(k, c.st[k].items)) return k;
    return q ? 'fridge' : null;
  }
  updateGuide(dt) {
    const st = this.nextStation();
    this.guide.visible = !!st && !this.done;
    if (!st) return;
    const s = STATION_POS[st]; this.guide.position.set(s.x, 0, s.z + (st === 'counter' ? 0 : -0.3));
    this.guideArrow.position.y = 3.9 + Math.sin(this.clock * 5) * 0.2; this.guideRing.scale.setScalar(1 + Math.sin(this.clock * 4) * 0.06);
    $('cafeNext').textContent = `➡ ${s.icon} ${s.label}`;
  }
  promptFor(st) {
    const c = this.core, h = c.hand, s = c.st[st], S = STATION_POS[st];
    if (st === 'fridge') { const n = c.neededIngredient(); return h ? 'Гар дүүрэн' : n ? `${INGREDIENTS[n].emoji} ${INGREDIENTS[n].name} авах` : 'Орц авах'; }
    if (st === 'trash') return h ? 'Хаях' : S.label;
    if (st === 'counter') return h?.kind === 'dish' ? `${RECIPES[h.recipe].emoji} Өгөх` : 'Лангуу — хоолоо авчир';
    if (st === 'chop') return s.state === 'working' ? `Зүс! E дар (${s.taps}/${CHOP_TAPS})` : s.state === 'ready' ? 'Зүссэнийг авах' : h?.kind === 'ing' ? 'Самбарт тавих' : 'Зүсэх самбар';
    if (st === 'juicer' || st === 'blender') return s.state === 'ready' ? `${RECIPES[s.recipe].emoji} Авах` : h?.kind === 'ing' ? 'Орц хийх' : s.items.length ? 'E барь — ажиллуулна' : S.label;
    if (st === 'stove' || st === 'oven') return s.state === 'ready' ? `${RECIPES[s.recipe].emoji} Бэлэн — авах!` : s.state === 'burnt' ? 'Түлэгдлээ… авах' : s.state === 'working' ? `Болж байна ${Math.round(s.progress * 100)}%` : h ? 'Зүссэн орц хийх' : S.label;
    if (st === 'plate') return s.state === 'ready' ? `${RECIPES[s.recipe].emoji} Авах` : h ? 'Тавагт тавих' : S.label;
    return S.label;
  }
  holdFx(st, dt) { const s = STATION_POS[st]; if (Math.random() < dt * 20) this.particles.burst(new T.Vector3(s.x + (Math.random() - 0.5) * 0.5, 1.9, s.z - 0.3), st === 'juicer' ? 0xff9a1f : 0xffc02e, 1, { speed: 1, up: 1, size: 0.08, life: 0.4, gravity: 3 }); if (Math.random() < dt * 8) this.audio.tone({ f: 180 + Math.random() * 40, type: 'sawtooth', dur: 0.1, vol: 0.03 }); }

  // ---------------------------------------------------------------- Захиалагчид
  updateCustomers(dt) {
    const c = this.core, spots = this.world.queueSpots;
    c.queue.forEach((q, i) => {
      let v = this.customers.get(q.id);
      if (!v) { const m = new Mascot({ kind: q.kind, scale: 0.9 }); m.root.position.set(spots[i].x, 0, 11); this.scene.add(m.root); curveTree(m.root); v = { m, q }; this.customers.set(q.id, v); this.bubbles.showText(m.root, `${RECIPES[q.recipe].emoji} ${RECIPES[q.recipe].name}!`, { dur: 3 }); }
      const target = spots[i], r = v.m.root; r.position.x += (target.x - r.position.x) * Math.min(1, dt * 3); r.position.z += (target.z - r.position.z) * Math.min(1, dt * 3);
      r.rotation.y = Math.PI; const moving = Math.abs(target.z - r.position.z) > 0.1;
      v.m.update(dt, { state: moving ? 'walk' : 'idle', speed: moving ? 0.4 : 0, lookAt: new T.Vector3(this.player.pos.x, 1.4, this.player.pos.z) });
      const k = q.patience / PATIENCE; if (k < 0.35) v.m.setMood('hurt', 0.3); else if (k < 0.7) v.m.setMood('surprised', 0.3);
      v.bubbleT = (v.bubbleT || 0) + dt; if (v.bubbleT > 6) { v.bubbleT = 0; this.bubbles.show(r, RECIPES[q.recipe].emoji, { dur: 2 }); }
    });
  }
  applyEvents() {
    const c = this.core, ev = c.events; c.events = [];
    for (const e of ev) {
      switch (e.t) {
        case 'customer': this.audio.ui(); break;
        case 'leave': { const v = this.customers.get(e.id); if (v) { v.m.setMood('hurt', 2); const r = v.m.root; const iv = setInterval(() => { r.position.z += 0.12; if (r.position.z > 12) { clearInterval(iv); r.removeFromParent(); } }, 30); this.customers.delete(e.id); } this.audio.wrong(); toast('Захиалагч хүлээж чадсангүй… 😢', 1600, '💔'); break; }
        case 'served': { const v = this.customers.get(e.id); if (v) { v.m.cheer(); this.bubbles.show(v.m.root, e.burnt ? '😕' : '❤️', { dur: 1.6 }); const r = v.m.root; setTimeout(() => { const iv = setInterval(() => { r.position.z += 0.12; if (r.position.z > 12) { clearInterval(iv); r.removeFromParent(); } }, 30); }, 900); this.customers.delete(e.id); } this.audio.correct(); this.particles.burst(new T.Vector3(STATION_POS.counter.x, 1.6, STATION_POS.counter.z), 0xffd24d, 14, { speed: 2.5, up: 3, size: 0.16, life: 0.8 }); toast(`+${e.gain} зоос${e.tip ? ` (цайны мөнгө +${e.tip})` : ''}${e.burnt ? ' — түлэгдсэн байсан' : ''}`, 1800, e.burnt ? '😕' : '🧃'); break; }
        case 'wrong': toast('Энэ хоолыг хэн ч захиалаагүй байна', 1400, '🤔'); break;
        case 'ready': { const s = STATION_POS[e.station]; this.audio.tone({ f: 880, f2: 1320, type: 'sine', dur: 0.2, vol: 0.08 }); this.particles.burst(new T.Vector3(s.x, 1.8, s.z - 0.3), 0x9df5b3, 10, { speed: 2, up: 2, size: 0.14, life: 0.6 }); break; }
        case 'burnt': { const s = STATION_POS[e.station]; this.audio.hurt(); this.particles.burst(new T.Vector3(s.x, 1.8, s.z - 0.3), 0x444444, 12, { speed: 1, up: 2.5, size: 0.2, life: 1.2, gravity: -1 }); toast('Түлэгдлээ! Цаг тухайд нь ав', 1600, '🔥'); break; }
        case 'chop': this.audio.tone({ f: 300, f2: 200, type: 'square', dur: 0.05, vol: 0.06 }); this.audio.noise({ dur: 0.04, vol: 0.05, hp: 1500 }); this.particles.burst(new T.Vector3(STATION_POS.chop.x, 1.2, STATION_POS.chop.z - 0.3), 0xffe7b0, 3, { speed: 1.2, up: 1.2, size: 0.07, life: 0.35, gravity: 5 }); break;
        case 'put': this.audio.tone({ f: 500, f2: 400, type: 'triangle', dur: 0.06, vol: 0.05 }); break;
        case 'over': this.dayOver(e); break;
      }
    }
  }
  /** Гарт байгаа зүйлийг толгой дээр харуулна */
  updateHand() {
    const h = this.core.hand; while (this.handMesh.children.length) this.handMesh.children[0].removeFromParent();
    const badge = $('cafeHand');
    if (!h) { badge.classList.add('hidden'); return; }
    const txt = h.kind === 'dish' ? `${RECIPES[h.recipe].emoji} ${RECIPES[h.recipe].name}${h.burnt ? ' (түлэгдсэн)' : ''}` : `${INGREDIENTS[h.id].emoji} ${INGREDIENTS[h.id].name}${h.kind === 'prep' ? ' (зүссэн)' : ''}`;
    badge.textContent = 'Гарт: ' + txt; badge.classList.remove('hidden');
    const lbl = new T.Sprite(new T.SpriteMaterial({ map: textTexture(txt, { bg: 'rgba(255,255,255,0.94)', fg: '#c8641c', font: '800 60px Arial, sans-serif', w: 1024, h: 300, radius: 60 }), transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); lbl.scale.set(2.4, 0.7, 1); lbl.position.y = 0.7; this.handMesh.add(lbl);
    if (h.kind === 'dish') { const r = RECIPES[h.recipe]; P.mesh(new T.CylinderGeometry(0.4, 0.4, 0.04, 16), toon(0xffffff, { key: 'cafePlate' }), this.handMesh, 0, 0, 0); P.sphere(toon(h.burnt ? 0x444444 : dishColor[h.recipe], { key: 'cafeDish' + (h.burnt ? 'B' : h.recipe) }), this.handMesh, 0, 0.18, 0, 0.3, 0.2, 0.3); this.bubbles.show(this.character.root, r.emoji, { dur: 1.2 }); }
    else { P.sphere(toon(ING_COLOR[h.id], { key: 'cafeIng_' + h.id }), this.handMesh, 0, 0, 0, h.kind === 'prep' ? 0.18 : 0.26); if (h.kind === 'prep') for (const s of [-1, 1]) P.sphere(toon(ING_COLOR[h.id], { key: 'cafeIng_' + h.id }), this.handMesh, s * 0.28, 0, 0, 0.14); }
  }
  updateHud() {
    const c = this.core; if (!c) return;
    $('cafeCoins').textContent = c.coins; $('cafeServed').textContent = `${c.served}/8`; $('cafeTime').textContent = `${Math.floor(c.time / 60)}:${String(Math.floor(c.time % 60)).padStart(2, '0')}`;
    $('cafeOrders').innerHTML = c.queue.map((q) => `<div class="ord"><span>${RECIPES[q.recipe].emoji}</span><b>${RECIPES[q.recipe].name}</b><small>${RECIPES[q.recipe].items.map((i) => INGREDIENTS[i].emoji).join(' ')} → ${RECIPES[q.recipe].prep ? '🔪 → ' : ''}${STATION_POS[RECIPES[q.recipe].station].icon}</small><i style="width:${Math.max(0, q.patience / PATIENCE * 100)}%"></i></div>`).join('') || '<div class="ord empty">Захиалагч хүлээж байна…</div>';
  }
  recipesModal() {
    modal(`<div class="eyebrow">МАНГО КАФЕ</div><h2>📖 Жорын ном</h2><div class="recipes">${Object.values(RECIPES).map((r) => `<div><b>${r.emoji} ${r.name}</b> · ${r.price} зоос<br><small>${r.items.map((i) => INGREDIENTS[i].emoji + ' ' + INGREDIENTS[i].name).join(' + ')} → ${r.prep ? '🔪 зүсэх → ' : ''}${STATION_POS[r.station].icon} ${STATION_POS[r.station].label}${r.station === 'chop' ? ' → 🍽️ таваг' : ''}</small></div>`).join('')}</div><p class="hint">🧊 хөргөгч орц өгнө · 🔪 E дараалан дар · 🧃🥤 E барь · 🍲🍕 4с болно, 6с-д авахгүй бол түлэгдэнэ · 🛎️ лангуунд өг</p><div class="row"><button id="rClose" class="primary">Ойлголоо</button></div>`);
    $('rClose').onclick = closeModal;
  }
  dayOver(r) {
    this.done = true; const st = this.state;
    st.stars += r.stars; st.cafe = { best: Math.max(st.cafe?.best || 0, r.score), days: (st.cafe?.days || 0) + 1 }; st.save();
    this.audio.fanfare(); this.character.cheer?.(); this.app.scenes.town.feat?.(`кафед ${r.served} захиалга биелүүлж ${r.score} зоос олов!`, '🍳');
    setTimeout(() => { modal(`<div class="reward">🍳</div><h2>Өдөр дууслаа!</h2><p>Захиалга <b>${r.served}/8</b> · Явсан <b>${r.failed}</b> · Цайны мөнгө <b>${r.tips}</b> · Оноо <b>${r.score}</b> · ⭐ <b>+${r.stars}</b> од</p><p class="hint">Рекорд: ${st.cafe.best} оноо</p><div class="row"><button id="cafeAgain" class="primary">🔁 Дахин</button><button id="cafeHome" class="ghost">🏠 Хот руу</button></div>`, { closable: false }); $('cafeAgain').onclick = () => { closeModal(); this.newDay(); }; $('cafeHome').onclick = () => { closeModal(); this.leave(); }; }, 800);
  }
  render() { this.app.post.setFocus(this.camera.position.distanceTo(this.player.pos) + 1); this.app.post.render(); }
}
