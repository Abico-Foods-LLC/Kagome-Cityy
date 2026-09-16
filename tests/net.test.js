import { describe, it, expect } from 'vitest';
import { packState, unpackState, pickHost, Interp, roomCode, ANIMS } from '../src/net/proto.js';

describe('net proto', () => {
  it('packState/unpackState round-trip', () => {
    const p = { x: 1.234, y: 0.5, z: -20.75, h: 1.57, anim: 'run', speed: 0.8, inCar: true, carX: 10.1, carZ: 20.2, carH: -0.5, carSpeed: 7.25, runner: false };
    const u = unpackState(packState(p));
    for (const k of ['x', 'y', 'z', 'h', 'speed', 'carX', 'carZ', 'carH', 'carSpeed']) expect(u[k]).toBeCloseTo(p[k], 2);
    expect(u.anim).toBe('run'); expect(u.inCar).toBe(true); expect(u.runner).toBe(false);
    expect(Array.isArray(packState(p))).toBe(true);
  });
  it('zone round-trip', () => { const u = unpackState(packState({ anim: 'idle', zone: 2 })); expect(u.zone).toBe(2); expect(u.runner).toBe(true); expect(unpackState(packState({ anim: 'idle' })).zone).toBe(0); });
  it('тодорхойгүй anim → idle', () => { expect(unpackState(packState({ anim: 'zzz' })).anim).toBe('idle'); expect(ANIMS).toContain('carried'); });
  it('pickHost: хамгийн эрт нэгдсэн, тэнцвэл id үсгээр', () => {
    expect(pickHost([{ id: 'b', joinedAt: 5 }, { id: 'a', joinedAt: 3 }])).toBe('a');
    expect(pickHost([{ id: 'b', joinedAt: 3 }, { id: 'a', joinedAt: 3 }])).toBe('a');
    expect(pickHost([])).toBeNull();
  });
  it('Interp: хоёр sample дунд', () => {
    const i = new Interp();
    i.push({ x: 0, y: 0, z: 0, h: 0 }, 1000); i.push({ x: 10, y: 0, z: 20, h: 1 }, 1200);
    const s = i.sample(1200, 100);   // 100мс хоцролт → t=1100 → дунд
    expect(s.x).toBeCloseTo(5); expect(s.z).toBeCloseTo(10); expect(s.h).toBeCloseTo(0.5);
  });
  it('Interp: heading π/−π дамнахад богино замаар', () => {
    const i = new Interp();
    i.push({ x: 0, y: 0, z: 0, h: 3.0 }, 0); i.push({ x: 0, y: 0, z: 0, h: -3.0 }, 200);
    const s = i.sample(200, 100);
    expect(Math.abs(Math.abs(s.h) - Math.PI)).toBeLessThan(0.15);
  });
  it('Interp: sample-гүй бол null, нэг sample бол өөрөө', () => { const i = new Interp(); expect(i.sample(0)).toBeNull(); i.push({ x: 1, y: 2, z: 3, h: 0 }, 0); expect(i.sample(500).x).toBe(1); });
  it('roomCode: 6 тэмдэгт a-z0-9', () => { for (let k = 0; k < 20; k++) expect(roomCode()).toMatch(/^[a-z0-9]{6}$/); });
});
