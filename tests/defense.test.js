import { describe, it, expect } from 'vitest';
import { DefenseCore, waveList, PESTS, SHOP, FENCE_R, STARS_DIV } from '../src/defense/DefenseCore.js';

const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
const run = (c, secs, step = 0.05) => { for (let t = 0; t < secs; t += step) c.tick(step); };

describe('DefenseCore', () => {
  it('давалгаа 1 = 6 хортон, зөвхөн хорхой', () => {
    const l = waveList(1, () => 0.5); expect(l).toHaveLength(6); expect(l.every((t) => t === 'WORM')).toBe(true);
    expect(waveList(3, () => 0.5)).toContain('CROW');
  });
  it('хортон base руу ойртож, хүрвэл base −4, арилна', () => {
    const c = new DefenseCore({ rand: () => 0.5 }); c.startWave();
    c.tick(0.05); expect(c.pests).toHaveLength(1);
    const p = c.pests[0], d0 = Math.hypot(p.x, p.z);
    c.tick(1); expect(Math.hypot(p.x, p.z)).toBeLessThan(d0);
    p.x = 0; p.z = 2.0; c.tick(0.05);
    expect(c.base.hp).toBe(96); expect(c.pests.find((q) => q.id === p.id)).toBeUndefined();
    expect(c.events.some((e) => e.t === 'baseHit')).toBe(true);
  });
  it('shoot: шулуун дээрх эхний хортонд dmg, үхвэл зоос/оноо; хажуугийнхыг онохгүй', () => {
    const c = new DefenseCore(); c.phase = 'wave';
    const p = c.spawn('WORM', 0, 8), q = c.spawn('WORM', 5, 8);
    expect(c.shoot(0, 0, 0, 1)).toBe(p.id); expect(p.hp).toBe(1); expect(q.hp).toBe(2);
    const coins = c.coins; c.shoot(0, 0, 0, 1);
    expect(c.pests).not.toContain(p); expect(c.coins).toBe(coins + PESTS.WORM.reward); expect(c.score).toBe(PESTS.WORM.reward);
    expect(c.shoot(0, 0, 1, 0)).toBeNull();
  });
  it('слайм үхвэл 2 жижиг слайм', () => { const c = new DefenseCore(); c.phase = 'wave'; const s = c.spawn('SLIME', 0, 6); c.damage(s, 5); expect(c.pests.filter((p) => p.type === 'MINI')).toHaveLength(2); });
  it('buy: зоос дутуу, slot дүүрэн, хашаа хортонг зогсоож эвдрэнэ, хэрээ давна', () => {
    const c = new DefenseCore(); c.coins = 30;
    expect(c.buy('FENCE').ok).toBe(false);
    c.coins = 10000; for (let i = 0; i < 8; i++) expect(c.buy('FENCE').ok).toBe(true);
    expect(c.buy('FENCE').reason).toBe('slot');
    c.phase = 'wave';
    const w = c.spawn('WORM', 0, FENCE_R + 0.3);   // slot 0 (өнцөг 0 → z тэнхлэг)
    run(c, 1); expect(w.biting).toBeTruthy(); expect(Math.hypot(w.x, w.z)).toBeGreaterThan(FENCE_R - 0.7);
    run(c, 31); expect(c.events.some((e) => e.t === 'fenceBroken')).toBe(true); expect(w.biting).toBeNull();
    const crow = c.spawn('CROW', 0, FENCE_R + 0.3); run(c, 1); expect(crow.biting).toBeNull();
  });
  it('цацуур 0.9с тутам ойрын хортонд dmg, хамгаалагч явж буудна', () => {
    const c = new DefenseCore(); c.coins = 1000; c.buy('SPRAYER'); c.buy('GUARD'); c.phase = 'wave';
    const s = c.structures[0], p = c.spawn('SLIME', s.x + 3, s.z); p.speed = 0;
    run(c, 1); expect(p.hp).toBeLessThan(5); expect(c.events.filter((e) => e.t === 'shot').length).toBeGreaterThan(0);
    const g = c.guards[0], a0 = g.angle; run(c, 1); expect(g.angle).toBeGreaterThan(a0);
  });
  it('POWER 2 түвшин, REPAIR base', () => { const c = new DefenseCore(); c.coins = 1000; c.base.hp = 50; expect(c.buy('REPAIR').ok).toBe(true); expect(c.base.hp).toBe(80); expect(c.buy('POWER').ok).toBe(true); expect(c.playerDmg).toBe(2); c.buy('POWER'); expect(c.buy('POWER').reason).toBe('max'); });
  it('давалгаа дуусахад бонус + prep; prep дуусахад автоматаар эхэлнэ', () => {
    const c = new DefenseCore({ rand: () => 0.5 }); c.startWave();
    run(c, 6); c.pests.length = 0; c.queue.length = 0; const coins = c.coins; c.tick(0.05);
    expect(c.phase).toBe('prep'); expect(c.coins).toBe(coins + 25);
    run(c, 20); expect(c.phase).toBe('wave'); expect(c.wave).toBe(2);
  });
  it('base 0 → over, од = score/25', () => { const c = new DefenseCore(); c.phase = 'wave'; c.score = 260; c.base.hp = 4; c.spawn('WORM', 0, 1); c.tick(0.05); expect(c.phase).toBe('over'); expect(c.result().stars).toBe(Math.floor(260 / STARS_DIV)); });
  it('snapshot/load round-trip', () => {
    const c = new DefenseCore({ rand: () => 0.3 }); c.coins = 500; c.buy('FENCE'); c.buy('SPRAYER'); c.buy('GUARD'); c.startWave(); run(c, 3);
    const d = new DefenseCore(); d.load(JSON.parse(JSON.stringify(c.snapshot())));
    expect(d.pests.length).toBe(c.pests.length); expect(d.structures.length).toBe(3 - 1); expect(d.guards.length).toBe(1); expect(d.slots[0].fence).toBe(c.slots[0].fence); expect(d.wave).toBe(1);
    run(d, 1); expect(d.phase).toBe('wave');
  });
});
