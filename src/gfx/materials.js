// Материалын үйлдвэр: toon shading, gradient map, outline hull, кэш.
import * as T from 'three';

let gradientMap = null;
function getGradient() {
  if (gradientMap) return gradientMap;
  // 4 шатлалт toon градиент: гүн сүүдэр → дунд → гэрэл → хамгийн гэрэл
  const data = new Uint8Array([95, 165, 225, 255]);
  const tex = new T.DataTexture(data, 4, 1, T.RedFormat);
  tex.minFilter = tex.magFilter = T.NearestFilter;
  tex.needsUpdate = true;
  gradientMap = tex;
  return tex;
}

const cache = new Map();

/** Toon материал (өнгөөр кэшлэгдэнэ). */
export function toon(color, { emissive = 0x000000, emissiveIntensity = 1, map = null, key = null, flat = false, transparent = false, opacity = 1, side = T.FrontSide } = {}) {
  const k = key || `${typeof color === 'number' ? color.toString(16) : color}|${emissive}|${emissiveIntensity}|${map ? map.uuid : ''}|${flat}|${opacity}|${side}`;
  if (cache.has(k)) return cache.get(k);
  const m = new T.MeshToonMaterial({
    color: new T.Color(color), gradientMap: getGradient(), map, emissive: new T.Color(emissive), emissiveIntensity,
    transparent, opacity, side,
  });
  cache.set(k, m);
  return m;
}

/** Стандарт материал (гялгар/металл зүйлст). */
export function standard(color, opts = {}) {
  return new T.MeshStandardMaterial({ color: new T.Color(color), roughness: 0.6, metalness: 0, ...opts });
}

/** Гэрэлтдэг материал (emissive) */
export function glow(color, intensity = 1.5) {
  return new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(intensity), toneMapped: false });
}

const outlineMat = new T.MeshBasicMaterial({ color: 0x1b2a2a, side: T.BackSide, toneMapped: false });

/** Inverted-hull outline: mesh-ийг бага зэрэг томсгож ар талыг нь харуулна. */
export function addOutline(mesh, thickness = 0.035) {
  const o = new T.Mesh(mesh.geometry, outlineMat);
  o.scale.setScalar(1 + thickness);
  o.castShadow = false; o.receiveShadow = false;
  o.name = 'outline';
  o.renderOrder = -1;
  mesh.add(o);
  return o;
}

export function outlineGroup(group, thickness = 0.045) {
  group.traverse((o) => {
    if (o.isMesh && o.name !== 'outline' && !o.userData.noOutline && !o.material.transparent) addOutline(o, thickness / Math.max(0.3, o.scale.x));
  });
}

// ---------- Ус: stylized (caustic нүд, нарны гялбаа, эргийн хөөс, гүний өнгө) ----------
/**
 * @param {number} color  усны үндсэн өнгө
 * @param {object} opts   { deep: гүний өнгө, shore: [minX,minZ,maxX,maxZ] арлын хүрээ (нуурт хөөс/гүн), edges: [x0,x1] сувгийн эрэг (хөөс) }
 */
export function waterMaterial(color = 0x3fb8d4, { deep = null, shore = null, edges = null, opacity = 0.88, ...opts } = {}) {
  const m = new T.MeshStandardMaterial({ color: new T.Color(color), roughness: 0.28, metalness: 0.0, transparent: true, opacity, ...opts });
  m.userData.time = { value: 0 };
  const uDeep = { value: new T.Color(deep ?? color).multiplyScalar(deep ? 1 : 0.7) };
  const uShore = { value: new T.Vector4(...(shore || [-1e5, -1e5, 1e5, 1e5])) };
  const uEdges = { value: new T.Vector2(...(edges || [-1e5, 1e5])) };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = m.userData.time;
    shader.uniforms.uDeep = uDeep; shader.uniforms.uShore = uShore; shader.uniforms.uEdges = uEdges;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec3 vWPos;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float w = sin(wp.x * 0.35 + uTime * 1.1) * 0.06 + sin(wp.z * 0.5 + uTime * 0.8) * 0.05 + sin((wp.x + wp.z) * 0.9 + uTime * 1.7) * 0.025;
        transformed.y += w;
        vWPos = wp.xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; uniform vec3 uDeep; uniform vec4 uShore; uniform vec2 uEdges; varying vec3 vWPos;
        float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
        float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash21(i), hash21(i + vec2(1, 0)), f.x), mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec2 p = vWPos.xz;
          // Зөөлөн гэрэлт нүд (caustic) — хоёр давхар noise
          float n1 = vnoise(p * 0.55 + vec2(uTime * 0.12, uTime * 0.07));
          float n2 = vnoise(p * 1.2 - vec2(uTime * 0.09, -uTime * 0.11) + 7.3);
          float cells = smoothstep(0.52, 0.78, n1 * 0.55 + n2 * 0.45);
          // Гүн: арлаас холдох тусам бараан
          float dIsland = max(max(uShore.x - p.x, p.x - uShore.z), max(uShore.y - p.y, p.y - uShore.w));
          float deep = smoothstep(2.0, 40.0, dIsland);
          diffuseColor.rgb = mix(diffuseColor.rgb, uDeep, deep);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), cells * 0.28);
          // Жижиг гялбаа
          float sp = smoothstep(0.88, 0.97, vnoise(p * 3.5 + vec2(uTime * 0.5, -uTime * 0.3)));
          diffuseColor.rgb += sp * 0.35;
          // Эргийн хөөс: арлын ирмэг ба сувгийн эрэг дагуу
          float dEdge = min(abs(p.x - uEdges.x), abs(p.x - uEdges.y));
          float foamD = min(abs(dIsland), dEdge);
          float foam = smoothstep(1.4, 0.15, foamD) * (0.55 + 0.45 * sin(foamD * 6.0 - uTime * 2.2 + vnoise(p * 2.0) * 3.0));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), clamp(foam, 0.0, 1.0) * 0.8);
        }`);
  };
  m.customProgramCacheKey = () => 'water2';
  return m;
}

// ---------- Салхинд ганхах навч / өвс ----------
export function windSway(material, { strength = 0.12, speed = 1.4, heightStart = 0.0 } = {}) {
  material.userData.time = material.userData.time || { value: 0 };
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader) => {
    if (prev) prev(shader);
    shader.uniforms.uTime = material.userData.time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec4 wp = modelMatrix * instanceSway(vec4(position, 1.0));
          float h = max(0.0, position.y - ${heightStart.toFixed(2)});
          float ph = wp.x * 0.25 + wp.z * 0.2;
          transformed.x += sin(uTime * ${speed.toFixed(2)} + ph) * ${strength.toFixed(3)} * h;
          transformed.z += cos(uTime * ${(speed * 0.8).toFixed(2)} + ph * 1.3) * ${(strength * 0.6).toFixed(3)} * h;
        }`)
      .replace('void main() {', `
        #ifdef USE_INSTANCING
        vec4 instanceSway(vec4 p) { return instanceMatrix * p; }
        #else
        vec4 instanceSway(vec4 p) { return p; }
        #endif
        void main() {`);
  };
  material.customProgramCacheKey = () => `sway${strength}${speed}${heightStart}`;
  return material;
}

export const PALETTE = {
  grass: 0x6fc25a, grassDark: 0x4ea347, grassLight: 0x9ee07a,
  road: 0xf2dcae, roadLine: 0xfff4d4, dirt: 0xb07a4e, sand: 0xf5e2b8,
  water: 0x45c3dc, waterDeep: 0x2a9fc0,
  wood: 0xa2723f, woodDark: 0x6f4a29, whiteWood: 0xfff5dd,
  leaf: 0x3c9e4a, leafLight: 0x7ed067, leafDark: 0x2c7a3a, trunk: 0x8b5e3c,
  stone: 0xd8d0c0, stoneDark: 0x9a9284,
  suit: 0x2c3646, suitLight: 0x3f4c60, shirt: 0xf8f4ec, tie: 0x8a1c25, skin: 0xd9a57b, skinDark: 0xb98262, hair: 0x1a1717,
  gold: 0xffd24d, cream: 0xfff8e6,
};

// ---------- Дугуй хязгаар (Animal Crossing маяг): алсын зүйлс доош нугарна ----------
export const curveUniforms = { uCurve: { value: 0.0007 }, uCurveStart: { value: 22 } };

/** Материалын vertex shader-т муруйлт нэмнэ (нэг удаа). */
export function applyCurve(material) {
  if (!material || material.userData.curved || material.isShaderMaterial) return material;
  material.userData.curved = true;
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey ? material.customProgramCacheKey.bind(material) : null;
  const prevSrc = prev ? prev.toString() : '';
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    shader.uniforms.uCurve = curveUniforms.uCurve;
    shader.uniforms.uCurveStart = curveUniforms.uCurveStart;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uCurve, uCurveStart;')
      .replace('#include <project_vertex>', `
        vec4 mvPosition = vec4( transformed, 1.0 );
        #ifdef USE_BATCHING
          mvPosition = batchingMatrix * mvPosition;
        #endif
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        mvPosition = modelViewMatrix * mvPosition;
        {
          float dz = max(0.0, -mvPosition.z - uCurveStart);
          mvPosition.y -= dz * dz * uCurve;
        }
        gl_Position = projectionMatrix * mvPosition;`);
  };
  material.customProgramCacheKey = () => (prevKey ? prevKey() : prevSrc) + '|curve';
  return material;
}

/** Модны бүх материалд муруйлт нэмнэ. */
export function curveTree(root) {
  root.traverse((o) => {
    if (o.userData.noCurve) return;
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) applyCurve(m);
  });
}

// ---- Мөргөлтийн далайлт: машин мод мөргөхөд титэм/их бие уян далайна (нэгтгэсэн статик mesh дээр ч ажиллана) ----
export const hitUniforms = { uHitPos: { value: new T.Vector3(0, -100, 0) }, uHitDir: { value: new T.Vector2(1, 0) }, uHitT: { value: -100 }, uNow: { value: 0 } };
export function hitSway(material) {
  if (!material || material.userData.hitSway) return material;
  material.userData.hitSway = true;
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey ? material.customProgramCacheKey.bind(material) : null;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    Object.assign(shader.uniforms, { uHitPos: hitUniforms.uHitPos, uHitDir: hitUniforms.uHitDir, uHitT: hitUniforms.uHitT, uNow: hitUniforms.uNow });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uHitPos; uniform vec2 uHitDir; uniform float uHitT, uNow;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec4 hwp = modelMatrix * vec4(position, 1.0);
          float hdt = uNow - uHitT;
          float hw = smoothstep(4.5, 0.5, distance(hwp.xz, uHitPos.xz)) * exp(-hdt * 2.0) * step(0.0, hdt) * clamp(hwp.y, 0.0, 4.0) * 0.25;
          transformed.xz += uHitDir * sin(hdt * 13.0) * 0.45 * hw;
        }`);
  };
  material.customProgramCacheKey = () => (prevKey ? prevKey() : '') + '|hit';
  return material;
}
