// «Хортон хамгаалалт» — цэвэр логик (Three/DOM-гүй, Vitest-ээр шалгагдана).
// Base (0,0) руу давалгаагаар хортон ирнэ; тоглогч/цацуур/хамгаалагч буудна; хашаа зогсооно; зоосоор дэлгүүр.

export const PESTS = {
  WORM: { hp: 2, speed: 1.6, reward: 10, r: 0.6 },
  CROW: { hp: 1, speed: 3.4, reward: 12, r: 0.5, flying: true },
  MOLE: { hp: 3, speed: 1.2, reward: 15, r: 0.6, burrow: true },
  SLIME: { hp: 5, speed: 1.0, reward: 20, r: 0.8, splits: true },
  MINI: { hp: 1, speed: 2.2, reward: 5, r: 0.4 },
};
export const SHOP = {
  FENCE: { price: 50, label: 'Хашаа', emoji: '🪵', desc: 'Хортонг зогсооно (HP 30)' },
  SPRAYER: { price: 120, label: 'Цацуур цамхаг', emoji: '🚿', desc: '8м-т өөрөө буудна' },
  GUARD: { price: 150, label: 'Хамгаалагч', emoji: '🥦', desc: 'Base эргэн тойрон явж буудна' },
  POWER: { price: 80, label: 'Шүүсний хүч', emoji: '⚡', desc: 'Таны буудалт хүчтэй/хурдан (2 түвшин)' },
  REPAIR: { price: 40, label: 'Base засах', emoji: '🔧', desc: 'Base +30 HP' },
};
export const SLOT_N = 8, FENCE_R = 7, SPRAYER_R = 4.5, BASE_R = 2.2, SPAWN_R = 26, PREP_T = 15, MAP_R = 30;
export const STARS_DIV = 25;

/** Давалгаа N-ийн хортоны жагсаалт (төрлөөр) */
export function waveList(n, rand = Math.random) {
  const count = 4 + 2 * n, out = [];
  for (let i = 0; i < count; i++) {
    const r = rand();
    let t = 'WORM';
    if (n >= 7 && r < 0.2) t = 'SLIME';
    else if (n >= 5 && r < 0.4) t = 'MOLE';
    else if (n >= 3 && r < 0.65) t = 'CROW';
    out.push(t);
  }
  return out;
}

export class DefenseCore {
  constructor({ rand = Math.random } = {}) {
    this.rand = rand;
    this.base = { hp: 100, max: 100 };
    this.wave = 0; this.phase = 'prep'; this.prepT = PREP_T;
    this.coins = 60; this.score = 0; this.power = 0;
    this.pests = []; this.structures = []; this.guards = []; this.queue = []; this.spawnT = 0;
    this.slots = Array.from({ length: SLOT_N }, (_, i) => ({ i, angle: i / SLOT_N * Math.PI * 2 }));
    this.events = []; this.nextId = 1; this.time = 0; this.kills = 0;
  }
  emit(t, d = {}) { this.events.push({ t, ...d }); }
  slotPos(i, r) { const a = this.slots[i].angle; return { x: Math.sin(a) * r, z: Math.cos(a) * r }; }

  // ---------------------------------------------------------------- Давалгаа
  startWave() {
    if (this.phase !== 'prep') return false;
    this.wave++; this.phase = 'wave'; this.queue = waveList(this.wave, this.rand); this.spawnT = 0;
    this.emit('waveStart', { wave: this.wave, count: this.queue.length });
    return true;
  }
  spawn(type, x, z) {
    const def = PESTS[type], id = this.nextId++;
    const p = { id, type, x, z, hp: def.hp, speed: def.speed, biting: null, emerged: !def.burrow, t: 0 };
    this.pests.push(p); this.emit('spawn', { id, type, x, z, burrow: !!def.burrow });
    return p;
  }
  spawnFromEdge(type) {
    const def = PESTS[type];
    if (def.burrow) { const a = this.rand() * Math.PI * 2, r = 8 + this.rand() * 3; return this.spawn(type, Math.sin(a) * r, Math.cos(a) * r); }
    const side = Math.floor(this.rand() * 4) * Math.PI / 2 + (this.rand() - 0.5) * 0.5;
    return this.spawn(type, Math.sin(side) * SPAWN_R, Math.cos(side) * SPAWN_R);
  }

  // ---------------------------------------------------------------- Дэлгүүр
  buy(kind) {
    const item = SHOP[kind]; if (!item) return { ok: false, reason: 'kind' };
    if (this.phase === 'over') return { ok: false, reason: 'over' };
    if (this.coins < item.price) return { ok: false, reason: 'coins' };
    if (kind === 'FENCE' || kind === 'SPRAYER') {
      const slot = this.slots.find((s) => !s[kind === 'FENCE' ? 'fence' : 'sprayer']);
      if (!slot) return { ok: false, reason: 'slot' };
      const r = kind === 'FENCE' ? FENCE_R : SPRAYER_R, pos = this.slotPos(slot.i, r);
      const st = { id: this.nextId++, kind, slot: slot.i, x: pos.x, z: pos.z, hp: kind === 'FENCE' ? 30 : 999, cd: 0 };
      this.structures.push(st); slot[kind === 'FENCE' ? 'fence' : 'sprayer'] = st.id;
      this.emit('build', { kind, id: st.id, x: pos.x, z: pos.z, slot: slot.i });
    } else if (kind === 'GUARD') {
      if (this.guards.length >= 4) return { ok: false, reason: 'slot' };
      const a = this.guards.length * Math.PI / 2 + Math.PI / 4;
      const g = { id: this.nextId++, x: Math.sin(a) * 5, z: Math.cos(a) * 5, angle: a, cd: 0 };
      this.guards.push(g); this.emit('guard', { id: g.id, x: g.x, z: g.z });
    } else if (kind === 'POWER') {
      if (this.power >= 2) return { ok: false, reason: 'max' };
      this.power++;
    } else if (kind === 'REPAIR') {
      if (this.base.hp >= this.base.max) return { ok: false, reason: 'full' };
      this.base.hp = Math.min(this.base.max, this.base.hp + 30);
    }
    this.coins -= item.price; this.emit('buy', { kind });
    return { ok: true };
  }
  get playerDmg() { return this.power >= 1 ? 2 : 1; }
  get playerRate() { return this.power >= 2 ? 0.25 : 0.35; }

  // ---------------------------------------------------------------- Буудалт
  /** Шулуун дээрх (14м, өргөн 0.8) эхний хортонд dmg; хортоны id эсвэл null */
  shoot(x, z, dx, dz, dmg = this.playerDmg, range = 14, width = 0.8) {
    const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
    let best = null, bd = range;
    for (const p of this.pests) {
      if (!p.emerged) continue;
      const rx = p.x - x, rz = p.z - z, along = rx * dx + rz * dz;
      if (along < 0 || along > bd) continue;
      const side = Math.abs(rx * dz - rz * dx);
      if (side > width + PESTS[p.type].r) continue;
      bd = along; best = p;
    }
    if (best) this.damage(best, dmg);
    return best ? best.id : null;
  }
  damage(p, dmg) {
    p.hp -= dmg; this.emit('hit', { id: p.id, x: p.x, z: p.z });
    if (p.hp > 0) return;
    const def = PESTS[p.type];
    this.pests.splice(this.pests.indexOf(p), 1);
    this.coins += def.reward; this.score += def.reward; this.kills++;
    this.emit('die', { id: p.id, type: p.type, x: p.x, z: p.z, reward: def.reward });
    if (def.splits) for (const s of [-1, 1]) this.spawn('MINI', p.x + s * 0.6, p.z + s * 0.3);
  }
  nearestPest(x, z, range, flyingOk = true) {
    let best = null, bd = range;
    for (const p of this.pests) { if (!p.emerged || (!flyingOk && PESTS[p.type].flying)) continue; const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } }
    return best;
  }

  // ---------------------------------------------------------------- Tick
  tick(dt) {
    if (this.phase === 'over') return;
    this.time += dt;
    if (this.phase === 'prep') { this.prepT -= dt; if (this.prepT <= 0) this.startWave(); return; }
    // Spawn
    if (this.queue.length) { this.spawnT -= dt; if (this.spawnT <= 0) { this.spawnT = 0.8; this.spawnFromEdge(this.queue.shift()); } }
    // Хортон
    for (const p of [...this.pests]) {
      const def = PESTS[p.type]; p.t += dt;
      if (!p.emerged) { if (p.t > 1.2) { p.emerged = true; this.emit('emerge', { id: p.id }); } continue; }
      const d = Math.hypot(p.x, p.z);
      if (d <= BASE_R) { this.pests.splice(this.pests.indexOf(p), 1); this.base.hp = Math.max(0, this.base.hp - 4); this.emit('baseHit', { id: p.id, hp: this.base.hp }); if (this.base.hp <= 0) return this.gameOver(); continue; }
      // Хашаа: slot тойрог дээр (FENCE_R ± 0.6) хашаатай сектор бол зогсоод хазна (хэрээ давна)
      if (!def.flying && !p.biting && Math.abs(d - FENCE_R) < 0.6) {
        const a = Math.atan2(p.x, p.z), slot = this.slots[Math.round(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * SLOT_N) % SLOT_N];
        if (slot.fence) { const f = this.structures.find((s) => s.id === slot.fence); if (f) p.biting = f; }
      }
      if (p.biting) {
        const f = p.biting; f.hp -= dt;
        if (f.hp <= 0) { this.structures.splice(this.structures.indexOf(f), 1); this.slots[f.slot].fence = null; this.emit('fenceBroken', { id: f.id, slot: f.slot }); for (const q of this.pests) if (q.biting === f) q.biting = null; }
        continue;
      }
      const sp = def.speed * dt / (d || 1);
      p.x -= p.x * sp; p.z -= p.z * sp;
    }
    // Цацуур цамхаг: 0.9с тутам 8м-т
    for (const s of this.structures) {
      if (s.kind !== 'SPRAYER') continue;
      s.cd -= dt; if (s.cd > 0) continue;
      const t = this.nearestPest(s.x, s.z, 8); if (!t) continue;
      s.cd = 0.9; this.emit('shot', { from: s.id, x: s.x, z: s.z, tx: t.x, tz: t.z }); this.damage(t, 1);
    }
    // Хамгаалагч: base эргэн тойрон явна, 7м-т 0.7с тутам
    for (const g of this.guards) {
      g.angle += dt * 0.35; g.x = Math.sin(g.angle) * 5; g.z = Math.cos(g.angle) * 5;
      g.cd -= dt; if (g.cd > 0) continue;
      const t = this.nearestPest(g.x, g.z, 7); if (!t) continue;
      g.cd = 0.7; this.emit('shot', { from: g.id, x: g.x, z: g.z, tx: t.x, tz: t.z, guard: true }); this.damage(t, 1);
    }
    // Давалгаа дууссан
    if (!this.queue.length && !this.pests.length) {
      const bonus = 20 + 5 * this.wave; this.coins += bonus; this.score += bonus;
      this.phase = 'prep'; this.prepT = PREP_T;
      this.emit('waveClear', { wave: this.wave, bonus });
    }
  }
  gameOver() { this.phase = 'over'; this.emit('over', this.result()); }
  result() { return { score: this.score, wave: this.wave, kills: this.kills, stars: Math.floor(this.score / STARS_DIV) }; }

  // ---------------------------------------------------------------- Co-op snapshot
  snapshot() {
    return { base: { ...this.base }, wave: this.wave, phase: this.phase, prepT: Math.round(this.prepT * 10) / 10, coins: this.coins, score: this.score, power: this.power, kills: this.kills, nextId: this.nextId,
      pests: this.pests.map((p) => [p.id, p.type, Math.round(p.x * 100) / 100, Math.round(p.z * 100) / 100, p.hp, p.emerged ? 1 : 0, p.biting ? p.biting.id : 0]),
      structures: this.structures.map((s) => ({ id: s.id, kind: s.kind, slot: s.slot, x: s.x, z: s.z, hp: Math.round(s.hp * 10) / 10 })),
      guards: this.guards.map((g) => ({ id: g.id, x: g.x, z: g.z, angle: g.angle })), queue: [...this.queue] };
  }
  load(s) {
    this.base = { ...s.base }; this.wave = s.wave; this.phase = s.phase; this.prepT = s.prepT; this.coins = s.coins; this.score = s.score; this.power = s.power || 0; this.kills = s.kills || 0; this.nextId = Math.max(this.nextId, s.nextId || 1);
    this.structures = s.structures.map((st) => ({ ...st, cd: 0 }));
    for (const sl of this.slots) { sl.fence = null; sl.sprayer = null; }
    for (const st of this.structures) this.slots[st.slot][st.kind === 'FENCE' ? 'fence' : 'sprayer'] = st.id;
    this.guards = s.guards.map((g) => ({ ...g, cd: 0 }));
    this.pests = s.pests.map(([id, type, x, z, hp, em, bite]) => ({ id, type, x, z, hp, speed: PESTS[type].speed, emerged: !!em, t: em ? 2 : 0, biting: bite ? this.structures.find((st) => st.id === bite) || null : null }));
    this.queue = [...(s.queue || [])];
  }
}
