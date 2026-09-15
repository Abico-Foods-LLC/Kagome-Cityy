// Жимсний хот: нээлттэй ертөнцийн gameplay — хөдөлгөөн, камер, машин, харилцаа, аялал, HUD.
import * as T from 'three';
import { createSky, createClouds, updateClouds } from '../gfx/sky.js';
import { Particles } from '../gfx/particles.js';
import { createSunFlare, createRain, updateRain, createRainbow, updateRainbow, createLeaves, updateLeaves, createButterflies, updateButterflies, createBirds, updateBirds } from '../gfx/effects.js';
import { glow, toon, PALETTE, curveTree } from '../gfx/materials.js';
import { buildTown, makeBlocked, ISLAND, CANAL, BRIDGES_Z } from '../world/town.js';
import { createAvatar, AVATARS } from '../world/avatar.js';
import { Mascot, MASCOTS, ACCESSORIES } from '../world/mascot.js';
import { JuiceGame } from './juice.js';
import { FarmPlot } from './farm.js';
import { FishingGame } from './fishing.js';
import { DeliveryBoard } from './delivery.js';
import { Dog, createDuck, updateDuck, createCat, updateCat } from '../world/animals.js';
import * as P from '../world/props.js';
import { bulbMaterial } from '../world/props.js';
import { FRUITS, PRODUCTS, CHAPTERS, QUESTIONS, LANDMARKS } from '../core/content.js';
import { $, toast, modal, closeModal, isModalOpen, show, pop, fmt } from '../core/ui.js';

const WALK = 5.6, RUN = 9.4, SWIM = 3.2, ROLL_SPEED = 12, ROLL_DUR = 0.45, ACCEL = 34, DECEL = 42, AIR_CTRL = 0.45, GRAVITY = 24, JUMP_V = 8.6, COYOTE = 0.12, BUFFER = 0.14;
const DAY_LENGTH = 540; // секунд — бүтэн өдөр

export class TownScene {
  constructor(app) {
    this.app = app;
    this.state = app.state;
    this.input = app.input;
    this.audio = app.audio;
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(55, innerWidth / innerHeight, 0.5, 700);   // near 0.5 → depth нарийвчлал сайн, z-fighting бага
    this.clock = 0;
    this.dayTime = 0.38; // 0..1 (0.25 = нар мандах, 0.5 = үд)
    this.started = false;
    this.active = false;
    this.vehicle = null;
    this.near = null;
    this.goal = null;
    this.interactables = [];
    this.cam = { yaw: 0.35, pitch: 0.42, dist: 9.5, targetDist: 9.5, shake: 0, fov: 55, intro: 0 };
    this.player = { pos: new T.Vector3(0, 0, 26), vel: new T.Vector3(), yVel: 0, y: 0, visualY: 0, grounded: true, coyote: 0, buffer: 0, jumps: 0, rollT: 0, wasWater: false, heading: Math.PI, state: 'idle', stepI: 0 };
    this.car = { speed: 0, steer: 0, heading: -0.5, roll: 0, pitch: 0, bounce: 0, lastPos: new T.Vector3() };
    this.wheelSpin = 0;
    this.build();
  }

  // ---------------------------------------------------------------- Барих
  build() {
    const { scene } = this;
    scene.fog = new T.Fog(0xbfe9f5, 90, 260);
    const sky = createSky();
    scene.add(sky.mesh); this.sky = sky;
    this.clouds = createClouds(16, { spread: 200, height: 42, seed: 3 });
    scene.add(this.clouds);

    this.hemi = new T.HemisphereLight(0xdff6ff, 0x7fa85a, 0.75);
    scene.add(this.hemi);
    this.sun = new T.DirectionalLight(0xfff1cf, 1.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 180 });
    this.sun.shadow.normalBias = 0.06;
    this.sun.shadow.bias = -0.0005;
    scene.add(this.sun, this.sun.target);

    this.town = buildTown(scene, { textures: this.app.productTextures });
    this.blocked = makeBlocked(this.town);
    this.blockedCam = makeBlocked(this.town, { terrain: false });   // камер ус, арлын ирмэг дээгүүр гарч болно

    this.buildAvatar(this.state.settings.avatar);

    this.particles = new Particles(scene, 500);

    // ---- Атмосферийн эффектүүд ----
    this.flare = createSunFlare(); scene.add(this.flare);
    this.rain = createRain(900); scene.add(this.rain);
    this.rainbow = createRainbow(130); scene.add(this.rainbow);
    this.leaves = createLeaves(60, { colors: [0xffb3c6, 0xfff0a8, 0xb8ec9a], area: 44 }); scene.add(this.leaves);
    this.butterflies = createButterflies(this.town.flowerSpots, 14); scene.add(this.butterflies);
    this.birds = createBirds(7); scene.add(this.birds);
    this.weather = { rain: 0, target: 0, timer: 90 + Math.random() * 120, rainbow: 0 };

    // Харилцах зүйлийн дээр хөвөх icon
    this.hintSprites = new Map();
    this.hint = new T.Sprite(new T.SpriteMaterial({ transparent: true, depthWrite: false, toneMapped: false }));
    this.hint.scale.set(1.3, 1.3, 1); this.hint.visible = false; this.hint.userData.noCurve = true;
    scene.add(this.hint);
    // Усны цагираг pool
    this.rings = [];
    const ringGeo = new T.RingGeometry(0.6, 0.72, 32);
    for (let i = 0; i < 10; i++) { const m = new T.Mesh(ringGeo, new T.MeshBasicMaterial({ color: 0xe8fbff, transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); this.rings.push({ m, t: 1 }); }
    this.ringTimer = 0;
    // Хотын иргэд: замаар алхдаг mascot-ууд
    this.buildCitizens();
    this.buildAnimals();
    this.snow = createRain(700, { area: 50, height: 22, snow: true }); scene.add(this.snow);
    this.season = -1;

    // Зорилгын тэмдэг
    const g = new T.Group();
    g.name = 'Goal';
    const ring = new T.Mesh(new T.TorusGeometry(1.2, 0.1, 8, 32), glow(0xffe672, 1.5)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.15;
    const arrow = new T.Mesh(new T.ConeGeometry(0.55, 1.1, 6), glow(0xffe672, 1.5)); arrow.rotation.z = Math.PI; arrow.position.y = 5;
    const beam = new T.Mesh(new T.CylinderGeometry(0.08, 0.5, 30, 8, 1, true), new T.MeshBasicMaterial({ color: 0xffe672, transparent: true, opacity: 0.12, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
    beam.position.y = 15;
    g.add(ring, arrow, beam); g.visible = false;
    scene.add(g); this.goalMarker = g;

    this.setupInteractables();
    this.setupUI();
    this.updateHUD();
    this.setGoalForChapter();
    this.sky.mesh.userData.noCurve = true;
    curveTree(scene);
  }

  /** Дүрийг (дахин) үүсгэнэ — тоглогч болон машины жолооч хоёулаа */
  buildAvatar(kind) {
    const prevVisible = this.character ? this.character.root.visible : true;
    if (this.character) this.scene.remove(this.character.root);
    if (this.driver) this.driver.root.removeFromParent();
    this.character = createAvatar(kind, {}, this.state.wardrobe.equipped);
    this.character.root.position.set(this.player.pos.x, this.player.visualY || 0, this.player.pos.z);
    this.character.root.rotation.y = this.player.heading;
    this.character.root.visible = prevVisible;
    this.scene.add(this.character.root);
    this.character.onStep = () => {
      if (this.vehicle) return;
      const p = this.player.pos, onBridge = Math.abs(p.x - CANAL.x) < 7 && BRIDGES_Z.some((b) => Math.abs(p.z - b) < 5);
      this.audio.step(this.player.stepI++, onBridge);
      if (!onBridge) this.particles.dust(p, this.player.state === 'run' ? 2 : 1);
    };
    // Жолооч — машинд суух үед харагдах хуулбар
    this.driver = createAvatar(kind, { scale: 0.72 }, this.state.wardrobe.equipped);
    this.driver.root.position.set(0, 1.42, 0.45);
    this.driver.root.rotation.y = Math.PI;
    this.driver.root.visible = !!this.vehicle;
    this.town.car.userData.chassis.add(this.driver.root);
    curveTree(this.character.root); curveTree(this.driver.root);
  }

  /** Дүр сонгох цонх */
  pickAvatar(onDone) {
    const cur = this.state.settings.avatar;
    modal(`<div class="eyebrow">ДҮРЭЭ СОНГО</div><h2>Хэн болж аялах вэ?</h2><div class="avatars">${Object.entries(AVATARS).map(([k, a]) => `<button data-avatar="${k}" class="${k === cur ? 'active' : ''}"><span>${a.emoji}</span><small>${a.name}</small></button>`).join('')}</div><div class="row"><button class="primary" id="avOk">Болно →</button></div>`, { closable: !!onDone });
    document.querySelectorAll('[data-avatar]').forEach((b) => b.onclick = () => {
      document.querySelectorAll('[data-avatar]').forEach((x) => x.classList.remove('active')); b.classList.add('active');
      this.audio.ui();
      this.app.setAvatar(b.dataset.avatar);
      this.character.cheer();
    });
    $('avOk').onclick = () => { closeModal(); onDone?.(); };
  }

  buildCitizens() {
    // Замын сүлжээний зангилаанууд ба холбоосууд
    const N = { m0: [0, -60], m1: [0, -34], m2: [0, 1], m3: [0, 31], m4: [0, 40], w1: [-50, -34], e1: [50, -34], w2: [-50, 1], e2: [50, 1], w3: [-48, 31], e3: [48, 31] };
    const E = { m0: ['m1'], m1: ['m0', 'm2', 'w1', 'e1'], m2: ['m1', 'm3', 'w2', 'e2'], m3: ['m2', 'm4', 'w3', 'e3'], m4: ['m3'], w1: ['m1'], e1: ['m1'], w2: ['m2'], e2: ['m2'], w3: ['m3'], e3: ['m3'] };
    this.citizens = [];
    const kinds = ['peach', 'mushroom', 'pumpkin', 'grape', 'orange', 'shiitake'];
    kinds.forEach((kind, i) => {
      const m = new Mascot({ kind, scale: 0.9 });
      m.wear({ hat: ['straw', 'flower', null, 'cap', null, 'party'][i] });
      const start = ['m2', 'm1', 'm3', 'w2', 'e2', 'm2'][i];
      const [x, z] = N[start];
      m.root.position.set(x + (i % 2 ? 2.5 : -2.5), 0, z + (i % 3) * 1.5);
      this.scene.add(m.root);
      this.citizens.push({ m, node: start, next: null, target: null, wait: i * 1.5, heading: 0, lane: (i % 2 ? 2.5 : -2.5) });
    });
    this.roadNodes = N; this.roadEdges = E;
  }

  buildAnimals() {
    const { scene, town } = this;
    // Нохой — усан оргилуурын дэргэд; E дарвал дагана
    this.dog = new Dog(0xf2c58a);
    this.dog.root.position.set(5, 0, -9); this.dog.heading = -1;
    scene.add(this.dog.root);
    this.interactables.push({ x: 5, z: -9, r: 3, label: this.state.pet ? 'Луувсайг илэх' : 'Луувсайг дагуулах', icon: '🐶', dynamic: () => this.dog.root.position, action: () => {
      if (!this.state.pet) { this.state.pet = true; this.state.save(); toast('Луувсай одооноос чамайг дагана! 🐾', 3000, '🐶'); this.character.cheer(); this.interactables.find((i) => i.icon === '🐶').label = 'Луувсайг илэх'; }
      else { this.character.play('pick', 0.8); this.dog.happy = 2; this.particles.burst(this.dog.root.position.clone().add(new T.Vector3(0, 0.8, 0)), 0xffa7c0, 8, { speed: 1.5, up: 2, size: 0.15, life: 0.7 }); this.audio.tone({ f: 880, f2: 1400, type: 'sine', dur: 0.15, vol: 0.08 }); }
      this.audio.ui();
    } });
    // Нугас — сувагт
    this.ducks = [];
    for (let i = 0; i < 4; i++) { const d = createDuck(i % 2 ? 0xfff3d6 : 0xd9c48a); d.userData.cz = -50 + i * 20 + (i % 2) * 6; scene.add(d); this.ducks.push(d); }
    // Муур — сандал дээр
    this.cats = [];
    for (const [x, z, r, c] of [[-5.5, -22, 0.6, 0x8a8a8a], [30, 30, -Math.PI / 2, 0xf2a35a]]) { const cat = createCat(c); cat.position.set(x, 0.55, z - 0.1); cat.rotation.y = r + Math.PI / 2; scene.add(cat); this.cats.push(cat); }
    // Ажилтай иргэд: тариаланч (усалдаг), худалдагч (лангууны ард), загасчин
    const farmer = new Mascot({ kind: 'carrot', scale: 0.9 }); farmer.wear({ hat: 'straw' }); scene.add(farmer.root);
    this.farmer = { m: farmer, path: [[31, -31], [49, -31], [49, -35], [31, -35], [31, -39], [49, -39], [49, -43], [31, -43]], i: 0, wait: 0, heading: 0 };
    farmer.root.position.set(31, 0, -31);
    const vendor = new Mascot({ kind: 'orange', scale: 0.9 }); vendor.wear({ hat: 'cap' }); vendor.root.position.set(-29, 0, -14.2); vendor.root.rotation.y = Math.PI; scene.add(vendor.root);
    this.vendor = vendor;
    const fisher = new Mascot({ kind: 'shiitake', scale: 0.9 }); fisher.wear({ hat: 'straw' }); fisher.root.position.set(16, 0.1, -20); fisher.root.rotation.y = Math.PI / 2; scene.add(fisher.root);
    this.fisher = fisher;
    const rod = new T.Group(); rod.position.set(16.5, 0.9, -20); scene.add(rod); this.rod = rod;
    const rodM = P.mesh(new T.CylinderGeometry(0.02, 0.03, 2.6, 6), toon(0x6a4a2a, { key: 'rodW' }), rod, 0.9, 1.0, 0); rodM.rotation.z = -1.1;
    this.float = P.sphere(toon(0xe83a4a, { key: 'floatR' }), scene, 22, -0.3, -20, 0.1);
    const lineGeo = new T.BufferGeometry().setFromPoints([new T.Vector3(18.2, 2.3, -20), new T.Vector3(22, -0.3, -20)]);
    this.line = new T.Line(lineGeo, new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); scene.add(this.line);
    P.contactShadow(scene, 0.5, 5, -9);
  }

  updateAnimals(dt) {
    const t = this.clock, pp = this.player.pos;
    // Нохой
    if (this.state.pet) this.dog.update(dt, this.vehicle ? this.vehicle.position : pp, this.blocked, this.player.state);
    else { this.dog.update(dt, this.dog.root.position, this.blocked, 'idle'); }
    // Нугас
    for (const d of this.ducks) updateDuck(d, dt, t, CANAL.x, d.userData.cz, 2.6);
    for (const c of this.cats) updateCat(c, dt, t);
    // Тариаланч: талбайн мөрөөр алхаж, зогсоод усална
    const F = this.farmer, fr = F.m.root;
    if (F.wait > 0) {
      F.wait -= dt;
      F.m.update(dt, { state: 'idle', speed: 0 });
      if (Math.random() < dt * 14) this.particles.sparkle(new T.Vector3(fr.position.x + Math.sin(F.heading) * 1.2 + (Math.random() - 0.5), 0.6, fr.position.z + Math.cos(F.heading) * 1.2 + (Math.random() - 0.5)), 0x9fe4ff, 1);
      if (F.wait <= 0) F.i = (F.i + 1) % F.path.length;
    } else {
      const [tx, tz] = F.path[F.i], dx = tx - fr.position.x, dz = tz - fr.position.z, d = Math.hypot(dx, dz);
      if (d < 0.3) { F.wait = 2.5; F.m.play('pick', 2.4); }
      else { const h = Math.atan2(dx, dz); F.heading += Math.atan2(Math.sin(h - F.heading), Math.cos(h - F.heading)) * Math.min(1, dt * 6); fr.rotation.y = F.heading; fr.position.x += Math.sin(F.heading) * 2 * dt; fr.position.z += Math.cos(F.heading) * 2 * dt; F.m.update(dt, { state: 'walk', speed: 0.4 }); }
    }
    // Худалдагч: тоглогч ойртвол даллана
    const nearV = Math.hypot(pp.x + 29, pp.z + 14.2) < 6;
    this.vendor.update(dt, { state: 'idle', speed: 0, lookAt: nearV ? new T.Vector3(pp.x, 1.5, pp.z) : null });
    if (nearV && !this.vendor.busy && Math.random() < dt * 0.4) this.vendor.play('wave', 1.2);
    // Загасчин: сууж, хөвүүр бөмбөрнө, хааяа загас
    this.fisher.update(dt, { state: 'sit', speed: 0 });
    this.float.position.y = -0.3 + Math.sin(t * 2.5) * 0.06;
    this.fisher.catchT = (this.fisher.catchT || 0) - dt;
    if (this.fisher.catchT <= 0) { this.fisher.catchT = 12 + Math.random() * 15; this.fisher.cheer(); this.particles.burst(this.float.position.clone(), 0xbff3ff, 12, { speed: 2, up: 3, size: 0.16, life: 0.6, gravity: 8 }); if (Math.hypot(pp.x - 16, pp.z + 20) < 10) this.audio.splash(); }
    this.line.geometry.attributes.position.setY(1, this.float.position.y); this.line.geometry.attributes.position.needsUpdate = true;
  }

  /** Улирал: 5 минут тутамд солигдоно — навчны өнгө, газар, унах зүйлс */
  updateSeason() {
    const idx = Math.floor(this.state.playtime / 300) % 4;   // 0 хавар, 1 зун, 2 намар, 3 өвөл
    if (idx === this.season) return;
    this.season = idx;
    const leaf = toon(PALETTE.leaf, { key: 'leaf' }), leafL = toon(PALETTE.leafLight, { key: 'leafL' }), leafD = toon(PALETTE.leafDark, { key: 'leafD' });
    const sets = [
      { leaf: 0x5fc45a, leafL: 0x9ee07a, leafD: 0x3f9e4a, ground: 0xffffff, petals: [0xffb3c6, 0xffd9e6, 0xfff0a8], name: 'Хавар', emoji: '🌸' },
      { leaf: PALETTE.leaf, leafL: PALETTE.leafLight, leafD: PALETTE.leafDark, ground: 0xffffff, petals: [0xb8ec9a, 0xfff0a8, 0xffffff], name: 'Зун', emoji: '☀️' },
      { leaf: 0xe08a2e, leafL: 0xf2b84a, leafD: 0xb85c1e, ground: 0xe8d9a8, petals: [0xe08a2e, 0xf2b84a, 0xc9502a], name: 'Намар', emoji: '🍂' },
      { leaf: 0xb9c9bc, leafL: 0xe6eeea, leafD: 0x8fa397, ground: 0xdde8e4, petals: [0xffffff, 0xf0f8ff, 0xe6f2ff], name: 'Өвөл', emoji: '❄️' },
    ];
    const S = sets[idx];
    leaf.color.set(S.leaf); leafL.color.set(S.leafL); leafD.color.set(S.leafD);
    this.town.groundMat.color.set(S.ground);
    const col = new T.Color();
    this.leaves.userData.items.forEach((it, i) => { col.set(S.petals[i % 3]); this.leaves.setColorAt(i, col); }); this.leaves.instanceColor.needsUpdate = true;
    if (this.started) toast(`${S.name} ирлээ`, 3000, S.emoji);
  }

  updateCitizens(dt) {
    const N = this.roadNodes, E = this.roadEdges, pp = this.player.pos;
    for (const c of this.citizens) {
      const r = c.m.root;
      if (c.wait > 0) {
        c.wait -= dt;
        const near = Math.hypot(pp.x - r.position.x, pp.z - r.position.z) < 4;
        c.m.update(dt, { state: 'idle', speed: 0, lookAt: near ? new T.Vector3(pp.x, 1.5, pp.z) : null });
        if (near && !c.waved && !c.m.busy) { c.m.play('wave', 1.2); c.waved = true; }
        continue;
      }
      if (!c.target) {
        const opts = E[c.node].filter((n) => n !== c.prev);
        c.next = opts[Math.floor(Math.random() * opts.length)] || E[c.node][0];
        const [x, z] = N[c.next];
        // Замын хажуу эгнээгээр явна
        const vertical = N[c.node][0] === x;
        c.target = new T.Vector3(x + (vertical ? c.lane : 0), 0, z + (vertical ? 0 : c.lane));
        c.waved = false;
      }
      const dx = c.target.x - r.position.x, dz = c.target.z - r.position.z, d = Math.hypot(dx, dz);
      const speed = 2.6;
      if (d < 0.3) { c.prev = c.node; c.node = c.next; c.target = null; c.wait = Math.random() < 0.5 ? 1.5 + Math.random() * 4 : 0; continue; }
      const h = Math.atan2(dx, dz);
      c.heading += Math.atan2(Math.sin(h - c.heading), Math.cos(h - c.heading)) * Math.min(1, dt * 8);
      r.rotation.y = c.heading;
      r.position.x += Math.sin(c.heading) * speed * dt; r.position.z += Math.cos(c.heading) * speed * dt;
      const near = Math.hypot(pp.x - r.position.x, pp.z - r.position.z) < 5;
      c.m.update(dt, { state: 'walk', speed: 0.45, lookAt: near ? new T.Vector3(pp.x, 1.5, pp.z) : null });
    }
  }

  hintTexture(icon) {
    if (this.hintSprites.has(icon)) return this.hintSprites.get(icon);
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = 'rgba(255,255,255,.92)'; x.beginPath(); x.arc(64, 58, 44, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,.92)'; x.beginPath(); x.moveTo(50, 92); x.lineTo(78, 92); x.lineTo(64, 112); x.closePath(); x.fill();
    x.font = '56px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(icon, 64, 62);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
    this.hintSprites.set(icon, t);
    return t;
  }

  setupInteractables() {
    const add = (o) => { this.interactables.push(o); return o; };
    const { town, state } = this;
    for (const h of town.harvests) {
      h.obj.visible = h.ring.visible = !state.collected.has(h.id);
      add({ x: h.x, z: h.z, r: 2.6, label: FRUITS[h.type].name + ' түүх', icon: FRUITS[h.type].emoji, visible: () => h.obj.visible, action: () => {
        if (state.harvest(h.id, h.type)) {
          this.character.play('pick', 0.7);
          h.obj.visible = h.ring.visible = false;
          this.particles.burst(new T.Vector3(h.x, 1, h.z), FRUITS[h.type].color, 18);
          this.audio.pickup(h.type);
          toast(FRUITS[h.type].name + ' түүлээ! +5 од', 2200, FRUITS[h.type].emoji);
          this.progress('harvest', 1);
          pop($('fruitCount'));
          this.commit();
        }
      } });
    }
    for (const p of town.packages) {
      p.obj.visible = p.ring.visible = !state.collected.has(p.id);
      add({ x: p.x, z: p.z, r: 2.6, label: 'Kagome бүтээгдэхүүн цуглуулах', icon: '🧃', visible: () => p.obj.visible, action: () => {
        if (state.collectPackage(p.id)) {
          this.character.play('pick', 0.7);
          p.obj.visible = p.ring.visible = false;
          this.particles.burst(new T.Vector3(p.x, 1, p.z), 0xffd24d, 24);
          this.audio.pickup(4);
          toast('Kagome цуглуулгад нэмлээ! +10 од', 2400, '🧃');
          pop($('starCount'));
          this.commit();
        }
      } });
    }
    for (const n of town.npcs) {
      add({ x: n.x, z: n.z, r: 3.6, label: n.name + 'тай ярилцах', icon: FRUITS[n.type].emoji, action: () => {
        this.player.heading = Math.atan2(n.x - this.player.pos.x, n.z - this.player.pos.z);
        if (this.delivery.deliver(n)) return;   // идэвхтэй захиалгын хүлээн авагч бол хүргэлт
        this.character.play('wave', 1.1); n.m.play('wave', 1.4);
        if (!n.talked) { n.talked = true; this.progress('talk', 1); }
        this.talk(n);
      } });
    }
    add({ x: 10, z: 20, r: 3.8, label: 'Жимсэн машинд суух', icon: '🚗', dynamic: () => town.car.position, action: () => this.enterCar() });
    add({ x: -28, z: 25, r: 4, label: 'Kagome маркет — дэлгүүр', icon: '🛍️', action: () => this.shop() });
    this.juice = new JuiceGame(this);
    add({ x: -21, z: 14, r: 3.5, label: 'Шүүсний лаборатори — шүүс хийх', icon: '🧃', action: () => this.juice.open() });
    add({ x: 38, z: 20, r: 3.4, label: 'Логикийн хүрд эргүүлэх', icon: '🎡', action: () => this.spinWheel() });
    add({ x: 46, z: -57, r: 4.5, label: 'Ширэнгэ рүү орох — Jungle Runner', icon: '🌴', action: () => this.enterJungle() });
    this.farm = new FarmPlot(this);
    this.fishing = new FishingGame(this);
    this.delivery = new DeliveryBoard(this);
  }

  setupUI() {
    const { input } = this;
    input.bindStick($('stick'), $('knob'), 36);
    input.bindButton($('jumpBtn'), 'jump');
    input.bindButton($('actionBtn'), 'interact');
    input.bindButton($('runBtn'), 'run');
    input.bindButton($('rollBtn'), 'roll');
    $('mapButton').onclick = () => this.showMap();
    $('collectionButton').onclick = () => this.collection();
    $('pauseButton').onclick = () => this.pauseMenu();
    $('dailyBtn').onclick = () => this.dailyModal();
    this.unbind = [
      input.on('jump', () => { if (this.active && !this.vehicle) this.player.buffer = BUFFER; }),
      input.on('interact', () => this.interact()),
      input.on('pause', () => { if (this.started && !isModalOpen()) this.pauseMenu(); else if ($('panel').open && $('panel').dataset.closable === '1') closeModal(); }),
      input.on('map', () => { if (this.active) this.showMap(); }),
      input.on('emote1', () => this.emote('wave')), input.on('emote2', () => this.emote('cheer')), input.on('emote3', () => this.emote('dance')),
    ];
    $('panel').addEventListener('close', () => input.clear());
  }

  enter() {
    show('townHud', true);
    this.app.post.setScene(this.scene); this.app.post.setCamera(this.camera);
    this.resize();
    // Runner-ээс буцахад аялал ахисан байж болно
    const prevChapter = this.hudChapter;
    this.updateHUD(); this.setGoalForChapter();
    if (prevChapter !== undefined && prevChapter !== this.state.chapter) { toast(this.state.done ? 'Бүх аяллаа дуусгалаа!' : 'Шинэ аялал нээгдлээ! +50 од', 4000, '✨'); this.audio.fanfare(); }
    this.hudChapter = this.state.chapter;
    if (this.started) { this.audio.startMusic('town'); this.audio.startAmbient(); }
  }
  exit() {
    show('townHud', false);
    if (this.delivery?.active) { this.delivery.finish(); toast('Хүргэлт цуцлагдлаа — ширэнгэ рүү явлаа', 2500, '📬'); }
    this.audio.engine(false);
    this.audio.stopMusic(); this.audio.stopAmbient();
  }
  resize() { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); }

  start() {
    this.started = true;
    // Танилцуулга: камер дээрээс аажуухан бууж ирнэ
    this.cam.dist = 70; this.cam.pitch = 1.1; this.cam.yaw = 0.35 + 2.2; this.cam.intro = 3.2;
    this.audio.startMusic('town'); this.audio.startAmbient();
    const c = this.state.currentChapter;
    toast(c ? 'Тавтай морил! ' + c.hint : 'Тавтай морил, одтой аялагч аа!', 4000, '👋');
  }

  // ---------------------------------------------------------------- Аялал / хадгалалт
  commit() {
    const up = this.state.progress();
    this.updateHUD();
    this.state.save();
    if (up) {
      const done = this.state.done;
      toast(done ? 'Бүх аяллаа дуусгалаа! +50 од' : 'Шинэ аялал нээгдлээ! +50 од', 4000, done ? '🏆' : '✨');
      this.particles.burst(this.player.pos.clone().add(new T.Vector3(0, 1.5, 0)), 0xffdc51, 40, { speed: 5, up: 5 });
      this.audio.fanfare();
      this.character.cheer();
      this.setGoalForChapter();
    }
  }

  updateHUD() {
    const s = this.state, c = s.currentChapter;
    this.hudChapter = s.chapter;
    $('fruitCount').textContent = '🍎 ' + s.counts.harvest;
    $('dailyCount').textContent = s.dailyDone + '/3';
    $('starCount').textContent = '⭐ ' + s.stars;
    if (c) {
      $('chapter').textContent = `АЯЛАЛ ${s.chapter + 1} / ${CHAPTERS.length}`;
      $('questTitle').textContent = c.title;
      $('questText').textContent = c.text;
      $('questHint').textContent = c.hint;
      const v = Math.min(c.goal, s.counts[c.key]);
      $('questProgress').textContent = `${v} / ${c.goal}`;
      $('questBar').style.width = (v / c.goal * 100) + '%';
    } else {
      $('chapter').textContent = 'БҮХ АЯЛАЛ БҮРЭН';
      $('questTitle').textContent = 'Хотын одтой аялагч!';
      $('questText').textContent = 'Чөлөөтэй аялж, үлдсэн ургацаа хураагаарай. Ширэнгийн бүх үеийг давж рекорд тогтоо.';
      $('questHint').textContent = '';
      $('questProgress').textContent = `${CHAPTERS.length} / ${CHAPTERS.length}`;
      $('questBar').style.width = '100%';
    }
  }

  setGoalForChapter() {
    const c = this.state.currentChapter;
    if (c && c.landmark !== undefined) this.setGoal(LANDMARKS[c.landmark]);
    else this.setGoal(null);
  }

  setGoal(l) {
    this.goal = l;
    this.goalMarker.visible = !!l;
    if (l) this.goalMarker.position.set(l.x, 0, l.z);
    $('compass').classList.toggle('on', !!l);
  }

  // ---------------------------------------------------------------- Харилцаа
  emote(kind) {
    if (!this.active || this.vehicle || this.player.state !== 'idle') return;
    this.progress('emotes', 1);
    if (kind === 'cheer') { this.character.cheer(); this.audio.tone({ f: 660, f2: 990, type: 'triangle', dur: 0.2, vol: 0.08 }); }
    else this.character.play(kind, kind === 'dance' ? 2.6 : 1.2);
    if (kind === 'dance') this.particles.burst(this.player.pos.clone().add(new T.Vector3(0, 1.5, 0)), 0xffd1f0, 12, { speed: 2, up: 2, size: 0.15, life: 0.8, gravity: 1 });
  }

  interact() {
    if (!this.active) return;
    if (this.vehicle) { this.exitCar(); return; }
    if (this.fishing.active) { this.fishing.press(); return; }
    if (this.near) { this.audio.ui(); this.near.action(); }
  }

  talk(n) {
    const questBtn = n.quest ? `<button id="npcAction" class="primary">${n.quest === 'runner' ? 'Ширэнгэ рүү явах' : 'Сорилоо эхлэх'}</button>` : '';
    modal(`<div class="npc-head"><div class="reward">${FRUITS[n.type].emoji}</div><div><div class="eyebrow">ХОТЫН ИРГЭН</div><h2>${n.name}</h2></div></div><p>${n.lines}</p><div class="row">${questBtn}<button id="npcBye" class="ghost">Аяллаа үргэлжлүүлэх</button></div>`);
    $('npcBye').onclick = () => closeModal();
    const b = $('npcAction');
    if (b) b.onclick = () => {
      if (n.quest === 'logic') this.spinWheel();
      else if (n.quest === 'runner') { closeModal(); this.setGoal(LANDMARKS[7]); toast('Ширэнгийн хаалга руу алтан тэмдгийг дагаарай.', 3000, '🌴'); }
      else this.ask(n.quest);
    };
  }

  ask(type, idx) {
    const qs = QUESTIONS[type];
    if (idx === undefined) idx = this.state.nextQuestion(type);
    if (idx < 0) { modal('<div class="reward">🏅</div><h2>Энэ сорилыг бүрэн давлаа!</h2><p>Газрын зургаас дараагийн аяллаа сонгоорой.</p><button class="primary" id="ok">Гоё!</button>'); $('ok').onclick = closeModal; return; }
    const q = qs[idx];
    const title = { math: 'ТОО БОДОХ ЗАХ', read: 'УНШИХ СОРИЛ', logic: 'ЛОГИКИЙН ХҮРД' }[type];
    const remaining = qs.filter((_, i) => !this.state.solved.has(type + i)).length;
    modal(`<div class="eyebrow">${title} · ${remaining} үлдсэн</div><h2>${q.q}</h2>${q.passage ? `<p class="hint">${q.passage}</p>` : ''}<div class="choices">${q.options.map((s, i) => `<button data-answer="${i}">${s}</button>`).join('')}</div><div class="feedback" role="status"></div>`);
    document.querySelectorAll('[data-answer]').forEach((b) => b.onclick = () => {
      const ok = this.state.answer(type, idx, +b.dataset.answer);
      const fb = document.querySelector('.feedback');
      if (ok) {
        document.querySelectorAll('[data-answer]').forEach((btn) => btn.disabled = true);
        b.classList.add('right');
        fb.textContent = 'Зөв хариуллаа! +15 од';
        this.audio.correct();
        this.particles.burst(this.player.pos.clone().add(new T.Vector3(0, 2, 0)), 0x9df5b3, 20);
        this.commit();
        const next = document.createElement('button');
        next.className = 'primary'; next.textContent = this.state.nextQuestion(type) >= 0 ? 'Дараагийн сорил →' : 'Дуусгах';
        next.onclick = () => this.ask(type);
        $('panelBody').appendChild(next);
      } else {
        b.classList.add('wrong'); b.disabled = true;
        fb.textContent = 'Дахиад бодоод үзээрэй. ' + q.h;
        this.audio.wrong();
      }
    });
  }

  spinWheel() {
    modal('<div class="eyebrow">ЛОГИКИЙН ХҮРД</div><h2>Дараагийн таавраа нээгээрэй</h2><div class="wheel">★</div><button id="spinNow" class="primary">Хүрд эргүүлэх</button><p class="hint">Зүй тогтол, тоон дараалал, уншиж бодох дасгал.</p>');
    $('spinNow').onclick = () => {
      $('spinNow').disabled = true;
      document.querySelector('.wheel').style.transform = 'rotate(1125deg)';
      this.wheelSpin = 1.7;
      this.audio.spin();
      setTimeout(() => { if ($('panel').open) this.ask('logic'); }, 1650);
    };
  }

  showMap() {
    const p = this.player.pos;
    modal(`<div class="eyebrow">ХОТЫН ХӨТӨЧ</div><h2>Хаашаа аялах вэ?</h2><p>Газрыг сонгоход алтан тэмдэг гарч, луужин чиглэл заана.</p><div class="map-grid">${LANDMARKS.map((l, i) => `<button data-landmark="${i}" class="${this.goal === l ? 'active' : ''}"><span>${l.emoji} ${l.name}</span><b>${Math.round(Math.hypot(l.x - p.x, l.z - p.z))} м</b></button>`).join('')}</div>`);
    document.querySelectorAll('[data-landmark]').forEach((b) => b.onclick = () => {
      const l = LANDMARKS[+b.dataset.landmark];
      this.setGoal(l); closeModal(); this.audio.ui();
      toast(l.name + ' руу алтан тэмдгийг дагаарай.', 2600, l.emoji);
    });
  }

  collection() {
    const s = this.state;
    const inv = FRUITS.map((t, i) => `<span class="stat" style="font-size:15px">${t.emoji} ${s.inventory[i] || 0}</span>`).join(' ');
    modal(`<div class="eyebrow">МИНИЙ АЯЛАЛ</div><h2>Ургац ба цуглуулга</h2><div class="row" style="margin:6px 0 14px">${inv}</div><p>Цуглуулсан од: <b>${s.stars}</b> · Дууссан аялал: <b>${s.chapter}/${CHAPTERS.length}</b> · Ширэнгэ: <b>${s.runner.unlocked}/5 үе</b></p><p>🐟 Загас: <b>${s.counts.fish}</b> · 🌱 Талбайн ургац: <b>${s.counts.farm}</b> · 📬 Хүргэлт: <b>${s.counts.delivery}</b></p><div class="grid">${PRODUCTS.map((p) => `<div class="product ${s.collected.has('package-' + p.sku) ? 'got' : ''}"><img src="${p.src}" alt="Kagome ${p.flavor}" loading="lazy"><small>${p.name}</small><span>${p.size}</span></div>`).join('')}</div><p class="hint" style="margin-top:14px">Хотоос 8 бүтээгдэхүүнийг олоод бүх ★ авбал цуглуулга бүрэн болно. Ширэнгэнд цуглуулсан: ${s.runner.collection.reduce((a, b) => a + b, 0)} ш.</p>`);
  }

  /** Аксессуарын дэлгүүр (Kagome маркет) */
  shop() {
    const st = this.state, w = st.wardrobe;
    const isMascot = st.settings.avatar !== 'suit';
    const items = Object.entries(ACCESSORIES).map(([k, a]) => {
      const owned = w.owned.includes(k), on = w.equipped[a.slot] === k;
      const btn = owned ? `<button data-wear="${k}" class="${on ? 'primary' : ''}">${on ? 'Өмссөн ✓' : 'Өмсөх'}</button>` : `<button data-buy="${k}" ${st.stars < a.price ? 'disabled' : ''}>⭐ ${a.price}</button>`;
      return `<div class="shop-item ${on ? 'on' : ''}"><span class="em">${a.emoji}</span><small>${a.name}</small>${btn}</div>`;
    }).join('');
    modal(`<div class="eyebrow">KAGOME МАРКЕТ</div><h2>Хувцас, аксессуар</h2><p>Од ⭐ <b id="shopStars">${st.stars}</b> · Оддоо цуглуулаад дүрээ гоёорой.${isMascot ? '' : ' <i>(Аксессуар mascot дүрүүдэд л харагдана)</i>'}</p><div class="shop">${items}</div><div class="row"><button id="shopCollection">🧃 Бүтээгдэхүүний цуглуулга</button><button class="ghost" id="shopClose">Хаах</button></div>`);
    document.querySelectorAll('[data-buy]').forEach((b) => b.onclick = () => {
      const k = b.dataset.buy;
      if (st.buyAccessory(k, ACCESSORIES[k].price)) { st.equip(k, ACCESSORIES[k].slot); st.save(); this.refreshWear(); this.audio.correct(); toast(ACCESSORIES[k].name + ' авлаа!', 2000, ACCESSORIES[k].emoji); this.updateHUD(); this.shop(); }
      else this.audio.wrong();
    });
    document.querySelectorAll('[data-wear]').forEach((b) => b.onclick = () => { const k = b.dataset.wear; st.equip(k, ACCESSORIES[k].slot); st.save(); this.refreshWear(); this.audio.ui(); this.shop(); });
    $('shopCollection').onclick = () => this.collection();
    $('shopClose').onclick = closeModal;
  }

  refreshWear() {
    for (const sc of Object.values(this.app.scenes)) { sc.character?.wear?.(this.state.wardrobe.equipped); sc.driver?.wear?.(this.state.wardrobe.equipped); }
    this.character.cheer?.();
  }

  /** Өдрийн даалгаврын цонх */
  dailyModal() {
    const st = this.state; st.ensureDaily();
    const rows = st.daily.quests.map((q) => { const d = st.dailyDef(q.id); const p = Math.min(q.goal, Math.round(q.progress)); return `<div class="dq ${q.done ? 'done' : ''}"><span class="em">${d.icon}</span><div><b>${d.text}</b><div class="track"><i style="width:${p / q.goal * 100}%"></i></div><small>${p} / ${q.goal} · ⭐ ${d.reward}</small></div><span class="chk">${q.done ? '✅' : ''}</span></div>`; }).join('');
    modal(`<div class="eyebrow">ӨДРИЙН ДААЛГАВАР · ${st.daily.date}</div><h2>Өнөөдрийн 3 даалгавар</h2>${rows}<p class="hint">Маргааш шинэ даалгавар гарна. Дуусгасан бүрд од ⭐ шууд нэмэгдэнэ.</p><button class="primary" id="ok">Явлаа!</button>`);
    $('ok').onclick = closeModal;
  }

  /** Даалгаврын ахиц + шагналын мэдэгдэл */
  progress(id, amount = 1) {
    const done = this.state.dailyProgress(id, amount);
    if (done) { toast(`Даалгавар биелэв: ${done.text} +${done.reward} од`, 3500, '📅'); this.audio.fanfare(); this.character.cheer(); this.particles.burst(this.player.pos.clone().add(new T.Vector3(0, 1.5, 0)), 0xffdc51, 30, { speed: 5, up: 5 }); this.state.save(); this.updateHUD(); }
    $('dailyCount').textContent = this.state.dailyDone + '/3';
  }

  pauseMenu() {
    if (!this.started) return;
    const st = this.state.settings;
    modal(`<div class="eyebrow">ТҮР ЗОГСЛОО</div><h2>Kagome City</h2>
      <div class="settings">
        <label>Дуу <input type="checkbox" id="sSound" ${st.sound ? 'checked' : ''}></label>
        <label>Хөгжим <input type="checkbox" id="sMusic" ${st.music ? 'checked' : ''}></label>
        <label>Гүний бүдгэрэлт (DoF) <input type="checkbox" id="sDof" ${st.dof !== false ? 'checked' : ''}></label>
        <label>Графикийн чанар <select id="sQuality"><option value="auto">Автомат</option><option value="high">Өндөр</option><option value="medium">Дунд</option><option value="low">Бага</option></select></label>
      </div>
      <div class="row"><button class="primary" id="resume">Үргэлжлүүлэх →</button><button id="help">Удирдлага</button><button id="pickAvatar">🍅 Дүр солих</button><button id="shopBtn">🛍️ Хувцас</button><button id="dailyBtn2">📅 Даалгавар</button><button id="gotoRunner">🌴 Jungle Runner</button><button id="reset" class="ghost">Ахиц устгах</button></div>`);
    $('sQuality').value = st.quality;
    $('resume').onclick = closeModal;
    $('sSound').onchange = (e) => { st.sound = e.target.checked; this.audio.applySettings(); this.state.save(); };
    $('sMusic').onchange = (e) => { st.music = e.target.checked; this.audio.applySettings(); this.state.save(); };
    $('sQuality').onchange = (e) => { st.quality = e.target.value; this.state.save(); this.app.applyQuality(); };
    $('sDof').onchange = (e) => { st.dof = e.target.checked; this.state.save(); this.app.applyQuality(); };
    $('help').onclick = () => this.help();
    $('gotoRunner').onclick = () => { closeModal(); this.enterJungle(); };
    $('pickAvatar').onclick = () => this.pickAvatar(() => this.pauseMenu());
    $('shopBtn').onclick = () => this.shop();
    $('dailyBtn2').onclick = () => this.dailyModal();
    $('reset').onclick = () => { if (confirm('Бүх ахиц устгах уу?')) { this.state.reset(); location.reload(); } };
  }

  help() {
    modal(`<div class="eyebrow">АЯЛЛЫН ХӨТӨЧ</div><h2>Удирдлага</h2>
      <p><kbd>W A S D</kbd> / сум — камерын чиглэлд алхана<br><kbd>Shift</kbd> — гүйнэ<br><kbd>Space</kbd> — үсэрнэ, агаарт дахин дарвал давхар үсрэлт (эргэлт)<br><kbd>C</kbd> — өнхрөх · <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> — даллах / баярлах / бүжиглэх<br>Суваг руу орвол сэлнэ (гүүр хэрэггүй!)<br><kbd>E</kbd> — жимс түүх, ярилцах, машинд суух / буух<br><kbd>M</kbd> — газрын зураг · <kbd>Esc</kbd> — цэс · <kbd>Дугуй</kbd> — zoom<br>Хулгана чирэх / <kbd>Q</kbd> <kbd>R</kbd> — камер эргүүлэх<br><b>Машинд:</b> W урагш, S ухрах, A/D жолоодох, Shift — турбо</p>
      <p class="hint">Утсан дээр зүүн дугуй удирдлагыг чирж, баруун товчнуудаар үйлдэл хийнэ. Дэлгэцийг чирж камер эргүүлнэ. Gamepad дэмжигдэнэ.</p>
      <button class="primary" id="ok">Ойлголоо</button>`);
    $('ok').onclick = () => this.pauseMenu();
  }

  // ---------------------------------------------------------------- Машин
  enterCar() {
    const car = this.town.car;
    this.vehicle = car;
    this.car.speed = 0; this.car.heading = car.rotation.y;
    this.character.root.visible = false;
    this.driver.root.visible = true;
    this.audio.carIn();
    this.audio.engine(true, 0);
    show('speedo', true);
    toast('W/S урагш-ухрах · A/D жолоодох · Shift турбо · E буух', 3200, '🚗');
  }

  exitCar() {
    if (!this.vehicle) return;
    const p = this.vehicle.position;
    const offsets = [[3, 0], [-3, 0], [0, 3], [0, -3], [3, 3], [-3, -3]];
    const ok = offsets.find(([x, z]) => !this.blocked(p.x + x, p.z + z));
    if (!ok) { toast('Буух зайгүй байна. Задгай газар очоорой.', 2000, '⚠️'); return; }
    this.player.pos.set(p.x + ok[0], 0, p.z + ok[1]);
    this.player.vel.set(0, 0, 0);
    this.character.root.visible = true;
    this.driver.root.visible = false;
    this.vehicle = null;
    this.audio.engine(false);
    show('speedo', false);
  }

  async enterJungle() {
    if (this.vehicle) this.exitCar();
    this.audio.whoosh();
    await this.app.switchTo('runner');
  }

  // ---------------------------------------------------------------- Update
  update(dt) {
    this.clock += dt;
    this.state.playtime += dt;
    const active = this.started && !isModalOpen();
    this.active = active;
    const input = this.input;
    const P = this.player;

    // Камерын эргүүлэлт (танилцуулгын үед автомат)
    const cam = this.cam;
    if (active && input.zoom) { cam.zoomLevel = T.MathUtils.clamp((cam.zoomLevel ?? 0) + input.zoom * 0.6, -4.5, 8); }
    cam.targetDist = (this.vehicle ? 13 : 9.5) + (cam.zoomLevel ?? 0);
    cam.dist += (cam.targetDist - cam.dist) * Math.min(1, dt * (cam.intro > 0 ? 1.1 : 4));
    if (cam.intro > 0) {
      cam.intro -= dt;
      cam.pitch += (0.42 - cam.pitch) * Math.min(1, dt * 1.2);
      cam.yaw += (0.35 - cam.yaw) * Math.min(1, dt * 1.0);
    } else if (active) {
      this.cam.yaw -= input.look.dx;
      this.cam.pitch = T.MathUtils.clamp(this.cam.pitch + input.look.dy, 0.12, 1.15);
      if (input.held('camLeft')) this.cam.yaw += dt * 1.8;
      if (input.held('camRight')) this.cam.yaw -= dt * 1.8;
    }

    let axis = active ? input.axis() : { x: 0, y: 0 };
    let moving = 0;
    if (this.vehicle) this.updateCar(dt, axis, active);
    else this.updatePlayer(dt, axis, active);

    // Дүр
    const speedNorm = this.vehicle ? 0 : Math.hypot(P.vel.x, P.vel.z) / RUN;
    const look = !this.vehicle && this.near ? new T.Vector3((this.near.dynamic ? this.near.dynamic() : this.near).x, 1.2, (this.near.dynamic ? this.near.dynamic() : this.near).z) : null;
    this.character.update(dt, { state: P.state, speed: speedNorm, lean: this.vehicle ? 0 : P.lean || 0, lookAt: look });
    this.character.root.position.set(P.pos.x, P.visualY, P.pos.z);
    this.character.root.rotation.y = P.heading;
    if (this.vehicle) this.driver.update(dt, { state: 'sit', speed: 0, lean: -this.car.steer * 0.3 });

    this.updateCamera(dt);
    this.updateWorld(dt);
    this.farm.update(dt);
    this.fishing.update(dt);
    this.delivery.update(dt);
    this.updateInteractables(active);
    this.updateHudLive();
    this.particles.update(dt, this.camera);
  }

  /** Сувагт (гүүрнээс хол) байгаа эсэх — сэлэх бүс */
  inWater(x, z) {
    return Math.abs(x - CANAL.x) < CANAL.halfW + 0.3 && !BRIDGES_Z.some((b) => Math.abs(z - b) < 4.4);
  }

  updatePlayer(dt, axis, active) {
    const P = this.player, cam = this.cam, ch = this.character;
    const len = Math.hypot(axis.x, axis.y);
    const water = this.inWater(P.pos.x, P.pos.z) && P.y <= 0.01;
    const rolling = P.rollT > 0;
    P.rollT = Math.max(0, P.rollT - dt);
    const run = active && !water && (this.input.held('run') || (this.input.isTouch && len > 0.92));
    const maxSpeed = water ? SWIM : rolling ? ROLL_SPEED : run ? RUN : WALK;
    // Камерын чиглэлтэй харьцангуй хүссэн вектор
    let wx = 0, wz = 0;
    if (len > 0.05 && !rolling) {
      wx = axis.x * Math.cos(cam.yaw) + axis.y * Math.sin(cam.yaw);
      wz = -axis.x * Math.sin(cam.yaw) + axis.y * Math.cos(cam.yaw);
      const wl = Math.hypot(wx, wz); wx /= wl; wz /= wl;
    }
    if (rolling) { wx = Math.sin(P.heading); wz = Math.cos(P.heading); }   // өнхрөх: харсан зүг рүү
    const want = (rolling ? 1 : Math.min(1, len)) * maxSpeed;
    const tx = wx * want, tz = wz * want;
    const accel = (len > 0.05 || rolling ? ACCEL : DECEL) * (P.grounded ? 1 : AIR_CTRL) * (water ? 0.4 : 1);
    P.vel.x += (tx - P.vel.x) * Math.min(1, accel * dt / maxSpeed * 2.2);
    P.vel.z += (tz - P.vel.z) * Math.min(1, accel * dt / maxSpeed * 2.2);
    if (Math.hypot(P.vel.x, P.vel.z) < 0.05 && len < 0.05) P.vel.set(0, 0, 0);

    // Хөдөлгөөн + collision (тэнхлэг тус бүрээр гулсах); тоглогч сувагт орж болно
    const nx = P.pos.x + P.vel.x * dt, nz = P.pos.z + P.vel.z * dt;
    if (!this.blocked(nx, P.pos.z, 0.45, { canal: false })) P.pos.x = nx; else P.vel.x *= -0.1;
    if (!this.blocked(P.pos.x, nz, 0.45, { canal: false })) P.pos.z = nz; else P.vel.z *= -0.1;

    // Чиглэл
    const sp = Math.hypot(P.vel.x, P.vel.z);
    if (sp > 0.5) { P.walkAcc = (P.walkAcc || 0) + sp * dt; if (P.walkAcc >= 10) { this.progress('walk', 10); P.walkAcc -= 10; } }
    if (sp > 0.3 && !rolling) {
      const target = Math.atan2(P.vel.x, P.vel.z);
      const d = Math.atan2(Math.sin(target - P.heading), Math.cos(target - P.heading));
      P.heading += d * Math.min(1, dt * 14);
      P.lean = T.MathUtils.clamp(d * 0.8, -0.5, 0.5) * (sp / RUN);
    } else P.lean = 0;

    // Усанд орох / гарах
    if (water && !P.wasWater) { this.progress('swim', 1); this.audio.splash(); this.particles.burst(new T.Vector3(P.pos.x, 0, P.pos.z), 0xbff3ff, 18, { speed: 2.5, up: 3, size: 0.2, life: 0.6, gravity: 8 }); P.yVel = 0; P.grounded = true; }
    if (!water && P.wasWater) { this.particles.dust(P.pos, 4, { color: 0xbff3ff }); }
    P.wasWater = water;
    if (water && sp > 1 && Math.random() < dt * 10) this.particles.sparkle(new T.Vector3(P.pos.x, -0.3, P.pos.z), 0xe6fbff);

    // Үсрэлт: coyote + buffer + variable height + давхар үсрэлт (эргэлттэй)
    P.coyote = P.grounded ? COYOTE : Math.max(0, P.coyote - dt);
    P.buffer = Math.max(0, P.buffer - dt);
    if (P.grounded) P.jumps = 0;
    if (P.buffer > 0 && active && !rolling) {
      if (P.coyote > 0 || (water && P.grounded)) {
        P.yVel = water ? JUMP_V * 0.75 : JUMP_V; P.grounded = false; P.coyote = 0; P.buffer = 0; P.jumps = 1;
        this.audio.jump(); this.progress('jumps', 1);
        if (water) this.particles.burst(new T.Vector3(P.pos.x, 0, P.pos.z), 0xbff3ff, 10, { speed: 2, up: 2, size: 0.18, life: 0.5 }); else this.particles.dust(P.pos, 4);
      } else if (P.jumps === 1 && !P.grounded) {
        // Давхар үсрэлт: урагш эргэлт
        P.yVel = JUMP_V * 0.9; P.buffer = 0; P.jumps = 2;
        ch.flip(); this.progress('flips', 1);
        this.audio.tone({ f: 500, f2: 1000, type: 'triangle', dur: 0.18, vol: 0.09 });
        this.particles.burst(new T.Vector3(P.pos.x, P.y + 0.8, P.pos.z), 0xfff3a8, 10, { speed: 2, up: 1, size: 0.16, life: 0.4, gravity: 2 });
      }
    }
    // Өнхрөх (C / gamepad X): газар дээр, хөдөлж байх үед
    if (active && this.input.justPressed('roll') && P.grounded && !water && !rolling && !ch.busy) {
      P.rollT = ROLL_DUR; ch.roll(ROLL_DUR);
      this.audio.whoosh(); this.particles.dust(P.pos, 6);
    }
    if (!P.grounded) {
      if (P.yVel > 0 && !this.input.held('jump')) P.yVel -= GRAVITY * 1.6 * dt;   // товчоо суллавал богино үсрэлт
      else P.yVel -= GRAVITY * dt;
      P.y += P.yVel * dt;
      if (P.y <= 0) {
        P.y = 0; P.grounded = true;
        if (this.inWater(P.pos.x, P.pos.z)) { this.audio.splash(); this.particles.burst(new T.Vector3(P.pos.x, 0, P.pos.z), 0xbff3ff, 20, { speed: 3, up: 3.5, size: 0.22, life: 0.6, gravity: 8 }); }
        else { this.audio.land(); this.particles.dust(P.pos, 5); }
        cam.shake = Math.max(cam.shake, Math.min(0.12, -P.yVel * 0.006));
        P.yVel = 0;
      }
    }
    P.state = !P.grounded ? (P.yVel > 0.5 ? 'jump' : 'fall') : water ? 'swim' : sp > 0.4 ? (sp > WALK + 0.6 ? 'run' : 'walk') : 'idle';
    ch.shadow.material.opacity = water ? 0 : 0.22 * Math.max(0.2, 1 - P.y * 0.18);
    ch.shadow.position.y = -P.y + 0.03;
    P.visualY = P.y + (water ? -0.55 : 0);   // усанд бие живнэ
  }

  updateCar(dt, axis, active) {
    const C = this.car, car = this.vehicle, cam = this.cam;
    const turbo = active && this.input.held('run');
    const maxF = turbo ? 26 : 18, maxR = 7;
    const throttle = -axis.y;
    // Хурд: хөдөлгүүр + эсэргүүцэл
    const drag = 0.9 + Math.abs(C.speed) * 0.045;
    C.speed += (throttle * (throttle > 0 ? 16 : 12) - C.speed * drag * (Math.abs(throttle) < 0.05 ? 1.6 : 0.35)) * dt;
    C.speed = T.MathUtils.clamp(C.speed, -maxR, maxF);
    // Жолоодлого: хурдтай үед мэдрэмтгий, зогссон үед эргэхгүй
    C.steer += (axis.x - C.steer) * Math.min(1, dt * 8);
    const grip = Math.min(1, Math.abs(C.speed) / 5);
    C.heading -= C.steer * dt * 2.1 * grip * Math.sign(C.speed || 1) * (1 - Math.abs(C.speed) / 60);
    const fx = -Math.sin(C.heading), fz = -Math.cos(C.heading);
    const nx = car.position.x + fx * C.speed * dt, nz = car.position.z + fz * C.speed * dt;
    const r = 1.6;
    if (!this.blocked(nx, nz, r)) car.position.set(nx, 0, nz);
    else {
      // Мөргөлт: гулсах эсвэл буцах
      if (!this.blocked(nx, car.position.z, r)) car.position.x = nx;
      else if (!this.blocked(car.position.x, nz, r)) car.position.z = nz;
      else { if (Math.abs(C.speed) > 6) { this.audio.hurt(); cam.shake = 0.4; this.particles.dust(car.position, 8, { color: 0xffffff }); } C.speed *= -0.25; }
    }
    car.rotation.y = C.heading;
    // Их биеийн налалт (suspension)
    const accel = (C.speed - (C.prevSpeed || 0)) / Math.max(dt, 0.001); C.prevSpeed = C.speed;
    C.roll += (-C.steer * Math.abs(C.speed) * 0.012 - C.roll) * Math.min(1, dt * 6);
    C.pitch += (-T.MathUtils.clamp(accel, -20, 20) * 0.006 - C.pitch) * Math.min(1, dt * 5);
    C.bounce = Math.sin(this.clock * 18) * Math.abs(C.speed) * 0.002;
    const ch = car.userData.chassis;
    ch.rotation.z = C.roll; ch.rotation.x = C.pitch; ch.position.y = C.bounce;
    // Дугуй
    car.userData.wheels.forEach((w, i) => { w.rotation.x += C.speed * dt * 1.7; if (i % 2 === 0) w.rotation.y = -C.steer * 0.5; });
    car.userData.wheelSteer.rotation.z = -C.steer * 1.2;
    // Тоос, дуу
    if (Math.abs(C.speed) > 6 && Math.random() < dt * 25) this.particles.dust(new T.Vector3(car.position.x - fx * 2, 0, car.position.z - fz * 2), 1, { size: 0.5 });
    C.driveAcc = (C.driveAcc || 0) + Math.abs(C.speed) * dt; if (C.driveAcc >= 10) { this.progress('drive', 10); C.driveAcc -= 10; }
    this.audio.engine(true, C.speed);
    this.player.pos.copy(car.position);
    this.player.heading = C.heading;
    this.player.state = 'sit';
    $('speedVal').textContent = Math.round(Math.abs(C.speed) * 4.2);
    // Хүргэлтийн хаалга
    for (const g of this.town.gates) {
      if (g.obj.visible && Math.hypot(g.x - car.position.x, g.z - car.position.z) < 3.2 && this.state.gate(g.index)) {
        this.particles.burst(new T.Vector3(g.x, 2.5, g.z), 0xffd645, 36, { speed: 6, up: 4 });
        this.audio.gate();
        toast(`Хүргэлт ${g.index + 1} амжилттай! +20 од`, 2600, '🚗');
        this.commit();
      }
    }
  }

  updateCamera(dt) {
    const cam = this.cam, P = this.player, camera = this.camera;
    const target = this.vehicle ? this.vehicle.position : P.pos;
    // Камерын өнцөг зөвхөн тоглогчийн хүсэлтээр (хулгана/Q/R) эргэнэ.
    // Машинд л аажуухан ард нь орно — алхахад дэлгэц өөрөө эргэхгүй.
    if (this.vehicle) {
      const d = Math.atan2(Math.sin(this.car.heading - cam.yaw), Math.cos(this.car.heading - cam.yaw));
      cam.yaw += d * Math.min(1, dt * (Math.abs(this.car.speed) > 2 ? 1.2 : 0.3));
    }
    const portrait = innerHeight > innerWidth ? 1.35 : 1;
    const dist = (cam.dist + (this.vehicle ? Math.abs(this.car.speed) * 0.06 : 0)) * portrait;
    const h = Math.sin(cam.pitch) * dist, r = Math.cos(cam.pitch) * dist;
    // Камерын өндөр: үсрэлтийг бараг дагахгүй (дэлгэц дээш доош үсрэхгүй)
    cam.groundY = cam.groundY ?? 0;
    cam.groundY += ((this.vehicle ? 0 : P.y * 0.15) - cam.groundY) * Math.min(1, dt * 3);
    const desired = new T.Vector3(target.x + Math.sin(cam.yaw) * r, cam.groundY + 1.6 + h, target.z + Math.cos(cam.yaw) * r);
    // Барилгаас хамгаалах: камерын цэг блоклогдсон бол ойртуулна (зөөлөн)
    let k = 1;
    if (cam.intro <= 0) for (let i = 0; i < 6; i++) {
      const px = target.x + (desired.x - target.x) * k, pz = target.z + (desired.z - target.z) * k;
      if (!this.blockedCam(px, pz, 0.3) || Math.hypot(px - target.x, pz - target.z) < 2.5) break;
      k -= 0.12;
    }
    cam.k = cam.k ?? 1;
    cam.k += (k - cam.k) * Math.min(1, dt * (k < cam.k ? 10 : 2.5));   // ойртохдоо хурдан, холдохдоо удаан
    desired.x = target.x + (desired.x - target.x) * cam.k;
    desired.z = target.z + (desired.z - target.z) * cam.k;
    desired.y = Math.max(1.2, desired.y);
    // Байрлал: тоглогчтой хамт хатуу хөдөлнө (хоцрохгүй), эргэлт зөөлөн
    const follow = this.vehicle ? 6 : 12;
    camera.position.lerp(desired, Math.min(1, dt * follow));
    if (cam.shake > 0) {
      cam.shake = Math.max(0, cam.shake - dt * 2.5);
      camera.position.x += (Math.random() - 0.5) * cam.shake * 0.25;
      camera.position.y += (Math.random() - 0.5) * cam.shake * 0.25;
    }
    // Харах цэг: тоглогчийн цээж — үсрэхэд бага зэрэг л дагана
    const look = new T.Vector3(target.x, (this.vehicle ? 1.6 : cam.groundY + 1.9), target.z);
    if (this.vehicle) look.addScaledVector(new T.Vector3(-Math.sin(this.car.heading), 0, -Math.cos(this.car.heading)), this.car.speed * 0.12);
    cam.lookPt = cam.lookPt || look.clone();
    cam.lookPt.lerp(look, Math.min(1, dt * 14));
    camera.lookAt(cam.lookPt);
    // FOV: зөвхөн машинд мэдэгдэхүйц, гүйхэд бараг үл мэдэг
    const fovT = (portrait > 1 ? 62 : 55) + (this.vehicle ? Math.abs(this.car.speed) * 0.5 : P.state === 'run' ? 2 : 0);
    cam.fov += (fovT - cam.fov) * Math.min(1, dt * 3);
    if (Math.abs(camera.fov - cam.fov) > 0.05) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
    // Нар ба сүүдрийн камер тоглогчийг дагана
    const s = this.sun;
    s.target.position.set(target.x, 0, target.z);
    s.position.set(target.x + this.sunDir.x * 80, this.sunDir.y * 80, target.z + this.sunDir.z * 80);
  }

  get sunDir() {
    const a = (this.dayTime - 0.25) * Math.PI * 2; // 0.25 = нар мандах
    return new T.Vector3(-Math.cos(a) * 0.8, Math.max(0.12, Math.sin(a)), 0.45).normalize();
  }

  updateWorld(dt) {
    const t = this.clock, town = this.town;
    // Өдрийн цаг (шөнө 2 дахин хурдан өнгөрнө)
    const sunH0 = Math.sin((this.dayTime - 0.25) * Math.PI * 2);
    this.dayTime = (this.dayTime + dt / DAY_LENGTH * (sunH0 < 0 ? 2.2 : 1)) % 1;
    const sunH = Math.sin((this.dayTime - 0.25) * Math.PI * 2); // -1..1
    const day = T.MathUtils.smoothstep(sunH, -0.12, 0.35);
    const dusk = Math.max(0, 1 - Math.abs(sunH) / 0.28);
    const night = (1 - day) * 0.8;
    const skyTop = new T.Color(0x3f9ce8).lerp(new T.Color(0x1a2a5e), night).lerp(new T.Color(0xff8d5c), dusk * 0.35);
    const skyHor = new T.Color(0xbfe9f5).lerp(new T.Color(0x44598f), night).lerp(new T.Color(0xffb26b), dusk * 0.6);
    this.sky.uniforms.uTop.value.copy(skyTop);
    this.sky.uniforms.uHorizon.value.copy(skyHor);
    this.sky.uniforms.uBottom.value.copy(new T.Color(0xe4f6f0).lerp(new T.Color(0x2e3d66), night));
    this.sky.uniforms.uSunDir.value.copy(this.sunDir);
    this.sky.uniforms.uSunColor.value.set(0xfff2c8).lerp(new T.Color(0xff7a3c), dusk);
    this.scene.fog.color.copy(skyHor);
    this.sun.intensity = 0.55 + day * 1.1;
    this.sun.color.set(0xfff1cf).lerp(new T.Color(0xffa060), dusk * 0.7).lerp(new T.Color(0xaabbff), night * 0.7);
    this.hemi.intensity = 0.5 + day * 0.35;
    this.hemi.color.set(0xdff6ff).lerp(new T.Color(0x7d8fc4), night);
    // Гэрлийн шил шөнө гэрэлтэнэ
    const bulbI = 0.6 + night * 3.2;
    bulbMaterial().color.set(0xfff0b0).multiplyScalar(bulbI);

    // Shader цаг
    for (const m of town.waterMats) m.userData.time.value = t;
    for (const m of town.swayMats) if (m.userData.time) m.userData.time.value = t;
    updateClouds(this.clouds, dt);

    // Хураах жимс / бүтээгдэхүүн хөвнө
    for (const h of town.harvests) if (h.obj.visible) { h.obj.position.y = 1 + Math.sin(t * 2.2 + h.x) * 0.14; h.obj.rotation.y = t * 0.8; const nearH = Math.hypot(h.x - this.player.pos.x, h.z - this.player.pos.z) < 7; h.ring.scale.setScalar(nearH ? 1.15 + Math.sin(t * 6) * 0.25 : 1 + Math.sin(t * 3 + h.z) * 0.08); }
    for (const p of town.packages) if (p.obj.visible) { p.obj.position.y = 0.6 + Math.sin(t * 2 + p.z) * 0.12; p.obj.rotation.y = t * 1.2; if (Math.random() < dt * 2) this.particles.sparkle(p.obj.position, 0xffd24d); }
    town.npcs.forEach((n, i) => {
      const near = Math.hypot(this.player.pos.x - n.x, this.player.pos.z - n.z) < 7;
      if (near) { const h = Math.atan2(this.player.pos.x - n.x, this.player.pos.z - n.z); n.obj.rotation.y += Math.atan2(Math.sin(h - n.obj.rotation.y), Math.cos(h - n.obj.rotation.y)) * Math.min(1, dt * 3); }
      else n.obj.rotation.y += (Math.sin(t * 0.5 + i) * 0.4 - n.obj.rotation.y) * Math.min(1, dt);
      n.m.update(dt, { state: 'idle', speed: 0, lookAt: near ? new T.Vector3(this.player.pos.x, 1.5, this.player.pos.z) : null });
    });
    if (town.statue) { town.statue.root.position.y = 3.6 + Math.sin(t * 2) * 0.05; town.statue.root.rotation.y = t * 0.3; }
    // Хүргэлтийн хаалга
    town.gates.forEach((g) => { g.obj.visible = this.state.chapter === 4 && g.index >= this.state.counts.drive; g.obj.traverse((o) => { if (o.userData.spin) { o.rotation.y = t * 1.5; o.position.y = 2.6 + Math.sin(t * 2) * 0.2; } }); });
    // Хүрд
    if (this.wheelSpin > 0) { this.wheelSpin -= dt; town.wheel.rotation.z += dt * (4 + this.wheelSpin * 6); } else town.wheel.rotation.z += dt * 0.15;
    // Усан оргилуур
    town.fountainJets.forEach((j, i) => { j.scale.y = 0.85 + Math.sin(t * 6 + i) * 0.2; });
    if (Math.random() < dt * 14) this.particles.sparkle(new T.Vector3(Math.sin(t * 3) * 2, 2.6, -15 + Math.cos(t * 3) * 2), 0xd8f6ff);
    // Лянхуа хөвнө
    town.world.children.forEach((o) => { if (o.userData.float) o.position.y = (o.geometry.type === 'CircleGeometry' ? -0.3 : -0.15) + Math.sin(t * 1.5 + o.position.z) * 0.05; });
    // ---- Цаг агаар: хааяа бороо, дараа нь солонго ----
    const W = this.weather;
    W.timer -= dt;
    if (W.timer <= 0) {
      if (W.target === 0) { W.target = 1; W.timer = 40 + Math.random() * 30; toast('Бороо орж эхэллээ…', 2500, '🌧️'); }
      else { W.target = 0; W.timer = 150 + Math.random() * 200; W.rainbow = 45; toast('Солонго татлаа!', 2500, '🌈'); }
    }
    W.rain += (W.target - W.rain) * Math.min(1, dt * 0.4);
    W.rainbow = Math.max(0, W.rainbow - dt);
    this.rain.userData.target = W.target * (0.85 - night * 0.3);
    updateRain(this.rain, dt, this.player.pos);
    this.audio.rain(W.rain);
    this.rainbow.userData.target = W.rainbow > 0 && W.rain < 0.3 ? Math.min(1, W.rainbow / 8) : 0;
    this.rainbow.position.set(this.player.pos.x - this.sunDir.x * 60, -8, this.player.pos.z - this.sunDir.z * 60 - 40);
    this.rainbow.rotation.y = Math.atan2(-this.sunDir.x, -this.sunDir.z);
    updateRainbow(this.rainbow, dt);
    // Бороонд тэнгэр бүрхэг, гэрэл сул
    if (W.rain > 0.01) {
      const grey = new T.Color(0x9fb0bd);
      this.sky.uniforms.uTop.value.lerp(grey, W.rain * 0.7); this.sky.uniforms.uHorizon.value.lerp(new T.Color(0xc5d0d8), W.rain * 0.7);
      this.scene.fog.color.copy(this.sky.uniforms.uHorizon.value);
      this.sun.intensity *= 1 - W.rain * 0.55; this.hemi.intensity *= 1 - W.rain * 0.25;
      if (Math.random() < dt * 40 * W.rain) this.particles.sparkle(new T.Vector3(this.player.pos.x + (Math.random() - 0.5) * 14, 0.05, this.player.pos.z + (Math.random() - 0.5) * 14), 0xd8f0ff, 1);
    }
    this.flare.position.copy(this.camera.position).addScaledVector(this.sunDir, 380);
    this.flare.visible = day > 0.15 && W.rain < 0.5;
    this.leaves.material.opacity = 0.9 * (1 - W.rain);
    updateLeaves(this.leaves, dt, t, this.player.pos);
    updateButterflies(this.butterflies, dt, t); this.butterflies.visible = W.rain < 0.5 && day > 0.3;
    updateBirds(this.birds, dt, t, this.player.pos);

    this.updateCitizens(dt);
    this.updateAnimals(dt);
    this.updateSeason();
    this.snow.userData.target = this.season === 3 && W.rain < 0.3 ? 0.9 : 0; updateRain(this.snow, dt, this.player.pos);
    // Жимс дахин ургах: 4 минутын дараа нахиалж буцаад гарна
    this.regrowT = (this.regrowT || 0) + dt;
    if (this.regrowT > 1) {
      this.regrowT = 0;
      for (const id of this.state.pollRegrow()) {
        const h = town.harvests.find((x) => x.id === id);
        if (h) { h.obj.visible = h.ring.visible = true; h.grow = 0; this.particles.burst(new T.Vector3(h.x, 0.8, h.z), 0xb8ec9a, 12, { speed: 2, up: 2, size: 0.18, life: 0.7 }); }
      }
      this.state.save();
    }
    for (const h of town.harvests) if (h.obj.visible && h.grow !== undefined && h.grow < 1) { h.grow = Math.min(1, h.grow + dt * 0.8); const k = 1 - Math.pow(1 - h.grow, 3); h.obj.scale.setScalar(0.75 * (0.2 + 0.8 * k)); if (h.grow >= 1) h.grow = undefined; }
    // Усны цагираг: сэлж байхад
    for (const rg of this.rings) { if (!rg.m.visible) continue; rg.t += dt * 1.4; const k = Math.min(1, rg.t); rg.m.scale.setScalar(1 + k * 2.2); rg.m.material.opacity = 0.55 * (1 - k); if (k >= 1) rg.m.visible = false; }
    if (this.player.state === 'swim') {
      this.ringTimer -= dt;
      if (this.ringTimer <= 0) { this.ringTimer = 0.45; const rg = this.rings.find((q) => !q.m.visible); if (rg) { rg.t = 0; rg.m.visible = true; rg.m.position.set(this.player.pos.x, -0.3, this.player.pos.z); rg.m.scale.setScalar(1); } }
    }

    // Зорилгын тэмдэг
    if (this.goalMarker.visible) {
      this.goalMarker.children[0].rotation.z = t;
      this.goalMarker.children[1].position.y = 5 + Math.sin(t * 3) * 0.35;
      this.goalMarker.children[1].rotation.y = t * 1.5;
      if (this.goal && !this.delivery?.active && Math.hypot(this.goal.x - this.player.pos.x, this.goal.z - this.player.pos.z) < 6 && this.state.currentChapter && LANDMARKS[this.state.currentChapter.landmark] !== this.goal) this.setGoal(null);
    }
  }

  updateInteractables(active) {
    let best = null, dBest = Infinity;
    if (active && !this.vehicle) {
      for (const it of this.interactables) {
        if (it.visible && !it.visible()) continue;
        const pos = it.dynamic ? it.dynamic() : it;
        const d = Math.hypot(pos.x - this.player.pos.x, pos.z - this.player.pos.z);
        if (d < it.r && d < dBest) { dBest = d; best = it; }
      }
    }
    this.near = best;
    const ov = this.fishing.active ? this.fishing.promptText : null;   // загас барих үед prompt-ыг дарна, hint нуугдана
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
    pr.classList.toggle('urgent', !!ov && this.fishing.phase === 'bite');
    if (showP) {
      const icon = typeof best?.icon === 'function' ? best.icon() : best?.icon, label = typeof best?.label === 'function' ? best.label() : best?.label;
      $('promptText').textContent = ov ?? (this.vehicle ? 'Машинаас буух' + (this.state.chapter === 4 ? ' · Алтан хаалгаар дарааллаар яв' : '') : icon + ' ' + label);
    }
  }

  updateHudLive() {
    const p = this.player.pos;
    let zone = 'Хотын төв', bestD = 24;
    for (const l of LANDMARKS) { const d = Math.hypot(l.x - p.x, l.z - p.z); if (d < bestD) { bestD = d; zone = l.emoji + ' ' + l.name; } }
    if (Math.abs(p.x - CANAL.x) < 7 && BRIDGES_Z.some((b) => Math.abs(p.z - b) < 5)) zone = '🌉 Сувгийн гүүр';
    const loc = $('locName');
    if (loc.textContent !== zone) loc.textContent = zone;
    if (this.goal) {
      const dx = this.goal.x - p.x, dz = this.goal.z - p.z;
      const ang = Math.atan2(dx, dz) - this.cam.yaw;
      $('compassNeedle').style.transform = `rotate(${-ang + Math.PI}rad)`;
      $('compassDist').textContent = Math.round(Math.hypot(dx, dz)) + ' м';
    }
    this.drawMinimap();
  }

  drawMinimap() {
    const c = $('minimap'), ctx = c.getContext('2d');
    const W = c.width, S = W / 140; // 140 ертөнцийн нэгж = бүтэн зураг
    const p = this.player.pos;
    const mx = (x) => W / 2 + (x - p.x) * S, mz = (z) => W / 2 + (z - p.z) * S;
    ctx.clearRect(0, 0, W, W);
    ctx.save();
    ctx.beginPath(); ctx.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#5fc9dc'; ctx.fillRect(0, 0, W, W);
    ctx.fillStyle = '#9edb7f'; ctx.fillRect(mx(ISLAND.minX), mz(ISLAND.minZ), (ISLAND.maxX - ISLAND.minX) * S, (ISLAND.maxZ - ISLAND.minZ) * S);
    ctx.strokeStyle = '#fbe4ac'; ctx.lineWidth = 15 * S / 1.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(mx(0), mz(-68)); ctx.lineTo(mx(0), mz(44));
    for (const z of BRIDGES_Z) { ctx.moveTo(mx(-55), mz(z)); ctx.lineTo(mx(55), mz(z)); }
    ctx.moveTo(mx(46), mz(-34)); ctx.lineTo(mx(46), mz(-56));
    ctx.stroke();
    ctx.fillStyle = '#66d3e8'; ctx.fillRect(mx(CANAL.x - CANAL.halfW), mz(-70), CANAL.halfW * 2 * S, 115 * S);
    ctx.fillStyle = '#c39a62'; for (const z of BRIDGES_Z) ctx.fillRect(mx(CANAL.x - 6), mz(z - 4.5), 12 * S, 9 * S);
    ctx.font = `${Math.round(11 * S)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const l of LANDMARKS) {
      ctx.fillStyle = l.color; ctx.beginPath(); ctx.arc(mx(l.x), mz(l.z), 7 * S, 0, Math.PI * 2); ctx.fill();
      ctx.fillText(l.emoji, mx(l.x), mz(l.z) + 1);
    }
    // Хураагаагүй жимс
    ctx.fillStyle = '#ff5c5c';
    for (const h of this.town.harvests) if (h.obj.visible) { ctx.beginPath(); ctx.arc(mx(h.x), mz(h.z), 2 * S, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ffd24d';
    for (const k of this.town.packages) if (k.obj.visible) { ctx.beginPath(); ctx.arc(mx(k.x), mz(k.z), 2.5 * S, 0, Math.PI * 2); ctx.fill(); }
    if (this.goal) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(mx(this.goal.x), mz(this.goal.z), 10 * S * (1 + Math.sin(this.clock * 5) * 0.15), 0, Math.PI * 2); ctx.stroke();
    }
    if (this.vehicle === null) { ctx.fillStyle = '#ffa72e'; ctx.beginPath(); ctx.arc(mx(this.town.car.position.x), mz(this.town.car.position.z), 4 * S, 0, Math.PI * 2); ctx.fill(); }
    // Тоглогч — гурвалжин чиглэлтэй
    ctx.translate(W / 2, W / 2); ctx.rotate(Math.PI - this.player.heading);   // heading 0 = +z = зураг дээр доош
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#124f50'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, -9 * S); ctx.lineTo(6 * S, 6 * S); ctx.lineTo(0, 3 * S); ctx.lineTo(-6 * S, 6 * S); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // Камерын харах хүрээ
    ctx.save(); ctx.translate(W / 2, W / 2); ctx.rotate(-this.cam.yaw);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, W / 2, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  render() { this.app.post.setFocus(this.camera.position.distanceTo(this.vehicle ? this.vehicle.position : this.player.pos) + 1); this.app.post.render(); }
}
