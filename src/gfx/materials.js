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

// ---------- Ус ----------
export function waterMaterial(color = 0x3fb8d4, opts = {}) {
  const m = new T.MeshStandardMaterial({
    color: new T.Color(color), roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.86, ...opts,
  });
  m.userData.time = { value: 0 };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = m.userData.time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec3 vWPos;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float w = sin(wp.x * 0.35 + uTime * 1.3) * 0.08 + sin(wp.z * 0.5 + uTime * 0.9) * 0.06 + sin((wp.x + wp.z) * 0.9 + uTime * 2.0) * 0.03;
        transformed.y += w;
        vWPos = wp.xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec3 vWPos;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float r1 = sin(vWPos.x * 1.7 + uTime * 1.1 + sin(vWPos.z * 1.3 + uTime * 0.7) * 1.2);
        float r2 = sin(vWPos.z * 2.3 - uTime * 0.9 + sin(vWPos.x * 1.1 - uTime * 0.6) * 1.4);
        float ripple = smoothstep(0.72, 0.98, r1 * r2);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), ripple * 0.55);
        float depthFade = smoothstep(0.2, 0.9, r1 * 0.5 + 0.5);
        diffuseColor.rgb *= 0.9 + depthFade * 0.18;`);
  };
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
