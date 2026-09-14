// Jungle Runner: дүрслэл, камер, эффект, HUD. Логик нь RunnerCore-д.
import * as T from 'three';
import { Runner, LANE_W } from './RunnerCore.js';
import { RUNNER_LEVELS, PRODUCTS, FRUITS } from '../core/content.js';
import { createSky } from '../gfx/sky.js';
import { Particles } from '../gfx/particles.js';
import { toon, glow, standard, waterMaterial, PALETTE, outlineGroup } from '../gfx/materials.js';
import { stoneTexture } from '../gfx/textures.js';
import * as P from '../world/props.js';
import { Character } from '../world/character.js';
import { mergeStatic } from '../gfx/merge.js';
import { $, toast, modal, closeModal, isModalOpen, show, pop } from '../core/ui.js';

const GAPS = [154, 298];
const ZONE_NAMES = ['Сүмийн хаалга', 'Усан хавцал', 'Эцсийн сорил', 'Оргил ойртлоо'];

export class RunnerScene {
  constructor(app) {
    this.app = app; this.state = app.state; this.input = app.input; this.audio = app.audio;
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 260);
    this.model = null; this.world = null; this.objects = new Map();
    this.elapsed = 0; this.impact = 0; this.zoneT = 0; this.comboT = 0; this.entered = false; this.level = 0;
    this.build();
  }

  build() {
    const { scene } = this;
    const sky = createSky({ radius: 220 });
    scene.add(sky.mesh); this.sky = sky;
    this.hemi = new T.HemisphereLight(0xfff8dc, 0x48634c, 0.9); scene.add(this.hemi);
    this.sun = new T.DirectionalLight(0xffeed0, 1.4);
    this.sun.position.set(-12, 26, 10); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, { left: -16, right: 16, top: 24, bottom: -24, near: 1, far: 80 });
    this.sun.shadow.bias = -0.001; this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun, this.sun.target);
    scene.fog = new T.FogExp2(0xc0e2d2, 0.009);

    this.character = new Character();
    this.character.root.rotation.y = Math.PI;
    scene.add(this.character.root);
    this.character.onStep = () => { if (this.model?.state === 'playing') { this.audio.step(); this.particles.dust(new T.Vector3(this.model.x, 0, 0), 1, { color: 0x9c8b6a, size: 0.3 }); } };
    this.particles = new Particles(scene, 500);

    // Уяа (зүүгдэх үед)
    this.rope = new T.Group();
    const ropeM = toon(0x6b4a2a, { key: 'rope' });
    const r1 = P.mesh(new T.CylinderGeometry(0.04, 0.04, 3.4, 6), ropeM, this.rope, 0, 5.3, 0);
    P.mesh(new T.CylinderGeometry(0.06, 0.06, 1.1, 8), toon(PALETTE.gold, { key: 'gold' }), this.rope, 0, 3.55, 0).rotation.z = Math.PI / 2;
    this.rope.visible = false; scene.add(this.rope);

    // Бамбай бөмбөлөг
    this.bubble = new T.Mesh(new T.SphereGeometry(1.35, 24, 16), new T.MeshBasicMaterial({ color: 0x7ef2e0, wireframe: true, transparent: true, opacity: 0.18, toneMapped: false }));
    this.bubble.visible = false; scene.add(this.bubble);
    // Соронзны цагираг
    this.magnetRing = new T.Mesh(new T.TorusGeometry(1.4, 0.05, 6, 32), glow(0xc59bff, 1.4));
    this.magnetRing.visible = false; scene.add(this.magnetRing);

    // Агаарт хөвөх навч / гэрлийн ширхэг
    const n = 160, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 30; pos[i * 3 + 1] = 0.5 + Math.random() * 10; pos[i * 3 + 2] = -Math.random() * 70; }
    this.motes = new T.Points(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(pos, 3)), new T.PointsMaterial({ color: 0xffe6a8, size: 0.09, transparent: true, opacity: 0.8, depthWrite: false }));
    scene.add(this.motes);
    // Хурдны зураас
    const sl = new Float32Array(40 * 3);
    for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 6; sl[i * 3] = Math.cos(a) * r; sl[i * 3 + 1] = 2 + Math.sin(a) * r; sl[i * 3 + 2] = -Math.random() * 20; }
    this.speedLines = new T.LineSegments(new T.BufferGeometry(), new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    this.speedLinesPos = sl; this.rebuildSpeedLines(0); scene.add(this.speedLines);

    this.bindUI();
  }

  rebuildSpeedLines(len) {
    const a = new Float32Array(40 * 6);
    for (let i = 0; i < 40; i++) { a[i * 6] = this.speedLinesPos[i * 3]; a[i * 6 + 1] = this.speedLinesPos[i * 3 + 1]; a[i * 6 + 2] = this.speedLinesPos[i * 3 + 2]; a[i * 6 + 3] = a[i * 6]; a[i * 6 + 4] = a[i * 6 + 1]; a[i * 6 + 5] = a[i * 6 + 2] + len; }
    this.speedLines.geometry.setAttribute('position', new T.BufferAttribute(a, 3));
  }

  bindUI() {
    document.querySelectorAll('#rControls [data-action]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.act(b.dataset.action); }));
    $('rPause').onclick = () => this.pause();
    this.unbind = [
      this.input.on('left', () => this.act('left')), this.input.on('right', () => this.act('right')),
      this.input.on('up', () => this.act('jump')), this.input.on('jump', () => this.act('jump')),
      this.input.on('down', () => this.act('slide')), this.input.on('interact', () => this.act('rope')),
      this.input.on('pause', () => { if (this.entered) { if ($('panel').open && $('panel').dataset.closable === '1') closeModal(); else this.pause(); } }),
    ];
  }

  act(a) { if (this.entered && this.model && !isModalOpen()) this.model.action(a); }

  enter() {
    this.entered = true;
    show('runnerHud', true);
    this.app.post.setScene(this.scene); this.app.post.setCamera(this.camera);
    this.resize();
    this.levelSelect();
  }
  exit() {
    this.entered = false;
    show('runnerHud', false);
    this.audio.stopMusic();
    $('vignette').style.opacity = 0;
    this.app.post.flash(0x000000, 0);
  }
  resize() { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); }

  // ---------------------------------------------------------------- Цэсүүд
  levelSelect() {
    const s = this.state.runner;
    const stages = RUNNER_LEVELS.map((l, i) => `<button data-level="${i}" ${i > s.unlocked ? 'disabled' : ''} class="${s.best[i] ? 'done' : ''}" title="${l.name}">${i > s.unlocked ? '🔒' : '0' + (i + 1)}<small>${s.best[i] ? s.best[i] : ''}</small></button>`).join('');
    modal(`<div class="eyebrow">ШИРЭНГИЙН ГҮЙЛТ</div><h1 style="font-size:34px">JUNGLE<br><em style="color:#158851">RUNNER.</em></h1><p>Жимсэн мангасуудыг давж, найман бүтээгдэхүүний цуглуулгаа гүйцээ. 5 үе · хэцүүрэх зам.</p><div class="stages">${stages}</div><p class="hint"><kbd>← →</kbd> Эгнээ · <kbd>↑</kbd> Үсрэх · <kbd>↓</kbd> Гулсах / шумбах · <kbd>E</kbd> Уяанаас зүүгдэх<br>Утсан дээр: шударна эсвэл доод товчнууд.</p><div class="row"><button class="primary" id="rStart">Гүйлтээ эхлэх →</button><button id="rBack" class="ghost">← Хот руу буцах</button></div>`, { closable: false });
    document.querySelectorAll('[data-level]').forEach((b) => b.onclick = () => { this.audio.ui(); this.startLevel(+b.dataset.level); });
    $('rStart').onclick = () => { this.audio.ui(); this.startLevel(Math.min(s.unlocked, 4)); };
    $('rBack').onclick = () => this.backToTown();
    if (!this.model) this.buildLevel(0);
  }

  async backToTown() {
    closeModal();
    await this.app.switchTo('town');
  }

  startLevel(i) {
    closeModal();
    this.level = i;
    this.buildLevel(i);
    this.model.start();
    this.audio.startMusic('runner');
    $('rStage').textContent = `0${i + 1} / 05`;
    $('rWorld').textContent = this.model.config.name;
    this.zoneT = 3; $('rZone').textContent = this.model.config.name; $('rZone').classList.add('on');
    toast('↑ Үсэр · ↓ Гулс · E Зүүгд', 2500, '🏃');
    this.sync();
  }

  pause() {
    if (!this.model || !['playing', 'paused'].includes(this.model.state)) return;
    this.model.pause();
    if (this.model.state === 'paused') {
      this.audio.engine(false);
      modal('<div class="eyebrow">ТҮР ЗОГСЛОО</div><h2>Зам чамайг хүлээнэ.</h2><div class="row"><button class="primary" id="resume">Үргэлжлүүлэх →</button><button id="rMenu">Үе сонгох</button><button id="rBack" class="ghost">← Хот руу</button></div>', { closable: false });
      $('resume').onclick = () => { closeModal(); this.model.pause(); };
      $('rMenu').onclick = () => { closeModal(); this.model.state = 'ready'; this.audio.stopMusic(); this.levelSelect(); };
      $('rBack').onclick = () => this.backToTown();
    }
  }

  end(win) {
    const m = this.model;
    this.audio.stopMusic();
    if (win) { this.state.runnerResult(m.level, m.score, m.collected); this.audio.fanfare(); this.character.cheer(); }
    else this.audio.wrong();
    const chapterUp = this.state.progress();
    this.state.save();
    const total = m.collected.reduce((a, b) => a + b, 0);
    const best = this.state.runner.best[m.level];
    modal(`<div class="medal">${win ? (m.level === 4 ? '🏆' : '✦') : '↻'}</div><div class="eyebrow" style="text-align:center">${win ? 'ҮЕ ДАВЛАА' : 'ДАХИН ОРОЛДООРОЙ'}</div><h2 style="text-align:center">${win ? (m.level === 4 ? 'Ургацын аварга!' : 'Замын эзэн!') : 'Мангасууд хүчтэй байлаа.'}</h2>
      <div class="score-row"><span><small>ОНОО</small><b>${m.score}</b></span><span><small>БҮТЭЭГДЭХҮҮН</small><b>${total}</b></span><span><small>ДАРААЛАЛ</small><b>×${m.bestCombo}</b></span><span><small>РЕКОРД</small><b>${best}</b></span></div>
      ${chapterUp ? '<p class="hint">✨ Хотод шинэ аялал нээгдлээ! +50 од</p>' : ''}
      <div class="row" style="justify-content:center"><button class="primary" id="next">${win && m.level < 4 ? 'Дараагийн үе →' : 'Дахин гүйх →'}</button><button id="rMenu">Үе сонгох</button><button id="rBack" class="ghost">← Хот руу</button></div>`, { closable: false });
    $('next').onclick = () => this.startLevel(win && m.level < 4 ? m.level + 1 : m.level);
    $('rMenu').onclick = () => { closeModal(); this.levelSelect(); };
    $('rBack').onclick = () => this.backToTown();
  }

  // ---------------------------------------------------------------- Ертөнц барих
  buildLevel(level) {
    if (this.world) { this.scene.remove(this.world); this.world.traverse((o) => { if (o.userData.merged) o.geometry.dispose(); }); }
    this.model = new Runner(level);
    const conf = this.model.config;
    const world = new T.Group(); this.world = world; this.scene.add(world); this.objects.clear();
    this.impact = 0; this.elapsed = 0;

    // Тэнгэр, гэрэл, манан
    const sky = new T.Color(conf.sky), fog = new T.Color(conf.fog);
    this.sky.uniforms.uTop.value.copy(sky); this.sky.uniforms.uHorizon.value.copy(fog); this.sky.uniforms.uBottom.value.copy(fog.clone().multiplyScalar(0.8));
    this.sky.uniforms.uSunDir.value.set(-0.35, 0.55, -0.6).normalize();
    this.scene.fog.color.copy(fog); this.scene.fog.density = conf.mist;
    this.sun.color.set(conf.light); this.sun.intensity = level === 1 ? 0.7 : 1.4;
    this.hemi.color.set(level === 1 ? 0x8ea0d8 : 0xfff3d6); this.hemi.groundColor.set(conf.ground); this.hemi.intensity = level === 1 ? 0.6 : 0.85;
    this.motes.material.color.set(level === 1 ? 0xa9c4ff : conf.glow);

    let rng = 17 + level;
    const r = () => { rng = (rng * 1664525 + 1013904223) >>> 0; return rng / 4294967296; };
    const ground = toon(conf.ground, { key: 'rg' + level }), rock = toon(conf.rock, { key: 'rr' + level }), leaf = toon(conf.leaf, { key: 'rl' + level }), leafL = toon(new T.Color(conf.leaf).offsetHSL(0, 0, 0.12).getHex(), { key: 'rll' + level });
    const stoneM = standard(0xd8ccae, { roughness: 0.95 }); stoneM.map = stoneTexture();
    const dark = toon(0x3d4e3a, { key: 'rdark' }), wood = toon(0x7a5233, { key: 'rwood' }), gold = toon(PALETTE.gold, { key: 'gold' });
    const glowM = glow(conf.glow, 1.6);
    const L = conf.length;

    // Газар ба зам
    P.mesh(new T.BoxGeometry(220, 0.6, L + 400), ground, world, 0, -1.2, -L / 2 - 60).receiveShadow = true;
    for (let d = -14; d < L + 90; d += 6) {
      if (GAPS.some((g) => Math.abs(d - g - 6) < 9)) continue;
      const slab = P.mesh(new T.BoxGeometry(8.2, 0.3, 5.85), stoneM, world, 0, -0.15, -d);
      slab.userData.shared = true;
      if (d % 12 === 0) for (const x of [-1.2, 1.2]) P.box(dark, world, x, 0.005, -d, 0.05, 0.02, 3);
      for (const x of [-4.4, 4.4]) P.mesh(new T.BoxGeometry(0.5, 0.45, 5.8), dark, world, x, 0.05, -d);
      if (r() < 0.3) P.mesh(new T.IcosahedronGeometry(0.5, 0), leaf, world, (r() - 0.5) * 7, 0.02, -d + (r() - 0.5) * 4, 1, 0.15, 1).castShadow = false; // хөвд
    }
    // Хажуугийн ширэнгэ
    for (let d = -10; d < L + 90; d += 9) {
      for (const side of [-1, 1]) {
        const x = side * (7.5 + r() * 6);
        if (r() < 0.55) P.palm(world, x, -d - r() * 4, { s: 0.9 + r() * 0.7, seed: d * 3 + side + level * 11 });
        else { const t = P.tree(world, x, -d - r() * 4, { type: level % 4, s: 1 + r() * 0.6, seed: d + side, fruits: r() < 0.4 }); }
        if (r() < 0.7) P.bush(world, side * (5.4 + r() * 2), -d + r() * 5, { s: 0.9 + r() * 0.7, seed: d + side * 5, flowers: r() < 0.35 ? [0xff6a8a, 0xfff08a, 0xffffff][d % 3] : 0 });
        if (r() < 0.35) P.rock(world, side * (6 + r() * 4), -d - 3, { s: 0.8 + r() * 1.5, seed: d + 9, color: conf.rock });
        // Том чулуун хана
        const w = P.mesh(new T.IcosahedronGeometry(2, 1), rock, world, side * (14 + r() * 6), 1.5, -d - 4, 1.4 + r(), 2.2 + r() * 3, 1.6);
        w.rotation.z = side * 0.2; w.castShadow = false;
      }
      // Эртний хаалга + бамбар
      if (d % 54 === 26) {
        for (const x of [-4.8, 4.8]) {
          P.box(rock, world, x, 2.9, -d, 0.8, 5.8, 0.8); P.box(stoneM, world, x, 5.9, -d, 1.3, 0.5, 1.3);
          P.mesh(new T.CylinderGeometry(0.1, 0.13, 0.9, 6), wood, world, x, 4.2, -d + 0.6);
          P.sphere(glowM, world, x, 4.8, -d + 0.6, 0.22, 0.32, 0.22).userData.flame = true;
        }
        P.mesh(new T.TorusGeometry(4.8, 0.32, 8, 28, Math.PI), rock, world, 0, 5.6, -d);
        for (let k = 0; k < 3; k++) P.mesh(new T.IcosahedronGeometry(0.5, 0), leaf, world, -3 + k * 3, 6.1 + (k % 2) * 0.4, -d, 1.2, 0.5, 1);
      }
      // Тотем / хөшөө
      if (d % 90 === 62) { const s = r() < 0.5 ? -1 : 1; P.box(stoneM, world, s * 6.2, 1.5, -d, 1.6, 3, 1.6); P.fruit(level, world, s * 6.2, 3.9, -d, 1.4, { face: true, outline: false }); }
    }
    // Хүрхрээ ба хавцал (уяан гүүр)
    for (const g of GAPS) {
      const wm = waterMaterial(level === 1 ? 0x5f83c4 : 0x6fd0d8); wm.userData.time.value = 0;
      this.waterMats = this.waterMats || []; this.waterMats.push(wm);
      const pool = new T.Mesh(new T.PlaneGeometry(40, 16, 8, 4), wm); pool.rotation.x = -Math.PI / 2; pool.position.set(0, -1.6, -g - 6); world.add(pool);
      for (const side of [-1, 1]) {
        P.box(rock, world, side * 8, 4.5, -g - 6, 3, 12, 4);
        for (let j = 0; j < 3; j++) { const strip = P.mesh(new T.BoxGeometry(0.4, 12, 0.1), new T.MeshStandardMaterial({ color: 0xd8f6ff, transparent: true, opacity: 0.65, roughness: 0.15 }), world, side * 6.3 + j * side * 0.45, 4.5, -g - 3.8); strip.userData.fall = j; strip.castShadow = false; }
        P.mesh(new T.CylinderGeometry(0.25, 0.3, 7, 8), wood, world, side * 4.4, 3.5, -g + 1);
        P.mesh(new T.CylinderGeometry(0.25, 0.3, 7, 8), wood, world, side * 4.4, 3.5, -g - 14);
      }
      // Хөндлөн дам нуруу — уяа зүүгдэнэ
      const beam = P.mesh(new T.CylinderGeometry(0.16, 0.16, 9.6, 8), wood, world, 0, 6.9, -g - 6.5); beam.rotation.z = Math.PI / 2;
      for (let k = -1; k <= 1; k++) P.mesh(new T.CylinderGeometry(0.05, 0.05, 15, 5), wood, world, k * 4.4, 6.2, -g - 6.5).rotation.x = Math.PI / 2;
      // Голын урд анхааруулга
      P.sign(world, 'E · УЯА', 0, 3.2, -g + 12, { width: 4, bg: '#ffd24d', fg: '#3d2a00' });
    }
    // Барианы хаалга
    for (const x of [-4.3, 4.3]) { P.box(gold, world, x, 3, -L, 0.5, 6, 0.5); P.sphere(glowM, world, x, 6.2, -L, 0.4); }
    P.box(gold, world, 0, 5.9, -L, 9, 0.5, 0.5);
    P.sign(world, 'БАРИА', 0, 7.2, -L, { width: 6, bg: '#fff8e0', fg: '#3b6855', border: '#ffd24d' });

    // Объектууд
    for (const o of this.model.objects) {
      let g;
      if (o.type === 'product') { g = P.product(PRODUCTS[o.sku], this.app.productTextures[o.sku], world, 0, 0, 0, 0.85); const halo = P.mesh(new T.TorusGeometry(0.42, 0.02, 6, 28), gold, g, 0, 0.05, 0); halo.rotation.x = Math.PI / 2; g.position.set(o.lane * LANE_W, o.high ? 2.6 : 0.25, -o.d); }
      else if (o.type === 'monster') { g = this.monster(world, level, o.id); g.position.set(o.lane * LANE_W, 0, -o.d); }
      else if (o.type === 'rolling') {
        g = new T.Group(); world.add(g); g.position.set(o.lane * LANE_W, 0.7, -o.d);
        const f = P.fruit(level % 8, g, 0, 0, 0, 1.15, { face: true, outline: false });
        f.rotation.z = 0;
        for (let k = 0; k < 8; k++) P.sphere(gold, g, Math.sin(k * Math.PI / 4) * 0.72, Math.cos(k * Math.PI / 4) * 0.72, 0, 0.08);
        g.userData.inner = f;
      }
      else if (o.type === 'hurdle') { g = new T.Group(); world.add(g); g.position.set(o.lane * LANE_W, 0, -o.d); P.mesh(new T.CylinderGeometry(0.28, 0.28, 2.1, 10), wood, g, 0, 0.55, 0).rotation.z = Math.PI / 2; for (const x of [-0.8, 0.8]) { P.box(wood, g, x, 0.4, 0, 0.16, 0.9, 0.16); P.mesh(new T.ConeGeometry(0.16, 0.25, 6), gold, g, x, 0.95, 0); } for (let k = 0; k < 3; k++) P.mesh(new T.IcosahedronGeometry(0.3, 0), leaf, g, -0.7 + k * 0.7, 0.9, 0, 1, 0.5, 1); }
      else if (o.type === 'beam') { g = new T.Group(); world.add(g); g.position.set(o.lane * LANE_W, 0, -o.d); for (const x of [-1, 1]) P.box(wood, g, x, 1.3, 0, 0.18, 2.6, 0.22); P.box(dark, g, 0, 1.75, 0, 2.2, 0.5, 0.45); for (const x of [-0.6, 0, 0.6]) { P.sphere(gold, g, x, 1.75, 0.28, 0.14); const v = P.mesh(new T.CylinderGeometry(0.03, 0.05, 0.7, 5), leaf, g, x + 0.3, 1.2, 0.1); v.rotation.z = 0.15; } }
      else if (o.type === 'shield' || o.type === 'magnet') { g = new T.Group(); world.add(g); g.position.set(o.lane * LANE_W, 1, -o.d); const col = o.type === 'shield' ? 0x5cf2d2 : 0xc59bff; P.mesh(new T.OctahedronGeometry(0.5), glow(col, 1.3), g); P.mesh(new T.TorusGeometry(0.7, 0.035, 6, 24), gold, g); const halo = P.mesh(new T.TorusGeometry(0.5, 0.02, 6, 28), glow(col, 1.5), g, 0, -0.9, 0); halo.rotation.x = Math.PI / 2; }
      if (g) { g.traverse((m) => { if (m.isMesh) m.castShadow = true; }); this.objects.set(o.id, g); }
    }
    const dyn = new Set(this.objects.values());
    mergeStatic(world, (o) => dyn.has(o) || o.userData.fall !== undefined || o.userData.flame);
    this.sync();
  }

  monster(parent, level, seed) {
    const g = new T.Group(); parent.add(g);
    const type = [1, 2, 3, 0, 7][level];
    const body = P.fruit(type, g, 0, 1, 0, 1.6, { face: false, outline: false });
    // Ууртай нүд, шүд
    const w = toon(0xffffff, { key: 'eyeW' }), k = toon(0x24302c, { key: 'pupil' }), brow = toon(0x2a1d18, { key: 'brow' });
    for (const s of [-1, 1]) {
      P.sphere(w, g, s * 0.38, 1.3, 0.85, 0.2, 0.22, 0.1); P.sphere(k, g, s * 0.36, 1.28, 0.93, 0.1, 0.12, 0.06);
      const b = P.box(brow, g, s * 0.38, 1.6, 0.9, 0.45, 0.1, 0.08); b.rotation.z = s * -0.45;
      P.sphere(toon(FRUITS[type].shade, { key: 'fruitD' + type }), g, s * 0.75, 0.35, 0.2, 0.28, 0.4, 0.28); // хөл
      P.sphere(toon(FRUITS[type].color, { key: 'fruit' + type }), g, s * 0.95, 1.0, 0.1, 0.22, 0.4, 0.22).rotation.z = s * 0.6; // гар
    }
    P.box(brow, g, 0, 0.75, 0.9, 0.6, 0.16, 0.08);
    for (const x of [-0.18, 0.18]) P.box(w, g, x, 0.68, 0.94, 0.12, 0.18, 0.08);
    const lf = P.leaf(g, 0.2, 2.1, 0, 1.6, -0.5); lf.rotation.x = 0.3;
    outlineGroup(g, 0.05);
    g.userData.seed = seed;
    return g;
  }

  // ---------------------------------------------------------------- Update
  update(dt) {
    const m = this.model; if (!m) return;
    this.elapsed += dt;
    const playing = m.state === 'playing' && !isModalOpen();
    if (this.input.swipe && playing) { const map = { left: 'left', right: 'right', up: 'jump', down: 'slide' }; m.action(map[this.input.swipe]); }
    if (playing) {
      m.update(dt);
      for (const e of m.events.splice(0)) this.onEvent(e);
      this.sync();
    }
    this.impact = Math.max(0, this.impact - dt);
    this.zoneT = Math.max(0, this.zoneT - dt); $('rZone').classList.toggle('on', this.zoneT > 0);
    this.comboT = Math.max(0, this.comboT - dt); $('rCombo').classList.toggle('on', this.comboT > 0);
    $('vignette').style.opacity = String(Math.min(1, this.impact * 2));
    this.app.post.flash(0x5cf2d2, m.shield > 0 && m.shield < 0.3 ? 0.2 : 0);

    // Ертөнц урагш гулсана
    this.world.position.z = m.distance;
    const ready = m.state === 'ready';
    const ch = this.character;
    const px = ready ? 0 : m.x, py = ready ? 0 : m.y;
    ch.root.position.set(px, py, ready ? 2 : 0);
    ch.root.rotation.y = ready ? Math.PI + Math.sin(this.elapsed * 0.4) * 0.25 : Math.PI;
    const cstate = ready ? 'idle' : m.hang > 0 ? 'hang' : m.slide > 0 ? 'slide' : m.y > 0.05 ? (m.vy > 0 ? 'jump' : 'fall') : 'run';
    ch.update(dt, { state: cstate, speed: ready ? 0 : 1, lean: (m.lane * LANE_W - m.x) * 0.5 });
    ch.root.visible = !(m.invincible > 0 && Math.floor(this.elapsed * 14) % 2 === 0);
    ch.shadow.position.y = -py + 0.03; ch.shadow.material.opacity = 0.22 * Math.max(0.15, 1 - py * 0.2);
    this.rope.visible = m.hang > 0; this.rope.position.set(m.x, m.y - 2.4, 0);
    if (m.hang > 0) this.rope.rotation.x = Math.sin((1 - m.hang / m.hangTotal) * Math.PI) * 0.35;
    this.bubble.visible = m.shield > 0; this.bubble.position.set(px, py + 1.3, 0); this.bubble.rotation.y = this.elapsed;
    this.magnetRing.visible = m.magnet > 0; this.magnetRing.position.set(px, py + 1.2, 0); this.magnetRing.rotation.x = this.elapsed * 2; this.magnetRing.rotation.y = this.elapsed * 1.3;

    // Объектын animation ба culling
    for (const o of m.objects) {
      const g = this.objects.get(o.id); if (!g) continue;
      const ahead = o.d - m.distance;
      g.visible = !o.done && ahead < 110 && ahead > -6;
      if (!g.visible) continue;
      if (o.type === 'product') { g.rotation.y = this.elapsed * 1.6 + o.id; g.position.y = (o.high ? 2.6 : 0.25) + Math.sin(this.elapsed * 3 + o.id) * 0.12; if (m.magnet > 0 && ahead < 10 && Math.abs(o.lane * LANE_W - m.x) < 4) g.position.x += (m.x - g.position.x) * dt * 6; }
      else if (o.type === 'rolling') { g.position.x = m.obstacleX(o); g.userData.inner.rotation.x = -this.elapsed * 3.5; g.position.y = 0.7 + Math.abs(Math.sin(this.elapsed * 4 + o.id)) * 0.1; }
      else if (o.type === 'monster') { g.position.y = Math.abs(Math.sin(this.elapsed * 3.5 + o.id)) * 0.2; g.rotation.y = Math.sin(this.elapsed * 1.2 + o.id) * 0.2; g.rotation.z = Math.sin(this.elapsed * 4 + o.id) * 0.08; }
      else if (o.type === 'shield' || o.type === 'magnet') { g.rotation.y = this.elapsed * 1.5; g.children[0].rotation.z = this.elapsed; g.position.y = 1.1 + Math.sin(this.elapsed * 3) * 0.15; }
    }
    // Ертөнцийн animation
    if (this.waterMats) for (const w of this.waterMats) w.userData.time.value = this.elapsed;
    this.world.traverse((o) => {
      if (o.userData.fall !== undefined) { o.scale.x = 1 + Math.sin(this.elapsed * 6 + o.userData.fall) * 0.25; o.material.opacity = 0.5 + Math.sin(this.elapsed * 9 + o.userData.fall * 2) * 0.15; }
      if (o.userData.flame) { o.scale.y = 0.32 + Math.sin(this.elapsed * 12 + o.position.x) * 0.06; }
    });
    // Ширхэг, хурдны зураас
    const pa = this.motes.geometry.attributes.position.array;
    for (let i = 0; i < pa.length; i += 3) { pa[i + 1] += (this.level === 2 ? -0.9 : 0.15) * dt; if (pa[i + 1] < 0) pa[i + 1] = 10; if (pa[i + 1] > 11) pa[i + 1] = 0.5; pa[i + 2] += (playing ? m.speed * 0.6 : 1) * dt; if (pa[i + 2] > 6) pa[i + 2] = -70; }
    this.motes.geometry.attributes.position.needsUpdate = true;
    const spd = playing ? m.speedMul - 1 : 0;
    this.speedLines.material.opacity += ((spd > 0.15 ? Math.min(0.35, spd) : 0) - this.speedLines.material.opacity) * Math.min(1, dt * 3);
    if (this.speedLines.material.opacity > 0.01) { this.rebuildSpeedLines(2 + spd * 10); this.speedLines.position.z = (this.elapsed * 40) % 20; }

    // Камер
    const cam = this.camera;
    const tx = ready ? 0 : m.x * 0.28, ty = 4.2 + (m.hang > 0 ? 0.9 : 0) + (m.y > 0 ? m.y * 0.15 : 0) - (m.slide > 0 ? 0.6 : 0);
    cam.position.x += (tx - cam.position.x) * Math.min(1, dt * 4.5);
    cam.position.y += (ty - cam.position.y) * Math.min(1, dt * 3.5);
    const portrait = innerHeight > innerWidth;
    cam.position.z = portrait ? 10.5 : 8.4;
    const fovT = (portrait ? 70 : 58) + (playing ? (m.speedMul - 1) * 30 + m.level * 1.2 : 0) + (m.hang > 0 ? 4 : 0);
    cam.fov += (fovT - cam.fov) * Math.min(1, dt * 3); cam.updateProjectionMatrix();
    cam.lookAt(m.x * 0.15, 1.3 + (m.hang > 0 ? 0.6 : 0), -14);
    if (this.impact > 0) { cam.position.x += Math.sin(this.elapsed * 70) * this.impact * 0.12; cam.position.y += Math.cos(this.elapsed * 55) * this.impact * 0.08; }
    cam.rotation.z = (m.lane * LANE_W - m.x) * -0.02;
    this.sun.target.position.set(0, 0, -10);

    // HUD
    const rope = playing && m.hang <= 0 && m.objects.some((o) => o.type === 'gap' && !o.done && o.d - m.distance < 24 && o.d - m.distance > 0);
    $('ropePrompt').classList.toggle('hidden', !rope);
    $('rPowers').innerHTML = [m.shield > 0 ? `<span class="cyan">🛡 БАМБАЙ ${Math.ceil(m.shield)}с</span>` : '', m.magnet > 0 ? `<span>🧲 СОРОНЗ ${Math.ceil(m.magnet)}с</span>` : ''].join('');
    this.particles.update(dt, cam);
  }

  onEvent(e) {
    const m = this.model;
    switch (e.kind) {
      case 'collect': {
        this.audio.pickup(e.sku);
        this.particles.burst(new T.Vector3(e.lane * LANE_W, e.high ? 2.6 : 0.6, 0), FRUITS[PRODUCTS[e.sku].fruit].color, 10, { speed: 3, up: 3, size: 0.2, life: 0.6 });
        pop($('rScore'));
        if (m.combo >= 6) { $('rCombo').textContent = `×${e.mult} · ${m.combo} ДАРААЛСАН`; this.comboT = 1.2; pop($('rCombo')); }
        break;
      }
      case 'hurt': this.impact = 0.6; this.audio.hurt(); this.particles.burst(new T.Vector3(m.x, 1.2, 0), 0xff5a4a, 16); toast('−1 ♥ · Дараагийн саадыг ажигла!', 1500, '💥'); pop($('rLives')); break;
      case 'shieldBreak': this.impact = 0.2; this.audio.shield(); this.particles.burst(new T.Vector3(m.x, 1.3, 0), 0x5cf2d2, 26, { speed: 5 }); toast('Бамбай хамгааллаа!', 1400, '🛡'); break;
      case 'shield': this.audio.shield(); toast('Бамбай 14 сек!', 1400, '🛡'); this.particles.burst(new T.Vector3(m.x, 1.3, 0), 0x5cf2d2, 16); break;
      case 'magnet': this.audio.shield(); toast('Соронз 10 сек!', 1400, '🧲'); this.particles.burst(new T.Vector3(m.x, 1.3, 0), 0xc59bff, 16); break;
      case 'jump': this.audio.jump(); this.particles.dust(new T.Vector3(m.x, 0, 0), 4, { color: 0x9c8b6a }); break;
      case 'land': this.audio.land(); this.particles.dust(new T.Vector3(m.x, 0, 0), 4, { color: 0x9c8b6a }); break;
      case 'slide': this.audio.whoosh(); this.particles.dust(new T.Vector3(m.x, 0, 0.5), 6, { color: 0x9c8b6a }); break;
      case 'lane': this.audio.noise({ dur: 0.08, vol: 0.04, hp: 1500 }); break;
      case 'rope': this.audio.tone({ f: 700, f2: 1100, type: 'triangle', dur: 0.2, vol: 0.1 }); toast('Уяанаас зүүгдлээ!', 1200, '🪢'); break;
      case 'noRope': toast('Уяа ойртсон үед E дар', 1200, '⚠️'); break;
      case 'nearMiss': this.audio.tone({ f: 1200, type: 'sine', dur: 0.06, vol: 0.06 }); break;
      case 'zone': this.zoneT = 3; $('rZone').textContent = ZONE_NAMES[Math.min(3, e.zone - 1)]; break;
      case 'won': this.end(true); break;
      case 'lost': this.end(false); break;
    }
  }

  sync() {
    const m = this.model;
    $('rScore').textContent = m.score;
    $('rCount').textContent = m.collected.reduce((a, b) => a + b, 0);
    $('rLives').textContent = '♥'.repeat(Math.max(0, m.lives)) + '♡'.repeat(Math.max(0, 3 - m.lives));
    $('rProgress').style.width = Math.min(100, m.distance / m.config.length * 100) + '%';
  }

  render() { this.app.post.render(); }
}
