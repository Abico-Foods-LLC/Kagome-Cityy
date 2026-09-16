import { describe, it, expect } from 'vitest';
import { generateTower, landOn, supportAt, moveOffset, noteFor, ObbyRun, PLATFORMS_N, CHECK_EVERY, STARS_CHECK, STARS_FINISH, FALL_MARGIN } from '../src/obby/ObbyCore.js';

describe('ObbyCore', () => {
  it('цамхаг 60 платформ, seed-тэй, checkpoint 10 тутам, эхнийх/сүүлчийнх checkpoint', () => {
    const a = generateTower(3), b = generateTower(3);
    expect(a).toHaveLength(PLATFORMS_N); expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a[0].type).toBe('check'); expect(a[CHECK_EVERY].type).toBe('check'); expect(a[PLATFORMS_N - 1].type).toBe('check');
  });
  it('дараалсан платформууд буух боломжтой зайтай', () => {
    const t = generateTower(7);
    for (let i = 1; i < t.length; i++) { const a = t[i - 1], b = t[i]; const gap = Math.hypot(b.x - a.x, b.z - a.z) - (a.w + b.w) / 2; expect(gap).toBeLessThan(3.2); expect(b.y - a.y).toBeLessThanOrEqual(1.16); expect(b.y).toBeGreaterThan(a.y); }
  });
  it('landOn: дээрээс унаж платформ дээр буух; хажуугаар өнгөрөхөд буухгүй', () => {
    const p = [{ id: 0, type: 'tile', x: 0, y: 2, z: 0, w: 2, d: 2, angle: 0, phase: 0 }];
    expect(landOn(p, 0.3, 0.2, 2.6, 2.2, 0)?.p.id).toBe(0);
    expect(landOn(p, 3, 0, 2.6, 2.2, 0)).toBeNull();
    expect(landOn(p, 0, 0, 2.1, 2.5, 0)).toBeNull();   // дээшээ явж байна
    expect(landOn(p, 0, 0, 2.6, 2.2, 0, new Set([0]))).toBeNull();   // нурсан
  });
  it('move платформ хөдөлж, supportAt дагана', () => {
    const p = [{ id: 1, type: 'move', x: 5, y: 1, z: 0, w: 2, d: 2, angle: 0, phase: 0 }];
    const o1 = moveOffset(p[0], 1.4); expect(Math.abs(o1.x) + Math.abs(o1.z)).toBeGreaterThan(0.5);
    expect(supportAt(p, 5 + o1.x, o1.z, 1.3, 1.4)?.p.id).toBe(1);
    expect(supportAt(p, 5, 0, 1.3, 1.4)?.p.id ?? null).toBe(Math.abs(o1.x) < 1.25 ? 1 : null);
  });
  it('noteFor пентатоник дээшилнэ', () => { expect(noteFor(1)).toBeGreaterThan(noteFor(0)); expect(noteFor(5)).toBeCloseTo(noteFor(0) * 2, 1); });
  it('ObbyRun: checkpoint од, төгсгөл, унах/respawn, элс нурах', () => {
    const t = generateTower(1), r = new ObbyRun(t);
    expect(r.land(t[3]).stars).toBe(0);
    const c = r.land(t[10]); expect(c.checkpoint).toBe(true); expect(c.stars).toBe(STARS_CHECK); expect(r.checkpoint).toBe(10);
    expect(r.land(t[10]).stars).toBe(0);
    expect(r.fell(t[10].y - FALL_MARGIN - 1)).toBe(true); expect(r.fell(t[10].y - 2)).toBe(false);
    expect(r.respawn().y).toBeCloseTo(t[10].y + 0.3); expect(r.falls).toBe(1);
    r.crumble(4); expect(r.crumbled.has(4)).toBe(true); r.tick(3.1); expect(r.crumbled.has(4)).toBe(false);
    const f = r.land(t[PLATFORMS_N - 1]); expect(f.finish).toBe(true); expect(f.stars).toBe(STARS_FINISH); expect(r.finished).toBe(true);
    const time = r.time; r.tick(1); expect(r.time).toBe(time);
  });
});
