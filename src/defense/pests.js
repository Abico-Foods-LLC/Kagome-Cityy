// Хортон шавьж (царайтай, хөөрхөн — аймшиггүй): хорхой, хэрээ, номин, слайм, жижиг слайм. Хамгаалагч mascot.
import * as T from 'three';
import { soft, mascotFace, Mascot } from '../world/mascot.js';
import * as P from '../world/props.js';
import { toon, glow } from '../gfx/materials.js';

const S = new T.SphereGeometry(1, 16, 12);
const part = (geo, mat, parent, x, y, z, sx = 1, sy = sx, sz = sx) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; parent.add(m); return m; };
let faceTex = null;
function face(parent, y, z, r) {
  faceTex = faceTex || mascotFace('focus');
  const m = new T.Mesh(new T.PlaneGeometry(r * 1.6, r * 1.6), new T.MeshBasicMaterial({ map: faceTex, transparent: true, toneMapped: false, depthWrite: false }));
  m.position.set(0, y, z); parent.add(m); return m;
}

export function createPest(type) {
  const g = new T.Group(); g.name = 'Pest_' + type; g.userData.type = type;
  const body = new T.Group(); g.add(body); g.userData.body = body;
  if (type === 'WORM') {
    const green = soft(0x7bd35a), dark = soft(0x4f9a3a);
    for (let i = 0; i < 3; i++) part(S, i ? green : dark, body, 0, 0.4, -i * 0.5, 0.42 - i * 0.04);
    face(body, 0.45, 0.42, 0.45);
    for (const s of [-1, 1]) part(new T.CylinderGeometry(0.025, 0.025, 0.4, 5), dark, body, s * 0.15, 0.85, 0.1).rotation.z = s * -0.4;
  } else if (type === 'CROW') {
    const ink = soft(0x2b2b3a), orange = soft(0xff9a1f);
    part(S, ink, body, 0, 0, 0, 0.45, 0.38, 0.55);
    part(S, ink, body, 0, 0.3, 0.4, 0.3);
    part(new T.ConeGeometry(0.1, 0.35, 6), orange, body, 0, 0.28, 0.72).rotation.x = Math.PI / 2;
    face(body, 0.32, 0.62, 0.32);
    const wings = [];
    for (const s of [-1, 1]) { const w = new T.Group(); w.position.set(s * 0.35, 0.1, 0); body.add(w); part(S, ink, w, s * 0.45, 0, 0, 0.5, 0.08, 0.3); wings.push({ w, s }); }
    g.userData.wings = wings; g.userData.fly = 2.4;
  } else if (type === 'MOLE') {
    const brown = soft(0x8a6242), pink = soft(0xffb0a0);
    part(S, brown, body, 0, 0.45, 0, 0.5, 0.45, 0.55);
    part(S, pink, body, 0, 0.45, 0.5, 0.12);
    face(body, 0.5, 0.48, 0.5);
    for (const s of [-1, 1]) part(S, pink, body, s * 0.42, 0.25, 0.3, 0.16, 0.1, 0.2);
    const mound = P.mesh(new T.ConeGeometry(0.9, 0.5, 10), toon(0x6d4b2a, { key: 'defSoil' }), g, 0, 0.2, 0); mound.castShadow = false; g.userData.mound = mound;
  } else if (type === 'SLIME' || type === 'MINI') {
    const r = type === 'SLIME' ? 0.8 : 0.4, mat = soft(type === 'SLIME' ? 0xb37aff : 0xd9a6ff, { glow: 0.5 });
    part(S, mat, body, 0, r, 0, r, r * 0.85, r);
    face(body, r, r * 0.95, r);
    g.userData.bounce = true; g.userData.r = r;
  }
  const shadow = new T.Mesh(new T.CircleGeometry(0.55, 16), new T.MeshBasicMaterial({ color: 0x0f2a1c, transparent: true, opacity: 0.25, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.03; g.add(shadow); g.userData.shadow = shadow;
  g.userData.phase = Math.random() * 6;
  return g;
}

/** Анимаци: хөдөлгөөн/хазалт/нисэлт; emerged=false бол номин газар доор */
export function updatePest(g, dt, t, { moving = true, emerged = true, biting = false } = {}) {
  const u = g.userData, b = u.body, ph = t * 9 + u.phase;
  if (u.type === 'CROW') { b.position.y = u.fly + Math.sin(t * 3 + u.phase) * 0.2; for (const { w, s } of u.wings) w.rotation.z = s * Math.sin(t * 16 + u.phase) * 0.7; b.rotation.z = Math.sin(t * 2 + u.phase) * 0.08; u.shadow.material.opacity = 0.12; return; }
  if (u.type === 'MOLE') { const k = emerged ? 1 : 0; b.position.y += ((k ? 0 : -1.1) - b.position.y) * Math.min(1, dt * 4); b.rotation.x = biting ? Math.sin(ph) * 0.15 : 0; return; }
  if (u.bounce) { const sq = moving ? Math.abs(Math.sin(ph * 0.7)) : 0; b.scale.set(1 + sq * 0.15, 1 - sq * 0.2, 1 + sq * 0.15); b.position.y = moving ? Math.abs(Math.sin(ph * 0.7)) * 0.3 : 0; return; }
  // Хорхой: мурилзана
  b.position.y = moving ? Math.abs(Math.sin(ph)) * 0.08 : 0; b.rotation.y = Math.sin(ph * 0.5) * 0.15;
  if (biting) b.rotation.x = Math.sin(ph * 1.5) * 0.12;
}

/** Хамгаалагч: брокколи mascot цацууртай */
export function createGuard() {
  const m = new Mascot({ kind: 'broccoli', scale: 0.85 }); m.wear({ hat: 'cap' });
  const spr = new T.Group(); spr.position.set(0.32, 0.75, 0.25); m.torso.add(spr);
  P.mesh(new T.CylinderGeometry(0.05, 0.07, 0.5, 8), toon(0x2b3335, { key: 'buggyDark' }), spr, 0, 0, 0.2).rotation.x = Math.PI / 2;
  P.mesh(new T.CylinderGeometry(0.14, 0.14, 0.3, 10), toon(0x3d8bff, { key: 'defTank' }), spr, 0, -0.1, -0.05);
  P.sphere(glow(0x9fe4ff, 0.8), spr, 0, 0, 0.5, 0.07);
  return m;
}
/** Тоглогчийн цацуур (гарт) */
export function createPlayerSprayer() {
  const spr = new T.Group();
  P.mesh(new T.CylinderGeometry(0.06, 0.08, 0.6, 8), toon(0x2b3335, { key: 'buggyDark' }), spr, 0, 0, 0.25).rotation.x = Math.PI / 2;
  P.mesh(new T.CylinderGeometry(0.16, 0.16, 0.34, 10), toon(0x9fe36a, { key: 'defJuice' }), spr, 0, -0.12, -0.05);
  P.sphere(glow(0xd8ff9a, 0.9), spr, 0, 0, 0.58, 0.08);
  return spr;
}
