// Ертөнцийн барилгын блокууд: мод, жимс, байшин, хашаа, гэрэл, сандал, цэцэг, өвс, чулуу, самбар...
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toon, standard, glow, PALETTE, outlineGroup, windSway } from '../gfx/materials.js';
import { woodTexture, roofTexture, textTexture, stoneTexture } from '../gfx/textures.js';
import { FRUITS } from '../core/content.js';

// ---- Хуваалцсан геометр ----
const G = {
  sphere: new T.SphereGeometry(1, 18, 12),
  sphereLow: new T.SphereGeometry(1, 10, 7),
  box: new T.BoxGeometry(1, 1, 1),
  cyl: new T.CylinderGeometry(1, 1, 1, 14),
  cone: new T.ConeGeometry(1, 1, 8),
  ico: new T.IcosahedronGeometry(1, 1),
  ico0: new T.IcosahedronGeometry(1, 0),
  torus: new T.TorusGeometry(1, 0.1, 8, 24),
};

export function mesh(geo, mat, parent, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx) {
  const m = new T.Mesh(geo, typeof mat === 'number' ? toon(mat) : mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}
export const sphere = (mat, p, x, y, z, sx = 1, sy = sx, sz = sx) => mesh(G.sphere, mat, p, x, y, z, sx, sy, sz);
export const box = (mat, p, x, y, z, sx, sy, sz) => mesh(G.box, mat, p, x, y, z, sx, sy, sz);
export const cyl = (mat, p, x, y, z, r, h, r2 = r) => { const m = mesh(G.cyl, mat, p, x, y, z, r, h, r); if (r2 !== r) { m.geometry = new T.CylinderGeometry(r2 / r, 1, 1, 14); } return m; };
export function group(name, parent, x = 0, y = 0, z = 0) {
  const g = new T.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g;
}

function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ---- Contact shadow: объектын ёроолд зөөлөн бараан толбо (хуурамч AO) ----
let shadowMat = null;
function getShadowMat() {
  if (shadowMat) return shadowMat;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(10,40,20,.55)'); g.addColorStop(0.55, 'rgba(10,40,20,.28)'); g.addColorStop(1, 'rgba(10,40,20,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new T.CanvasTexture(c);
  shadowMat = new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false });
  return shadowMat;
}
const shadowGeo = new T.CircleGeometry(1, 20);
export function contactShadow(parent, r, x = 0, z = 0, sz = r) {
  const m = new T.Mesh(shadowGeo, getShadowMat());
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.025, z); m.scale.set(r, sz, 1);
  m.castShadow = false; m.receiveShadow = false; m.renderOrder = 1; m.userData.shadow = true;
  parent.add(m);
  return m;
}

// ---- Навч (жимсний дээрх) ----
export function leaf(parent, x, y, z, s = 1, rot = 0) {
  const l = mesh(G.sphereLow, toon(PALETTE.leaf, { key: 'leaf' }), parent, x, y, z, 0.5 * s, 0.09 * s, 0.24 * s);
  l.rotation.z = rot; l.rotation.y = 0.3;
  return l;
}

// ---- Жимс ----
export function fruit(type, parent, x = 0, y = 0, z = 0, s = 1, { face = false, outline = true } = {}) {
  const def = FRUITS[type];
  const g = group('Fruit_' + def.name, parent, x, y, z);
  g.scale.setScalar(s);
  const SG = s <= 0.6 ? G.sphereLow : G.sphere;   // жижиг жимс = бага polygon
  const sphere = (m, p, px, py, pz, sx = 1, sy = sx, sz = sx) => mesh(SG, m, p, px, py, pz, sx, sy, sz);
  const c = toon(def.color, { key: 'fruit' + type });
  const cd = toon(def.shade, { key: 'fruitD' + type });
  if (type === 2) { // усан үзэм — багц
    for (let row = 0; row < 3; row++) for (let n = 0; n < 3 - row; n++) sphere(c, g, (n - (2 - row) / 2) * 0.42, 0.3 - row * 0.4, Math.sin(n * 3 + row) * 0.12, 0.3);
    sphere(c, g, 0.1, 0.05, 0.28, 0.28); sphere(c, g, -0.15, -0.3, 0.26, 0.26);
  } else if (type === 4) { // лууван
    const b = mesh(new T.ConeGeometry(0.34, 1.25, 12), c, g, 0, -0.1, 0); b.rotation.z = Math.PI + 0.12;
    for (let j = 0; j < 4; j++) { const lf = leaf(g, (j - 1.5) * 0.12, 0.62, 0, 0.9, (j - 1.5) * 0.7); lf.rotation.x = 0.4; }
  } else if (type === 6) { // брокколи
    cyl(toon(0xa4d65e, { key: 'brocStem' }), g, 0, -0.35, 0, 0.16, 0.7);
    for (let j = 0; j < 6; j++) mesh(G.ico, c, g, Math.sin(j * 2.2) * 0.32, 0.12 + Math.cos(j * 1.3) * 0.12, Math.cos(j * 2.2) * 0.28, 0.36);
  } else if (type === 7) { // хулуу — хэсэглэсэн
    for (let j = 0; j < 7; j++) sphere(j % 2 ? c : cd, g, Math.sin(j / 7 * Math.PI * 2) * 0.3, 0, Math.cos(j / 7 * Math.PI * 2) * 0.3, 0.42, 0.5, 0.42);
    sphere(c, g, 0, 0, 0, 0.5, 0.48, 0.5);
  } else if (type === 3) { // манго — өндгөн, налуу
    const m = sphere(c, g, 0, 0, 0, 0.55, 0.7, 0.5); m.rotation.z = 0.3;
    sphere(toon(0xff8a3c, { key: 'mangoBlush' }), g, 0.15, 0.2, 0.3, 0.3, 0.32, 0.22);
  } else if (type === 5) { // улаан лооль
    sphere(c, g, 0, 0, 0, 0.6, 0.52, 0.6);
    for (let j = 0; j < 5; j++) { const lf = leaf(g, Math.sin(j * 1.26) * 0.18, 0.5, Math.cos(j * 1.26) * 0.18, 0.6, 0); lf.rotation.y = j * 1.26; }
  } else if (type === 1) { // жүрж
    sphere(c, g, 0, 0, 0, 0.6);
    sphere(cd, g, 0, 0.05, 0.56, 0.08, 0.08, 0.05);
  } else { // алим
    sphere(c, g, 0, 0, 0, 0.6, 0.58, 0.6);
    sphere(c, g, 0, -0.08, 0, 0.62, 0.5, 0.62);
    sphere(cd, g, 0, 0.5, 0, 0.16, 0.06, 0.16);
  }
  if (![4, 6, 5].includes(type)) { cyl(toon(0x7a5230, { key: 'stem' }), g, 0, 0.62, 0, 0.05, 0.25); leaf(g, 0.22, 0.7, 0, 1, 0.25); }
  if (face) {
    const eyeW = toon(0xffffff, { key: 'eyeW' }), pupil = toon(0x24302c, { key: 'pupil' }), blush = toon(0xffa7a0, { key: 'blush' });
    for (const xx of [-0.2, 0.2]) {
      sphere(eyeW, g, xx, 0.12, 0.52, 0.11, 0.13, 0.05);
      sphere(pupil, g, xx + 0.02, 0.12, 0.57, 0.06, 0.07, 0.03);
      sphere(blush, g, xx * 1.8, -0.1, 0.5, 0.08, 0.05, 0.03);
    }
    const smile = mesh(new T.TorusGeometry(0.15, 0.03, 6, 16, Math.PI), toon(0x5a2c26, { key: 'mouth' }), g, 0, -0.03, 0.56);
    smile.rotation.z = Math.PI;
    for (const side of [-1, 1]) {
      sphere(c, g, side * 0.62, -0.15, 0, 0.12, 0.2, 0.12);           // гар
      sphere(toon(0x5e4030, { key: 'shoeF' }), g, side * 0.26, -0.68, 0.06, 0.16, 0.08, 0.22); // гутал
    }
  }
  if (outline) outlineGroup(g, 0.05);
  return g;
}

// ---- Мод ----
export function tree(parent, x, z, { type = 0, s = 1, seed = 1, fruits = true } = {}) {
  const r = seeded(seed * 97 + type);
  const g = group('Tree', parent, x, 0, z);
  const trunk = toon(PALETTE.trunk, { key: 'trunk' });
  const t = mesh(new T.CylinderGeometry(0.22, 0.4, 2.6, 9), trunk, g, 0, 1.3, 0);
  t.rotation.y = r() * 3;
  // Мөчир
  for (let j = 0; j < 3; j++) {
    const b = mesh(new T.CylinderGeometry(0.06, 0.14, 1.4, 6), trunk, g, 0, 2.4, 0);
    b.rotation.set(0.6 + r() * 0.3, j * 2.1 + r(), 0);
    b.position.set(Math.sin(j * 2.1) * 0.5, 2.5, Math.cos(j * 2.1) * 0.5);
  }
  const l1 = toon(PALETTE.leaf, { key: 'leaf' }), l2 = toon(PALETTE.leafLight, { key: 'leafL' }), l3 = toon(PALETTE.leafDark, { key: 'leafD' });
  // Давхарласан навчны бөмбөгүүд
  mesh(G.ico, l3, g, 0, 3.2, 0, 1.7 * s, 1.35 * s, 1.7 * s).rotation.y = r();
  mesh(G.ico, l1, g, -0.7 * s, 3.9, 0.4 * s, 1.25 * s, 1.05 * s, 1.25 * s).rotation.y = r();
  mesh(G.ico, l1, g, 0.8 * s, 3.7, -0.3 * s, 1.15 * s, 1 * s, 1.15 * s).rotation.y = r();
  mesh(G.ico, l2, g, 0.1 * s, 4.5, 0.2 * s, 1 * s, 0.85 * s, 1 * s).rotation.y = r();
  if (fruits) for (let j = 0; j < 5; j++) {
    const a = j * 1.3 + r();
    fruit(type, g, Math.sin(a) * 1.35 * s, 3.1 + Math.cos(j * 2) * 0.6, Math.cos(a) * 1.35 * s, 0.5, { outline: false });
  }
  contactShadow(g, 1.6 * s);
  g.userData.collider = { r: 0.6 };
  return g;
}

/** Ширэнгийн далдуу мод */
export function palm(parent, x, z, { s = 1, seed = 1 } = {}) {
  const r = seeded(seed * 31);
  const g = group('Palm', parent, x, 0, z);
  const trunk = toon(0x9a7248, { key: 'palmTrunk' });
  const h = 5 * s, segs = 6, lean = (r() - 0.5) * 0.5;
  for (let i = 0; i < segs; i++) {
    const seg = mesh(new T.CylinderGeometry(0.22 * s, 0.28 * s, h / segs + 0.1, 8), trunk, g, Math.sin(lean) * (i / segs) * h, (i + 0.5) * h / segs, 0);
    seg.rotation.z = -lean;
  }
  const top = new T.Vector3(Math.sin(lean) * h, h, 0);
  const leafM = toon(0x2f9a4c, { key: 'palmLeaf' });
  for (let j = 0; j < 7; j++) {
    const a = j / 7 * Math.PI * 2 + r() * 0.4;
    const lf = mesh(new T.ConeGeometry(0.5 * s, 3.2 * s, 4), leafM, g, top.x + Math.sin(a) * 1.2 * s, top.y + 0.2, top.z + Math.cos(a) * 1.2 * s);
    lf.rotation.set(-Math.PI / 2 + 0.4, a, 0, 'YXZ');
    lf.scale.set(0.9, 1, 0.25);
  }
  for (let j = 0; j < 3; j++) sphere(toon(0x6a4a2a, { key: 'coco' }), g, top.x + Math.sin(j * 2.1) * 0.35, top.y - 0.15, top.z + Math.cos(j * 2.1) * 0.35, 0.28 * s);
  contactShadow(g, 1.1 * s);
  g.userData.collider = { r: 0.5 };
  return g;
}

/** Бут */
export function bush(parent, x, z, { s = 1, seed = 1, flowers = 0 } = {}) {
  const r = seeded(seed * 17);
  const g = group('Bush', parent, x, 0, z);
  const l1 = toon(PALETTE.leaf, { key: 'leaf' }), l2 = toon(PALETTE.leafLight, { key: 'leafL' });
  for (let j = 0; j < 4; j++) mesh(G.ico, j % 2 ? l1 : l2, g, (r() - 0.5) * 1.2 * s, 0.5 * s + r() * 0.3, (r() - 0.5) * 1.2 * s, 0.7 * s, 0.55 * s, 0.7 * s).rotation.y = r() * 3;
  if (flowers) {
    const fm = toon(flowers, { key: 'bushFlower' + flowers });
    for (let j = 0; j < 6; j++) sphere(fm, g, (r() - 0.5) * 1.4 * s, 0.7 * s + r() * 0.5, (r() - 0.5) * 1.4 * s, 0.12);
  }
  contactShadow(g, 1.2 * s);
  return g;
}

/** Чулуу */
export function rock(parent, x, z, { s = 1, seed = 1, color = PALETTE.stone } = {}) {
  const r = seeded(seed * 13);
  const g = group('Rock', parent, x, 0, z);
  mesh(G.ico0, toon(color, { key: 'rock' + color }), g, 0, 0.3 * s, 0, s, 0.6 * s, 0.8 * s).rotation.set(r(), r() * 3, r() * 0.3);
  mesh(G.ico0, toon(PALETTE.stoneDark, { key: 'rockD' }), g, 0.4 * s, 0.2 * s, 0.3 * s, 0.5 * s, 0.35 * s, 0.5 * s).rotation.y = r() * 3;
  contactShadow(g, 1.3 * s, 0.1 * s, 0.1 * s);
  return g;
}

// ---- Instanced цэцэг / өвс ----
export function flowerField(parent, positions, { colors = [0xfff3a8, 0xffb3cc, 0xd7c6ff, 0xffffff] } = {}) {
  const petals = new T.SphereGeometry(0.12, 6, 4);
  const stemGeo = new T.CylinderGeometry(0.02, 0.03, 0.5, 4);
  const stemM = windSway(toon(0x3f9b52, { key: 'stemSway' }), { strength: 0.18, speed: 1.6 });
  const stems = new T.InstancedMesh(stemGeo, stemM, positions.length);
  const centerM = windSway(toon(0xffd23c, { key: 'centerSway' }), { strength: 0.18, speed: 1.6 });
  const centers = new T.InstancedMesh(new T.SphereGeometry(0.08, 6, 4), centerM, positions.length);
  const petalMeshes = colors.map((c) => new T.InstancedMesh(petals, windSway(toon(c, { key: 'petal' + c }), { strength: 0.18, speed: 1.6 }), positions.length * 5));
  const counts = colors.map(() => 0);
  const m = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(1, 1, 1), pos = new T.Vector3();
  positions.forEach(([x, z], i) => {
    pos.set(x, 0.25, z); m.compose(pos, q, sc); stems.setMatrixAt(i, m);
    pos.set(x, 0.55, z); m.compose(pos, q, sc); centers.setMatrixAt(i, m);
    const ci = i % colors.length;
    for (let j = 0; j < 5; j++) {
      pos.set(x + Math.sin(j * 1.26) * 0.16, 0.5, z + Math.cos(j * 1.26) * 0.16);
      m.compose(pos, q, sc); petalMeshes[ci].setMatrixAt(counts[ci]++, m);
    }
  });
  petalMeshes.forEach((pm, i) => { pm.count = counts[i]; pm.castShadow = false; pm.receiveShadow = true; parent.add(pm); });
  stems.castShadow = false; centers.castShadow = false;
  parent.add(stems, centers);
  return [stems, centers, ...petalMeshes];
}

export function grassTufts(parent, positions, { color = 0x7ed35e } = {}) {
  const geo = new T.ConeGeometry(0.16, 0.7, 4);
  geo.translate(0, 0.35, 0);
  const mat = windSway(toon(color, { key: 'tuft' + color }), { strength: 0.25, speed: 1.9 });
  const im = new T.InstancedMesh(geo, mat, positions.length * 3);
  const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sc = new T.Vector3(), pos = new T.Vector3();
  let n = 0;
  const r = seeded(99);
  for (const [x, z] of positions) {
    for (let j = 0; j < 3; j++) {
      pos.set(x + (r() - 0.5) * 0.5, 0, z + (r() - 0.5) * 0.5);
      e.set((r() - 0.5) * 0.5, r() * 3, (r() - 0.5) * 0.5); q.setFromEuler(e);
      sc.set(0.7 + r() * 0.6, 0.7 + r() * 0.8, 0.7 + r() * 0.6);
      m.compose(pos, q, sc); im.setMatrixAt(n++, m);
    }
  }
  im.count = n; im.castShadow = false; im.receiveShadow = true;
  parent.add(im);
  return im;
}

// ---- Хашаа ----
export function fence(parent, x, z, len, axis = 'x', { color = PALETTE.whiteWood } = {}) {
  const g = group('Fence', parent, x, 0, z);
  const m = toon(color, { key: 'fence' + color });
  // Сегментчилсэн: шон + хоёр шонгийн хоорондох банз тусдаа mesh — эвдрэхэд зөвхөн мөргөсөн хэсэг унана
  const seg = 1.6, n = Math.ceil(len / seg);
  for (let k = 0; k <= n; k++) {
    const d = Math.min(len, k * seg), a = axis === 'x' ? d : 0, b = axis === 'z' ? d : 0;
    box(m, g, a, 0.6, b, 0.14, 1.2, 0.14);
    mesh(G.cone, m, g, a, 1.28, b, 0.12, 0.18, 0.12);
    if (k < n) {
      const d2 = Math.min(len, (k + 1) * seg), L = d2 - d, c = (d + d2) / 2;
      for (const y of [0.4, 0.9]) box(m, g, axis === 'x' ? c : 0, y, axis === 'z' ? c : 0, axis === 'x' ? L : 0.1, 0.1, axis === 'z' ? L : 0.1);
    }
  }
  return g;
}

// ---- Гудамжны гэрэл ----
let bulbMat = null;
export function bulbMaterial() { if (!bulbMat) bulbMat = glow(0xfff0b0, 1.6); return bulbMat; }
export function lamp(parent, x, z) {
  const g = group('Lamp', parent, x, 0, z);
  const m = toon(0x2f5e4e, { key: 'lampPost' });
  mesh(new T.CylinderGeometry(0.08, 0.14, 3.6, 8), m, g, 0, 1.8, 0);
  mesh(new T.CylinderGeometry(0.3, 0.22, 0.2, 8), m, g, 0, 0.1, 0);
  const arm = mesh(new T.CylinderGeometry(0.05, 0.05, 0.9, 6), m, g, 0.4, 3.55, 0); arm.rotation.z = Math.PI / 2;
  mesh(new T.ConeGeometry(0.35, 0.3, 8), m, g, 0.8, 3.65, 0);
  const bulb = mesh(new T.SphereGeometry(0.16, 10, 8), bulbMaterial(), g, 0.8, 3.45, 0);
  bulb.castShadow = false; bulb.userData.bulb = true;
  contactShadow(g, 0.6);
  return g;
}

// ---- Сандал ----
export function bench(parent, x, z, rot = 0) {
  const g = group('Bench', parent, x, 0, z);
  g.rotation.y = rot;
  const w = toon(0xc08a52, { key: 'benchWood' }), iron = toon(0x2d3b3a, { key: 'iron' });
  for (const dy of [0, 0.22]) box(w, g, 0, 0.5, -0.1 + dy * -1.2, 1.8, 0.08, 0.2);
  box(w, g, 0, 0.5, 0.18, 1.8, 0.08, 0.2);
  for (const dy of [0, 0.24]) box(w, g, 0, 0.85 + dy, -0.4, 1.8, 0.16, 0.06);
  for (const s of [-1, 1]) { box(iron, g, s * 0.8, 0.25, 0, 0.08, 0.5, 0.55); box(iron, g, s * 0.8, 0.8, -0.38, 0.08, 0.6, 0.08); }
  contactShadow(g, 1.4, 0, 0, 0.9);
  return g;
}

// ---- Нэрийн самбар ----
export function sign(parent, text, x, y, z, { width = 6, bg = '#fff8e0', fg = '#1e6b45', border = null, post = false, double = true } = {}) {
  const tex = textTexture(text, { bg, fg, border });
  const m = new T.MeshBasicMaterial({ map: tex, transparent: true, side: double ? T.DoubleSide : T.FrontSide, toneMapped: false, depthWrite: false });
  const p = new T.Mesh(new T.PlaneGeometry(width, width / 4), m);
  p.position.set(x, y, z); p.castShadow = false; p.receiveShadow = false;
  p.name = 'Sign';
  parent.add(p);
  if (double) {
    // Ар тал: толин тусгалгүй, энгийн самбар
    const back = new T.Mesh(new T.BoxGeometry(width * 0.98, width / 4 * 0.9, 0.08), toon(PALETTE.woodDark, { key: 'woodD' }));
    back.position.z = -0.05; back.castShadow = false; p.add(back);
    m.side = T.FrontSide;
  }
  if (post) {
    cyl(toon(PALETTE.woodDark, { key: 'woodD' }), parent, x, y / 2, z - 0.05, 0.08, y);
  }
  return p;
}

// ---- Жимсэн байшин: нэг гөлгөр lathe бие + урд талын орц (хаалга), цонх гадаргуу дээр ----
const houseGeoCache = new Map();
function houseBodyGeo(type) {
  if (houseGeoCache.has(type)) return houseGeoCache.get(type);
  // (r, y) профайл — алим/жүрж маягийн дүүрэн бие, дээд тал бага зэрэг хонхойно
  const pts = [[0, 0.3], [3.4, 0.3], [4.2, 1.2], [4.55, 2.8], [4.45, 4.6], [3.7, 6.0], [2.3, 6.9], [1.1, 7.1], [0.5, 6.9], [0, 6.85]];
  const curve = new T.CatmullRomCurve3(pts.map(([r, y]) => new T.Vector3(r, y, 0)));
  const prof = curve.getPoints(48).map((v) => new T.Vector2(Math.max(0, v.x), v.y));
  const geo = new T.LatheGeometry(prof, 48);
  // Хулуу, жүрж, манго: зөөлөн судал (радиусыг өнцгөөр бага зэрэг хэлбэлзүүлнэ)
  const ribs = type === 7 ? 8 : type === 1 || type === 3 ? 10 : 0;
  if (ribs) {
    const pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), z = pa.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z);
      const k = 1 + 0.035 * Math.cos(a * ribs);
      pa.setXYZ(i, x / (r || 1) * r * k, pa.getY(i), z / (r || 1) * r * k);
    }
    geo.computeVertexNormals();
  }
  houseGeoCache.set(type, geo);
  return geo;
}

export function fruitHouse(parent, x, z, type, label, rot = 0) {
  const def = FRUITS[type];
  const g = group('House_' + label, parent, x, 0, z);
  g.rotation.y = rot;
  const wall = toon(def.color, { key: 'fruit' + type });
  const cream = toon(PALETTE.cream, { key: 'cream' }), wood = toon(PALETTE.woodDark, { key: 'woodD' }), glass = toon(0x9fe7f2, { key: 'glass' });
  // Суурь
  mesh(new T.CylinderGeometry(5.0, 5.3, 0.4, 32), toon(0xe9dcc4, { key: 'plinth' }), g, 0, 0.2, 0);
  // Бие
  mesh(houseBodyGeo(type), wall, g, 0, 0, 0);
  // Иш ба навч (жижиг)
  cyl(wood, g, 0, 7.4, 0, 0.18, 1.0, 0.24);
  const lf = mesh(G.sphere, toon(PALETTE.leaf, { key: 'leaf' }), g, 0.7, 7.55, 0.1, 1.3, 0.22, 0.6); lf.rotation.z = 0.35; lf.rotation.y = 0.5;
  // Орц: биеэс урагш цухуйсан дөрвөлжин — хаалга түүн дээр
  const porch = group('Porch', g, 0, 0, 4.45);   // биеийн гадаргуугаас (r≈4.4) урагш цухуйна
  mesh(new T.BoxGeometry(2.4, 3.1, 1.6), wall, porch, 0, 1.95, 0);
  mesh(new T.BoxGeometry(2.7, 0.35, 1.9), cream, porch, 0, 3.6, 0);                        // орцны дээвэр
  box(wood, porch, 0, 1.55, 0.81, 1.5, 2.5, 0.12);                                              // хаалганы хүрээ
  box(cream, porch, 0, 1.5, 0.88, 1.2, 2.2, 0.06);                                              // хаалга
  sphere(toon(PALETTE.gold, { key: 'gold' }), porch, 0.4, 1.45, 0.95, 0.09);                     // бариул
  box(cream, porch, 0, 0.12, 1.2, 2.2, 0.24, 1.0);                                              // шат
  // Цонх: гадаргуу дээр яг тулна
  for (const s of [-1, 1]) {
    const a = s * 0.7, R = 4.62, y = 4.0;      // профайлын радиус энэ өндөрт ≈4.5
    const win = group('Win', g, Math.sin(a) * R, y, Math.cos(a) * R);
    win.rotation.y = a;
    mesh(new T.CylinderGeometry(0.95, 0.95, 0.18, 20), cream, win, 0, 0, 0).rotation.x = Math.PI / 2;
    mesh(new T.CylinderGeometry(0.72, 0.72, 0.2, 20), glass, win, 0, 0, 0.02).rotation.x = Math.PI / 2;
    box(cream, win, 0, 0, 0.13, 0.1, 1.5, 0.06); box(cream, win, 0, 0, 0.13, 1.5, 0.1, 0.06);
    box(wood, win, 0, -0.95, 0.2, 1.9, 0.14, 0.5);                                              // цонхны тавцан
    for (const [fx, c] of [[-0.55, 0xff6a8a], [0, 0xfff08a], [0.55, 0xff6a8a]]) sphere(toon(c, { key: 'winFlower' + c }), win, fx, -0.72, 0.35, 0.15);
  }
  sign(label, 0, 5.45, 4.25, { width: 4.6, bg: '#fff8e0', fg: '#1e5c3a', border: def.color });
  contactShadow(g, 6.4);
  g.userData.collider = { r: 4.9 };
  return g;

  function sign(text, sx, sy, sz, o) {
    const tex = textTexture(text, { bg: o.bg, fg: o.fg, border: o.border });
    const p = new T.Mesh(new T.PlaneGeometry(o.width, o.width / 4), new T.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
    p.position.set(sx, sy, sz); p.rotation.x = -0.25; p.castShadow = false; g.add(p);
  }
}

// ---- Асар (сорилын булан) ----
export function pavilion(parent, x, z, name, color, rot = 0) {
  const g = group('Pavilion_' + name, parent, x, 0, z);
  g.rotation.y = rot;
  const cream = toon(PALETTE.cream, { key: 'cream' }), wood = toon(PALETTE.wood, { key: 'wood' });
  mesh(new T.CylinderGeometry(5.2, 5.4, 0.35, 8), toon(0xe9dcc4, { key: 'plinth' }), g, 0, 0.17, 0).rotation.y = Math.PI / 8;
  mesh(new T.CylinderGeometry(4.6, 4.8, 0.3, 8), cream, g, 0, 0.45, 0).rotation.y = Math.PI / 8;
  for (let j = 0; j < 8; j++) {
    const a = j / 8 * Math.PI * 2 + Math.PI / 8;
    cyl(cream, g, Math.sin(a) * 4, 2.4, Math.cos(a) * 4, 0.16, 4);
    sphere(wood, g, Math.sin(a) * 4, 4.45, Math.cos(a) * 4, 0.25, 0.15, 0.25);
  }
  const roofM = toon(color, { key: 'roof' + color });
  const roof = mesh(new T.ConeGeometry(5.6, 2.6, 8), roofM, g, 0, 5.7, 0); roof.rotation.y = Math.PI / 8;
  mesh(new T.ConeGeometry(2.2, 1.4, 8), toon(PALETTE.cream, { key: 'cream' }), g, 0, 7.4, 0).rotation.y = Math.PI / 8;
  sphere(toon(PALETTE.gold, { key: 'gold' }), g, 0, 8.2, 0, 0.35);
  // Дээврийн ирмэгийн тууз
  mesh(new T.TorusGeometry(5.4, 0.12, 6, 8), cream, g, 0, 4.5, 0).rotation.x = Math.PI / 2;
  sign(g, name, 0, 3.6, 4.3, { width: 7, bg: '#fffbea', fg: '#28643f', border: '#' + color.toString(16).padStart(6, '0') });
  contactShadow(g, 6.5);
  return g;
}

// ---- Худалдааны лангуу ----
export function stall(parent, x, z, color, rot = 0) {
  const g = group('Stall', parent, x, 0, z);
  g.rotation.y = rot;
  const wood = toon(PALETTE.wood, { key: 'wood' }), cream = toon(PALETTE.cream, { key: 'cream' }), cm = toon(color, { key: 'stall' + color });
  box(wood, g, 0, 0.55, 0, 3.6, 1.1, 1.4);
  box(cream, g, 0, 1.13, 0, 3.8, 0.08, 1.6);
  for (const s of [-1, 1]) cyl(wood, g, s * 1.7, 1.9, -0.6, 0.06, 2);
  // Судалтай тент
  for (let j = 0; j < 6; j++) box(j % 2 ? cm : cream, g, -1.5 + j * 0.6, 2.9, 0.1, 0.62, 0.08, 2.2).rotation.x = 0.15;
  for (let j = 0; j < 6; j++) sphere(j % 2 ? cm : cream, g, -1.5 + j * 0.6, 2.7, 1.15, 0.3, 0.2, 0.1);
  contactShadow(g, 2.6, 0, 0.2, 1.4);
  return g;
}

// ---- Усан оргилуур ----
export function fountain(parent, x, z) {
  const g = group('Fountain', parent, x, 0, z);
  const stone = toon(0xf1e6cf, { key: 'fstone' }), stoneD = toon(0xd9c9a8, { key: 'fstoneD' });
  mesh(new T.CylinderGeometry(4.2, 4.4, 0.6, 24), stoneD, g, 0, 0.3, 0);
  mesh(new T.TorusGeometry(4, 0.35, 10, 28), stone, g, 0, 0.7, 0).rotation.x = Math.PI / 2;
  mesh(new T.CylinderGeometry(0.7, 1.1, 2.2, 12), stone, g, 0, 1.6, 0);
  mesh(new T.CylinderGeometry(1.8, 1.4, 0.3, 16), stone, g, 0, 2.7, 0);
  mesh(new T.CylinderGeometry(0.3, 0.5, 0.8, 10), stone, g, 0, 3.2, 0);
  contactShadow(g, 5.6);
  g.userData.collider = { r: 4.4 };
  return g;
}

// ---- Гүүр ----
export function bridge(parent, x, z, len = 12, width = 9) {
  const g = group('Bridge', parent, x, 0, z);
  const wood = toon(PALETTE.wood, { key: 'wood' }), cream = toon(PALETTE.whiteWood, { key: 'fence' + PALETTE.whiteWood });
  const deck = mesh(new T.BoxGeometry(len, 0.35, width), toon(0xc39a62, { key: 'deck' }), g, 0, 0.12, 0);
  deck.material.map = woodTexture('#c39a62', '#8c6a3a'); deck.material.needsUpdate = true;
  for (const a of [-1, 1]) {
    box(cream, g, 0, 1.15, a * (width / 2 - 0.3), len, 0.14, 0.14);
    for (let k = -len / 2; k <= len / 2; k += 2) box(cream, g, k, 0.65, a * (width / 2 - 0.3), 0.14, 1.1, 0.14);
    box(wood, g, 0, 0.35, a * (width / 2 - 0.3), len, 0.3, 0.3);
  }
  return g;
}

// ---- Логикийн хүрд ----
export function logicWheel(parent, x, z) {
  const g = group('LogicWheel', parent, x, 0, z);
  const cream = toon(PALETTE.cream, { key: 'cream' });
  mesh(new T.CylinderGeometry(1.6, 1.8, 0.4, 12), toon(0xe9dcc4, { key: 'plinth' }), g, 0, 0.2, 0);
  box(cream, g, 0, 2.4, -0.4, 0.5, 4.4, 0.5);
  const wheel = group('Wheel', g, 0, 4.3, 0);
  for (let i = 0; i < 8; i++) {
    const piece = new T.Mesh(new T.CircleGeometry(2.4, 8, i * Math.PI / 4, Math.PI / 4), toon(FRUITS[i].color, { key: 'fruit' + i, side: T.DoubleSide }));
    piece.castShadow = true; wheel.add(piece);
    fruit(i, wheel, Math.cos(i * Math.PI / 4 + 0.4) * 1.65, Math.sin(i * Math.PI / 4 + 0.4) * 1.65, 0.2, 0.4, { outline: false });
  }
  mesh(new T.TorusGeometry(2.45, 0.12, 8, 32), toon(PALETTE.gold, { key: 'gold' }), wheel, 0, 0, 0);
  sphere(toon(PALETTE.gold, { key: 'gold' }), wheel, 0, 0, 0.3, 0.35);
  const pointer = mesh(new T.ConeGeometry(0.25, 0.6, 6), toon(0xe83a4a, { key: 'pointer' }), g, 0, 7.05, 0.3); pointer.rotation.z = Math.PI;
  sign(g, 'ЛОГИКИЙН ХҮРД', 0, 7.6, 0, { width: 7, bg: '#fff8e0', fg: '#3b6855', border: '#f8809a' });
  g.userData.wheel = wheel;
  g.userData.collider = { r: 1.8 };
  return g;
}

// ---- Хүргэлтийн хаалга ----
export function deliveryGate(parent, x, z, index, rot = 0) {
  const g = group('Gate' + index, parent, x, 0, z);
  g.rotation.y = rot;
  const gold = glow(0xffd24d, 1.3);
  for (const s of [-1, 1]) { cyl(gold, g, s * 3.5, 2.6, 0, 0.18, 5.2); sphere(gold, g, s * 3.5, 5.3, 0, 0.35); }
  const arc = mesh(new T.TorusGeometry(3.5, 0.15, 8, 24, Math.PI), gold, g, 0, 5.2, 0);
  const ring = mesh(new T.TorusGeometry(2.4, 0.08, 6, 32), gold, g, 0, 2.6, 0);
  ring.userData.spin = true;
  sign(g, 'ХҮРГЭЛТ ' + (index + 1), 0, 6.3, 0, { width: 5.5, bg: '#ffe9a6', fg: '#6b4a10', border: '#f0b429' });
  g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return g;
}

// ---- Ширэнгийн хаалга (Runner-ийн орц) ----
export function jungleGate(parent, x, z, rot = 0) {
  const g = group('JungleGate', parent, x, 0, z);
  g.rotation.y = rot;
  const stone = standard(0x8c8a7c, { roughness: 0.9 }); stone.map = stoneTexture();
  const moss = toon(0x3f8f4a, { key: 'moss' });
  for (const s of [-1, 1]) {
    box(stone, g, s * 3.4, 3, 0, 1.4, 6, 1.4);
    box(stone, g, s * 3.4, 6.2, 0, 1.9, 0.5, 1.9);
    mesh(G.ico, moss, g, s * 3.4, 6.6, 0.2, 0.9, 0.4, 0.9);
    sphere(glow(0x8ff7c8, 1.6), g, s * 3.4, 4.6, 0.8, 0.22);
  }
  box(stone, g, 0, 6.6, 0, 8.6, 0.9, 1.6);
  mesh(new T.TorusGeometry(3.2, 0.3, 8, 24, Math.PI), stone, g, 0, 6.2, 0);
  palm(g, -5, -1, { s: 1.1, seed: 5 }); palm(g, 5.2, -1.5, { s: 1.3, seed: 6 });
  bush(g, -4.8, 1.5, { s: 1.2, seed: 7 }); bush(g, 4.9, 1.2, { s: 1.1, seed: 8 });
  sign(g, 'JUNGLE RUNNER', 0, 7.6, 0.9, { width: 8, bg: '#12362a', fg: '#c9ffe4', border: '#8ff7c8' });
  return g;
}

// ---- Kagome бүтээгдэхүүн (лонх / хайрцаг) ----
let bottleGeo = null;
function getBottleGeo() {
  if (bottleGeo) return bottleGeo;
  const profile = [[0, 0.03], [0.025, 0.82], [0.06, 0.97], [0.38, 0.97], [0.41, 0.86], [0.44, 0.97], [0.75, 0.97], [0.8, 0.8], [0.85, 0.48], [0.89, 0.35], [0.91, 0.44], [0.98, 0.44], [1, 0.36]];
  const pos = [], uv = [], idx = [], N = 36, H = 1.85, R = H * 0.138;
  for (const [t, r] of profile) for (let k = 0; k <= N; k++) {
    const a = k / N * Math.PI * 2;
    pos.push(Math.sin(a) * R * r, t * H, Math.cos(a) * R * r);
    // Label-ийг урд талд нэг удаа: 0..1 нь урд хагас
    uv.push(0.5 + Math.sin(a) * r * 0.5, t);
  }
  for (let j = 0; j < profile.length - 1; j++) for (let k = 0; k < N; k++) { const a = j * (N + 1) + k; idx.push(a, a + 1, a + N + 2, a, a + N + 2, a + N + 1); }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  bottleGeo = g;
  return g;
}

export function product(def, texture, parent, x = 0, y = 0, z = 0, s = 1) {
  const g = group('Product_' + def.sku, parent, x, y, z);
  g.scale.setScalar(s);
  const label = new T.MeshStandardMaterial({ map: texture, roughness: 0.35, metalness: 0.05 });
  if (def.sku < 4) {
    mesh(getBottleGeo(), label, g, 0, 0, 0);
    mesh(new T.CylinderGeometry(0.112, 0.112, 0.15, 24), toon(0xfffdf4, { key: 'cap' }), g, 0, 1.77, 0);
  } else {
    const side = new T.MeshStandardMaterial({ color: new T.Color(def.side), roughness: 0.4 });
    const top = toon(0xfff9e7, { key: 'cartonTop' });
    const b = new T.Mesh(new T.BoxGeometry(0.57, 1.37, 0.4), [side, side, top, top, label, side]);
    b.position.y = 0.685; b.castShadow = true; g.add(b);
    box(top, g, 0, 1.4, 0, 0.59, 0.05, 0.42);
    // Сорох гувш
    cyl(toon(0xffffff, { key: 'straw' }), g, 0.18, 1.55, 0.05, 0.03, 0.4);
  }
  return g;
}

// ---- Жимсэн машин (buggy): цэвэр дугуйрсан бие, задгай кабин, суудал, жолооны хүрд ----
export function buggy(parent, x, z) {
  const g = group('Buggy', parent, x, 0, z);
  const body = toon(0xff9f2e, { key: 'buggyBody' }), bodyD = toon(0xe07f16, { key: 'buggyD' }), cream = toon(PALETTE.cream, { key: 'cream' }), green = toon(0x3f7d4f, { key: 'buggyGreen' }), dark = toon(0x2b3335, { key: 'buggyDark' }), red = toon(0xe81e39, { key: 'kagomeRed' });
  const chassis = group('Chassis', g, 0, 0, 0);
  // Их бие: доод хэсэг + дээд урд хонгил (hood) + ар тал
  mesh(new RoundedBoxGeometry(3.0, 0.9, 4.4, 4, 0.3), body, chassis, 0, 1.0, 0);
  mesh(new RoundedBoxGeometry(2.8, 0.6, 1.5, 4, 0.25), body, chassis, 0, 1.65, -1.35);         // капот
  mesh(new RoundedBoxGeometry(2.8, 0.7, 1.2, 4, 0.25), body, chassis, 0, 1.7, 1.55);           // ар тал
  // Хажуугийн улаан судал + K тэмдэг
  for (const sx of [-1, 1]) { box(red, chassis, sx * 1.51, 1.05, 0, 0.04, 0.2, 3.6); const k = new T.Mesh(new T.CircleGeometry(0.42, 24), new T.MeshBasicMaterial({ map: textTexture('K', { bg: '#fff8e0', fg: '#e81e39', font: '900 200px Arial', w: 256, h: 256, radius: 128 }), toneMapped: false })); k.position.set(sx * 1.52, 1.05, 0.9); k.rotation.y = sx * Math.PI / 2; chassis.add(k); }
  // Кабин (задгай): дотор ногоон, суудал цайвар
  mesh(new T.BoxGeometry(2.4, 0.5, 2.2), green, chassis, 0, 1.4, 0.2);
  mesh(new RoundedBoxGeometry(1.8, 0.35, 0.9, 3, 0.12), cream, chassis, 0, 1.6, 0.5);          // суудал
  mesh(new RoundedBoxGeometry(1.8, 0.9, 0.3, 3, 0.12), cream, chassis, 0, 2.15, 1.05).rotation.x = -0.15; // түшлэг
  // Салхины хаалт
  const wind = new T.Mesh(new T.BoxGeometry(2.3, 0.8, 0.06), new T.MeshStandardMaterial({ color: 0xa8ecf5, transparent: true, opacity: 0.5, roughness: 0.1 }));
  wind.position.set(0, 2.15, -0.75); wind.rotation.x = -0.35; chassis.add(wind);
  box(dark, chassis, 0, 1.78, -0.7, 2.4, 0.08, 0.12);                                            // хаалтын суурь
  // Жолооны хүрд
  const sw = mesh(new T.TorusGeometry(0.26, 0.05, 8, 20), dark, chassis, 0.45, 1.95, -0.35); sw.rotation.x = -1.0;
  g.userData.wheelSteer = sw;
  // Гэрэл: урд (гэрэлтдэг), хойд (улаан)
  for (const sx of [-1, 1]) {
    mesh(new T.CylinderGeometry(0.22, 0.22, 0.1, 16), cream, chassis, sx * 0.95, 1.4, -2.12).rotation.x = Math.PI / 2;
    sphere(glow(0xfff5bb, 1.3), chassis, sx * 0.95, 1.4, -2.16, 0.16);
    box(glow(0xff4b4b, 1.0), chassis, sx * 0.95, 1.5, 2.2, 0.4, 0.16, 0.06);
  }
  // Бампер
  mesh(new RoundedBoxGeometry(2.6, 0.3, 0.3, 3, 0.12), cream, chassis, 0, 0.75, -2.15);
  mesh(new RoundedBoxGeometry(2.6, 0.3, 0.3, 3, 0.12), cream, chassis, 0, 0.75, 2.15);
  // Навчин туг (ард)
  cyl(dark, chassis, -1.1, 2.6, 1.7, 0.03, 1.2);
  const lf = leaf(chassis, -0.85, 3.15, 1.7, 1.3, 0.15); lf.rotation.x = 0.2; lf.userData.flag = true;
  // Дугуй + ханын дугуй (fender)
  const wheels = [];
  const tire = toon(0x2d3435, { key: 'tire' }), rim = toon(0xffe9b8, { key: 'rim' });
  for (const wx of [-1.45, 1.45]) for (const wz of [-1.45, 1.45]) {
    const w = group('Wheel', g, wx, 0.58, wz);
    mesh(new T.CylinderGeometry(0.58, 0.58, 0.42, 20), tire, w, 0, 0, 0).rotation.z = Math.PI / 2;
    mesh(new T.CylinderGeometry(0.34, 0.34, 0.44, 12), rim, w, 0, 0, 0).rotation.z = Math.PI / 2;
    sphere(dark, w, wx > 0 ? 0.23 : -0.23, 0, 0, 0.1);
    wheels.push(w);
    const fender = mesh(new T.TorusGeometry(0.7, 0.16, 8, 20, Math.PI), bodyD, chassis, wx, 0.62, wz); fender.rotation.y = Math.PI / 2;
  }
  g.userData.wheels = wheels;
  g.userData.chassis = chassis;
  contactShadow(g, 2.6, 0, 0, 3.0);
  return g;
}

// ---- Маркетын машины чимэг: туг / антенн / жимсний хайрцаг (нэг удаад нэг) ----
export function carDecor(chassis, kind) {
  if (chassis.userData.decor) { chassis.userData.decor.removeFromParent(); chassis.userData.decor = null; }
  if (!kind) return null;
  const g = group('CarDecor', chassis, 0, 0, 0);
  const dark = toon(0x2b3335, { key: 'buggyDark' });
  if (kind === 'flag') {
    cyl(dark, g, 1.1, 2.7, 1.7, 0.03, 1.5);
    const cloth = mesh(new T.PlaneGeometry(0.9, 0.5), new T.MeshBasicMaterial({ color: 0xe81e39, side: T.DoubleSide, toneMapped: false }), g, 1.1 + 0.45, 3.25, 1.7);
    cloth.geometry.translate(0.45, 0, 0); cloth.position.x = 1.1; cloth.userData.wave = true; g.userData.cloth = cloth;
    const k = new T.Mesh(new T.CircleGeometry(0.15, 16), new T.MeshBasicMaterial({ map: textTexture('K', { bg: '#fff8e0', fg: '#e81e39', font: '900 200px Arial', w: 256, h: 256, radius: 128 }), toneMapped: false, side: T.DoubleSide }));
    k.position.set(0.5, 0, 0.005); cloth.add(k);
  } else if (kind === 'antenna') {
    cyl(dark, g, 1.2, 2.3, -1.5, 0.02, 1.3);
    sphere(glow(0xffd24d, 1.2), g, 1.2, 3.0, -1.5, 0.13);
  } else if (kind === 'crate') {
    const wood = toon(0xc08a52, { key: 'benchWood' });
    mesh(new RoundedBoxGeometry(1.2, 0.4, 0.8, 3, 0.06), wood, g, 0, 2.45, 1.2);
    for (const s of [-1, 1]) box(toon(0x8a5a30, { key: 'crateD' }), g, s * 0.3, 2.45, 1.2, 0.06, 0.42, 0.82);
    [[0xf0464f, -0.35], [0xff9a1f, 0], [0x8f5cd6, 0.35]].forEach(([c, x]) => sphere(toon(c, { key: 'crateF' + c }), g, x, 2.72, 1.2, 0.17));
  }
  chassis.userData.decor = g;
  return g;
}

// ---- «Миний булан»: талбайн дэргэдэх гэрийн чимэглэл ----
export function homeDecor(parent, kind, x, z) {
  if (kind === 'flowers') {
    const pts = []; for (let i = 0; i < 12; i++) pts.push([x + Math.sin(i * 2.4) * 1.1 * (0.4 + (i % 3) * 0.3), z + Math.cos(i * 2.4) * 1.1 * (0.4 + (i % 3) * 0.3)]);
    const g = group('HomeFlowers', parent, 0, 0, 0); flowerField(g, pts);
    mesh(new T.TorusGeometry(1.4, 0.12, 6, 24), toon(0x8a5a30, { key: 'crateD' }), g, x, 0.06, z).rotation.x = Math.PI / 2;
    return g;
  }
  if (kind === 'lamp') return lamp(parent, x, z);
  if (kind === 'bench') return bench(parent, x, z, Math.PI / 2);
  const g = group('Home_' + kind, parent, x, 0, z);
  if (kind === 'mailbox') {
    const red = toon(0xe83a4a, { key: 'kagomeRed' }), dark = toon(0x2b3335, { key: 'buggyDark' });
    cyl(dark, g, 0, 0.5, 0, 0.05, 1.0);
    mesh(new RoundedBoxGeometry(0.5, 0.4, 0.7, 3, 0.12), red, g, 0, 1.2, 0);
    box(toon(0xffd24d, { key: 'mailFlag' }), g, 0.28, 1.35, -0.1, 0.03, 0.25, 0.12);
    mesh(new T.CircleGeometry(0.14, 12), toon(0x2b3335, { key: 'buggyDark' }), g, 0, 1.2, 0.36);
  } else if (kind === 'bunting') {
    const dark = toon(0x2f5e4e, { key: 'lampPost' });
    for (const s of [-1, 1]) cyl(dark, g, s * 2.2, 1.4, 0, 0.05, 2.8);
    const rope = mesh(new T.CylinderGeometry(0.015, 0.015, 4.4, 4), dark, g, 0, 2.7, 0); rope.rotation.z = Math.PI / 2;
    const cols = [0xff5c5c, 0xffb03a, 0xfff05a, 0x5ee07a, 0x5aa8ff, 0xb37aff, 0xff7ab8, 0xffffff];
    for (let i = 0; i < 8; i++) { const f = mesh(new T.ConeGeometry(0.16, 0.4, 3), new T.MeshBasicMaterial({ color: cols[i], toneMapped: false, side: T.DoubleSide }), g, -1.75 + i * 0.5, 2.5 - Math.sin(i / 7 * Math.PI) * 0.25, 0); f.rotation.x = Math.PI; f.userData.wave = i; }
  } else if (kind === 'scarecrow') {
    const wood = toon(0xc08a52, { key: 'benchWood' }), straw = toon(0xf2d27a, { key: 'straw' });
    cyl(wood, g, 0, 1.0, 0, 0.05, 2.0);
    const arm = cyl(wood, g, 0, 1.5, 0, 0.04, 1.6); arm.rotation.z = Math.PI / 2;
    box(toon(0x3d8bff, { key: 'scareShirt' }), g, 0, 1.4, 0, 0.5, 0.6, 0.3);
    sphere(toon(0xffc93c, { key: 'scareHead' }), g, 0, 2.0, 0, 0.26);
    mesh(new T.CylinderGeometry(0.42, 0.45, 0.06, 16), straw, g, 0, 2.2, 0); mesh(new T.CylinderGeometry(0.2, 0.24, 0.24, 12), straw, g, 0, 2.34, 0);
    for (const s of [-1, 1]) sphere(toon(0x2b3335, { key: 'buggyDark' }), g, s * 0.09, 2.04, 0.24, 0.035);
    sphere(toon(0xff7f2a, { key: 'scareNose' }), g, 0, 1.96, 0.27, 0.05, 0.05, 0.1);
  }
  contactShadow(g, 0.7);
  return g;
}
