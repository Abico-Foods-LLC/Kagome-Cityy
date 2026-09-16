// «Хортон хамгаалалт» scene: DefenseCore-ийн логикийг дүрсэлж, тоглогчийн хөдөлгөөн/буудалт, HUD, дэлгүүр, дуусгал. RunnerScene-тэй ижил API.
import * as T from 'three';
import { DefenseCore, SHOP, PESTS, MAP_R, BASE_R } from './DefenseCore.js';
import { buildDefenseWorld, setBaseMood, createFence, createSprayer, createBlob } from './defenseWorld.js';
import { createPest, updatePest, createGuard, createPlayerSprayer } from './pests.js';
import { createAvatar } from '../world/avatar.js';
import { Particles } from '../gfx/particles.js';
import { curveTree } from '../gfx/materials.js';
import { Bubbles } from '../world/bubble.js';
import { $, toast, modal, closeModal, isModalOpen, show } from '../core/ui.js';

const WALK = 5.6, RUN = 9.4, ACCEL = 34, DECEL = 42, AIM_R = 14, BLOB_SPEED = 22;

export class DefenseScene {
  constructor(app) {
    this.app = app; this.state = app.state; this.input = app.input; this.audio = app.audio;
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(55, innerWidth / innerHeight, 0.3, 300);
    this.entered = false; this.clock = 0;
    this.player = { pos: new T.Vector3(0, 0, 10), vel: new T.Vector3(), heading: Math.PI, state: 'idle', fireCd: 0 };
    this.cam = { yaw: 0.2, pitch: 0.45, dist: 10 };
    this.pests = new Map(); this.structs = new Map(); this.guards = new Map(); this.blobs = [];
    this.build();
  }

  build() {
    this.world = buildDefenseWorld(this.scene);
    this.particles = new Particles(this.scene, 500);
    this.bubbles = new Bubbles(this.scene, (icon) => this.app.scenes.town.hintTexture(icon));
    this.buildAvatar(this.state.settings.avatar);
    this.bindUI();
  }
  buildAvatar(kind) {
    if (this.character) this.scene.remove(this.character.root);
    this.character = createAvatar(kind, {}, this.state.wardrobe.equipped);
    this.scene.add(this.character.root); curveTree(this.character.root);
    const spr = createPlayerSprayer(); spr.position.set(0.38, 0.7, 0.3); (this.character.torso || this.character.root).add(spr);
    this.character.onStep = () => this.audio.step();
  }
  bindUI() {
    $('defStart').onclick = () => this.startWave();
    $('defShopBtn').onclick = () => this.shopModal();
    $('defExit').onclick = () => this.leave();
  }

  // ---------------------------------------------------------------- Орох/гарах
  enter() {
    this.entered = true; show('defHud', true); show('touchHud', true); document.body.classList.add('defense'); $('actionBtn').innerHTML = '🚿<small>Буудах</small>';
    this.app.post.setScene(this.scene); this.app.post.setCamera(this.camera); this.resize();
    this.audio.startMusic('night'); this.mood = 'night';
    this.newGame();
    toast('Хортон base руу ирнэ! Ойртоход өөрөө чиглэнэ — E / товшилт буудна', 4200, '🚿');
  }
  exit() { this.entered = false; show('defHud', false); show('touchHud', false); document.body.classList.remove('defense'); $('actionBtn').innerHTML = 'E<small>Үйлдэл</small>'; this.audio.stopMusic(); closeModal(); }
  resize() { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); }
  async leave() { await this.app.switchTo('town'); }

  newGame() {
    this.core = new DefenseCore();
    for (const p of this.pests.values()) p.g.removeFromParent(); this.pests.clear();
    for (const s of this.structs.values()) s.removeFromParent(); this.structs.clear();
    for (const g of this.guards.values()) g.m.root.removeFromParent(); this.guards.clear();
    for (const b of this.blobs) b.m.removeFromParent(); this.blobs = [];
    this.player.pos.set(0, 0, 8); this.player.vel.set(0, 0, 0); this.player.heading = Math.PI; this.cam.yaw = 0.2;
    this.over = false; this.updateHud();
  }

  // ---------------------------------------------------------------- Дэлгүүр / давалгаа
  startWave() { if (this.core.phase === 'prep') { this.core.startWave(); this.audio.gate(); closeModal(); } }
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
  buy(kind) { const r = this.core.buy(kind); if (r.ok) this.updateHud(); return r; }

  // ---------------------------------------------------------------- Буудалт
  shoot() {
    const P = this.player; if (P.fireCd > 0 || this.over) return;
    P.fireCd = this.core.playerRate;
    const dx = Math.sin(P.heading), dz = Math.cos(P.heading);
    this.spawnBlob(P.pos.x + dx * 0.6, 1.1, P.pos.z + dz * 0.6, dx, dz);
    this.audio.tone({ f: 520, f2: 260, type: 'square', dur: 0.08, vol: 0.06 });
    this.character.play?.('pick', 0.2);
    this.onShoot(P.pos.x, P.pos.z, dx, dz);
  }
  /** Онолтыг Core шийднэ (co-op-д host) */
  onShoot(x, z, dx, dz) { this.core.shoot(x, z, dx, dz); }
  spawnBlob(x, y, z, dx, dz, color) {
    const m = createBlob(this.scene, color); m.position.set(x, y, z);
    this.blobs.push({ m, vx: dx * BLOB_SPEED, vz: dz * BLOB_SPEED, vy: 1.5, t: 0.7 });
  }

  // ---------------------------------------------------------------- Update
  update(dt) {
    if (!this.entered) return;
    this.clock += dt;
    const active = !isModalOpen(), input = this.input, P = this.player, c = this.core;
    // Камер
    if (active) { this.cam.yaw -= input.look.dx; this.cam.pitch = T.MathUtils.clamp(this.cam.pitch + input.look.dy, 0.15, 1.1); if (input.zoom) this.cam.dist = T.MathUtils.clamp(this.cam.dist + input.zoom * 0.6, 5, 18); }
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
    // Авто чиглүүлэлт: ойрын хортон руу; байхгүй бол хөдөлгөөний чиглэл
    const aim = c.nearestPest(P.pos.x, P.pos.z, AIM_R);
    let wantH = P.heading;
    if (aim) wantH = Math.atan2(aim.x - P.pos.x, aim.z - P.pos.z); else if (sp > 0.4) wantH = Math.atan2(P.vel.x, P.vel.z);
    P.heading += Math.atan2(Math.sin(wantH - P.heading), Math.cos(wantH - P.heading)) * Math.min(1, dt * 12);
    P.state = sp > 0.4 ? (sp > WALK + 0.6 ? 'run' : 'walk') : 'idle';
    P.fireCd = Math.max(0, P.fireCd - dt);
    if (active && !this.over && (input.justPressed('interact') || input.justPressed('jump') || input.justPressed('click') || input.held('interact'))) this.shoot();
    this.character.update(dt, { state: P.state, speed: sp / RUN, lookAt: aim ? new T.Vector3(aim.x, 1, aim.z) : null });
    this.character.root.position.copy(P.pos); this.character.root.rotation.y = P.heading;
    // Core
    this.tickCore(dt);
    this.applyEvents();
    this.syncVisuals(dt);
    // Сум
    for (let i = this.blobs.length - 1; i >= 0; i--) { const b = this.blobs[i]; b.t -= dt; b.m.position.x += b.vx * dt; b.m.position.z += b.vz * dt; b.vy -= 6 * dt; b.m.position.y += b.vy * dt; if (b.t <= 0 || b.m.position.y < 0) { b.m.removeFromParent(); this.blobs.splice(i, 1); } }
    // Камер
    const h = Math.sin(this.cam.pitch) * this.cam.dist, r = Math.cos(this.cam.pitch) * this.cam.dist;
    const desired = new T.Vector3(P.pos.x + Math.sin(this.cam.yaw) * r, 1.6 + h, P.pos.z + Math.cos(this.cam.yaw) * r);
    this.camera.position.lerp(desired, Math.min(1, dt * 8));
    this.camera.lookAt(P.pos.x, 1.3, P.pos.z);
    this.particles.update(dt, this.camera); this.bubbles.update(dt);
    this.world.sky.uniforms.uTime.value = this.clock;
    this.world.baseGlow.intensity = 1.1 + Math.sin(this.clock * 3) * 0.15;
    this.hudT = (this.hudT || 0) + dt; if (this.hudT > 0.2) { this.hudT = 0; this.updateHud(); }
  }
  tickCore(dt) { this.core.tick(dt); }

  /** Core-ийн event → эффект */
  applyEvents() {
    const c = this.core, ev = c.events; c.events = [];
    for (const e of ev) {
      switch (e.t) {
        case 'waveStart': toast(`🌊 Давалгаа ${e.wave} — ${e.count} хортон ирж байна!`, 2600, '🐛'); this.audio.gate(); break;
        case 'spawn': { const g = createPest(e.type); g.position.set(e.x, 0, e.z); this.scene.add(g); curveTree(g); this.pests.set(e.id, { g, x: e.x, z: e.z, type: e.type }); if (!e.burrow) this.particles.dust(g.position, 4); break; }
        case 'emerge': { const p = this.pests.get(e.id); if (p) this.particles.dust(p.g.position, 8, { color: 0x8a6242 }); break; }
        case 'hit': { const p = this.pests.get(e.id); if (p) { p.hitT = 0.2; this.particles.burst(new T.Vector3(e.x, 0.8, e.z), 0x9fe36a, 6, { speed: 2, up: 2, size: 0.12, life: 0.4, gravity: 6 }); } this.audio.tone({ f: 300, f2: 200, type: 'triangle', dur: 0.06, vol: 0.05 }); break; }
        case 'die': { const p = this.pests.get(e.id); if (p) { p.g.removeFromParent(); this.pests.delete(e.id); } this.particles.burst(new T.Vector3(e.x, 0.9, e.z), [0xff5c5c, 0xffb03a, 0xfff05a, 0x5ee07a, 0x5aa8ff, 0xb37aff][Math.floor(Math.random() * 6)], 16, { speed: 3.5, up: 3, size: 0.16, life: 0.9, gravity: 5 }); this.audio.pickup(0); this.floatText(e.x, e.z, `+${e.reward}`); break; }
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
  floatText(x, z, text) { this.bubbles.showText({ position: new T.Vector3(x, 0.6, z) }, text, { dur: 1, y: 1 }); }

  /** Core-ийн байрлалыг дүрслэлд: хортон, хамгаалагч */
  syncVisuals(dt) {
    const c = this.core, t = this.clock;
    for (const p of c.pests) {
      const v = this.pests.get(p.id); if (!v) continue;
      const moving = !p.biting && p.emerged;
      const dx = p.x - v.g.position.x, dz = p.z - v.g.position.z;
      v.g.position.x = p.x; v.g.position.z = p.z;
      if (moving && Math.hypot(dx, dz) > 0.001) v.g.rotation.y = Math.atan2(-p.x, -p.z);
      updatePest(v.g, dt, t, { moving, emerged: p.emerged, biting: !!p.biting });
      if (v.hitT > 0) { v.hitT -= dt; v.g.userData.body.scale.setScalar(1 + v.hitT * 0.8); } else v.g.userData.body.scale.setScalar(1);
    }
    for (const g of c.guards) { const v = this.guards.get(g.id); if (!v) continue; const r = v.m.root; r.position.set(g.x, 0, g.z); const tg = c.nearestPest(g.x, g.z, 7); r.rotation.y = tg ? Math.atan2(tg.x - g.x, tg.z - g.z) : g.angle + Math.PI / 2; v.m.update(dt, { state: 'walk', speed: 0.35 }); }
    if (this.shake > 0) { this.shake -= dt; this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.6; this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.4; }
  }

  updateHud() {
    const c = this.core; if (!c) return;
    $('defHp').style.width = (c.base.hp / c.base.max * 100) + '%';
    $('defHpText').textContent = `${c.base.hp}/${c.base.max}`;
    $('defWave').textContent = c.phase === 'prep' ? `Бэлтгэл ${Math.ceil(c.prepT)}с` : `Давалгаа ${c.wave}`;
    $('defCoins').textContent = c.coins; $('defScore').textContent = c.score;
    $('defLeft').textContent = c.phase === 'wave' ? `🐛 ${c.pests.length + c.queue.length}` : '';
    $('defStart').classList.toggle('hidden', c.phase !== 'prep' || !this.canStart());
    $('defShopBtn').classList.toggle('hidden', c.phase === 'over');
  }
  canStart() { return true; }

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
