// Жимсний хотын ертөнцийг барих. Дүрслэлийн объектууд + физик collider-ууд.
import * as T from 'three';
import { toon, standard, waterMaterial, PALETTE, glow } from '../gfx/materials.js';
import { grassTexture, roadTexture } from '../gfx/textures.js';
import * as P from './props.js';
import { FRUITS, PRODUCTS } from '../core/content.js';
import { mergeStatic } from '../gfx/merge.js';

export const ISLAND = { minX: -60, maxX: 60, minZ: -70, maxZ: 45, cx: 0, cz: -12 };
export const BRIDGES_Z = [1, -34, 31];
export const CANAL = { x: 21, halfW: 4 };

function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

export function buildTown(scene, { textures }) {
  const world = new T.Group();
  world.name = 'Town';
  scene.add(world);
  const colliders = [];      // {x,z,r}
  const boxColliders = [];   // {minX,maxX,minZ,maxZ}
  const swayMats = new Set();
  const out = { world, colliders, boxColliders, harvests: [], packages: [], npcs: [], gates: [], lamps: [], waterMats: [], swayMats };

  const addCollider = (g) => { if (g.userData.collider) colliders.push({ x: g.position.x, z: g.position.z, r: g.userData.collider.r }); };

  // ---------- Газар (суваг хоёр хэсэгт хуваана) ----------
  const grassTex = grassTexture();
  const groundMat = new T.MeshToonMaterial({ color: 0xffffff, map: grassTex, gradientMap: toon(0xffffff).gradientMap, vertexColors: true });
  const cliffMat = toon(0x8a6a48, { key: 'cliff' });
  const r0 = seeded(4);
  const groundPiece = (x0, x1) => {
    const w = x1 - x0, h = ISLAND.maxZ - ISLAND.minZ + 8, cx = (x0 + x1) / 2;
    const geo = new T.PlaneGeometry(w, h, Math.max(8, Math.round(w / 2)), 60);
    const pa = geo.attributes.position, uv = geo.attributes.uv, col = new Float32Array(pa.count * 3);
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i) + cx, y = pa.getY(i);
      const n = Math.sin(x * 0.12) * Math.cos(y * 0.1) * 0.5 + Math.sin(x * 0.31 + y * 0.2) * 0.25;
      const shade = 0.9 + n * 0.12 + r0() * 0.04;
      col[i * 3] = shade; col[i * 3 + 1] = shade + 0.03; col[i * 3 + 2] = shade * 0.95;
      uv.setXY(i, (x + 70) / 140 * 24, uv.getY(i) * 24);   // texture давталт ертөнцийн координатаар
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    const g = new T.Mesh(geo, groundMat);
    g.rotation.x = -Math.PI / 2; g.position.set(cx, 0, ISLAND.cz); g.receiveShadow = true; g.name = 'Ground';
    world.add(g);
    const cliff = new T.Mesh(new T.BoxGeometry(w, 3, h), cliffMat);
    cliff.position.set(cx, -1.55, ISLAND.cz); world.add(cliff);
  };
  groundPiece(ISLAND.minX - 4, CANAL.x - CANAL.halfW - 0.6);
  groundPiece(CANAL.x + CANAL.halfW + 0.6, ISLAND.maxX + 4);
  const lakeMat = waterMaterial(PALETTE.water);
  out.waterMats.push(lakeMat);
  const lake = new T.Mesh(new T.PlaneGeometry(700, 700, 48, 48), lakeMat);
  lake.rotation.x = -Math.PI / 2; lake.position.set(0, -0.55, -12); lake.receiveShadow = true;
  world.add(lake);

  // Алсын толгод (нуурын цаана)
  const hillM = toon(0x5fae63, { key: 'hill' }), hillM2 = toon(0x7fcb7c, { key: 'hill2' });
  const rh = seeded(21);
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI * 2;
    const d = 118 + rh() * 40;
    const h = P.mesh(new T.SphereGeometry(1, 12, 8), i % 3 ? hillM : hillM2, world, Math.cos(a) * d, -6, Math.sin(a) * d - 12, 18 + rh() * 16, 12 + rh() * 10, 18 + rh() * 16);
    h.castShadow = false;
  }
  // ---------- Зам ----------
  const roadTex = roadTexture();
  const roadMat = new T.MeshToonMaterial({ color: 0xffffff, map: roadTex, gradientMap: groundMat.gradientMap });
  const road = (x, z, w, h) => {
    const geo = new T.PlaneGeometry(w, h);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 6, uv.getY(i) * h / 6);
    const m = new T.Mesh(geo, roadMat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z); m.receiveShadow = true; world.add(m);
    return m;
  };
  road(0, -12, 15, 113);
  road(0, 1, 111, 10); road(0, -34, 109, 9); road(0, 31, 103, 8);
  road(46, -47, 8, 26);                     // ширэнгийн хаалга руу
  // Замын хажуугийн хашлага
  const curb = toon(0xfff1cf, { key: 'curb' });
  for (const s of [-1, 1]) {
    for (let z = -66; z < 42; z += 6) if (![1, -34, 31].some((b) => Math.abs(z - b) < 6)) P.box(curb, world, s * 7.8, 0.12, z, 0.35, 0.22, 4.5);
  }

  // ---------- Суваг ба гүүр ----------
  const canalMat = waterMaterial(0x5cd3e8);
  out.waterMats.push(canalMat);
  const canal = new T.Mesh(new T.PlaneGeometry(CANAL.halfW * 2 + 1.2, ISLAND.maxZ - ISLAND.minZ + 8, 4, 60), canalMat);
  canal.rotation.x = -Math.PI / 2; canal.position.set(CANAL.x, -0.35, ISLAND.cz); world.add(canal);
  const bank = toon(0xd9c8a3, { key: 'bank' });
  for (const s of [-1, 1]) P.box(bank, world, CANAL.x + s * (CANAL.halfW + 0.3), -0.1, ISLAND.cz, 0.6, 0.5, ISLAND.maxZ - ISLAND.minZ + 8);
  // Сувгийн ёроол
  const bed = new T.Mesh(new T.BoxGeometry(CANAL.halfW * 2 + 1.2, 2.4, ISLAND.maxZ - ISLAND.minZ + 8), toon(0x8fb9c4, { key: 'bed' }));
  bed.position.set(CANAL.x, -2.0, ISLAND.cz); world.add(bed);
  for (const z of BRIDGES_Z) P.bridge(world, CANAL.x, z, 12, z === 1 ? 10 : 9);
  // Хөвөгч лянхуа
  const lotus = toon(0x62c26b, { key: 'lotus' }), lotusF = toon(0xffa1c9, { key: 'lotusF' });
  const rl = seeded(8);
  for (let i = 0; i < 18; i++) {
    const z = -68 + rl() * 110;
    if (BRIDGES_Z.some((b) => Math.abs(z - b) < 7)) continue;
    const pad = P.mesh(new T.CircleGeometry(0.45 + rl() * 0.4, 8, 0.4, Math.PI * 1.75), lotus, world, CANAL.x + (rl() - 0.5) * 6, -0.3, z);
    pad.rotation.x = -Math.PI / 2; pad.rotation.z = rl() * 6; pad.castShadow = false; pad.userData.float = true;
    if (rl() < 0.4) P.sphere(lotusF, world, pad.position.x, -0.15, pad.position.z, 0.2, 0.12, 0.2).userData.float = true;
  }

  // ---------- Байшин ----------
  const houseDefs = [[-33, -50, 0, 'АЛИМЫН ГУДАМЖ', 0.2], [40, -49, 3, 'МАНГО КАФЕ', -0.15], [-42, 24, 2, 'УСАН ҮЗМИЙН ГЭР', 0.5], [46, 8, 1, 'ЖҮРЖИЙН БУУДАЛ', -0.8], [-46, -32, 7, 'ХУЛУУНЫ ГЭР', 0.9]];
  for (const [x, z, t, label, rot] of houseDefs) addCollider(P.fruitHouse(world, x, z, t, label, rot));

  // ---------- Асар ----------
  P.pavilion(world, -28, -20, 'ТОО БОДОХ ЗАХ', 0xffb554, 0.1); colliders.push({ x: -28, z: -20, r: 1.2 });
  P.pavilion(world, 38, -22, 'НОМЫН ЦЭЦЭРЛЭГ', 0xa28ee6, -0.1); colliders.push({ x: 38, z: -22, r: 1.2 });
  P.pavilion(world, -28, 20, 'KAGOME МАРКЕТ', 0xef6379, 0); colliders.push({ x: -28, z: 20, r: 1.2 });
  // Захын лангуу (тоо бодох захын урд)
  for (let i = 0; i < 3; i++) {
    const st = P.stall(world, -34 + i * 5, -12.5, [0xff7a59, 0xffc857, 0x6fd1c6][i]);
    for (let j = 0; j < 4; j++) P.fruit((i * 3 + j) % 8, st, -1.2 + j * 0.8, 1.45, 0.1, 0.45, { outline: false });
    boxColliders.push({ minX: -36 + i * 5, maxX: -32 + i * 5, minZ: -13.5, maxZ: -11.5 });
  }
  // Номын цэцэрлэгийн номын тавиур
  for (let i = 0; i < 6; i++) P.box(toon([0xf08091, 0xffd15b, 0x78cce5, 0x9e88da, 0x8fca6c, 0xff9f6e][i], { key: 'book' + i }), world, 34 + i * 0.7, 1.05, -28, 0.6, 1.6 + (i % 2) * 0.3, 0.5);
  P.box(toon(PALETTE.wood, { key: 'wood' }), world, 35.8, 0.15, -28, 5, 0.3, 1);
  boxColliders.push({ minX: 33, maxX: 38.5, minZ: -29, maxZ: -27 });
  // Kagome маркетийн бүтээгдэхүүний лангуу
  for (let i = 0; i < 8; i++) {
    const px = -31.5 + (i % 4) * 2.3, pz = 26 + Math.floor(i / 4) * 2.2;
    P.box(toon(0xfff3db, { key: 'shelf' }), world, px, 0.2, pz, 1.5, 0.35, 1.1);
    P.product(PRODUCTS[i], textures[i], world, px, 0.4, pz, 0.7);
  }
  boxColliders.push({ minX: -33, maxX: -23, minZ: 25, maxZ: 29 });

  // ---------- Логикийн хүрд ----------
  const wheelObj = P.logicWheel(world, 38, 20); addCollider(wheelObj); out.wheel = wheelObj.userData.wheel;

  // ---------- Цэцэрлэг ба ферм ----------
  for (let row = 0; row < 3; row++) for (let c = 0; c < 4; c++) { const t = P.tree(world, -43 + c * 6, -4 + row * 6, { type: (row + c) % 4, s: 0.9, seed: row * 7 + c }); addCollider(t); }
  P.fence(world, -48, -8, 27); P.fence(world, -48, -8, 27, 'z'); P.fence(world, -48, 19, 27); P.fence(world, -21, -8, 27, 'z');
  const soil = toon(0xa5744c, { key: 'soil' });
  for (let row = 0; row < 4; row++) {
    P.box(soil, world, 40, 0.06, -43 + row * 4.1, 20, 0.14, 2.6);
    for (let c = 0; c < 9; c++) P.fruit(4 + (row % 4), world, 31 + c * 2.2, 0.55, -43 + row * 4.1, 0.55, { outline: false });
  }
  P.fence(world, 29, -46.5, 22); P.fence(world, 29, -46.5, 20, 'z'); P.fence(world, 51, -46.5, 20, 'z');
  // Тариалангийн талбайн хашаа collider
  boxColliders.push({ minX: 29.5, maxX: 50.5, minZ: -46.8, maxZ: -46.2 });
  // Хөдөө аж ахуйн сав, тэрэг
  P.box(toon(0xb2743c, { key: 'crate' }), world, 52, 0.5, -30, 1.2, 1, 1.2); P.box(toon(0xb2743c, { key: 'crate' }), world, 52.3, 1.5, -30.1, 1, 1, 1);
  colliders.push({ x: 52, z: -30, r: 1 });

  // ---------- Төв талбай ----------
  addCollider(P.fountain(world, 0, -15));
  const fWater = new T.Mesh(new T.CircleGeometry(3.7, 24), waterMaterial(0x63d8ec));
  fWater.rotation.x = -Math.PI / 2; fWater.position.set(0, 0.55, -15); world.add(fWater); out.waterMats.push(fWater.material);
  P.fruit(1, world, 0, 4.2, -15, 1.6, { face: true }).userData.bob = { base: 4.2, amp: 0.1 };
  out.fountainJets = [];
  for (let j = 0; j < 8; j++) {
    const jet = P.mesh(new T.CylinderGeometry(0.03, 0.07, 1.1, 6), glow(0xd8f6ff, 0.9), world, Math.sin(j / 8 * Math.PI * 2) * 1.1, 3.3, -15 + Math.cos(j / 8 * Math.PI * 2) * 1.1);
    jet.rotation.z = Math.sin(j / 8 * Math.PI * 2) * 0.6; jet.rotation.x = -Math.cos(j / 8 * Math.PI * 2) * 0.6; jet.castShadow = false;
    out.fountainJets.push(jet);
  }
  // Тавтай морил хаалга
  for (const s of [-1, 1]) { P.cyl(toon(PALETTE.cream, { key: 'cream' }), world, s * 7.5, 3, 8, 0.32, 6, 0.4); P.fruit(s < 0 ? 0 : 1, world, s * 7.5, 6.8, 8, 1.3); colliders.push({ x: s * 7.5, z: 8, r: 0.5 }); }
  P.mesh(new T.TorusGeometry(7.5, 0.22, 8, 32, Math.PI), toon(PALETTE.cream, { key: 'cream' }), world, 0, 6, 8);
  P.sign(world, 'KAGOME FRUIT TOWN', 0, 8.2, 8, { width: 13, bg: '#188658', fg: '#ffffff', border: '#ffd24d' });
  // Сандал, гэрэл
  for (const [x, z, r] of [[-5.5, -22, 0.6], [5.5, -22, -0.6], [-5.5, -8, 2.5], [5.5, -8, -2.5], [-24, 6, Math.PI / 2], [30, 30, -Math.PI / 2]]) { P.bench(world, x, z, r); colliders.push({ x, z, r: 0.9 }); }
  for (let i = 0; i < 12; i++) {
    const x = i % 2 === 0 ? -9 : 9, z = -60 + Math.floor(i / 2) * 19;
    if (BRIDGES_Z.some((b) => Math.abs(z - b) < 5.5)) continue;
    const l = P.lamp(world, x, z); l.rotation.y = x < 0 ? -Math.PI / 2 : Math.PI / 2; colliders.push({ x, z, r: 0.25 }); out.lamps.push(l);
  }
  for (const [x, z] of [[-14, 1], [14, 1], [-14, 31], [14, 31], [-14, -34], [33, 1], [-36, -34], [36, -34]]) { const l = P.lamp(world, x, z); colliders.push({ x, z, r: 0.25 }); out.lamps.push(l); }

  // ---------- Мод, бут, чулуу (ерөнхий ландшафт) ----------
  const rt = seeded(77);
  const freeSpot = (x, z) => {
    if (Math.abs(x) < 10 || Math.abs(x - CANAL.x) < 6.5) return false;
    if (BRIDGES_Z.some((b) => Math.abs(z - b) < 6.5)) return false;
    if (x > -50 && x < -20 && z > -10 && z < 20) return false;      // цэцэрлэг
    if (x > 28 && x < 52 && z > -48 && z < -28) return false;      // ферм
    if (x > 38 && x < 56 && z > -66 && z < -44) return false;      // ширэнгийн хаалга
    for (const c of colliders) if (Math.hypot(x - c.x, z - c.z) < c.r + 3) return false;
    return x > ISLAND.minX + 3 && x < ISLAND.maxX - 3 && z > ISLAND.minZ + 3 && z < ISLAND.maxZ - 3;
  };
  let placed = 0, tries = 0;
  while (placed < 42 && tries++ < 600) {
    const x = ISLAND.minX + rt() * (ISLAND.maxX - ISLAND.minX), z = ISLAND.minZ + rt() * (ISLAND.maxZ - ISLAND.minZ);
    if (!freeSpot(x, z)) continue;
    const t = P.tree(world, x, z, { type: placed % 4, s: 0.85 + rt() * 0.45, seed: placed + 3, fruits: rt() < 0.6 }); addCollider(t); placed++;
  }
  placed = 0; tries = 0;
  while (placed < 40 && tries++ < 600) {
    const x = ISLAND.minX + rt() * (ISLAND.maxX - ISLAND.minX), z = ISLAND.minZ + rt() * (ISLAND.maxZ - ISLAND.minZ);
    if (!freeSpot(x, z)) continue;
    if (rt() < 0.6) P.bush(world, x, z, { s: 0.8 + rt() * 0.6, seed: placed, flowers: rt() < 0.5 ? [0xff6a8a, 0xfff08a, 0xffffff][placed % 3] : 0 });
    else { P.rock(world, x, z, { s: 0.6 + rt() * 1, seed: placed }); colliders.push({ x, z, r: 0.8 }); }
    placed++;
  }
  // Цэцэг ба өвс (instanced)
  const flowers = [], tufts = [];
  for (let i = 0; i < 700; i++) {
    const x = ISLAND.minX + rt() * (ISLAND.maxX - ISLAND.minX), z = ISLAND.minZ + rt() * (ISLAND.maxZ - ISLAND.minZ);
    if (!freeSpot(x, z)) continue;
    (i % 3 === 0 ? flowers : tufts).push([x, z]);
  }
  for (const m of P.flowerField(world, flowers)) swayMats.add(m.material);
  swayMats.add(P.grassTufts(world, tufts).material);
  swayMats.add(P.grassTufts(world, tufts.slice(0, 120), { color: 0x5fb64c }).material);

  // ---------- Ширэнгийн хаалга ----------
  const jg = P.jungleGate(world, 46, -58, Math.PI);
  colliders.push({ x: 42.6, z: -58, r: 1.2 }, { x: 49.4, z: -58, r: 1.2 }, { x: 41, z: -59, r: 1 }, { x: 51.2, z: -59.5, r: 1 });
  out.jungleGate = jg;
  // Хаалганы ард ширэнгэ (гоёл)
  for (let i = 0; i < 9; i++) P.palm(world, 36 + i * 3, -67 + (i % 2) * 2, { s: 1 + (i % 3) * 0.2, seed: i + 20 });
  for (let i = 0; i < 6; i++) P.bush(world, 38 + i * 3.2, -64, { s: 1.3, seed: i + 40 });

  // ---------- Хураах жимс (32 ширхэг) ----------
  for (let i = 0; i < 32; i++) {
    const type = i % 8;
    const x = i < 16 ? -44 + (i % 4) * 6 : 30 + (i % 4) * 5.5;
    const z = i < 16 ? -1 + Math.floor(i / 4) * 5 : -41 + Math.floor((i - 16) / 4) * 4.1;
    const obj = P.fruit(type, world, x, 1, z, 0.75);
    const ring = P.mesh(new T.TorusGeometry(0.55, 0.04, 6, 24), glow(FRUITS[type].color, 1.4), world, x, 0.08, z);
    ring.rotation.x = Math.PI / 2; ring.castShadow = false;
    out.harvests.push({ obj, ring, id: 'crop-' + i, type, x, z });
  }

  // ---------- Kagome бүтээгдэхүүн (цуглуулах) ----------
  const souvenir = [[-12, 3], [12, -6], [-12, -30], [12, -45], [-45, 31], [47, 30], [-42, -30], [32, -3]];
  souvenir.forEach(([x, z], i) => {
    const obj = P.product(PRODUCTS[i], textures[i], world, x, 0.6, z, 0.65);
    const ring = P.mesh(new T.TorusGeometry(0.6, 0.04, 6, 24), glow(0xffd24d, 1.4), world, x, 0.08, z);
    ring.rotation.x = Math.PI / 2; ring.castShadow = false;
    out.packages.push({ obj, ring, id: 'package-' + i, sku: i, x, z });
  });

  // ---------- NPC ----------
  const npcDefs = [
    { type: 0, x: -10, z: 12, name: 'Алим Ану', lines: 'Сайн уу, аялагч аа! Би Ану. Цэцэрлэгийн доогуур гялалзах жимснүүдийг E дарж түүгээрэй. M товчоор газрын зураг нээгдэнэ.' },
    { type: 4, x: -27, z: -14.5, name: 'Лууван Лулу', lines: 'Манай захад тавтай морил! Ургацаа тоолоход туслаад од аваарай.', quest: 'math' },
    { type: 2, x: 37, z: -16, name: 'Үзэм Үүлээ', lines: 'Эхийг анхааралтай уншаарай. Яарах хэрэггүй, хариултаа эх дотроос олоорой.', quest: 'read' },
    { type: 3, x: 34, z: 23, name: 'Манго Мими', lines: 'Хүрдээ эргүүлээд зүй тогтол, тоон дарааллын таавруудыг тайлцгаая!', quest: 'logic' },
    { type: 6, x: 30, z: -27, name: 'Брокколи Бобо', lines: 'Манай фермд лууван, улаан лооль, брокколи, хулуу ургаж байна. Хүссэн ногоогоо түүгээд цуглуулгаа нээгээрэй.' },
    { type: 7, x: 44, z: -50, name: 'Хулуу Хүслэн', lines: 'Ширэнгийн цаана эртний сүм бий. Тэнд Kagome-ийн бүтээгдэхүүн тарсан гэнэ. Гүйлтэнд бэлэн үү?', quest: 'runner' },
  ];
  for (const d of npcDefs) {
    const obj = P.fruit(d.type, world, d.x, 1.1, d.z, 1.4, { face: true });
    P.sign(world, d.name, d.x, 3.4, d.z, { width: 3.6, bg: '#ffffe9', fg: '#276843' });
    colliders.push({ x: d.x, z: d.z, r: 0.9 });
    out.npcs.push({ ...d, obj });
  }

  // ---------- Хүргэлтийн хаалга ----------
  [[0, 0, 31, Math.PI / 2], [1, -20, -34, Math.PI / 2], [2, 38, 1, Math.PI / 2]].forEach(([i, x, z, rot]) => {
    const g = P.deliveryGate(world, x, z, i, rot);
    out.gates.push({ obj: g, x, z, index: i });
  });

  // ---------- Жимсэн машин ----------
  const car = P.buggy(world, 10, 20);
  car.rotation.y = -0.5;
  out.car = car;
  P.sign(world, 'ЖИМСЭН МАШИН', 10, 4.4, 20, { width: 6, bg: '#fff7d7', fg: '#306e46', border: '#ffa72e' }).userData.carSign = true;

  // ---------- Draw call оновчлол: статик mesh-үүдийг нэгтгэнэ ----------
  const dynamic = new Set([
    ...out.harvests.flatMap((h) => [h.obj, h.ring]), ...out.packages.flatMap((p) => [p.obj, p.ring]),
    ...out.npcs.map((n) => n.obj), ...out.gates.map((g) => g.obj), out.wheel, car, ...out.fountainJets,
  ]);
  out.merged = mergeStatic(world, (o) => dynamic.has(o) || o.userData.float || o.userData.bulb || o.userData.bob);
  return out;
}

/** Хөдөлгөөн зөвшөөрөгдөх эсэх. */
export function makeBlocked(town, { radius = 0.45, terrain = true } = {}) {
  return function blocked(x, z, r = radius) {
    if (terrain) {
      if (x < ISLAND.minX + 1 || x > ISLAND.maxX - 1 || z < ISLAND.minZ + 1 || z > ISLAND.maxZ - 1) return true;
      // Суваг: гүүрнээс бусад газар
      if (Math.abs(x - CANAL.x) < CANAL.halfW + 0.6 + r && !BRIDGES_Z.some((b) => Math.abs(z - b) < 4.2)) return true;
    }
    for (const c of town.colliders) if (Math.hypot(x - c.x, z - c.z) < c.r + r) return true;
    for (const b of town.boxColliders) if (x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r) return true;
    return false;
  };
}
