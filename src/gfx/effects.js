// Дүрслэлийн нэмэлт эффектүүд: нарны lens flare, гэрлийн туяа, бороо, солонго, унах навч, эрвээхий, шувуу.
import * as T from 'three';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';
import { glow } from './materials.js';

function radialTexture(size, stops) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [p, col] of stops) g.addColorStop(p, col);
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}

/** Нарны lens flare — камерын харах чиглэлд нар байвал гялбана. */
export function createSunFlare() {
  const glowTex = radialTexture(256, [[0, 'rgba(255,245,220,1)'], [0.25, 'rgba(255,230,170,.55)'], [0.6, 'rgba(255,200,120,.12)'], [1, 'rgba(255,200,120,0)']]);
  const ringTex = radialTexture(128, [[0, 'rgba(255,255,255,0)'], [0.6, 'rgba(255,255,255,0)'], [0.75, 'rgba(255,240,200,.35)'], [0.85, 'rgba(255,240,200,0)'], [1, 'rgba(255,255,255,0)']]);
  const dotTex = radialTexture(64, [[0, 'rgba(255,255,255,.6)'], [0.5, 'rgba(255,255,255,.15)'], [1, 'rgba(255,255,255,0)']]);
  const lf = new Lensflare();
  lf.addElement(new LensflareElement(glowTex, 520, 0, new T.Color(0xfff3d6)));
  lf.addElement(new LensflareElement(ringTex, 110, 0.35, new T.Color(0xffe0a0)));
  lf.addElement(new LensflareElement(dotTex, 50, 0.55, new T.Color(0xa0ffd0)));
  lf.addElement(new LensflareElement(dotTex, 80, 0.75, new T.Color(0xffc0e0)));
  lf.addElement(new LensflareElement(ringTex, 160, 1.0, new T.Color(0xc0e0ff)));
  lf.userData.noCurve = true;
  return lf;
}

/** Ширэнгийн гэрлийн туяа: налуу, нэмэгдэх (additive) хавтгайнууд. */
export function createLightShafts(count = 10, { length = 500, color = 0xfff2c0, spread = 14 } = {}) {
  const tex = radialTexture(128, [[0, 'rgba(255,255,255,.5)'], [0.5, 'rgba(255,255,255,.18)'], [1, 'rgba(255,255,255,0)']]);
  const mat = new T.MeshBasicMaterial({ map: tex, color, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false });
  const g = new T.Group(); g.name = 'LightShafts';
  for (let i = 0; i < count; i++) {
    const m = new T.Mesh(new T.PlaneGeometry(2.5 + Math.random() * 3, 18), mat);
    m.position.set((Math.random() - 0.5) * spread, 7, -Math.random() * length);
    m.rotation.set(0, Math.random() * 0.6 - 0.3, 0.35 + Math.random() * 0.2);
    m.userData.phase = Math.random() * 6;
    g.add(m);
  }
  g.userData.mat = mat;
  return g;
}

/** Бороо: Points-оор урт дусал. */
export function createRain(count = 900, { area = 60, height = 30, snow = false } = {}) {
  const pos = new Float32Array(count * 3), vel = new Float32Array(count);
  for (let i = 0; i < count; i++) { pos[i * 3] = (Math.random() - 0.5) * area; pos[i * 3 + 1] = Math.random() * height; pos[i * 3 + 2] = (Math.random() - 0.5) * area; vel[i] = snow ? 1.2 + Math.random() * 1.2 : 18 + Math.random() * 8; }
  const geo = new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(pos, 3));
  const c = document.createElement('canvas'); c.width = 32; c.height = 32;
  const x = c.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, 32); gr.addColorStop(0, 'rgba(220,240,255,0)'); gr.addColorStop(0.5, 'rgba(220,240,255,.8)'); gr.addColorStop(1, 'rgba(220,240,255,0)');
  if (snow) { x.clearRect(0, 0, 32, 32); const rg = x.createRadialGradient(16, 16, 0, 16, 16, 12); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = rg; x.fillRect(0, 0, 32, 32); }
  else x.fillStyle = gr, x.fillRect(14, 0, 3, 32);   // нимгэн босоо зураас
  const tex = new T.CanvasTexture(c);
  const mat = new T.PointsMaterial({ map: tex, size: snow ? 0.35 : 0.55, transparent: true, opacity: 0, depthWrite: false, color: snow ? 0xffffff : 0xdff2ff, sizeAttenuation: true });
  const pts = new T.Points(geo, mat); pts.frustumCulled = false; pts.name = 'Rain';
  pts.userData = { vel, area, height, target: 0, snow };
  return pts;
}
export function updateRain(rain, dt, center) {
  const u = rain.userData, p = rain.geometry.attributes.position.array;
  rain.material.opacity += (u.target - rain.material.opacity) * Math.min(1, dt * 0.8);
  if (rain.material.opacity < 0.01) { rain.visible = false; return; }
  rain.visible = true;
  rain.position.set(center.x, 0, center.z);
  for (let i = 0; i < u.vel.length; i++) { p[i * 3 + 1] -= u.vel[i] * dt; if (u.snow) p[i * 3] += Math.sin(p[i * 3 + 1] * 1.3 + i) * dt * 0.6; if (p[i * 3 + 1] < 0) { p[i * 3 + 1] = u.height; p[i * 3] = (Math.random() - 0.5) * u.area; p[i * 3 + 2] = (Math.random() - 0.5) * u.area; } }
  rain.geometry.attributes.position.needsUpdate = true;
}

/** Солонго: хагас цагираг, 6 өнгийн тууз. */
export function createRainbow(radius = 120) {
  const g = new T.Group(); g.name = 'Rainbow';
  const cols = [0xff4d4d, 0xffa53c, 0xfff05a, 0x6fdc6f, 0x5cb8ff, 0xb28cff];
  cols.forEach((c, i) => {
    const m = new T.Mesh(new T.TorusGeometry(radius - i * 2.2, 1.15, 4, 64, Math.PI), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: T.DoubleSide }));
    g.add(m);
  });
  g.userData.target = 0; g.visible = false; g.userData.noCurve = true;
  return g;
}
export function updateRainbow(rb, dt) {
  const t = rb.userData.target;
  let any = false;
  for (const m of rb.children) { m.material.opacity += (t * 0.45 - m.material.opacity) * Math.min(1, dt * 0.5); if (m.material.opacity > 0.005) any = true; }
  rb.visible = any;
}

/** Унах навч / дэлбээ: instanced quads аажуухан эргэлдэн унана. */
export function createLeaves(count = 70, { colors = [0xffb3c6, 0xfff0a8, 0x9be07a], area = 50 } = {}) {
  const geo = new T.PlaneGeometry(0.28, 0.2);
  const mat = new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false });
  const im = new T.InstancedMesh(geo, mat, count);
  im.instanceColor = new T.InstancedBufferAttribute(new Float32Array(count * 3), 3);
  const items = [];
  const col = new T.Color();
  for (let i = 0; i < count; i++) {
    items.push({ x: (Math.random() - 0.5) * area, y: Math.random() * 12, z: (Math.random() - 0.5) * area, r: Math.random() * 6, s: 0.6 + Math.random() * 0.8, w: 0.5 + Math.random() });
    col.set(colors[i % colors.length]); im.setColorAt(i, col);
  }
  im.instanceColor.needsUpdate = true;
  im.userData = { items, area }; im.frustumCulled = false; im.name = 'Leaves';
  return im;
}
const _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _s = new T.Vector3(), _p = new T.Vector3();
export function updateLeaves(im, dt, t, center) {
  const { items, area } = im.userData;
  items.forEach((it, i) => {
    it.y -= dt * 0.7 * it.w; it.x += Math.sin(t * it.w + it.r) * dt * 0.8; it.z += Math.cos(t * 0.7 * it.w + it.r) * dt * 0.5; it.r += dt * 1.5 * it.w;
    if (it.y < 0) { it.y = 10 + Math.random() * 4; it.x = center.x + (Math.random() - 0.5) * area; it.z = center.z + (Math.random() - 0.5) * area; }
    if (Math.abs(it.x - center.x) > area) it.x = center.x + (Math.random() - 0.5) * area;
    if (Math.abs(it.z - center.z) > area) it.z = center.z + (Math.random() - 0.5) * area;
    _p.set(it.x, it.y, it.z); _e.set(it.r, it.r * 0.7, it.r * 1.3); _q.setFromEuler(_e); _s.setScalar(it.s);
    _m.compose(_p, _q, _s); im.setMatrixAt(i, _m);
  });
  im.instanceMatrix.needsUpdate = true;
}

/** Эрвээхий: хоёр далавч, цэцэгсийн дээгүүр эргэлдэнэ. */
export function createButterflies(spots, count = 14) {
  const g = new T.Group(); g.name = 'Butterflies';
  const cols = [0xff8ad0, 0xffd54a, 0x8ad4ff, 0xffffff, 0xffa060];
  const wingGeo = new T.PlaneGeometry(0.22, 0.18); wingGeo.translate(0.11, 0, 0);
  for (let i = 0; i < count; i++) {
    const b = new T.Group();
    const mat = new T.MeshBasicMaterial({ color: cols[i % cols.length], side: T.DoubleSide });
    const l = new T.Mesh(wingGeo, mat), r = new T.Mesh(wingGeo, mat);
    r.rotation.y = Math.PI; b.add(l, r);
    const body = new T.Mesh(new T.CapsuleGeometry(0.02, 0.12, 3, 6), new T.MeshBasicMaterial({ color: 0x333 }));
    body.rotation.x = Math.PI / 2; b.add(body);
    const spot = spots[i % spots.length];
    b.userData = { l, r, home: new T.Vector3(spot[0], 1.2, spot[1]), phase: Math.random() * 6, speed: 0.6 + Math.random() * 0.6, radius: 1.5 + Math.random() * 2 };
    g.add(b);
  }
  return g;
}
export function updateButterflies(g, dt, t) {
  for (const b of g.children) {
    const u = b.userData, a = t * u.speed + u.phase;
    const nx = u.home.x + Math.cos(a) * u.radius + Math.sin(a * 2.3) * 0.5, nz = u.home.z + Math.sin(a * 0.8) * u.radius, ny = u.home.y + Math.sin(a * 3.1) * 0.4 + 0.5;
    b.rotation.y = Math.atan2(nx - b.position.x, nz - b.position.z);
    b.position.set(nx, ny, nz);
    const flap = Math.sin(t * 22 + u.phase) * 0.9;
    u.l.rotation.y = flap; u.r.rotation.y = Math.PI - flap;
  }
}

/** Шувууны сүрэг: V хэлбэрээр тэнгэрт хааяа нисч өнгөрнө. */
export function createBirds(count = 7) {
  const g = new T.Group(); g.name = 'Birds';
  const mat = new T.MeshBasicMaterial({ color: 0x2a3a3a, side: T.DoubleSide });
  const wing = new T.PlaneGeometry(0.9, 0.25); wing.translate(0.45, 0, 0);
  for (let i = 0; i < count; i++) {
    const b = new T.Group();
    const l = new T.Mesh(wing, mat), r = new T.Mesh(wing, mat); r.rotation.y = Math.PI; b.add(l, r);
    const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
    b.position.set(side * row * 2.2, -row * 0.3, row * 2.4);
    b.userData = { l, r, phase: i * 0.4 };
    g.add(b);
  }
  g.userData = { t: -1, dir: 1, timer: 15 + Math.random() * 20 };
  g.visible = false;
  return g;
}
export function updateBirds(g, dt, t, center) {
  const u = g.userData;
  if (!g.visible) { u.timer -= dt; if (u.timer <= 0) { g.visible = true; u.t = 0; u.dir = Math.random() < 0.5 ? 1 : -1; u.z0 = center.z + (Math.random() - 0.5) * 60; u.h = 26 + Math.random() * 10; } return; }
  u.t += dt;
  const x = center.x + (u.t * 9 - 120) * u.dir;
  g.position.set(x, u.h + Math.sin(u.t) * 1.5, u.z0);
  g.rotation.y = u.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  for (const b of g.children) { const f = Math.sin(t * 9 + b.userData.phase) * 0.7; b.userData.l.rotation.z = f; b.userData.r.rotation.z = -f; }
  if (u.t * 9 > 240) { g.visible = false; u.timer = 20 + Math.random() * 30; }
}
