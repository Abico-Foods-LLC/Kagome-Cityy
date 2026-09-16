// Толгой дээрх emoji бөмбөлөг: иргэн, амьтан г.м дүрийн сэтгэл хөдлөлийг товч харуулна.
// show(target, icon) — target: Vector3 буцаадаг функц эсвэл Object3D. Нэг target-д нэг л бөмбөлөг байна (шинэ нь хуучныг солино).
import * as T from 'three';

export class Bubbles {
  /** @param texture (icon:string) => T.Texture — emoji texture (cache-тэй) */
  constructor(scene, texture) {
    this.scene = scene; this.texture = texture;
    this.items = [];
  }
  show(target, icon, { dur = 1.6, y = 2.7, size = 1.1 } = {}) {
    const pos = typeof target === 'function' ? target : () => target.position;
    let b = this.items.find((i) => i.owner === target);
    if (!b) {
      const s = new T.Sprite(new T.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false }));
      s.renderOrder = 20; this.scene.add(s);
      b = { s, owner: target }; this.items.push(b);
    }
    b.s.material.map = this.texture(icon); b.s.material.needsUpdate = true;
    b.pos = pos; b.t = 0; b.dur = dur; b.y = y; b.size = size; b.s.visible = true;
    return b;
  }
  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const b = this.items[i]; b.t += dt;
      if (b.t >= b.dur) { this.scene.remove(b.s); b.s.material.dispose(); this.items.splice(i, 1); continue; }
      const p = b.pos();
      const pop = Math.min(1, b.t / 0.18), scale = b.size * (1 - Math.pow(1 - pop, 3) * 0.6) * (1 + Math.sin(b.t * 5) * 0.03);
      const fade = Math.min(1, (b.dur - b.t) / 0.35);
      b.s.scale.set(scale, scale, 1);
      b.s.position.set(p.x, p.y + b.y + b.t * 0.12 + Math.sin(b.t * 3) * 0.04, p.z);
      b.s.material.opacity = fade;
    }
  }
}
