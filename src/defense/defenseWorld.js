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
  buildEnvironment(scene, out);
  return out;
}

/** Орчин: модны тойрог, захын хашаа, амбаар, салхин тээрэм, бамбар, хулууны талбай, хайрцаг, өвс, галт шувуу, сарны гэрэл */
function buildEnvironment(scene, out) {
  const onRoad = (x, z, w = 3) => Math.abs(x) < w || Math.abs(z) < w;
  const rnd = (() => { let sd = 7; return () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; }; })();
  // Мод: захаар (34–40м) 28, дотор 8 (замаас хол)
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2 + rnd() * 0.15, r = 33 + rnd() * 6, x = Math.sin(a) * r, z = Math.cos(a) * r; if (onRoad(x, z, 3.5)) continue; P.tree(scene, x, z, { type: i % 3, s: 1.1 + rnd() * 0.5, seed: i + 3, fruits: false }); }
  for (const [x, z] of [[8, 22], [-9, 21], [22, -9], [-21, 9], [-7, -22], [9, -20], [21, 8], [-22, -8]]) P.tree(scene, x, z, { type: 1, s: 0.9 + rnd() * 0.3, seed: x * 3 + z, fruits: false });
  // Захын хашаа (замын зайд цоорхойтой)
  const wood = toon(0xa8794a, { key: 'defFence' });
  const N = 40;
  for (let i = 0; i < N; i++) {
    const a0 = i / N * Math.PI * 2, a1 = (i + 1) / N * Math.PI * 2, r = MAP_R + 1.5;
    const x0 = Math.sin(a0) * r, z0 = Math.cos(a0) * r, x1 = Math.sin(a1) * r, z1 = Math.cos(a1) * r, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    if (onRoad(mx, mz, 2.6)) continue;
    P.box(wood, scene, x0, 0.6, z0, 0.16, 1.2, 0.16);
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
    for (const y of [0.45, 0.95]) { const rail = P.box(wood, scene, mx, y, mz, 0.1, 0.1, len); rail.rotation.y = ang; }
  }
  // Амбаар (баруун дээд), салхин тээрэм (зүүн доод)
  const barn = new T.Group(); barn.position.set(23, 0, 5); barn.rotation.y = -0.4; scene.add(barn);
  P.box(toon(0xb8433a, { key: 'defBarn' }), barn, 0, 1.6, 0, 5, 3.2, 3.6);
  const roof = P.mesh(new T.CylinderGeometry(0.01, 3.4, 3.2, 4, 1), toon(0x5a3a2a, { key: 'defRoof' }), barn, 0, 3.2 + 1.6, 0); roof.rotation.y = Math.PI / 4; roof.scale.set(1.15, 1, 0.8);
  P.box(toon(0xf2d27a, { key: 'straw' }), barn, 0, 1.0, 1.85, 1.4, 2.0, 0.1);
  for (const dx of [-1.5, 1.5]) P.box(toon(0xfff6ee, { key: 'defWhite' }), barn, dx, 2.2, 1.83, 0.7, 0.7, 0.06);
  const barnLight = new T.PointLight(0xffc27a, 1.0, 12, 1.6); barnLight.position.set(0, 2.6, 2.6); barn.add(barnLight);
  const mill = new T.Group(); mill.position.set(-23, 0, -7); scene.add(mill);
  P.mesh(new T.CylinderGeometry(1.1, 1.6, 6, 10), toon(0xd9c4a0, { key: 'defMill' }), mill, 0, 3, 0);
  P.mesh(new T.ConeGeometry(1.4, 1.4, 10), toon(0x5a3a2a, { key: 'defRoof' }), mill, 0, 6.7, 0);
  const blades = new T.Group(); blades.position.set(0, 5.6, 1.3); mill.add(blades);
  for (let i = 0; i < 4; i++) { const b = P.box(toon(0xfff6ee, { key: 'defWhite' }), blades, 0, 1.7, 0, 0.5, 3.2, 0.08); b.rotation.z = 0; const pivot = new T.Group(); pivot.rotation.z = i * Math.PI / 2; pivot.add(b); blades.add(pivot); }
  out.blades = blades;
  // Base-ийн тавцан, бамбар 4, хулууны талбай, хайрцаг
  P.mesh(new T.CylinderGeometry(3.4, 3.6, 0.25, 24), toon(0x8a6242, { key: 'defDeck' }), scene, 0, 0.12, 0).receiveShadow = true;
  out.torches = [];
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4, x = Math.sin(a) * 3.1, z = Math.cos(a) * 3.1;
    P.mesh(new T.CylinderGeometry(0.06, 0.08, 2.0, 6), toon(0x5a3a2a, { key: 'defRoof' }), scene, x, 1.0, z);
    const flame = P.sphere(glow(0xffa030, 1.8), scene, x, 2.15, z, 0.16, 0.24, 0.16); flame.castShadow = false;
    const light = new T.PointLight(0xff9a3a, 1.4, 9, 1.8); light.position.set(x, 2.3, z); scene.add(light);
    out.torches.push({ flame, light, phase: i * 1.7 });
  }
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.2, r = 3.9 + (i % 2) * 0.5; if (onRoad(Math.sin(a) * r, Math.cos(a) * r, 0.9)) continue; P.sphere(toon(0xf39a2c, { key: 'defPumpkin' }), scene, Math.sin(a) * r, 0.28, Math.cos(a) * r, 0.32, 0.26, 0.32); }
  const crate = toon(0xc08a52, { key: 'benchWood' });
  for (const [x, z] of [[4.2, 4.2], [-4.2, 4.2], [4.2, -4.2], [-4.2, -4.2]]) { P.box(crate, scene, x, 0.45, z, 0.9, 0.9, 0.9); P.box(crate, scene, x + 0.3, 1.2, z - 0.2, 0.6, 0.6, 0.6); }
  // Өвсний ширхэг (instanced), сүрлэн боодол, манаач
  const tuft = new T.InstancedMesh(new T.ConeGeometry(0.12, 0.5, 4), toon(0x7fb86a, { key: 'defTuft' }), 320);
  const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), pos = new T.Vector3(); let k = 0;
  for (let i = 0; i < 320; i++) { const a = rnd() * Math.PI * 2, r = 4 + rnd() * (MAP_R - 5), x = Math.sin(a) * r, z = Math.cos(a) * r; if (onRoad(x, z, 2)) continue; pos.set(x, 0.2, z); q.setFromAxisAngle(new T.Vector3(0, 1, 0), rnd() * 6); sc.set(1, 0.7 + rnd(), 1); m4.compose(pos, q, sc); tuft.setMatrixAt(k++, m4); }
  tuft.count = k; tuft.castShadow = false; scene.add(tuft);
  for (const [x, z] of [[18, -18], [-17, 18], [16, 19], [-19, -16]]) { const h = P.mesh(new T.CylinderGeometry(0.8, 0.8, 1.4, 12), toon(0xe8c46a, { key: 'defHay' }), scene, x, 0.8, z); h.rotation.z = Math.PI / 2; }
  P.homeDecor(scene, 'scarecrow', -8, 17); P.homeDecor(scene, 'scarecrow', 14, -9);
  // Галт шувуу (points, дээшээ доошоо хөвнө)
  const fn = 90, fp = new Float32Array(fn * 3);
  for (let i = 0; i < fn; i++) { const a = rnd() * Math.PI * 2, r = 3 + rnd() * 24; fp[i * 3] = Math.sin(a) * r; fp[i * 3 + 1] = 0.6 + rnd() * 2.2; fp[i * 3 + 2] = Math.cos(a) * r; }
  out.fireflies = new T.Points(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(fp, 3)), new T.PointsMaterial({ color: 0xd8ff7a, size: 0.16, transparent: true, opacity: 0.9, depthWrite: false, blending: T.AdditiveBlending }));
  out.fireflies.userData.base = fp.slice(); scene.add(out.fireflies);
  // Сарны гэрлийн цагираг (halo sprite)
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const gr = x.createRadialGradient(128, 128, 20, 128, 128, 128); gr.addColorStop(0, 'rgba(255,244,200,.9)'); gr.addColorStop(0.3, 'rgba(255,240,190,.35)'); gr.addColorStop(1, 'rgba(255,240,190,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  const halo = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false })); halo.position.set(60, 70, -90); halo.scale.set(40, 40, 1); scene.add(halo);
}

/** Орчны анимаци: салхин тээрэм, бамбар анивчих, галт шувуу */
export function updateEnvironment(world, dt, t) {
  if (world.blades) world.blades.rotation.z += dt * 0.8;
  for (const tr of world.torches || []) { const f = 1.2 + Math.sin(t * 9 + tr.phase) * 0.25 + Math.sin(t * 23 + tr.phase) * 0.15; tr.light.intensity = f; tr.flame.scale.set(0.16 * (0.9 + f * 0.1), 0.24 * (0.8 + f * 0.2), 0.16); }
  const ff = world.fireflies; if (ff) { const a = ff.geometry.attributes.position, b = ff.userData.base; for (let i = 0; i < a.count; i++) { a.setY(i, b[i * 3 + 1] + Math.sin(t * 0.9 + i) * 0.35); a.setX(i, b[i * 3] + Math.sin(t * 0.4 + i * 1.3) * 0.6); } a.needsUpdate = true; ff.material.opacity = 0.6 + Math.sin(t * 2) * 0.3; }
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
