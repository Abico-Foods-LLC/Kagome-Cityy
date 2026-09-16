// «Хортон хамгаалалт»-ын ертөнц: шөнийн ферм, төвд аварга хулуу base, 8 slot, 4 зам, дэнлүү, талбайн мөр. Бүгд procedural.
import * as T from 'three';
import * as P from '../world/props.js';
import { toon, glow, PALETTE, applyCurve } from '../gfx/materials.js';
import { createSky } from '../gfx/sky.js';
import { grassTexture } from '../gfx/textures.js';
import { mascotFace } from '../world/mascot.js';
import { SLOT_N, FENCE_R, SPRAYER_R, SPAWN_R, MAP_R } from './DefenseCore.js';

export function buildDefenseWorld(scene) {
  const out = {};
  const sky = createSky({ radius: 220, top: 0x0c1a3a, horizon: 0x2a3d6e, bottom: 0x15213d });
  sky.uniforms.uSunColor.value.set(0x9fb8ff); sky.uniforms.uSunDir.value.set(0.3, 0.7, -0.5).normalize();
  scene.add(sky.mesh); out.sky = sky;
  scene.fog = new T.Fog(0x1a2748, 28, 70);
  scene.add(new T.HemisphereLight(0x8fa8ff, 0x22301c, 0.55));
  const moon = new T.DirectionalLight(0xbfd0ff, 0.9); moon.position.set(14, 30, -10); moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024); Object.assign(moon.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 90 }); moon.shadow.bias = -0.001;
  scene.add(moon, moon.target); out.moon = moon;
  // Сар, одод
  P.sphere(glow(0xfff4c8, 1.6), scene, 60, 70, -90, 5);
  const n = 240, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, e = 0.15 + Math.random() * 0.8; pos[i * 3] = Math.cos(a) * Math.cos(e) * 200; pos[i * 3 + 1] = Math.sin(e) * 200; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 200; }
  scene.add(new T.Points(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(pos, 3)), new T.PointsMaterial({ color: 0xffffff, size: 0.9, transparent: true, opacity: 0.85, depthWrite: false, fog: false })));

  // Газар: тойрог ферм + гадна харанхуй
  const gt = grassTexture(); gt.wrapS = gt.wrapT = T.RepeatWrapping; gt.repeat.set(22, 22);
  const ground = new T.Mesh(new T.CircleGeometry(MAP_R + 6, 48), toon(0x9fd08a, { key: 'defGround', map: gt }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground); out.ground = ground;
  const rim = new T.Mesh(new T.RingGeometry(MAP_R + 6, MAP_R + 60, 48), toon(0x223a2a, { key: 'defRim' })); rim.rotation.x = -Math.PI / 2; rim.position.y = -0.02; scene.add(rim);
  // 4 зам (хортон ирэх мөр) — бор туузууд
  const road = toon(0xb89a6a, { key: 'defRoad' });
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; const m = P.mesh(new T.PlaneGeometry(3, SPAWN_R - 4), road, scene, Math.sin(a) * (SPAWN_R / 2 + 2), 0.02, Math.cos(a) * (SPAWN_R / 2 + 2)); m.rotation.x = -Math.PI / 2; m.rotation.z = -a; m.receiveShadow = true; }
  // Талбайн мөрүүд (4 булан)
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) for (let r = 0; r < 3; r++) for (let k = 0; k < 5; k++) {
    const x = sx * (11 + r * 1.6), z = sz * (11 + k * 1.6);
    P.box(toon(0x6d4b2a, { key: 'defSoil' }), scene, x, 0.1, z, 1.2, 0.2, 1.2);
    P.sphere(toon([0xff7f2a, 0x5fbb5a, 0xf5453a][(r + k) % 3], { key: 'defCrop' + ((r + k) % 3) }), scene, x, 0.45, z, 0.32, 0.28, 0.32);
  }
  // Дэнлүү 4
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; P.lamp(scene, Math.sin(a) * 9, Math.cos(a) * 9); const l = new T.PointLight(0xffd27a, 0.9, 16, 1.6); l.position.set(Math.sin(a) * 9 + 0.6, 3.4, Math.cos(a) * 9); scene.add(l); }
  // Slot тойрог (хашаа/цацуурын байрлал) — бүдэг цагираг
  out.slotRings = [];
  for (let i = 0; i < SLOT_N; i++) {
    const a = i / SLOT_N * Math.PI * 2;
    const ring = P.mesh(new T.RingGeometry(0.9, 1.15, 24), new T.MeshBasicMaterial({ color: 0xffe38a, transparent: true, opacity: 0.18, depthWrite: false }), scene, Math.sin(a) * FENCE_R, 0.03, Math.cos(a) * FENCE_R);
    ring.rotation.x = -Math.PI / 2; out.slotRings.push(ring);
  }
  // Base: аварга хулуу + царай
  const base = new T.Group(); base.position.set(0, 0, 0); scene.add(base); out.base = base;
  const pumpkin = toon(0xf39a2c, { key: 'defPumpkin' });
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; P.sphere(pumpkin, base, Math.sin(a) * 0.55, 1.6, Math.cos(a) * 0.55, 1.7, 1.55, 1.7); }
  P.mesh(new T.CylinderGeometry(0.22, 0.3, 0.8, 8), toon(0x5a7a3a, { key: 'defStem' }), base, 0, 3.4, 0).rotation.z = 0.2;
  const faceMat = new T.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false });
  const face = new T.Mesh(new T.PlaneGeometry(2.2, 2.2), faceMat); face.position.set(0, 1.75, 2.62); base.add(face);
  out.faces = { smile: mascotFace('smile'), hurt: mascotFace('focus'), scared: mascotFace('surprised') }; faceMat.map = out.faces.smile; out.faceMat = faceMat;
  const baseGlow = new T.PointLight(0xffb060, 1.2, 12, 1.5); baseGlow.position.set(0, 2.5, 0); scene.add(baseGlow); out.baseGlow = baseGlow;
  P.contactShadow(scene, 2.6, 0, 0);
  return out;
}

/** Base-ийн царай HP-аар */
export function setBaseMood(world, hp, max) {
  const k = hp / max, tex = k > 0.6 ? world.faces.smile : k > 0.3 ? world.faces.hurt : world.faces.scared;
  if (world.faceMat.map !== tex) { world.faceMat.map = tex; world.faceMat.needsUpdate = true; }
}

/** Хашааны сегмент (slot-д) */
export function createFence(scene, x, z) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(x, z) + Math.PI / 2;
  const wood = toon(0xc08a52, { key: 'benchWood' });
  for (const dx of [-1.6, 0, 1.6]) P.box(wood, g, dx, 0.6, 0, 0.16, 1.2, 0.16);
  for (const y of [0.45, 0.95]) P.box(wood, g, 0, y, 0, 3.6, 0.12, 0.08);
  P.contactShadow(g, 1.8, 0, 0, 0.6);
  scene.add(g); return g;
}
/** Цацуур цамхаг: сав + эргэдэг хошуу */
export function createSprayer(scene, x, z) {
  const g = new T.Group(); g.position.set(x, 0, z);
  P.mesh(new T.CylinderGeometry(0.5, 0.6, 1.4, 12), toon(0x3d8bff, { key: 'defTank' }), g, 0, 0.7, 0);
  P.mesh(new T.CylinderGeometry(0.55, 0.55, 0.12, 12), toon(0x2b3335, { key: 'buggyDark' }), g, 0, 1.45, 0);
  const head = new T.Group(); head.position.y = 1.55; g.add(head);
  P.mesh(new T.CylinderGeometry(0.08, 0.12, 0.9, 8), toon(0x2b3335, { key: 'buggyDark' }), head, 0, 0, 0.45).rotation.x = Math.PI / 2;
  P.sphere(glow(0x9fe4ff, 0.8), head, 0, 0, 0.9, 0.14);
  g.userData.head = head; P.contactShadow(g, 0.8);
  scene.add(g); return g;
}
/** Шүүсний бөмбөлөг (сум) */
export function createBlob(scene, color = 0x9fe36a) {
  const m = P.sphere(glow(color, 0.9), scene, 0, 0, 0, 0.18); m.castShadow = false; return m;
}
export { applyCurve, PALETTE };
