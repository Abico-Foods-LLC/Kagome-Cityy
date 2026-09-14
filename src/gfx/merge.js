// Статик mesh-үүдийг материалаар нь нэгтгэж draw call-ыг хэдэн мянгаас хэдэн арав болгоно.
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * @param {T.Object3D} root  Нэгтгэх модны үндэс
 * @param {(o:T.Object3D)=>boolean} isDynamic  true бол энэ объект (ба хүүхдүүд нь) хөдөлдөг тул хөндөхгүй
 * @returns {T.Mesh[]} нэгтгэсэн mesh-үүд
 */
export function mergeStatic(root, isDynamic = () => false) {
  root.updateMatrixWorld(true);
  const groups = new Map();   // key → { material, geos: [], meshes: [] }
  const skip = new Set();

  root.traverse((o) => {
    if (isDynamic(o)) { o.traverse((c) => skip.add(c)); }
  });

  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || skip.has(o) || !o.visible) return;
    if (Array.isArray(o.material) || o.material.map && o.material.map.isCanvasTexture && o.name === 'Sign') return;
    const g = o.geometry;
    if (!g.attributes.position || !g.attributes.normal) return;
    const attrKey = Object.keys(g.attributes).sort().join(',') + (g.index ? '|i' : '|n');
    const key = o.material.uuid + '|' + attrKey + '|' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0);
    if (!groups.has(key)) groups.set(key, { material: o.material, geos: [], meshes: [], castShadow: o.castShadow, receiveShadow: o.receiveShadow });
    const grp = groups.get(key);
    const clone = g.clone();
    clone.applyMatrix4(o.matrixWorld);
    // Толин тусгал (сөрөг scale) бол normal урвуу — determinant шалгана
    if (o.matrixWorld.determinant() < 0) {
      const idx = clone.index;
      if (idx) for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i); idx.setX(i, idx.getX(i + 2)); idx.setX(i + 2, a); }
    }
    clone.computeBoundingSphere();
    grp.geos.push(clone);
    grp.meshes.push(o);
  });

  const merged = [];
  const removed = new Set();
  for (const grp of groups.values()) {
    if (grp.meshes.length < 2) { grp.geos.forEach((g) => g.dispose()); continue; }
    // Frustum culling ажиллуулахын тулд z-ээр эрэмбэлж ~24k vertex-ийн багцад хуваана
    grp.geos.sort((a, b) => a.boundingSphere.center.z - b.boundingSphere.center.z);
    let batch = [], count = 0;
    const flush = () => {
      if (!batch.length) return;
      const geo = mergeGeometries(batch, false);
      batch.forEach((b) => b.dispose());
      if (!geo) { batch = []; count = 0; return; }
      geo.computeBoundingSphere();
      const m = new T.Mesh(geo, grp.material);
      m.castShadow = grp.castShadow; m.receiveShadow = grp.receiveShadow;
      m.name = 'Merged';
      m.userData.merged = true;
      root.add(m);
      merged.push(m);
      batch = []; count = 0;
    };
    let z0 = Infinity;
    for (const g of grp.geos) {
      const z = g.boundingSphere.center.z;
      if (batch.length && (count > 24000 || z - z0 > 50)) { flush(); z0 = Infinity; }
      if (z0 === Infinity) z0 = z;
      batch.push(g); count += g.attributes.position.count;
    }
    flush();
    grp.meshes.forEach((o) => removed.add(o));
  }
  // Устгагдах mesh-ийн нэгтгэгдээгүй хүүхдүүдийг (жишээ нь динамик) root руу шилжүүлнэ
  for (const o of removed) {
    for (const c of [...o.children]) if (!removed.has(c)) root.attach(c);
    o.removeFromParent();
  }
  return merged;
}
