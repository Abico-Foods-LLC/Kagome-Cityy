// «Хортон хамгаалалт» scene: DefenseCore-ийн логикийг дүрсэлж, тоглогчийн хөдөлгөөн/буудалт, HUD, дэлгүүр, дуусгал. RunnerScene-тэй ижил API.
import * as T from 'three';
import { DefenseCore, SHOP, PESTS, MAP_R, BASE_R } from './DefenseCore.js';
import { buildDefenseWorld, updateEnvironment, setBaseMood, createFence, createSprayer, createBlob } from './defenseWorld.js';
import { createPest, updatePest, createGuard, createPlayerSprayer } from './pests.js';
import { createAvatar } from '../world/avatar.js';
import { Particles } from '../gfx/particles.js';
import { curveTree } from '../gfx/materials.js';
import { Bubbles } from '../world/bubble.js';
import { $, toast, modal, closeModal, isModalOpen, show } from '../core/ui.js';
import { RemotePlayers } from '../net/remote.js';
import { packState } from '../net/proto.js';

const WALK = 5.6, RUN = 9.4, ACCEL = 34, DECEL = 42, AIM_R = 16, BLOB_SPEED = 30, CAM_DIST = 6.2, GRAVITY = 24, JUMP_V = 8;

export class DefenseScene {
  constructor(app) {
    this.app = app; this.state = app.state; this.input = app.input; this.audio = app.audio;
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(55, innerWidth / innerHeight, 0.3, 300);
    this.entered = false; this.clock = 0;
    this.player = { pos: new T.Vector3(0, 0, 10), vel: new T.Vector3(), heading: Math.PI, state: 'idle', fireCd: 0, y: 0, yVel: 0, grounded: true };
    this.ads = false; this.spread = 0; this.fov = 55; this.killFeed = [];
    this.cam = { yaw: 0.2, pitch: 0.45, dist: 10 };
    this.pests = new Map(); this.structs = new Map(); this.guards = new Map(); this.blobs = [];
    this.defPeers = new Map();   // co-op: байшинд байгаа peer → орсон цаг
    this.build();
  }
  get net() { return this.app.scenes.town.net; }
  get coop() { return this.net.active && this.defPeers.size > 0; }
  /** Session host = байшинд хамгийн эрт орсон */
  get isHost() {
    if (!this.net.active) return true;
    let best = this.net.selfId, at = this.defAt;
    for (const [id, t] of this.defPeers) if (t < at || (t === at && id < best)) { best = id; at = t; }
    return best === this.net.selfId;
  }

  build() {
    this.world = buildDefenseWorld(this.scene);
    this.particles = new Particles(this.scene, 500);
    this.bubbles = new Bubbles(this.scene, (icon) => this.app.scenes.town.hintTexture(icon));
    this.dying = [];
    this.tracers = []; this.muzzleLight = new T.PointLight(0xd8ffa0, 0, 6, 2); this.scene.add(this.muzzleLight);
    this.flash = createBlob(this.scene, 0xf0ffb0); this.flash.visible = false; this.flash.material = this.flash.material.clone(); this.flash.material.transparent = true; this.flash.material.opacity = 0.85;
    this.remote = new RemotePlayers(this, 2);
    const net = this.net;
    net.on('hello', (id, p) => this.remote.add(id, p)).on('state', (id, arr) => this.remote.onState(id, arr))
      .on('peerLeave', (id) => { this.remote.remove(id); this.defPeers.delete(id); })
      .on('def', (d, from) => this.onDef(d, from));
    this.buildAvatar(this.state.settings.avatar);
    this.bindUI();
  }
  buildAvatar(kind) {
    if (this.character) this.scene.remove(this.character.root);
    this.character = createAvatar(kind, {}, this.state.wardrobe.equipped);
    this.scene.add(this.character.root); curveTree(this.character.root);
    // Цацуур баруун гарт: гар урагш өргөгдөхөд хошуу урагш заана (rotation.x = π/2 → +z хошуу гарын −y дагуу)
    const spr = createPlayerSprayer(); const ch = this.character;
    const hand = ch.arms?.[1]?.elbow || ch.arms?.[1]?.sh || ch.torso || ch.root;
    spr.position.set(0, ch.arms?.[1]?.elbow ? -0.5 : -0.42, 0.06); spr.rotation.x = Math.PI / 2; hand.add(spr);
    this.sprayer = spr; this.nozzle = spr.children[spr.children.length - 1];
    this.character.onStep = () => this.audio.step();
  }
  bindUI() {
    const canvas = this.app.renderer.domElement;
    // Хулгана: товшоод түгжинэ (shift-lock), дараа нь хулганы хөдөлгөөн = чиглүүлэлт, зүүн товч = буудах
    canvas.addEventListener('mousedown', (e) => { if (!this.entered || e.button !== 0 || isModalOpen()) return; if (document.pointerLockElement !== canvas && !this.input.isTouch) { canvas.requestPointerLock?.(); return; } this.firing = true; });
    canvas.addEventListener('mouseup', (e) => { if (e.button === 0) this.firing = false; if (e.button === 2) this.ads = false; });
    canvas.addEventListener('mousedown', (e) => { if (this.entered && e.button === 2) this.ads = true; });
    canvas.addEventListener('contextmenu', (e) => { if (this.entered) e.preventDefault(); });
    $('adsBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); this.ads = !this.ads; $('adsBtn').classList.toggle('on', this.ads); });
    document.addEventListener('mousemove', (e) => { if (this.entered && document.pointerLockElement === canvas) { const k = this.ads ? 0.55 : 1; this.input.look.dx += e.movementX * 0.0022 * k; this.input.look.dy += e.movementY * 0.0016 * k; } });
    document.addEventListener('pointerlockchange', () => { if (this.entered) $('crosshair').classList.toggle('locked', document.pointerLockElement === canvas); });
    $('defStart').onclick = () => this.startWave();
    $('defShopBtn').onclick = () => this.shopModal();
    $('defExit').onclick = () => this.leave();
  }

  // ---------------------------------------------------------------- Орох/гарах
  enter() {
    this.entered = true; show('defHud', true); show('touchHud', true); document.body.classList.add('defense'); $('actionBtn').innerHTML = '🚿<small>Буудах</small>'; $('jumpBtn').innerHTML = '↑<small>Үсрэх</small>'; this.ads = false; $('adsBtn').classList.remove('on'); this.killFeed = []; $('killFeed').innerHTML = '';
    this.app.post.setScene(this.scene); this.app.post.setCamera(this.camera); this.resize();
    this.audio.startMusic('night'); this.mood = 'night';
    this.defAt = Date.now(); this.defPeers.clear(); this.snapT = 0; this.lastSnap = null; this.gotSnap = false;
    for (const id of this.remote.map.keys()) this.remote.get(id).st = null;   // хуучин байрлал үлдээхгүй
    this.newGame();
    if (this.net.active) { this.net.sendEvent({ t: 'defJoin', at: this.defAt }); toast('Өрөөнийхөн энэ хаалгаар орвол хамт хамгаална 👥', 3000, '🎃'); }
    toast(this.input.isTouch ? 'Дэлгэц чирж чиглүүл, 🚿 барьж бууд, 🔍 зум, ↑ үсрэх' : 'Товшоод хулганаа түгж (Esc гарна) · Зүүн товч бууд · Баруун товч зум · Space үсрэх · Shift гүйх', 4500, '🚿');
  }
  exit() { document.exitPointerLock?.(); this.firing = false; if (this.net.active) this.net.sendEvent({ t: 'defLeave' }); this.defPeers.clear(); this.entered = false; show('defHud', false); show('touchHud', false); document.body.classList.remove('defense'); $('actionBtn').innerHTML = 'E<small>Үйлдэл</small>'; this.audio.stopMusic(); closeModal(); }
  resize() { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); }
  async leave() { await this.app.switchTo('town'); }

  newGame() {
    this.core = new DefenseCore();
    for (const p of this.pests.values()) p.g.removeFromParent(); this.pests.clear();
    for (const s of this.structs.values()) s.removeFromParent(); this.structs.clear();
    for (const g of this.guards.values()) g.m.root.removeFromParent(); this.guards.clear();
    for (const b of this.blobs) b.m.removeFromParent(); this.blobs = [];
    this.player.pos.set(0, 0, 8); this.player.vel.set(0, 0, 0); this.player.heading = 0; this.cam.yaw = Math.PI; this.cam.pitch = 0.2;
    this.over = false; this.updateHud();
  }

  // ---------------------------------------------------------------- Дэлгүүр / давалгаа
  startWave() { if (this.core.phase !== 'prep') return; if (!this.isHost) { this.net.sendEvent({ t: 'defStart' }); closeModal(); return; } this.core.startWave(); this.audio.gate(); closeModal(); }
  shopModal() {
    const c = this.core; if (c.phase === 'over') return;
    const items = Object.entries(SHOP).map(([k, it]) => `<div class="shop-item"><span class="em">${it.emoji}</span><small>${it.label}</small><span class="hint" style="font-size:11px">${it.desc}</span><button data-def="${k}" ${c.coins < it.price ? 'disabled' : ''}>🧃 ${it.price}</button></div>`).join('');
    modal(`<div class="eyebrow">ХОРТОН ХАМГААЛАЛТ · ДЭЛГҮҮР</div><h2>🧃 ${c.coins} зоос · ❤️ ${c.base.hp}/${c.base.max}</h2><p>Хашаа ${c.structures.filter((s) => s.kind === 'FENCE').length}/8 · Цацуур ${c.structures.filter((s) => s.kind === 'SPRAYER').length}/8 · Хамгаалагч ${c.guards.length}/4 · Хүч ${c.power}/2</p><div class="shop">${items}</div><div class="row">${c.phase === 'prep' ? '<button id="defGo" class="primary">▶ Давалгаа эхлэх</button>' : ''}<button id="defClose" class="ghost">Хаах</button></div>`);
    document.querySelectorAll('[data-def]').forEach((b) => b.onclick = () => {
      const r = this.buy(b.dataset.def);
      if (!r.ok) { this.audio.wrong(); toast({ coins: 'Зоос хүрэхгүй', slot: 'Байрлал дүүрсэн', max: 'Дээд түвшин', full: 'Base бүтэн', over: 'Тоглолт дууссан' }[r.reason] || 'Болохгүй', 1600, '⚠️'); return; }
      this.audio.correct(); this.shopModal();
    });
    const go = $('defGo'); if (go) go.onclick = () => this.startWave();
    $('defClose').onclick = closeModal;
  }
  buy(kind) { if (!this.isHost) { const r = this.core.buy(kind); if (r.ok) this.net.sendEvent({ t: 'defBuy', kind }); this.updateHud(); return r; } const r = this.core.buy(kind); if (r.ok) this.updateHud(); return r; }

  // ---------------------------------------------------------------- Буудалт
  /** Crosshair-ийн чиглэл (камерын урд) + aim assist: 16м-т, 7° (утсанд 12°) дотор хортон байвал түүн рүү */
  aimDir() {
    const P = this.player;
    let dx = -Math.sin(this.cam.yaw), dz = -Math.cos(this.cam.yaw), target = null;
    const tol = this.input.isTouch ? 0.21 : 0.12; let best = tol;
    for (const p of this.core.pests) {
      if (!p.emerged) continue;
      const rx = p.x - P.pos.x, rz = p.z - P.pos.z, d = Math.hypot(rx, rz); if (d > AIM_R || d < 0.5) continue;
      const ang = Math.abs(Math.atan2(rx * dz - rz * dx, rx * dx + rz * dz));
      if (ang < best) { best = ang; target = p; }
    }
    if (target) { const rx = target.x - P.pos.x, rz = target.z - P.pos.z, l = Math.hypot(rx, rz); dx = rx / l; dz = rz / l; }
    return { dx, dz, target };
  }
  shoot() {
    const P = this.player; if (P.fireCd > 0 || this.over) return;
    P.fireCd = this.core.playerRate;
    let { dx, dz } = this.aimDir();
    // Тэлэлт (bloom): байнга буудах/хөдлөхөд өргөснө, ADS-д багасна
    const jitter = (Math.random() - 0.5) * this.spread * (this.ads ? 0.35 : 1) * 0.12;
    const cj = Math.cos(jitter), sj = Math.sin(jitter); [dx, dz] = [dx * cj - dz * sj, dx * sj + dz * cj];
    this.spread = Math.min(1, this.spread + 0.28);
    const n = this.nozzle.getWorldPosition(new T.Vector3());
    this.spawnBlob(n.x, n.y, n.z, dx, dz);
    this.tracer(n, dx, dz);
    // Muzzle: цацлагын дусал + гэрэл, recoil, камерын цохилт (ADS-д зөөлөн)
    this.particles.burst(n, 0xc8ff8a, 5, { speed: 5, up: 1.2, size: 0.09, life: 0.25, gravity: 4 });
    this.flash.position.copy(n); this.flashT = 0.07; this.muzzleLight.position.copy(n); this.muzzleLight.intensity = 2.2;
    this.character.recoil?.(); this.cam.kick = this.ads ? 0.01 : 0.02; this.cam.yawKick = (Math.random() - 0.5) * (this.ads ? 0.004 : 0.01);
    this.audio.tone({ f: 640, f2: 300, type: 'square', dur: 0.07, vol: 0.06 }); this.audio.noise?.({ dur: 0.05, vol: 0.04, hp: 2500 });
    this.onShoot(P.pos.x, P.pos.z, dx, dz);
  }
  /** Онолтыг Core шийднэ (co-op-д host) */
  onShoot(x, z, dx, dz) { if (this.isHost) this.core.shoot(x, z, dx, dz); if (this.coop) this.net.sendEvent({ t: 'defShot', x, z, dx, dz }); }
  /** Хошуунаас 14м урагш бүдгэрэх зураас */
  tracer(n, dx, dz) {
    const geo = new T.BufferGeometry().setFromPoints([n, new T.Vector3(n.x + dx * 13, n.y + 0.2, n.z + dz * 13)]);
    const line = new T.Line(geo, new T.LineBasicMaterial({ color: 0xd8ffa0, transparent: true, opacity: 0.55, depthWrite: false }));
    this.scene.add(line); this.tracers.push({ line, t: 0.12 });
  }
  spawnBlob(x, y, z, dx, dz, color) {
    const m = createBlob(this.scene, color); m.position.set(x, y, z);
    this.blobs.push({ m, vx: dx * BLOB_SPEED, vz: dz * BLOB_SPEED, vy: 0.6, t: 0.7, color: color || 0x9fe36a });
  }

  // ---------------------------------------------------------------- Update
  update(dt) {
    if (!this.entered) return;
    this.clock += dt;
    const active = !isModalOpen(), input = this.input, P = this.player, c = this.core;
    // Камер
    if (active) { this.cam.yaw -= input.look.dx; this.cam.pitch = T.MathUtils.clamp(this.cam.pitch + input.look.dy, -0.25, 0.9); } else if (document.pointerLockElement) document.exitPointerLock();
    // Хөдөлгөөн (камерын чиглэлээр)
    const axis = active && !this.over ? input.axis() : { x: 0, y: 0 }, len = Math.hypot(axis.x, axis.y);
    const run = active && (input.held('run') || (input.isTouch && len > 0.92));
    let wx = 0, wz = 0;
    if (len > 0.05) { wx = axis.x * Math.cos(this.cam.yaw) + axis.y * Math.sin(this.cam.yaw); wz = -axis.x * Math.sin(this.cam.yaw) + axis.y * Math.cos(this.cam.yaw); const l = Math.hypot(wx, wz); wx /= l; wz /= l; }
    const maxSpeed = run ? RUN : WALK, want = Math.min(1, len) * maxSpeed;
    const accel = len > 0.05 ? ACCEL : DECEL, ka = Math.min(1, accel * dt / maxSpeed * 2.2);
    P.vel.x += (wx * want - P.vel.x) * ka; P.vel.z += (wz * want - P.vel.z) * ka;
    const nx = P.pos.x + P.vel.x * dt, nz = P.pos.z + P.vel.z * dt;
    if (Math.hypot(nx, nz) < MAP_R && Math.hypot(nx, nz) > BASE_R + 0.6) { P.pos.x = nx; P.pos.z = nz; } else P.vel.multiplyScalar(0.2);
    const sp = Math.hypot(P.vel.x, P.vel.z);
    // Үсрэлт (Space / ↑)
    if (active && !this.over && P.grounded && input.justPressed('jump')) { P.yVel = JUMP_V; P.grounded = false; this.audio.jump(); }
    if (!P.grounded) { P.yVel -= GRAVITY * dt; P.y += P.yVel * dt; if (P.y <= 0) { P.y = 0; P.yVel = 0; P.grounded = true; this.particles.dust(P.pos, 3); } }
    P.pos.y = P.y;
    // ADS зум + гүйлтийн FOV; crosshair тэлэлт
    const wantFov = this.ads ? 38 : (run && sp > 6 ? 62 : 55);
    this.fov += (wantFov - this.fov) * Math.min(1, dt * 10); if (Math.abs(this.camera.fov - this.fov) > 0.05) { this.camera.fov = this.fov; this.camera.updateProjectionMatrix(); }
    this.spread = Math.max(0, this.spread - dt * 1.6);
    const spreadPx = 6 + this.spread * 22 + (this.ads ? 0 : sp * 1.2) + (P.grounded ? 0 : 10);
    $('crosshair').style.setProperty('--gap', spreadPx + 'px'); $('crosshair').classList.toggle('ads', this.ads);
    // Зэвсгийн sway: эргэлтэд хоцорч, алхахад савлана
    if (this.sprayer) { this.swayX = (this.swayX || 0) + (-input.look.dx * 3 - (this.swayX || 0)) * Math.min(1, dt * 8); this.sprayer.position.x = 0 + this.swayX * 0.05; this.sprayer.position.z = 0.06 + Math.sin(this.clock * 9) * sp * 0.006; }
    // Дүр үргэлж crosshair (камерын урд) руу харна; хажуу тийш алхахад strafe
    const wantH = this.cam.yaw + Math.PI;
    P.heading += Math.atan2(Math.sin(wantH - P.heading), Math.cos(wantH - P.heading)) * Math.min(1, dt * 14);
    P.state = sp > 0.4 ? (sp > WALK + 0.6 ? 'run' : 'walk') : 'idle';
    P.fireCd = Math.max(0, P.fireCd - dt);
    const wantFire = active && !this.over && (this.firing || input.held('interact') || input.justPressed('click'));
    if (wantFire) this.shoot();
    const { target } = this.aimDir();
    const ch = $('crosshair'); ch.classList.toggle('target', !!target); if (this.hitFlash > 0) { this.hitFlash -= dt; ch.classList.add('hit'); } else ch.classList.remove('hit');
    this.character.update(dt, { state: 'aim', speed: sp / RUN });
    this.character.root.position.copy(P.pos); this.character.root.rotation.y = P.heading;
    this.character.shadow && (this.character.shadow.position.y = -P.y + 0.03);
    for (let i = this.tracers.length - 1; i >= 0; i--) { const tr = this.tracers[i]; tr.t -= dt; tr.line.material.opacity = Math.max(0, tr.t / 0.12) * 0.55; if (tr.t <= 0) { tr.line.removeFromParent(); tr.line.geometry.dispose(); this.tracers.splice(i, 1); } }
    this.muzzleLight.intensity *= Math.exp(-dt * 30);
    for (let i = this.killFeed.length - 1; i >= 0; i--) { this.killFeed[i].t -= dt; if (this.killFeed[i].t <= 0) { this.killFeed.splice(i, 1); this.renderFeed(); } }
    if (this.flashT > 0) { this.flashT -= dt; this.flash.visible = true; this.flash.scale.setScalar(0.5 + this.flashT * 6); } else this.flash.visible = false;
    // Core
    this.tickCore(dt);
    this.applyEvents();
    this.syncVisuals(dt);
    // Сум + цацлагын мөр
    for (let i = this.blobs.length - 1; i >= 0; i--) { const b = this.blobs[i]; b.t -= dt; b.m.position.x += b.vx * dt; b.m.position.z += b.vz * dt; b.vy -= 5 * dt; b.m.position.y += b.vy * dt; if (Math.random() < dt * 40) this.particles.burst(b.m.position, b.color, 1, { speed: 0.4, up: 0.3, size: 0.07, life: 0.3, gravity: 3 }); if (b.t <= 0 || b.m.position.y < 0) { b.m.removeFromParent(); this.blobs.splice(i, 1); } }
    // Камер: мөрний дээгүүр (баруун тийш offset), crosshair дэлгэцийн голд
    this.cam.kick = Math.max(0, (this.cam.kick || 0) - dt * 0.12); if (this.cam.yawKick) { this.cam.yaw += this.cam.yawKick; this.cam.yawKick *= Math.exp(-dt * 25); if (Math.abs(this.cam.yawKick) < 1e-4) this.cam.yawKick = 0; }
    const pitch = this.cam.pitch - this.cam.kick, fx = -Math.sin(this.cam.yaw), fz = -Math.cos(this.cam.yaw), rx = -fz, rz = fx;
    const ads = this.ads ? 0.55 : 1, focus = new T.Vector3(P.pos.x + rx * 1.6 * ads, 1.7 + P.y * 0.5, P.pos.z + rz * 1.6 * ads);
    const cd = CAM_DIST * (this.ads ? 0.6 : 1), desired = new T.Vector3(focus.x - fx * Math.cos(pitch) * cd, focus.y + Math.sin(pitch) * cd, focus.z - fz * Math.cos(pitch) * cd);
    this.camera.position.lerp(desired, Math.min(1, dt * 14));
    const lookAt = new T.Vector3(focus.x + fx * 14, focus.y - Math.sin(pitch) * 14 + 0.4, focus.z + fz * 14);
    this.camera.lookAt(lookAt);
    this.particles.update(dt, this.camera); this.bubbles.update(dt);
    this.world.sky.uniforms.uTime.value = this.clock; updateEnvironment(this.world, dt, this.clock);
    this.world.baseGlow.intensity = 1.1 + Math.sin(this.clock * 3) * 0.15;
    this.hudT = (this.hudT || 0) + dt; if (this.hudT > 0.2) { this.hudT = 0; this.updateHud(); }
  }
  tickCore(dt) {
    if (this.isHost) { this.core.tick(dt); if (this.coop) { this.snapT += dt; if (this.snapT >= 0.1) { this.snapT = 0; this.net.sendDef(this.core.snapshot()); } } }
    // Тоглогчийн state (байшинд) 15Hz
    if (this.net.active) { this.netTick = (this.netTick || 0) + dt; if (this.netTick >= 1 / 15) { this.netTick = 0; const P = this.player; this.net.sendState(packState({ x: P.pos.x, y: 0, z: P.pos.z, h: P.heading, anim: P.state, speed: Math.hypot(P.vel.x, P.vel.z) / RUN, inCar: false, zone: 2 })); } this.remote.update(dt); }
  }

  // ---------------------------------------------------------------- Co-op
  onNetEvent(d, from) {
    if (!this.entered) return;
    switch (d.t) {
      case 'defJoin': { const isNew = !this.defPeers.has(from); this.defPeers.set(from, d.at); if (isNew) { this.net.sendEvent({ t: 'defJoin', at: this.defAt }, from); toast(`${this.net.peers.get(from)?.name || 'Тоглогч'} хамгаалалтад нэгдлээ!`, 2400, '👥'); if (this.isHost) this.net.sendDef(this.core.snapshot()); } break; }
      case 'defLeave': this.defPeers.delete(from); break;
      case 'defShot': { const dx = d.dx, dz = d.dz; this.spawnBlob(d.x + dx * 0.6, 1.1, d.z + dz * 0.6, dx, dz); if (this.isHost) this.core.shoot(d.x, d.z, dx, dz); break; }
      case 'defBuy': if (this.isHost) { const r = this.core.buy(d.kind); if (r.ok) this.audio.correct(); } break;
      case 'defStart': if (this.isHost && this.core.phase === 'prep') { this.core.startWave(); this.audio.gate(); } break;
    }
  }
  /** Host-ын snapshot → guest: Core-оо шинэчилж, дүрслэлийг reconcile */
  onDef(snap, from) {
    if (!this.entered || this.isHost) return;
    const c = this.core, prev = c.snapshot();
    const wasIds = new Set(c.pests.map((p) => p.id)), pos = new Map(c.pests.map((p) => [p.id, [p.x, p.z]]));
    c.load(snap); this.gotSnap = true;
    // Шинэ хортон/байгууламж/хамгаалагч → визуал
    for (const p of c.pests) if (!this.pests.has(p.id)) { const g = createPest(p.type); g.position.set(p.x, 0, p.z); this.scene.add(g); curveTree(g); this.pests.set(p.id, { g, type: p.type }); }
    for (const id of wasIds) if (!c.pests.some((p) => p.id === id)) { const v = this.pests.get(id); if (v) { const [x, z] = pos.get(id) || [v.g.position.x, v.g.position.z]; v.g.removeFromParent(); this.pests.delete(id); if (Math.hypot(x, z) > BASE_R + 1) { this.particles.burst(new T.Vector3(x, 0.9, z), [0xff5c5c, 0xffb03a, 0xfff05a, 0x5ee07a][Math.floor(Math.random() * 4)], 14, { speed: 3.5, up: 3, size: 0.16, life: 0.9, gravity: 5 }); this.audio.pickup(0); } } }
    for (const st of c.structures) if (!this.structs.has(st.id)) this.structs.set(st.id, st.kind === 'FENCE' ? createFence(this.scene, st.x, st.z) : createSprayer(this.scene, st.x, st.z));
    for (const [id, g] of this.structs) if (!c.structures.some((st) => st.id === id)) { g.removeFromParent(); this.structs.delete(id); }
    for (const g of c.guards) if (!this.guards.has(g.id)) { const m = createGuard(); m.root.position.set(g.x, 0, g.z); this.scene.add(m.root); curveTree(m.root); this.guards.set(g.id, { m }); }
    if (c.base.hp < prev.base.hp) { this.audio.hurt(); this.shake = 0.3; setBaseMood(this.world, c.base.hp, c.base.max); }
    if (c.wave > prev.wave) { toast(`🌊 Давалгаа ${c.wave}!`, 2000, '🐛'); this.audio.gate(); }
    if (c.phase === 'prep' && prev.phase === 'wave') { toast(`Давалгаа ${c.wave} давлаа! Дэлгүүр нээгдлээ`, 2600, '🎉'); this.audio.fanfare(); }
    if (c.phase === 'over' && !this.over) this.gameOver(c.result());
  }

  /** Core-ийн event → эффект */
  applyEvents() {
    const c = this.core, ev = c.events; c.events = [];
    for (const e of ev) {
      switch (e.t) {
        case 'waveStart': toast(`🌊 Давалгаа ${e.wave} — ${e.count} хортон ирж байна!`, 2600, '🐛'); this.audio.gate(); break;
        case 'spawn': { const g = createPest(e.type); g.position.set(e.x, 0, e.z); this.scene.add(g); curveTree(g); this.pests.set(e.id, { g, x: e.x, z: e.z, type: e.type }); if (!e.burrow) this.particles.dust(g.position, 4); break; }
        case 'emerge': { const p = this.pests.get(e.id); if (p) this.particles.dust(p.g.position, 8, { color: 0x8a6242 }); break; }
        case 'hit': { this.hitFlash = 0.12; $('hitmark').classList.remove('show'); void $('hitmark').offsetWidth; $('hitmark').classList.add('show'); const p = this.pests.get(e.id); if (p) { p.hitT = 0.2; this.particles.burst(new T.Vector3(e.x, 0.8, e.z), 0x9fe36a, 6, { speed: 2, up: 2, size: 0.12, life: 0.4, gravity: 6 }); } this.audio.tone({ f: 300, f2: 200, type: 'triangle', dur: 0.06, vol: 0.05 }); break; }
        case 'die': { const p = this.pests.get(e.id); if (p) { this.dying.push({ g: p.g, t: 0.16 }); this.pests.delete(e.id); } this.feed(e.type, e.reward); this.audio.tone({ f: 900, f2: 1400, type: 'sine', dur: 0.1, vol: 0.07 }); this.particles.burst(new T.Vector3(e.x, 0.9, e.z), [0xff5c5c, 0xffb03a, 0xfff05a, 0x5ee07a, 0x5aa8ff, 0xb37aff][Math.floor(Math.random() * 6)], 16, { speed: 3.5, up: 3, size: 0.16, life: 0.9, gravity: 5 }); this.audio.pickup(0); this.floatText(e.x, e.z, `+${e.reward}`); break; }
        case 'baseHit': { const p = this.pests.get(e.id); if (p) { p.g.removeFromParent(); this.pests.delete(e.id); } this.audio.hurt(); this.shake = 0.35; this.particles.burst(new T.Vector3(0, 2, 0), 0xf39a2c, 10, { speed: 3, up: 2, size: 0.2, life: 0.6 }); setBaseMood(this.world, c.base.hp, c.base.max); break; }
        case 'build': { const g = e.kind === 'FENCE' ? createFence(this.scene, e.x, e.z) : createSprayer(this.scene, e.x, e.z); this.structs.set(e.id, g); this.particles.burst(new T.Vector3(e.x, 1, e.z), 0xffe27a, 12, { speed: 2, up: 3, size: 0.16, life: 0.7 }); break; }
        case 'fenceBroken': { const g = this.structs.get(e.id); if (g) { g.removeFromParent(); this.structs.delete(e.id); } this.audio.hurt(); toast('Хашаа эвдэрлээ!', 1600, '🪵'); break; }
        case 'guard': { const m = createGuard(); m.root.position.set(e.x, 0, e.z); this.scene.add(m.root); curveTree(m.root); this.guards.set(e.id, { m }); break; }
        case 'shot': { const dx = e.tx - e.x, dz = e.tz - e.z, l = Math.hypot(dx, dz) || 1; this.spawnBlob(e.x, e.guard ? 1.0 : 1.6, e.z, dx / l, dz / l, 0x9fe4ff); if (!e.guard) { const g = this.structs.get(e.from); if (g?.userData.head) g.userData.head.rotation.y = Math.atan2(dx, dz); } break; }
        case 'buy': { if (e.kind === 'REPAIR') { setBaseMood(this.world, c.base.hp, c.base.max); this.particles.burst(new T.Vector3(0, 2.5, 0), 0x9df5b3, 14, { speed: 2, up: 3, size: 0.18, life: 0.8 }); } break; }
        case 'waveClear': toast(`Давалгаа ${e.wave} давлаа! +${e.bonus} зоос — дэлгүүр нээгдлээ`, 3200, '🎉'); this.audio.fanfare(); this.character.cheer?.(); this.onWaveClear?.(); break;
        case 'over': this.gameOver(e); break;
      }
    }
  }
  feed(type, reward) {
    const names = { WORM: '🐛 Хорхой', CROW: '🐦 Хэрээ', MOLE: '🐹 Номин', SLIME: '🟣 Слайм', MINI: '🟣 Жижиг слайм' };
    this.killFeed.push({ text: `${names[type] || type} <b>+${reward}</b>`, t: 4 }); if (this.killFeed.length > 5) this.killFeed.shift(); this.renderFeed();
  }
  renderFeed() { $('killFeed').innerHTML = this.killFeed.map((k) => `<div>${k.text}</div>`).join(''); }
  floatText(x, z, text) { this.bubbles.showText({ position: new T.Vector3(x, 0.6, z) }, text, { dur: 1, y: 1 }); }

  /** Core-ийн байрлалыг дүрслэлд: хортон, хамгаалагч */
  syncVisuals(dt) {
    const c = this.core, t = this.clock;
    for (const p of c.pests) {
      const v = this.pests.get(p.id); if (!v) continue;
      const moving = !p.biting && p.emerged;
      const dx = p.x - v.g.position.x, dz = p.z - v.g.position.z;
      if (this.isHost) { v.g.position.x = p.x; v.g.position.z = p.z; } else { const k = Math.min(1, dt * 12); v.g.position.x += dx * k; v.g.position.z += dz * k; }
      if (moving && Math.hypot(dx, dz) > 0.001) v.g.rotation.y = Math.atan2(-p.x, -p.z);
      updatePest(v.g, dt, t, { moving, emerged: p.emerged, biting: !!p.biting });
      if (v.hitT > 0) { v.hitT -= dt; v.g.userData.body.scale.setScalar(1 + v.hitT * 0.8); } else v.g.userData.body.scale.setScalar(1);
    }
    for (let i = this.dying.length - 1; i >= 0; i--) { const d = this.dying[i]; d.t -= dt; const k = Math.max(0, d.t / 0.16); d.g.scale.set(1 + (1 - k) * 0.8, k * 0.9 + 0.05, 1 + (1 - k) * 0.8); if (d.t <= 0) { d.g.removeFromParent(); this.dying.splice(i, 1); } }
    for (const g of c.guards) { const v = this.guards.get(g.id); if (!v) continue; const r = v.m.root; r.position.set(g.x, 0, g.z); const tg = c.nearestPest(g.x, g.z, 7); r.rotation.y = tg ? Math.atan2(tg.x - g.x, tg.z - g.z) : g.angle + Math.PI / 2; v.m.update(dt, { state: 'walk', speed: 0.35 }); }
    if (this.shake > 0) { this.shake -= dt; this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.6; this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.4; }
  }

  updateHud() {
    const c = this.core; if (!c) return;
    $('defHp').style.width = (c.base.hp / c.base.max * 100) + '%';
    $('defHpText').textContent = `${c.base.hp}/${c.base.max}`;
    $('defWave').textContent = c.phase === 'prep' ? `Бэлтгэл ${Math.ceil(c.prepT)}с` : `Давалгаа ${c.wave}`;
    const cd = $('defCountdown'); cd.classList.toggle('hidden', c.phase !== 'prep'); if (c.phase === 'prep') cd.innerHTML = `<small>Давалгаа ${c.wave + 1}</small><b>${Math.ceil(c.prepT)}</b>`;
    $('defCoins').textContent = c.coins; $('defScore').textContent = c.score;
    $('defLeft').textContent = c.phase === 'wave' ? `🐛 ${c.pests.length + c.queue.length}` : '';
    $('defStart').classList.toggle('hidden', c.phase !== 'prep' || !this.canStart()); $('defStart').textContent = '▶ Эрт эхлэх';
    $('defWave').textContent += this.coop ? ` · 👥${this.defPeers.size + 1}` : '';
    $('defShopBtn').classList.toggle('hidden', c.phase === 'over');
  }
  canStart() { return this.isHost; }

  gameOver(r) {
    this.over = true;
    const st = this.state;
    st.stars += r.stars; st.counts.defense = (st.counts.defense || 0) + 1;
    st.defense = { best: Math.max(st.defense?.best || 0, r.score), wavesBest: Math.max(st.defense?.wavesBest || 0, r.wave) };
    st.dailyProgress?.('defense', r.wave); st.save();
    this.audio.hurt(); setBaseMood(this.world, 0, 100);
    setTimeout(() => {
      modal(`<div class="reward">🎃</div><h2>Base унав… Давалгаа ${r.wave}</h2><p>Оноо <b>${r.score}</b> · Хортон <b>${r.kills}</b> · ⭐ <b>+${r.stars}</b> од</p><p class="hint">Рекорд: ${st.defense.best} оноо · ${st.defense.wavesBest} давалгаа</p><div class="row"><button id="defAgain2" class="primary">🔁 Дахин</button><button id="defHome2" class="ghost">🏠 Хот руу</button></div>`, { closable: false });
      $('defAgain2').onclick = () => { closeModal(); this.newGame(); }; $('defHome2').onclick = () => { closeModal(); this.leave(); };
    }, 900);
  }

  render() { this.app.post.setFocus(this.camera.position.distanceTo(this.player.pos) + 1); this.app.post.render(); }
}
