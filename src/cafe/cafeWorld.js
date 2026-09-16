// «Манго кафе»-гийн гал тогоо: станцууд (хөргөгч, самбар, шахагч, блендер, зуух, шарах зуух, таваг, лангуу, хогийн сав), ширээ, чимэглэл. Procedural.
import * as T from 'three';
import * as P from '../world/props.js';
import { toon, glow } from '../gfx/materials.js';
import { createSky } from '../gfx/sky.js';
import { textTexture } from '../gfx/textures.js';

/** Станцын байрлал (x, z), харах чиглэл; тоглогч урд нь зогсоно */
export const STATION_POS = {
  fridge: { x: -7, z: -5, label: 'Хөргөгч', icon: '🧊' },
  chop: { x: -3.5, z: -5, label: 'Зүсэх самбар', icon: '🔪' },
  juicer: { x: 0, z: -5, label: 'Шахагч', icon: '🧃' },
  blender: { x: 3.5, z: -5, label: 'Блендер', icon: '🥤' },
  stove: { x: 7, z: -5, label: 'Зуух', icon: '🍲' },
  oven: { x: 7, z: 0, label: 'Шарах зуух', icon: '🍕' },
  plate: { x: -7, z: 0, label: 'Тавагны ширээ', icon: '🍽️' },
  trash: { x: -7, z: 4, label: 'Хогийн сав', icon: '🗑️' },
  counter: { x: 0, z: 5, label: 'Лангуу', icon: '🛎️' },
};
export const ROOM = { minX: -9.5, maxX: 9.5, minZ: -3.8, maxZ: 3.8 };   // тоглогчийн хөдлөх талбай (гал тогоо)

const wood = (k) => toon(0xc9a06a, { key: 'cafe' + k });

export function buildCafeWorld(scene) {
  const out = { stations: {} };
  const sky = createSky({ radius: 200, top: 0xffd9a8, horizon: 0xfff1d6, bottom: 0xffe6c2 }); scene.add(sky.mesh); out.sky = sky;
  scene.add(new T.HemisphereLight(0xfff6e8, 0xd9b58a, 1.0));
  const sun = new T.DirectionalLight(0xfff0d0, 1.0); sun.position.set(6, 14, 8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 50 }); sun.shadow.bias = -0.001; scene.add(sun, sun.target);
  // Шал, хана
  const floor = P.mesh(new T.BoxGeometry(24, 0.2, 20), toon(0xf3d9a8, { key: 'cafeFloor' }), scene, 0, -0.1, 0); floor.receiveShadow = true;
  for (let i = -5; i <= 5; i++) { const l = P.box(toon(0xe6c48c, { key: 'cafeTile' }), scene, i * 2, 0.005, 0, 0.06, 0.01, 20); l.castShadow = false; }
  P.box(toon(0xffb86b, { key: 'cafeWall' }), scene, 0, 4, -7.2, 24, 8, 0.4).receiveShadow = true;           // ар хана (өндөр — камерын дэвсгэр)
  for (const sx of [-1, 1]) P.box(toon(0xffb86b, { key: 'cafeWall' }), scene, sx * 12, 2.0, 0, 0.4, 4, 20);   // хажуу хана (нам — дээрээс харагдана)
  // Цонх (ар хана): манго дүрстэй
  for (const x of [-8, 8]) { P.mesh(new T.CircleGeometry(1.3, 24), toon(0x9fe4ff, { key: 'glass' }), scene, x, 3.2, -6.98); P.mesh(new T.TorusGeometry(1.3, 0.1, 8, 24), toon(0xfff6ee, { key: 'defWhite' }), scene, x, 3.2, -6.95); }
  P.sign(scene, 'МАНГО КАФЕ', 0, 4.0, -6.9, { width: 6, bg: '#fff7d7', fg: '#c8641c', border: '#ffa72e', post: false, double: false });
  // Цэсний самбар
  const menu = new T.Mesh(new T.PlaneGeometry(5.2, 1.4), new T.MeshBasicMaterial({ map: textTexture('🧃 Шүүс 30 · 🥗 Салат 40 · 🍲 Шөл 45 · 🥤 Смүүти 35 · 🍕 Пицца 50', { bg: '#2f3a2f', fg: '#ffe7b0', font: '800 52px Arial', w: 2048, h: 512, radius: 30 }), toneMapped: false })); menu.position.set(0, 2.6, -6.95); scene.add(menu);
  // Станцууд: ширээ + тухайн төхөөрөмж
  const counterMat = toon(0xfff1dc, { key: 'cafeCounter' }), steel = toon(0xc9d3d8, { key: 'cafeSteel' }), dark = toon(0x2b3335, { key: 'buggyDark' });
  const table = (x, z, w = 2.6, d = 1.4) => { const g = new T.Group(); g.position.set(x, 0, z); scene.add(g); P.box(wood('Tbl'), g, 0, 0.45, 0, w, 0.9, d); P.box(counterMat, g, 0, 0.93, 0, w + 0.1, 0.08, d + 0.1).receiveShadow = true; return g; };
  const S = STATION_POS;
  // Хөргөгч
  { const g = new T.Group(); g.position.set(S.fridge.x, 0, S.fridge.z - 0.3); scene.add(g); P.box(toon(0x9fd3ff, { key: 'cafeFridge' }), g, 0, 1.3, 0, 2.0, 2.6, 1.4); P.box(dark, g, 0.7, 1.4, 0.72, 0.08, 0.9, 0.06); P.box(dark, g, 0.7, 0.55, 0.72, 0.08, 0.5, 0.06); for (let i = 0; i < 4; i++) P.sphere(toon([0xff7f2a, 0xff9a1f, 0xf0464f, 0x8f5cd6][i], { key: 'cafeIng' + i }), g, -0.6 + i * 0.4, 2.75, 0, 0.16); out.stations.fridge = g; }
  // Зүсэх самбар
  { const g = table(S.chop.x, S.chop.z - 0.3); P.box(wood('Board'), g, 0, 1.0, 0, 1.4, 0.06, 0.9); const knife = P.box(steel, g, 0.7, 1.05, -0.2, 0.7, 0.03, 0.12); knife.rotation.y = 0.4; g.userData.knife = knife; out.stations.chop = g; }
  // Шахагч
  { const g = table(S.juicer.x, S.juicer.z - 0.3, 2.2); P.mesh(new T.CylinderGeometry(0.4, 0.5, 0.9, 16), steel, g, 0, 1.4, 0); P.mesh(new T.CylinderGeometry(0.3, 0.3, 0.3, 16), toon(0xffe7b0, { key: 'cafeGlass' }), g, 0, 2.0, 0); const spout = P.mesh(new T.CylinderGeometry(0.05, 0.05, 0.5, 8), steel, g, 0.5, 1.1, 0); spout.rotation.z = Math.PI / 2; g.userData.spin = P.mesh(new T.TorusGeometry(0.34, 0.04, 6, 24), dark, g, 0, 1.85, 0); g.userData.spin.rotation.x = Math.PI / 2; out.stations.juicer = g; }
  // Блендер
  { const g = table(S.blender.x, S.blender.z - 0.3, 2.2); P.mesh(new T.CylinderGeometry(0.35, 0.4, 0.5, 16), dark, g, 0, 1.2, 0); const jar = P.mesh(new T.CylinderGeometry(0.34, 0.28, 1.0, 16), new T.MeshToonMaterial({ color: 0xc8f0ff, transparent: true, opacity: 0.6 }), g, 0, 1.95, 0); g.userData.jar = jar; out.stations.blender = g; }
  // Зуух
  { const g = table(S.stove.x, S.stove.z - 0.3); for (const dx of [-0.6, 0.6]) P.mesh(new T.CylinderGeometry(0.4, 0.4, 0.06, 20), dark, g, dx, 1.0, 0); const pot = P.mesh(new T.CylinderGeometry(0.45, 0.4, 0.5, 20), steel, g, -0.6, 1.28, 0); g.userData.pot = pot; const flame = P.sphere(glow(0xff9a3a, 1.6), g, -0.6, 1.02, 0, 0.3, 0.12, 0.3); flame.visible = false; g.userData.flame = flame; out.stations.stove = g; }
  // Шарах зуух
  { const g = new T.Group(); g.position.set(S.oven.x + 0.4, 0, S.oven.z); g.rotation.y = -Math.PI / 2; scene.add(g); P.box(toon(0xd9a06a, { key: 'cafeOven' }), g, 0, 1.0, 0, 2.2, 2.0, 1.6); P.box(dark, g, 0, 1.0, 0.82, 1.6, 1.0, 0.06); const glow_ = P.box(glow(0xff8a3a, 1.4), g, 0, 1.0, 0.86, 1.4, 0.8, 0.02); glow_.visible = false; g.userData.glow = glow_; P.mesh(new T.CylinderGeometry(0.2, 0.2, 1.0, 10), toon(0x8a5a30, { key: 'crateD' }), g, 0, 2.5, 0); out.stations.oven = g; }
  // Тавагны ширээ
  { const g = table(S.plate.x, S.plate.z, 1.8, 1.8); for (let i = 0; i < 3; i++) P.mesh(new T.CylinderGeometry(0.42, 0.42, 0.03, 20), toon(0xffffff, { key: 'cafePlate' }), g, 0, 0.98 + i * 0.04, 0); out.stations.plate = g; }
  // Хогийн сав
  { const g = new T.Group(); g.position.set(S.trash.x, 0, S.trash.z); scene.add(g); P.mesh(new T.CylinderGeometry(0.45, 0.38, 1.0, 14), toon(0x4f6f5a, { key: 'cafeTrash' }), g, 0, 0.5, 0); out.stations.trash = g; }
  // Лангуу (урд) + захиалагчийн 3 байрлал
  { const g = new T.Group(); g.position.set(S.counter.x, 0, S.counter.z); scene.add(g); P.box(wood('Cnt'), g, 0, 0.5, 0, 9, 1.0, 1.2); P.box(counterMat, g, 0, 1.03, 0, 9.2, 0.08, 1.3); P.mesh(new T.SphereGeometry(0.12, 12, 8), toon(0xffd24d, { key: 'gold' }), g, 3.5, 1.2, 0); out.stations.counter = g; }
  out.queueSpots = [{ x: -2.4, z: 7.2 }, { x: 0, z: 7.4 }, { x: 2.4, z: 7.2 }];
  // Ширээ сандал (кафены хэсэг)
  for (const [x, z] of [[-7, 9.5], [7, 9.5]]) { P.mesh(new T.CylinderGeometry(1.0, 1.0, 0.08, 20), wood('Tbl'), scene, x, 0.9, z); P.mesh(new T.CylinderGeometry(0.08, 0.1, 0.9, 8), dark, scene, x, 0.45, z); for (const a of [0, Math.PI]) P.mesh(new T.CylinderGeometry(0.35, 0.35, 0.5, 12), toon(0xff9a1f, { key: 'cafeStool' }), scene, x + Math.sin(a) * 1.4, 0.25, z + Math.cos(a) * 1.4); }
  // Чимэглэл: манго тавиур, цэцэг
  for (let i = 0; i < 5; i++) P.sphere(toon(0xffc02e, { key: 'cafeMango' }), scene, -10 + i * 1.2, 4.1, -6.4, 0.3, 0.38, 0.3);
  P.box(wood('Shelf'), scene, -7.6, 3.85, -6.4, 6.4, 0.08, 0.8);
  return out;
}
export const dishColor = { juice: 0xff9a1f, salad: 0x5fbb5a, soup: 0xff7f2a, smoothie: 0xffc02e, pizza: 0xf0464f };
