// Jungle Runner-ийн цэвэр логик (дүрслэлгүй). Эгнээ, үсрэлт, гулсалт, уяа, саад, цуглуулга, оноо, power-up.
// Зам хэсэг хэсгээр (chunk) үүсдэг тул төгсгөлгүй горимд ч ажиллана.
import { RUNNER_LEVELS } from '../core/content.js';

export const LANE_W = 2.4;
export const ENDLESS = 5;
export const ENDLESS_CONFIG = { name: 'Төгсгөлгүй гүйлт', speed: 12, length: Infinity, sky: 0x9fd0e8, fog: 0xc0e2d2, ground: 0x5f9c4a, rock: 0x7b7f6a, leaf: 0x2f7a46, light: 0xfff0cc, mist: 0.008, glow: 0xffb44a };
const GAP_EVERY = 144;          // хавцал давтамж

function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

export class Runner {
  constructor(level = 0) {
    this.level = level;
    this.endless = level === ENDLESS;
    this.config = this.endless ? ENDLESS_CONFIG : RUNNER_LEVELS[level];
    this.distance = 0;
    this.lane = 0; this.x = 0; this.y = 0; this.vy = 0;
    this.slide = 0; this.hang = 0; this.hangTotal = 0; this.invincible = 0;
    this.shield = 0; this.magnet = 0; this.jet = 0; this.double = 0;
    this.combo = 0; this.bestCombo = 0; this.zone = 0; this.lives = 3; this.score = 0;
    this.collected = Array(8).fill(0);
    this.nearMiss = 0;
    this.state = 'ready';
    this.events = [];
    this.objects = [];
    this.gaps = [];
    this.time = 0;
    this.speedMul = 1;
    this.rng = seeded(101 + level * 7);
    this.nextId = 0;
    this.genD = 30;              // дараагийн саадын байрлал
    this.wave = 0;
    this.generated = 0;          // хэр хол хүртэл үүсгэсэн
    this.lastPower = 40;
    this.ensureTrack(260);
  }

  get difficulty() { return this.endless ? Math.min(4, this.distance / 400) : this.level; }

  /** `upTo` зай хүртэл зам үүсгэнэ */
  ensureTrack(upTo) {
    const r = this.rng, L = this.config.length;
    const push = (o) => { this.objects.push({ id: this.nextId++, done: false, ...o }); };
    const limit = Math.min(upTo, L - 14);
    while (this.genD < limit) {
      const d = this.genD, diff = this.difficulty;
      // Хавцал (уяа): тодорхой давтамжтай
      const gapAt = Math.floor((d + 10) / GAP_EVERY) * GAP_EVERY + 154 - 144;
      if (!this.gaps.includes(gapAt) && gapAt >= 150 && Math.abs(d - gapAt) < 22) {
        this.gaps.push(gapAt);
        push({ type: 'gap', lane: 0, d: gapAt });
        for (let j = 0; j < 6; j++) push({ type: 'product', sku: (j + this.level) % 8, lane: 0, d: gapAt - 6 + j * 2.6, high: true, rope: true });
        this.genD = gapAt + 26; continue;
      }
      const lane = Math.floor(r() * 3) - 1;
      const types = ['monster', 'hurdle', 'beam'];
      let type = this.wave % 5 === 4 ? 'rolling' : types[Math.floor(r() * 3)];
      if (diff >= 2 && r() < 0.25) type = 'rolling';
      push({ type, lane, d });
      // Хоёр дахь саад: өөр эгнээнд, гурван эгнээ хэзээ ч бүгд хаагдахгүй
      if (diff >= 1 && r() < 0.25 + diff * 0.12) {
        const lane2 = ((lane + 1 + Math.floor(r() * 2)) % 3 + 3) % 3 - 1;
        push({ type: ['hurdle', 'beam'][Math.floor(r() * 2)], lane: lane2 === lane ? (lane + 1 > 1 ? -1 : lane + 1) : lane2, d: d + 0.5 });
      }
      // Бүтээгдэхүүний мөр — чөлөөтэй эгнээнд
      const free = [-1, 0, 1].filter((l) => !this.objects.some((o) => Math.abs(o.d - d) < 2 && o.lane === l && o.type !== 'product'));
      const pl = free[Math.floor(r() * free.length)] ?? 0;
      const n = 3 + Math.floor(r() * 3), sku = Math.floor(r() * 8);
      for (let j = 0; j < n; j++) push({ type: 'product', sku: (sku + j) % 8, lane: pl, d: d + 4 + j * 2.6, high: false });
      if (type === 'hurdle' && r() < 0.5) for (let j = 0; j < 3; j++) push({ type: 'product', sku: (sku + 3 + j) % 8, lane, d: d - 1 + j * 1.6, high: true });
      // Power-up: 55–90 м тутамд нэг
      if (d - this.lastPower > 55 + r() * 35) {
        const pw = ['shield', 'magnet', 'jet', 'double'][Math.floor(r() * 4)];
        push({ type: pw, lane: pl, d: d + 2 });
        this.lastPower = d;
      }
      this.genD = d + 15 + r() * 6 - Math.min(5, diff * 1.2);
      this.wave++;
    }
    this.generated = Math.max(this.generated, limit);
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
    if (this.jet > 0) return;   // jetpack үед үсрэх/гулсах хэрэггүй
    if (a === 'jump') {
      if (this.y <= 0.01 && this.hang <= 0) { this.vy = 8.6; this.slide = 0; this.events.push({ kind: 'jump' }); }
      else if (this.y > 0.01 && this.hang <= 0) this.jumpBuffer = 0.12;
    }
    if (a === 'slide') {
      if (this.y <= 0.01 && this.hang <= 0) { this.slide = 0.9; this.events.push({ kind: 'slide' }); }
      else if (this.y > 0.01) { this.vy = -14; this.events.push({ kind: 'dive' }); }
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
    this.double = Math.max(0, this.double - dt);
    const wasJet = this.jet > 0;
    this.jet = Math.max(0, this.jet - dt);
    if (wasJet && this.jet === 0) this.events.push({ kind: 'jetEnd' });
    this.jumpBuffer = Math.max(0, (this.jumpBuffer || 0) - dt);
    // Хурд аажмаар нэмэгдэнэ
    this.speedMul = this.endless ? 1 + Math.min(0.9, this.distance / 1600) : 1 + Math.min(0.35, this.distance / this.config.length * 0.35);
    const zone = Math.floor(this.distance / 120);
    if (zone > this.zone) { this.zone = zone; this.events.push({ kind: 'zone', zone }); }
    const step = this.speed * dt;
    this.distance += step;
    if (this.endless) { this.distScore = (this.distScore || 0) + step; if (this.distScore >= 1) { this.score += Math.floor(this.distScore); this.distScore -= Math.floor(this.distScore); } }
    if (this.distance + 220 > this.generated) this.ensureTrack(this.distance + 300);
    this.x += (this.lane * LANE_W - this.x) * Math.min(1, dt * 13);
    this.slide = Math.max(0, this.slide - dt);
    this.invincible = Math.max(0, this.invincible - dt);
    if (this.jet > 0) { this.y += (3.4 + Math.sin(this.time * 4) * 0.2 - this.y) * Math.min(1, dt * 5); this.vy = 0; this.hang = 0; }
    else if (this.hang > 0) { this.hang = Math.max(0, this.hang - dt); this.y = 2.4; }
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
    // Хуучин объектуудыг устгана (санах ой)
    if (this.objects.length > 400 && this.objects[0].d < this.distance - 40) this.objects = this.objects.filter((o) => o.d > this.distance - 40);
    for (const o of this.objects) {
      if (o.done) continue;
      const ahead = o.d - this.distance;
      if (ahead > 1.2) break;
      if (ahead < -1.2) { o.done = true; continue; }
      const dx = Math.abs(this.obstacleX(o) - this.x);
      const aligned = dx < 1.15;
      if (o.type === 'product') {
        const reach = aligned || ((this.magnet > 0 || this.jet > 0) && dx < 4);
        const heightOk = this.jet > 0 || this.magnet > 0 || (o.high ? this.y > 1.3 : this.y < 1.7);
        if (reach && heightOk) {
          o.done = true;
          this.collected[o.sku]++;
          this.combo++;
          this.bestCombo = Math.max(this.combo, this.bestCombo);
          const mult = Math.min(5, 1 + Math.floor(this.combo / 6)) * (this.double > 0 ? 2 : 1);
          const points = 25 * mult;
          this.score += points;
          this.events.push({ kind: 'collect', sku: o.sku, points, mult, lane: o.lane, high: o.high });
        } else if (ahead < -0.9) o.done = true;
        continue;
      }
      if (['shield', 'magnet', 'jet', 'double'].includes(o.type)) {
        if (aligned && (this.y < 2 || this.jet > 0)) {
          o.done = true;
          if (o.type === 'shield') this.shield = 14; else if (o.type === 'magnet') this.magnet = 10; else if (o.type === 'jet') { this.jet = 7; this.slide = 0; } else this.double = 12;
          this.events.push({ kind: o.type });
        } else if (ahead < -0.9) o.done = true;
        continue;
      }
      if (ahead > 0.6) continue;
      o.done = true;
      if (this.jet > 0) continue;          // jetpack: саадын дээгүүр нисдэг
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
    if (!this.endless && this.distance >= this.config.length && this.state === 'playing') {
      this.state = 'won';
      this.score += this.lives * 100 + this.bestCombo * 5;
      this.events.push({ kind: 'won' });
    }
  }
}
