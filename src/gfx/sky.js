// Тэнгэр: градиент бөмбөрцөг shader, нар, stylized үүл, өдрийн цагийн өнгө.
import * as T from 'three';
import { toon } from './materials.js';

export function createSky({ radius = 400, top = 0x3f9ce8, horizon = 0xbfe9f5, bottom = 0xe4f6f0 } = {}) {
  const uniforms = {
    uTop: { value: new T.Color(top) },
    uHorizon: { value: new T.Color(horizon) },
    uBottom: { value: new T.Color(bottom) },
    uSunDir: { value: new T.Vector3(-0.4, 0.6, 0.5).normalize() },
    uSunColor: { value: new T.Color(0xfff2c8) },
    uTime: { value: 0 },
  };
  const mat = new T.ShaderMaterial({
    uniforms, side: T.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform vec3 uTop, uHorizon, uBottom, uSunDir, uSunColor; uniform float uTime; varying vec3 vDir;
      void main(){
        float h = vDir.y;
        vec3 col = h > 0.0 ? mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(uHorizon, uBottom, clamp(-h * 3.0, 0.0, 1.0));
        float sun = max(dot(vDir, uSunDir), 0.0);
        col += uSunColor * (pow(sun, 380.0) * 1.2 + pow(sun, 12.0) * 0.18);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new T.Mesh(new T.SphereGeometry(radius, 32, 16), mat);
  mesh.name = 'Sky';
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return { mesh, uniforms };
}

/** Хавтгай toon үүл — олон бөмбөгөөс бүрдэнэ, аажуухан хөвнө. */
export function createClouds(count = 14, { spread = 180, height = 38, seed = 1 } = {}) {
  const g = new T.Group();
  g.name = 'Clouds';
  const mat = toon(0xffffff, { key: 'cloud' });
  const geo = new T.SphereGeometry(1, 10, 8);
  let s = seed;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < count; i++) {
    const c = new T.Group();
    const n = 3 + Math.floor(r() * 4), scale = 2.6 + r() * 3;
    for (let j = 0; j < n; j++) {
      const m = new T.Mesh(geo, mat);
      m.position.set((j - n / 2) * scale * 0.75, (r() - 0.3) * scale * 0.4, (r() - 0.5) * scale * 0.5);
      m.scale.set(scale * (0.8 + r() * 0.6), scale * (0.45 + r() * 0.3), scale * (0.7 + r() * 0.4));
      m.castShadow = false; m.receiveShadow = false;
      c.add(m);
    }
    c.position.set((r() - 0.5) * spread * 2, height + r() * 22, (r() - 0.5) * spread * 2);
    c.userData.speed = 0.4 + r() * 0.8;
    g.add(c);
  }
  g.userData.spread = spread;
  return g;
}

export function updateClouds(g, dt) {
  const spread = g.userData.spread;
  for (const c of g.children) {
    c.position.x += c.userData.speed * dt;
    if (c.position.x > spread) c.position.x = -spread;
  }
}
