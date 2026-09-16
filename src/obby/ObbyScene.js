// «ASMR цамхаг»: пастел спираль цамхаг, гишгэх бүрд зөөлөн ноот/pop, платформ хавчийж тэлнэ, checkpoint, хугацаа. RunnerScene API.
import * as T from 'three';
import { generateTower, landOn, supportAt, moveOffset, ObbyRun, TYPES, PLATFORMS_N } from './ObbyCore.js';
import { createAvatar } from '../world/avatar.js';
import { Particles } from '../gfx/particles.js';
import { curveTree, toon, glow } from '../gfx/materials.js';
import { createSky } from '../gfx/sky.js';
import * as P from '../world/props.js';
import { RemotePlayers } from '../net/remote.js';
import { packState } from '../net/proto.js';
import { $, toast, modal, closeModal, isModalOpen, show } from '../core/ui.js';

const WALK = 5.2, RUN = 8.2, ACCEL = 30, DECEL = 40, GRAVITY = 24, JUMP_V = 8.4, COYOTE = 0.12, BUFFER = 0.14;

export class ObbyScene {
  constructor(app) {
    this.app = app; this.state = app.state; this.input = app.input; this.audio = app.audio;
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(55, innerWidth / innerHeight, 0.3, 400);
    this.entered = false; this.clock = 0;
    this.player = { pos: new T.Vector3(), vel: new T.Vector3(), y: 0, yVel: 0, grounded: true, jumps: 0, coyote: 0, buffer: 0, heading: 0, state: 'idle', on: null };
    this.cam = { yaw: 0.4, pitch: 0.38, dist: 8 };
    this.build();
  }
  get net() { return this.app.scenes.town.net; }

  build() {
    const { scene } = this;
    const sky = createSky({ radius: 300, top: 0xc9b6ff, horizon: 0xffd6ec, bottom: 0xbfeee8 }); scene.add(sky.mesh); this.sky = sky;
    scene.fog = new T.Fog(0xf3d9f0, 60, 160);
    scene.add(new T.HemisphereLight(0xfff4ff, 0xd8c8f0, 1.25));
    const sun = new T.DirectionalLight(0xfff0e0, 1.1); sun.position.set(20, 60, 10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 90, bottom: -10, near: 1, far: 140 }); sun.shadow.bias = -0.001; scene.add(sun, sun.target); this.sun = sun;
    this.particles = new Particles(scene, 500);
    this.tower = generateTower(11);
    this.plats = new Map();
    this.buildTower();
    // Зөөлөн үүл, бөмбөлөг (motes)
    const n = 200, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.3, r = 4 + Math.random() * 22; pos[i * 3] = Math.sin(a) * r; pos[i * 3 + 1] = Math.random() * 70; pos[i * 3 + 2] = Math.cos(a) * r; }
    this.motes = new T.Points(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(pos, 3)), new T.PointsMaterial({ color: 0xffffff, size: 0.18, transparent: true, opacity: 0.55, depthWrite: false })); scene.add(this.motes);
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.3, r = 26 + (i % 3) * 8; const c = P.sphere(toon(0xffffff, { key: 'obbyCloud' }), scene, Math.sin(a) * r, 6 + (i * 5.3) % 60, Math.cos(a) * r, 3 + (i % 3), 1.4, 2.2 + (i % 2)); c.castShadow = false; }
    this.remote = new RemotePlayers(this, 3);
    this.net.on('hello', (id, p) => this.remote.add(id, p)).on('state', (id, arr) => this.remote.onState(id, arr)).on('peerLeave', (id) => this.remote.remove(id));
    this.buildAvatar(this.state.settings.avatar);
    $('obbyExit').onclick = () => this.leave(); $('obbyRestart').onclick = () => this.newRun();
  }
  buildTower() {
    const { scene } = this;
    // Төв багана (пастел цагирагтай)
    const top = this.tower[this.tower.length - 1].y + 6;
    P.mesh(new T.CylinderGeometry(3.2, 3.6, top + 4, 24), toon(0xf6e8ff, { key: 'obbyCol' }), scene, 0, top / 2 - 2, 0).receiveShadow = true;
    for (let y = 2; y < top; y += 4) P.mesh(new T.TorusGeometry(3.45, 0.18, 8, 32), toon([0xffc2e2, 0xc7e8ff, 0xd9ffd6][Math.floor(y / 4) % 3], { key: 'obbyRing' + (Math.floor(y / 4) % 3) }), scene, 0, y, 0).rotation.x = Math.PI / 2;
    // Газар: зөөлөн диск + элсэн тойрог
    const g = P.mesh(new T.CylinderGeometry(24, 26, 1.2, 40), toon(0xd9ffd6, { key: 'obbyGround' }), scene, 0, -0.6, 0); g.receiveShadow = true;
    for (const p of this.tower) {
      const def = TYPES[p.type];
      const grp = new T.Group(); grp.position.set(p.x, p.y, p.z); scene.add(grp);
      const color = p.type === 'check' ? 0xffe38a : p.type === 'jelly' ? 0xa0f0d8 : p.type === 'sand' ? 0xf5dcb0 : p.type === 'slime' ? 0xb8ff9a : p.color;
      const mat = p.type === 'jelly' || p.type === 'slime' ? new T.MeshToonMaterial({ color, transparent: true, opacity: 0.85 }) : toon(color, { key: 'obbyP' + p.id });
      const geo = p.type === 'pop' ? new T.CylinderGeometry(def.w / 2, def.w / 2, 0.6, 24) : new T.BoxGeometry(def.w, 0.6, def.d);
      const m = P.mesh(geo, mat, grp, 0, 0, 0); m.receiveShadow = true;
      if (p.type === 'check') { P.mesh(new T.CylinderGeometry(0.05, 0.05, 2.2, 6), toon(0xffffff, { key: 'obbyPole' }), grp, def.w / 2 - 0.3, 1.4, -def.d / 2 + 0.3); const flag = P.mesh(new T.PlaneGeometry(0.9, 0.55), new T.MeshBasicMaterial({ color: 0xff7ab8, side: T.DoubleSide, toneMapped: false }), grp, def.w / 2 - 0.3 + 0.45, 2.2, -def.d / 2 + 0.3); flag.userData.flag = true; grp.userData.flag = flag; }
      if (p.type === 'jelly') for (let k = 0; k < 6; k++) P.sphere(glow(0xffffff, 0.6), grp, (Math.random() - 0.5) * 1.4, 0.1 + Math.random() * 0.2, (Math.random() - 0.5) * 1.4, 0.08);
      if (p.type === 'pop') for (let k = 0; k < 7; k++) { const a = k / 7 * 6.3; P.sphere(toon(0xffffff, { key: 'obbyBubble' }), grp, Math.sin(a) * 0.75, 0.32, Math.cos(a) * 0.75, 0.22, 0.12, 0.22).userData.bubble = true; }
      if (p.type === 'slime') P.mesh(new T.BoxGeometry(def.w, 0.08, def.d), new T.MeshToonMaterial({ color: 0xe0ffc8, transparent: true, opacity: 0.6 }), grp, 0, 0.34, 0);
      if (p.type === 'sand') for (let k = 0; k < 5; k++) P.sphere(toon(0xe8c98a, { key: 'obbySandBall' }), grp, (Math.random() - 0.5) * 1.6, 0.35, (Math.random() - 0.5) * 1.6, 0.12, 0.08, 0.12);
      const ring = P.mesh(new T.TorusGeometry(def.w * 0.7, 0.06, 6, 32), glow(color, 1.2), grp, 0, 0.32, 0); ring.rotation.x = Math.PI / 2; ring.visible = false; ring.castShadow = false;
      const label = P.mesh(new T.PlaneGeometry(0.6, 0.6), new T.MeshBasicMaterial({ transparent: true, opacity: 0, toneMapped: false }), grp, 0, 0.31, 0);
      this.plats.set(p.id, { p, grp, mesh: m, ring, squash: 0, ringT: 0, base: color, mat });
    }
  }
  buildAvatar(kind) {
    if (this.character) this.scene.remove(this.character.root);
    this.character = createAvatar(kind, {}, this.state.wardrobe.equipped);
    this.scene.add(this.character.root); curveTree(this.character.root);
    this.character.onStep = () => this.audio.step();
  }

  // ---------------------------------------------------------------- Орох/гарах
  enter() {
    this.entered = true; show('obbyHud', true); show('touchHud', true); document.body.classList.add('obby');
    this.app.post.setScene(this.scene); this.app.post.setCamera(this.camera); this.resize();
    this.audio.startMusic('winter'); this.newRun();
    toast('Дээшээ авир! Гишгэх бүр аялгуу 🎵 · Space/↑ үсрэх (давхар үсрэлт) · унавал checkpoint-с', 4500, '🍬');
  }
  exit() { this.entered = false; show('obbyHud', false); show('touchHud', false); document.body.classList.remove('obby'); this.audio.stopMusic(); closeModal(); }
  resize() { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); }
  async leave() { await this.app.switchTo('town'); }
  newRun() {
    this.run = new ObbyRun(this.tower); const s = this.run.spawn;
    this.player.pos.set(s.x, s.y, s.z); this.player.y = s.y; this.player.vel.set(0, 0, 0); this.player.yVel = 0; this.player.grounded = true; this.player.on = this.tower[0];
    this.cam.yaw = Math.atan2(s.x, s.z) + Math.PI; this.done = false; closeModal(); this.updateHud();
  }

  // ---------------------------------------------------------------- Update
  update(dt) {
    if (!this.entered) return;
    this.clock += dt; const t = this.clock;
    const active = !isModalOpen(), input = this.input, P = this.player, run = this.run;
    run.tick(dt);
    if (active) { this.cam.yaw -= input.look.dx; this.cam.pitch = T.MathUtils.clamp(this.cam.pitch + input.look.dy, 0.05, 1.2); if (input.zoom) this.cam.dist = T.MathUtils.clamp(this.cam.dist + input.zoom * 0.6, 4, 14); }
    // Хөдөлгөөн (камерын чиглэлээр), слайм дээр гулсамтгай
    const axis = active && !this.done ? input.axis() : { x: 0, y: 0 }, len = Math.hypot(axis.x, axis.y);
    const sprint = active && (input.held('run') || (input.isTouch && len > 0.92));
    let wx = 0, wz = 0;
    if (len > 0.05) { wx = axis.x * Math.cos(this.cam.yaw) + axis.y * Math.sin(this.cam.yaw); wz = -axis.x * Math.sin(this.cam.yaw) + axis.y * Math.cos(this.cam.yaw); const l = Math.hypot(wx, wz); wx /= l; wz /= l; }
    const slippery = P.grounded && P.on?.type === 'slime';
    const maxSpeed = sprint ? RUN : WALK, want = Math.min(1, len) * maxSpeed;
    const accel = (len > 0.05 ? ACCEL : DECEL) * (P.grounded ? (slippery ? 0.18 : 1) : 0.45), ka = Math.min(1, accel * dt / maxSpeed * 2.2);
    P.vel.x += (wx * want - P.vel.x) * ka; P.vel.z += (wz * want - P.vel.z) * ka;
    // Үсрэлт: coyote + buffer, давхар үсрэлт
    P.coyote = P.grounded ? COYOTE : Math.max(0, P.coyote - dt); P.buffer = Math.max(0, P.buffer - dt);
    if (active && !this.done && input.justPressed('jump')) P.buffer = BUFFER;
    if (P.buffer > 0 && (P.coyote > 0 || P.jumps < 1)) {
      const dbl = P.coyote <= 0;
      P.yVel = JUMP_V * (dbl ? 0.9 : 1); P.grounded = false; P.coyote = 0; P.buffer = 0; P.jumps = dbl ? 1 : 0;
      if (dbl) { this.character.flip?.(); this.particles.burst(P.pos.clone().add(new T.Vector3(0, 0.3, 0)), 0xffffff, 10, { speed: 2, up: 0.5, size: 0.14, life: 0.5, gravity: 2 }); }
      this.audio.jump(); this.audio.tone({ f: 520, f2: 780, type: 'sine', dur: 0.12, vol: 0.05 });
      if (P.on) this.squash(P.on.id, 0.5);
      P.on = null;
    }
    // Босоо
    const yPrev = P.y;
    P.yVel -= GRAVITY * dt; P.y += P.yVel * dt;
    const carry = P.on && P.grounded ? moveOffset(P.on, t) : null, carryPrev = P.on && P.grounded ? moveOffset(P.on, t - dt) : null;
    if (carry) { P.pos.x += carry.x - carryPrev.x; P.pos.z += carry.z - carryPrev.z; }
    P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt;
    if (P.yVel <= 0) {
      const hit = landOn(this.tower, P.pos.x, P.pos.z, yPrev, P.y, t, new Set(run.crumbled.keys()));
      if (hit) { if (!P.grounded) this.onLand(hit.p, -P.yVel); P.y = hit.top; P.yVel = 0; P.grounded = true; P.jumps = 0; P.on = hit.p; }
      else if (P.grounded) { const sup = supportAt(this.tower, P.pos.x, P.pos.z, P.y, t, new Set(run.crumbled.keys())); if (sup) { P.y = sup.top; P.yVel = 0; } else { P.grounded = false; P.on = null; } }
    }
    // Унах → checkpoint
    if (run.fell(P.y) || P.y < -12) this.fall();
    P.pos.y = P.y;
    const sp = Math.hypot(P.vel.x, P.vel.z);
    if (sp > 0.4) { const h = Math.atan2(P.vel.x, P.vel.z); P.heading += Math.atan2(Math.sin(h - P.heading), Math.cos(h - P.heading)) * Math.min(1, dt * 12); }
    P.state = !P.grounded ? (P.yVel > 0.5 ? 'jump' : 'fall') : sp > 0.4 ? (sp > WALK + 0.6 ? 'run' : 'walk') : 'idle';
    this.character.update(dt, { state: P.state, speed: sp / RUN });
    this.character.root.position.copy(P.pos); this.character.root.rotation.y = P.heading;
    this.character.shadow && (this.character.shadow.material.opacity = P.grounded ? 0.22 : 0.1);
    // Платформын анимаци
    for (const v of this.plats.values()) {
      const p = v.p, off = moveOffset(p, t);
      v.grp.position.set(p.x + off.x, p.y, p.z + off.z);
      if (v.squash > 0) { v.squash -= dt * 4; const k = Math.max(0, v.squash), s = Math.sin(k * Math.PI); v.mesh.scale.set(1 + s * 0.12, 1 - s * 0.35, 1 + s * 0.12); } else v.mesh.scale.set(1, 1, 1);
      if (v.ringT > 0) { v.ringT -= dt; v.ring.visible = true; const k = 1 - v.ringT / 0.5; v.ring.scale.setScalar(1 + k * 1.6); v.ring.material.opacity = 1 - k; v.ring.material.transparent = true; } else v.ring.visible = false;
      const crumbled = run.crumbled.has(p.id); v.grp.visible = !crumbled || run.crumbled.get(p.id) < 0.6; if (crumbled) v.grp.scale.setScalar(Math.min(1, (0.6 - run.crumbled.get(p.id)) / 0.6 + 0.05));
      else v.grp.scale.setScalar(1);
      if (p.type === 'jelly') v.mesh.position.y = Math.sin(t * 2 + p.phase) * 0.04;
      if (v.grp.userData.flag) v.grp.userData.flag.rotation.y = Math.sin(t * 5 + p.phase) * 0.25;
    }
    if (this.crumbleT !== undefined && this.crumbleT > 0) { this.crumbleT -= dt; if (this.crumbleT <= 0 && this.crumblePending !== undefined) { const id = this.crumblePending; run.crumble(id); const v = this.plats.get(id); this.particles.burst(v.grp.position.clone().add(new T.Vector3(0, 0.4, 0)), 0xe8c98a, 18, { speed: 2, up: 1, size: 0.14, life: 0.8, gravity: 6 }); this.audio.noise({ dur: 0.25, vol: 0.06, hp: 300, lp: 2500 }); this.crumblePending = undefined; } }
    // Камер: орбит
    const h = Math.sin(this.cam.pitch) * this.cam.dist, r = Math.cos(this.cam.pitch) * this.cam.dist;
    const desired = new T.Vector3(P.pos.x + Math.sin(this.cam.yaw) * r, P.y + 1.6 + h, P.pos.z + Math.cos(this.cam.yaw) * r);
    this.camera.position.lerp(desired, Math.min(1, dt * 9)); this.camera.lookAt(P.pos.x, P.y + 1.2, P.pos.z);
    this.sun.position.set(P.pos.x + 20, P.y + 60, P.pos.z + 10); this.sun.target.position.set(P.pos.x, P.y, P.pos.z);
    this.motes.rotation.y = t * 0.02; this.sky.uniforms.uTime.value = t;
    this.particles.update(dt, this.camera);
    // Net
    if (this.net.active) { this.netTick = (this.netTick || 0) + dt; if (this.netTick >= 1 / 15) { this.netTick = 0; this.net.sendState(packState({ x: P.pos.x, y: P.y, z: P.pos.z, h: P.heading, anim: P.state, speed: sp / RUN, inCar: false, zone: 3 })); } this.remote.update(dt); }
    this.hudT = (this.hudT || 0) + dt; if (this.hudT > 0.15) { this.hudT = 0; this.updateHud(); }
  }

  /** Буулт: ноот, хавчилт, цагираг, төрлийн эффект */
  onLand(p, speed) {
    const run = this.run, v = this.plats.get(p.id), r = run.land(p);
    this.squash(p.id, 1); v.ringT = 0.5;
    const vol = Math.min(0.14, 0.05 + speed * 0.008);
    this.audio.tone({ f: r.note, type: 'sine', dur: 0.35, vol }); this.audio.tone({ f: r.note * 2, type: 'triangle', dur: 0.2, vol: vol * 0.35, delay: 0.02 });
    this.audio.noise({ dur: 0.05, vol: 0.03, hp: 1500, lp: 6000 });
    this.particles.burst(v.grp.position.clone().add(new T.Vector3(0, 0.4, 0)), v.base, 8, { speed: 1.4, up: 1.2, size: 0.1, life: 0.45, gravity: 3 });
    if (p.type === 'jelly') { this.player.yVel = JUMP_V * TYPES.jelly.bounce; this.player.grounded = false; this.player.jumps = 0; this.player.on = null; this.audio.tone({ f: 200, f2: 900, type: 'sine', dur: 0.25, vol: 0.09 }); this.character.flip?.(); this.particles.burst(v.grp.position.clone().add(new T.Vector3(0, 0.5, 0)), 0xa0f0d8, 14, { speed: 2.5, up: 3, size: 0.14, life: 0.6, gravity: 3 }); }
    if (p.type === 'pop') { for (let i = 0; i < 4; i++) this.audio.tone({ f: 1400 + Math.random() * 600, type: 'square', dur: 0.03, vol: 0.05, delay: i * 0.045 }); v.grp.children.forEach((c) => { if (c.userData.bubble) c.scale.y = 0.03; }); }
    if (p.type === 'sand') { this.crumblePending = p.id; this.crumbleT = TYPES.sand.crumble; this.audio.noise({ dur: 0.15, vol: 0.04, hp: 400, lp: 3000 }); }
    if (p.type === 'slime') this.audio.tone({ f: 300, f2: 180, type: 'sine', dur: 0.2, vol: 0.06 });
    if (r.checkpoint) {
      [523, 659, 784, 1047].forEach((f, i) => this.audio.tone({ f, type: 'triangle', dur: 0.3, vol: 0.12, delay: i * 0.08 }));
      this.character.cheer?.(); this.particles.burst(v.grp.position.clone().add(new T.Vector3(0, 1.5, 0)), 0xffe38a, 24, { speed: 3, up: 3, size: 0.16, life: 0.9, gravity: 4 });
      this.state.stars += r.stars; this.state.save(); this.app.scenes.town.updateHUD?.();
      if (r.finish) this.finish(); else toast(`Checkpoint ${p.id / 10}/5 · +${r.stars} од`, 2000, '🚩');
    }
  }
  squash(id, k) { const v = this.plats.get(id); if (v) v.squash = Math.max(v.squash, k); }
  fall() {
    const s = this.run.respawn();
    this.audio.tone({ f: 600, f2: 200, type: 'sine', dur: 0.4, vol: 0.08 });
    this.player.pos.set(s.x, s.y, s.z); this.player.y = s.y; this.player.vel.set(0, 0, 0); this.player.yVel = 0; this.player.grounded = true; this.player.on = this.tower[this.run.checkpoint];
    this.app.post.flash(0xffffff, 0.5); setTimeout(() => this.app.post.flash(0xffffff, 0), 120);
    toast('Оо! Checkpoint-с дахин 🍬', 1400, '💫');
  }
  finish() {
    this.done = true; const r = this.run, st = this.state;
    const prev = st.obby?.best; st.obby = { best: prev ? Math.min(prev, r.time) : r.time, runs: (st.obby?.runs || 0) + 1 }; st.save();
    this.audio.fanfare(); this.app.scenes.town.feat?.(`ASMR цамхагийг ${fmtT(r.time)}-д давлаа!`, '🍬');
    for (let i = 0; i < 3; i++) setTimeout(() => this.particles.burst(this.player.pos.clone().add(new T.Vector3((Math.random() - 0.5) * 3, 2, (Math.random() - 0.5) * 3)), [0xff7ab8, 0xffe38a, 0xa0f0d8][i], 30, { speed: 4, up: 5, size: 0.18, life: 1.2, gravity: 4 }), i * 250);
    setTimeout(() => modal(`<div class="reward">🏆</div><h2>Цамхагийн оройд гарлаа!</h2><p>Хугацаа <b>${fmtT(r.time)}</b> · Уналт <b>${r.falls}</b> · ⭐ <b>+${r.stars}</b> од</p><p class="hint">Рекорд: ${fmtT(st.obby.best)}</p><div class="row"><button id="obbyAgain" class="primary">🔁 Дахин</button><button id="obbyHome" class="ghost">🏠 Хот руу</button></div>`, { closable: false }), 900);
    setTimeout(() => { $('obbyAgain').onclick = () => this.newRun(); $('obbyHome').onclick = () => { closeModal(); this.leave(); }; }, 950);
  }
  updateHud() {
    const r = this.run; if (!r) return;
    $('obbyTime').textContent = fmtT(r.time); $('obbyCheck').textContent = `🚩 ${r.checkpoint / 10}/5`;
    $('obbyHeight').textContent = `⬆ ${Math.max(0, Math.round(this.player.y))} м`; $('obbyFalls').textContent = `💫 ${r.falls}`;
    $('obbyProg').style.width = (this.player.on ? this.player.on.id : r.checkpoint) / (PLATFORMS_N - 1) * 100 + '%';
  }
  render() { this.app.post.setFocus(this.camera.position.distanceTo(this.player.pos) + 1); this.app.post.render(); }
}
function fmtT(s) { const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(1).padStart(4, '0')}`; }
