// «ASMR цамхаг» — цэвэр логик: спираль цамхаг үүсгэх, платформ дээр буух шалгалт, checkpoint, хугацаа, од.
export const TYPES = {
  tile: { w: 2.2, d: 2.2 },
  jelly: { w: 2.0, d: 2.0, bounce: 1.7 },
  sand: { w: 2.2, d: 2.2, crumble: 0.55, respawn: 3 },
  move: { w: 2.0, d: 2.0, amp: 2.4, speed: 1.1 },
  pop: { w: 2.4, d: 2.4 },
  slime: { w: 2.6, d: 2.6, slippery: true },
  spin: { w: 3.0, d: 3.0, spinSpeed: 1.6 },
  check: { w: 3.2, d: 3.2, checkpoint: true },
};
export const PLATFORMS_N = 60, CHECK_EVERY = 10, STAGE_TYPES = ['tile', 'pop', 'jelly', 'sand', 'move', 'spin'];
export const FALL_MARGIN = 9, STARS_CHECK = 5, STARS_FINISH = 50;
const PENTA = [0, 2, 4, 7, 9];

/** Дэс дугаараар пентатоник ноотын давтамж (C4-ээс дээшлэнэ) */
export function noteFor(i) { const oct = Math.floor(i / 5) % 3, deg = PENTA[i % 5]; return 261.63 * Math.pow(2, (deg + oct * 12) / 12); }

/** Спираль цамхаг: seed-тэй, буух боломжтой зайтай (зай ≤ 3.1, өндөр ≤ 1.15) */
export function generateTower(seed = 1) {
  let sd = seed >>> 0; const rand = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
  const out = []; let angle = 0, y = 0, r = 7.5;
  for (let i = 0; i < PLATFORMS_N; i++) {
    const stage = Math.floor(i / CHECK_EVERY);
    const isCheck = i > 0 && i % CHECK_EVERY === 0, isLast = i === PLATFORMS_N - 1;
    let type = i === 0 ? 'check' : isCheck || isLast ? 'check' : STAGE_TYPES[stage % STAGE_TYPES.length];
    if (type !== 'check' && rand() < 0.3) type = 'tile';   // хольц — амьсгаа авах хавтан
    if (type === 'tile' && stage >= 4 && rand() < 0.35) type = 'slime';
    const def = TYPES[type];
    if (i > 0) { angle += 0.36 + rand() * 0.12; y += 0.85 + rand() * 0.3; r = 7.5 + Math.sin(i * 0.37) * 1.2; }
    out.push({ id: i, type, x: Math.sin(angle) * r, y, z: Math.cos(angle) * r, w: def.w, d: def.d, angle, stage, color: colorFor(i), note: noteFor(i), phase: rand() * 6 });
  }
  return out;
}
/** Пастел өнгө: өндрөөр hue эргэнэ */
export function colorFor(i) { const h = (i * 9) % 360; return hsl(h, 0.7, 0.78); }
function hsl(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return ((Math.round((r + m) * 255) << 16) | (Math.round((g + m) * 255) << 8) | Math.round((b + m) * 255));
}

/** Хөдөлдөг платформын одоогийн offset (тангенсийн дагуу) */
export function moveOffset(p, t) { if (p.type !== 'move') return { x: 0, z: 0 }; const k = Math.sin(t * TYPES.move.speed + p.phase) * TYPES.move.amp; return { x: Math.cos(p.angle) * k, z: -Math.sin(p.angle) * k }; }

/** Дээрээс унаж буй тоглогч платформ дээр буух эсэх: yPrev ≥ top ≥ yNow, xz дотор. Буусан платформыг буцаана */
export function landOn(platforms, x, z, yPrev, yNow, t, crumbled = new Set()) {
  let best = null;
  for (const p of platforms) {
    if (crumbled.has(p.id)) continue;
    const off = moveOffset(p, t), px = p.x + off.x, pz = p.z + off.z, top = p.y + 0.3;
    if (Math.abs(x - px) > p.w / 2 + 0.25 || Math.abs(z - pz) > p.d / 2 + 0.25) continue;
    if (yPrev >= top - 0.02 && yNow <= top + 0.001) { if (!best || top > best.top) best = { p, top, off }; }
  }
  return best;
}
/** Тоглогч платформ дээр зогсож байгаа эсэх (дэмжлэг) */
export function supportAt(platforms, x, z, y, t, crumbled = new Set()) {
  for (const p of platforms) {
    if (crumbled.has(p.id)) continue;
    const off = moveOffset(p, t), top = p.y + 0.3;
    if (Math.abs(y - top) < 0.05 && Math.abs(x - p.x - off.x) <= p.w / 2 + 0.25 && Math.abs(z - p.z - off.z) <= p.d / 2 + 0.25) return { p, top, off };
  }
  return null;
}

export class ObbyRun {
  constructor(platforms) { this.platforms = platforms; this.checkpoint = 0; this.time = 0; this.reached = new Set([0]); this.finished = false; this.falls = 0; this.stars = 0; this.crumbled = new Map(); }
  get spawn() { const p = this.platforms[this.checkpoint]; return { x: p.x, y: p.y + 0.3, z: p.z }; }
  tick(dt) { if (!this.finished) this.time += dt; for (const [id, t] of this.crumbled) if (t - dt <= 0) this.crumbled.delete(id); else this.crumbled.set(id, t - dt); }
  /** Буулт: checkpoint / төгсгөл / элс нурах → үр дүн */
  land(p) {
    const r = { note: p.note, checkpoint: false, finish: false, stars: 0 };
    if (p.type === 'sand') this.crumbleAt = p.id;
    if (p.type === 'check' && !this.reached.has(p.id)) {
      this.reached.add(p.id); this.checkpoint = p.id; r.checkpoint = true;
      if (p.id === this.platforms.length - 1) { this.finished = true; r.finish = true; r.stars = STARS_FINISH; } else r.stars = STARS_CHECK;
      this.stars += r.stars;
    } else if (p.type === 'check' && p.id > this.checkpoint) this.checkpoint = p.id;
    return r;
  }
  crumble(id) { this.crumbled.set(id, TYPES.sand.respawn); }
  /** Унасан эсэх: checkpoint-оос FALL_MARGIN доош */
  fell(y) { return y < this.platforms[this.checkpoint].y - FALL_MARGIN; }
  respawn() { this.falls++; return this.spawn; }
}
