// Хөнгөн particle систем: нэг InstancedMesh, pool-тэй.
import * as T from 'three';
import { spotTexture } from './textures.js';

export class Particles {
  constructor(scene, max = 400) {
    this.max = max;
    const geo = new T.PlaneGeometry(1, 1);
    this.mat = new T.MeshBasicMaterial({ map: spotTexture(), transparent: true, depthWrite: false, toneMapped: false, side: T.DoubleSide });
    this.mesh = new T.InstancedMesh(geo, this.mat, max);
    this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.mesh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false; this.mesh.receiveShadow = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
    this.items = [];
    this.camera = null;
    this._m = new T.Matrix4(); this._q = new T.Quaternion(); this._s = new T.Vector3(); this._p = new T.Vector3(); this._c = new T.Color();
  }

  /** Жимс түүх, од авах г.м дэлбэрэлт */
  burst(pos, color = 0xffd25a, n = 16, { speed = 4, up = 3, size = 0.25, life = 0.9, gravity = 6 } = {}) {
    for (let i = 0; i < n; i++) {
      if (this.items.length >= this.max) this.items.shift();
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
      this.items.push({
        p: new T.Vector3(pos.x, pos.y, pos.z),
        v: new T.Vector3(Math.cos(a) * s, up * (0.6 + Math.random() * 0.8), Math.sin(a) * s),
        life, max: life, size: size * (0.7 + Math.random() * 0.6), color: new T.Color(color), gravity, grow: 0,
      });
    }
  }

  /** Тоос: газраас босч томордог, дээшээ хөвнө */
  dust(pos, n = 2, { color = 0xd8caa0, size = 0.35 } = {}) {
    for (let i = 0; i < n; i++) {
      if (this.items.length >= this.max) this.items.shift();
      this.items.push({
        p: new T.Vector3(pos.x + (Math.random() - 0.5) * 0.5, pos.y + 0.1, pos.z + (Math.random() - 0.5) * 0.5),
        v: new T.Vector3((Math.random() - 0.5) * 1.2, 0.6 + Math.random() * 0.6, (Math.random() - 0.5) * 1.2),
        life: 0.5, max: 0.5, size, color: new T.Color(color), gravity: -0.5, grow: 1.6,
      });
    }
  }

  /** Гялалзах од (дээшээ аажуухан) */
  sparkle(pos, color = 0xffffff, n = 1) {
    for (let i = 0; i < n; i++) {
      if (this.items.length >= this.max) this.items.shift();
      this.items.push({
        p: new T.Vector3(pos.x + (Math.random() - 0.5) * 1.2, pos.y + Math.random() * 0.6, pos.z + (Math.random() - 0.5) * 1.2),
        v: new T.Vector3(0, 0.8 + Math.random() * 0.5, 0), life: 1, max: 1, size: 0.16, color: new T.Color(color), gravity: 0, grow: -0.8,
      });
    }
  }

  update(dt, camera) {
    const m = this._m, q = this._q, s = this._s, p = this._p;
    if (camera) q.copy(camera.quaternion);
    let n = 0;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      if (it.life <= 0) { this.items.splice(i, 1); continue; }
      it.v.y -= it.gravity * dt;
      it.p.addScaledVector(it.v, dt);
      const k = it.life / it.max;
      const size = it.size * (it.grow > 0 ? (1 + (1 - k) * it.grow) * k : Math.max(0.05, k + it.grow * 0.2 * (1 - k)));
      s.setScalar(size);
      p.copy(it.p);
      m.compose(p, q, s);
      this.mesh.setMatrixAt(n, m);
      this._c.copy(it.color).multiplyScalar(it.grow > 0 ? 1 : 1.6 * k + 0.2);
      this.mesh.setColorAt(n, this._c);
      n++;
    }
    this.mesh.count = n;
    if (n) { this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true; }
  }
}
