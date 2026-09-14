// Jungle Runner-ийн цэвэр логик (дүрслэлгүй). Эгнээ, үсрэлт, гулсалт, уяа, саад, цуглуулга, оноо.
import { RUNNER_LEVELS } from '../core/content.js';

export const LANE_W = 2.4;
const GAPS = [154, 298];

function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

export class Runner {
  constructor(level = 0) {
    this.level = level;
    this.config = RUNNER_LEVELS[level];
    this.distance = 0;
    this.lane = 0; this.x = 0; this.y = 0; this.vy = 0;
    this.slide = 0; this.hang = 0; this.hangTotal = 0; this.invincible = 0; this.shield = 0; this.magnet = 0;
    this.combo = 0; this.bestCombo = 0; this.zone = 0; this.lives = 3; this.score = 0;
    this.collected = Array(8).fill(0);
    this.nearMiss = 0;
    this.state = 'ready';
    this.events = [];
    this.objects = [];
    this.time = 0;
    this.speedMul = 1;
    this.makeTrack();
  }

  makeTrack() {
    const r = seeded(101 + this.level * 7);
    let id = 0;
    const L = this.config.length;
    const push = (o) => this.objects.push({ id: id++, done: false, ...o });
    let d = 30;
    let wave = 0;
    while (d < L - 14) {
      if (GAPS.some((g) => Math.abs(d - g) < 20)) { d += 6; continue; }
      const lane = Math.floor(r() * 3) - 1;
      const pick = r();
      const types = ['monster', 'hurdle', 'beam', 'rolling'];
      let type = wave % 5 === 4 ? 'rolling' : types[Math.floor(pick * 3)];
      if (this.level >= 2 && r() < 0.25) type = 'rolling';
      push({ type, lane, d });
      // Хоёр дахь саад (өндөр үед): өөр эгнээнд, гэхдээ гурван эгнээ хэзээ ч бүгд хаагдахгүй
      if (this.level >= 1 && r() < 0.25 + this.level * 0.12) {
        const lane2 = ((lane + 1 + Math.floor(r() * 2)) % 3 + 3) % 3 - 1;
        const t2 = ['hurdle', 'beam'][Math.floor(r() * 2)];
        push({ type: t2, lane: lane2 === lane ? (lane + 1 > 1 ? -1 : lane + 1) : lane2, d: d + 0.5 });
      }
      // Бүтээгдэхүүний мөр — чөлөөтэй эгнээнд
      const free = [-1, 0, 1].filter((l) => !this.objects.some((o) => Math.abs(o.d - d) < 2 && o.lane === l && o.type !== 'product'));
      const pl = free[Math.floor(r() * free.length)] ?? 0;
      const n = 3 + Math.floor(r() * 3);
      const sku = Math.floor(r() * 8);
      for (let j = 0; j < n; j++) push({ type: 'product', sku: (sku + j) % 8, lane: pl, d: d + 4 + j * 2.6, high: false });
      // Үсрэх онгойлт дээр өндөр мөр
      if (type === 'hurdle' && r() < 0.5) for (let j = 0; j < 3; j++) push({ type: 'product', sku: (sku + 3 + j) % 8, lane, d: d - 1 + j * 1.6, high: true });
      d += 15 + r() * 6 - Math.min(5, this.level * 1.2);
      wave++;
    }
    for (const g of GAPS) {
      push({ type: 'gap', lane: 0, d: g });
      for (let j = 0; j < 6; j++) push({ type: 'product', sku: (j + this.level) % 8, lane: 0, d: g - 6 + j * 2.6, high: true, rope: true });
    }
    // Хүч: бамбай, соронз
    for (const [dd, type, lane] of [[62, 'shield', 0], [110, 'magnet', 1], [230, 'shield', -1], [270, 'magnet', 0], [360, 'shield', 1], [440, 'magnet', -1]]) {
      if (dd < L - 20) push({ type, lane, d: dd, id: 10000 + dd });
    }
    this.objects.sort((a, b) => a.d - b.d);
  }

  obstacleX(o) {
    if (o.type === 'rolling') return o.lane * LANE_W + Math.sin(o.id * 0.9 + Math.min(this.distance, o.d - 14) * 0.09) * 0.75;
    return o.lane * LANE_W;
  }

  get speed() { return this.config.speed * this.speedMul; }

  start() { if (this.state === 'ready') this.state = 'playing'; }
  pause() { if (this.state === 'playing') this.state = 'paused'; else if (this.state === 'paused') this.state = 'playing'; }

  action(a) {
    if (this.state !== 'playing') return;
    if (a === 'left' && this.hang <= 0) { const p = this.lane; this.lane = Math.max(-1, this.lane - 1); if (p !== this.lane) this.events.push({ kind: 'lane', dir: -1 }); }
    if (a === 'right' && this.hang <= 0) { const p = this.lane; this.lane = Math.min(1, this.lane + 1); if (p !== this.lane) this.events.push({ kind: 'lane', dir: 1 }); }
    if (a === 'jump') {
      if (this.y <= 0.01 && this.hang <= 0) { this.vy = 8.6; this.slide = 0; this.events.push({ kind: 'jump' }); }
      else if (this.y > 0.01 && this.hang <= 0) this.jumpBuffer = 0.12;
    }
    if (a === 'slide') {
      if (this.y <= 0.01 && this.hang <= 0) { this.slide = 0.9; this.events.push({ kind: 'slide' }); }
      else if (this.y > 0.01) { this.vy = -14; this.events.push({ kind: 'dive' }); } // агаараас хурдан буух
    }
    if (a === 'rope') {
      const gap = this.objects.find((o) => o.type === 'gap' && !o.done && o.d - this.distance < 24 && o.d - this.distance > -2);
      if (gap && this.hang <= 0) {
        this.hangTotal = this.hang = (gap.d + 16 - this.distance) / this.speed;
        this.lane = 0; this.y = 2.4; this.vy = 0; this.slide = 0;
        this.events.push({ kind: 'rope' });
      } else if (this.hang <= 0) this.events.push({ kind: 'noRope' });
    }
  }

  update(dt) {
    if (this.state !== 'playing') return;
    dt = Math.min(0.05, dt);
    this.time += dt;
    this.shield = Math.max(0, this.shield - dt);
    this.magnet = Math.max(0, this.magnet - dt);
    this.jumpBuffer = Math.max(0, (this.jumpBuffer || 0) - dt);
    // Хурд аажмаар нэмэгдэнэ
    this.speedMul = 1 + Math.min(0.35, this.distance / this.config.length * 0.35);
    const zone = Math.floor(this.distance / 120);
    if (zone > this.zone) { this.zone = zone; this.events.push({ kind: 'zone', zone }); }
    this.distance += this.speed * dt;
    this.x += (this.lane * LANE_W - this.x) * Math.min(1, dt * 13);
    this.slide = Math.max(0, this.slide - dt);
    this.invincible = Math.max(0, this.invincible - dt);
    if (this.hang > 0) { this.hang = Math.max(0, this.hang - dt); this.y = 2.4; }
    else {
      this.vy -= 24 * dt;
      const wasAir = this.y > 0;
      this.y = Math.max(0, this.y + this.vy * dt);
      if (this.y === 0) {
        if (wasAir) this.events.push({ kind: 'land' });
        this.vy = 0;
        if (this.jumpBuffer > 0) { this.jumpBuffer = 0; this.vy = 8.6; this.events.push({ kind: 'jump' }); }
      }
    }
    for (const o of this.objects) {
      if (o.done) continue;
      const ahead = o.d - this.distance;
      if (ahead > 1.2) break;              // объектууд эрэмбэлэгдсэн
      if (ahead < -1.2) { o.done = true; continue; }
      const dx = Math.abs(this.obstacleX(o) - this.x);
      const aligned = dx < 1.15;
      if (o.type === 'product') {
        const reach = aligned || (this.magnet > 0 && dx < 4);
        const heightOk = o.high ? (this.y > 1.3 || this.magnet > 0) : (this.y < 1.7 || this.magnet > 0);
        if (reach && heightOk) {
          o.done = true;
          this.collected[o.sku]++;
          this.combo++;
          this.bestCombo = Math.max(this.combo, this.bestCombo);
          const mult = Math.min(5, 1 + Math.floor(this.combo / 6));
          const points = 25 * mult;
          this.score += points;
          this.events.push({ kind: 'collect', sku: o.sku, points, mult, lane: o.lane, high: o.high });
        } else if (ahead < -0.9) { o.done = true; }
        continue;
      }
      if (o.type === 'shield' || o.type === 'magnet') {
        if (aligned && this.y < 2) { o.done = true; this[o.type] = o.type === 'shield' ? 14 : 10; this.events.push({ kind: o.type }); }
        else if (ahead < -0.9) o.done = true;
        continue;
      }
      if (ahead > 0.6) continue;           // саадтай зөвхөн яг дээр нь мөргөлдөнө
      o.done = true;
      const hit = o.type === 'gap' ? this.hang <= 0
        : aligned && this.hang <= 0 && (
          (o.type === 'monster' && this.y < 1.4) ||
          (o.type === 'rolling' && this.y < 1.2) ||
          (o.type === 'hurdle' && this.y < 0.85) ||
          (o.type === 'beam' && this.slide <= 0 && this.y < 2.6));
      if (!hit) {
        if (o.type !== 'gap' && dx < 2.2) { this.nearMiss++; this.score += 10; this.events.push({ kind: 'nearMiss' }); }
        continue;
      }
      if (this.invincible > 0) continue;
      this.combo = 0;
      if (this.shield > 0 && o.type !== 'gap') { this.shield = 0; this.invincible = 1.4; this.events.push({ kind: 'shieldBreak' }); continue; }
      this.lives--;
      this.invincible = 1.6;
      this.events.push({ kind: 'hurt', type: o.type });
      if (this.lives <= 0) { this.state = 'lost'; this.events.push({ kind: 'lost' }); break; }
      if (o.type === 'gap') { this.y = 0; this.vy = 0; }
    }
    if (this.distance >= this.config.length && this.state === 'playing') {
      this.state = 'won';
      this.score += this.lives * 100 + this.bestCombo * 5;
      this.events.push({ kind: 'won' });
    }
  }
}
