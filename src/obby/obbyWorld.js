// ASMR цамхагийн орчин: чихрийн ертөнц — хөвөн чихэр үүл, донат/лоллипоп/зайрмаг чимэг, солонго, бөмбөлөг, оддын гялбаа. Procedural.
import * as T from 'three';
import * as P from '../world/props.js';
import { toon, glow } from '../gfx/materials.js';

/** Шат бүрийн палитр (10 платформ тутам) */
export const STAGE_PALETTE = [
  { name: 'Чихэр', a: 0xffb3d1, b: 0xffd6e8, ring: 0xff8fbf },
  { name: 'Гаа', a: 0xa8f0dc, b: 0xd6fff2, ring: 0x6fdcbf },
  { name: 'Тэнгэр', a: 0xb3d9ff, b: 0xdcefff, ring: 0x7ab8ff },
  { name: 'Нимбэг', a: 0xfff0a8, b: 0xfff8d6, ring: 0xffd24d },
  { name: 'Лаванда', a: 0xd6c2ff, b: 0xece2ff, ring: 0xb28fff },
  { name: 'Тоор', a: 0xffcfb0, b: 0xffe6d6, ring: 0xff9f6b },
];
export const stageColor = (stage, k = 0) => { const p = STAGE_PALETTE[stage % STAGE_PALETTE.length]; return new T.Color(p.a).lerp(new T.Color(p.b), k).getHex(); };

const soft = (c, key) => toon(c, { key: 'obby_' + key });

export function buildObbyWorld(scene, tower) {
  const out = { anim: [] };
  const top = tower[tower.length - 1].y + 6;
  // Хөвөн чихэр үүл: 4–6 бөмбөрцгийн бөөгнөрөл, пастел ягаан/цэнхэр
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * 6.3 + (i % 2) * 0.2, r = 24 + (i % 4) * 7, y = 3 + (i * 7.3) % (top + 10);
    const g = new T.Group(); g.position.set(Math.sin(a) * r, y, Math.cos(a) * r); scene.add(g);
    const c = i % 3 === 0 ? 0xffd6ec : i % 3 === 1 ? 0xdcefff : 0xffffff;
    for (let k = 0; k < 5; k++) { const m = P.sphere(soft(c, 'cloud' + (i % 3)), g, (k - 2) * 1.4 + (k % 2) * 0.4, (k % 2) * 0.6, (k % 3 - 1) * 0.6, 1.4 + (k % 2) * 0.5, 1.0 + (k % 3) * 0.2, 1.3); m.castShadow = false; }
    out.anim.push({ o: g, kind: 'cloud', phase: i, y });
  }
  // Донат, лоллипоп, зайрмаг чимэг (багана тойрон хөвнө)
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * 6.3, r = 13 + (i % 3) * 3, y = 4 + i * (top / 12);
    const g = new T.Group(); g.position.set(Math.sin(a) * r, y, Math.cos(a) * r); scene.add(g);
    const kind = i % 3;
    if (kind === 0) { P.mesh(new T.TorusGeometry(0.9, 0.42, 12, 28), soft(0xf2c9a0, 'donut'), g, 0, 0, 0); const ic = P.mesh(new T.TorusGeometry(0.9, 0.36, 12, 28), soft([0xff8fbf, 0xb28fff, 0x7ab8ff][i % 3], 'icing' + (i % 3)), g, 0, 0.12, 0); ic.scale.y = 0.6; for (let s = 0; s < 8; s++) { const sa = s / 8 * 6.3; P.box(soft([0xffffff, 0xffd24d, 0x6fdcbf][s % 3], 'spr' + (s % 3)), g, Math.cos(sa) * 0.9, 0.35, Math.sin(sa) * 0.9, 0.08, 0.08, 0.2).rotation.y = sa; } }
    else if (kind === 1) { P.mesh(new T.CylinderGeometry(0.05, 0.05, 2.4, 6), soft(0xffffff, 'stick'), g, 0, -0.8, 0); const disc = P.mesh(new T.CylinderGeometry(1.0, 1.0, 0.3, 24), soft(0xff8fbf, 'lolly'), g, 0, 0.6, 0); disc.rotation.x = Math.PI / 2; const sw = P.mesh(new T.TorusGeometry(0.6, 0.12, 8, 24), soft(0xffffff, 'stick'), g, 0, 0.6, 0.17); sw.scale.set(1, 1, 0.5); }
    else { P.mesh(new T.ConeGeometry(0.7, 1.8, 16), soft(0xf2c9a0, 'cone'), g, 0, -0.9, 0).rotation.x = Math.PI; P.sphere(soft([0xffd6ec, 0xa8f0dc, 0xfff0a8][i % 3], 'scoop' + (i % 3)), g, 0, 0.35, 0, 0.8); P.sphere(soft(0xff5c7a, 'cherry'), g, 0.2, 1.1, 0.1, 0.18); }
    out.anim.push({ o: g, kind: 'float', phase: i * 0.9, y });
  }
  // Солонго (хагас торус) 2
  for (const [x, z, ry] of [[-30, 10, 0.4], [26, -22, -0.9]]) {
    const cols = [0xff6b6b, 0xffb03a, 0xfff05a, 0x5ee07a, 0x5aa8ff, 0xb37aff];
    cols.forEach((c, i) => { const m = P.mesh(new T.TorusGeometry(14 - i * 0.9, 0.45, 8, 48, Math.PI), new T.MeshToonMaterial({ color: c, transparent: true, opacity: 0.55 }), scene, x, 0, z); m.rotation.y = ry; m.castShadow = false; });
  }
  // Бөмбөлөг (дээшээ хөвнө), одны гялбаа motes
  out.balloons = [];
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.3, r = 10 + (i % 3) * 5; const g = new T.Group(); g.position.set(Math.sin(a) * r, (i * 4.7) % top, Math.cos(a) * r); scene.add(g); P.sphere(soft([0xff8fbf, 0x7ab8ff, 0xffd24d, 0x6fdcbf][i % 4], 'ball' + (i % 4)), g, 0, 0, 0, 0.5, 0.6, 0.5); P.mesh(new T.CylinderGeometry(0.01, 0.01, 1.4, 4), soft(0xffffff, 'stick'), g, 0, -1.2, 0); out.balloons.push({ g, speed: 0.4 + (i % 3) * 0.2, top }); }
  const n = 260, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.3, r = 5 + Math.random() * 24; pos[i * 3] = Math.sin(a) * r; pos[i * 3 + 1] = Math.random() * (top + 8); pos[i * 3 + 2] = Math.cos(a) * r; const c = new T.Color([0xffd6ec, 0xdcefff, 0xfff8d6, 0xffffff][i % 4]); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  out.motes = new T.Points(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(pos, 3)).setAttribute('color', new T.BufferAttribute(col, 3)), new T.PointsMaterial({ vertexColors: true, size: 0.22, transparent: true, opacity: 0.8, depthWrite: false, blending: T.AdditiveBlending }));
  out.motes.userData.base = pos.slice(); scene.add(out.motes);
  // Газар: чихрийн толгод
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.3, r = 30 + (i % 2) * 8; const h = P.sphere(soft([0xffd6ec, 0xd6fff2, 0xdcefff][i % 3], 'hill' + (i % 3)), scene, Math.sin(a) * r, -3, Math.cos(a) * r, 8 + (i % 3) * 3, 5 + (i % 2) * 2, 8); h.receiveShadow = true; }
  // Том зөөлөн нар
  P.sphere(glow(0xfff0c8, 1.4), scene, -80, 90, -120, 9).castShadow = false;
  return out;
}

export function updateObbyWorld(w, dt, t) {
  for (const a of w.anim) { if (a.kind === 'cloud') a.o.position.y = a.y + Math.sin(t * 0.4 + a.phase) * 0.6; else { a.o.position.y = a.y + Math.sin(t * 0.9 + a.phase) * 0.4; a.o.rotation.y += dt * 0.5; } }
  for (const b of w.balloons) { b.g.position.y += b.speed * dt; b.g.position.x += Math.sin(t + b.speed) * dt * 0.3; if (b.g.position.y > b.top + 8) b.g.position.y = -2; }
  const a = w.motes.geometry.attributes.position, base = w.motes.userData.base;
  for (let i = 0; i < a.count; i++) a.setY(i, base[i * 3 + 1] + Math.sin(t * 0.7 + i) * 0.5);
  a.needsUpdate = true; w.motes.material.opacity = 0.6 + Math.sin(t * 1.5) * 0.2;
}
