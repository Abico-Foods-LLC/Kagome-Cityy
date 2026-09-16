// Толгой дээрх emoji бөмбөлөг: иргэн, амьтан г.м дүрийн сэтгэл хөдлөлийг товч харуулна.
// show(target, icon) — target: Vector3 буцаадаг функц эсвэл Object3D. Нэг target-д нэг л бөмбөлөг байна (шинэ нь хуучныг солино).
import * as T from 'three';

export class Bubbles {
  /** @param texture (icon:string) => T.Texture — emoji texture (cache-тэй) */
  constructor(scene, texture) {
    this.scene = scene; this.texture = texture;
    this.items = [];
    this.scale = 1;   // бага чанарт 0.9
  }
  show(target, icon, { dur = 1.6, y = 2.7, size = 1.1 } = {}) {
    const pos = typeof target === 'function' ? target : () => target.position;
    let b = this.items.find((i) => i.owner === target);
    if (!b) {
      const s = new T.Sprite(new T.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false }));
      s.renderOrder = 20; this.scene.add(s);
      b = { s, owner: target }; this.items.push(b);
    }
    if (icon) b.s.material.map = this.texture(icon); b.s.material.needsUpdate = true;
    b.own?.dispose(); b.own = null; b.wide = false;
    b.pos = pos; b.t = 0; b.dur = dur; b.y = y; b.size = size; b.s.visible = true;
    return b;
  }
  /** Үгтэй бөмбөлөг (чат) — canvas texture, cache-гүй */
  showText(target, text, { dur = 3, y = 2.7 } = {}) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 160;
    const x = c.getContext('2d');
    x.fillStyle = 'rgba(255,255,255,.94)'; x.beginPath(); x.roundRect(8, 8, 496, 112, 40); x.fill();
    x.beginPath(); x.moveTo(230, 118); x.lineTo(282, 118); x.lineTo(256, 150); x.closePath(); x.fill();
    x.fillStyle = '#1e6b45'; x.font = '800 44px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    let f = 44; while (x.measureText(text).width > 470 && f > 24) { f -= 2; x.font = `800 ${f}px Arial, sans-serif`; }
    x.fillText(text, 256, 64);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
    const b = this.show(target, '', { dur, y, size: 1 });
    b.s.material.map = t; b.s.material.needsUpdate = true; b.wide = true; b.own = t;
    return b;
  }
  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const b = this.items[i]; b.t += dt;
      if (b.t >= b.dur) { this.scene.remove(b.s); b.own?.dispose(); b.s.material.dispose(); this.items.splice(i, 1); continue; }
      const p = b.pos();
      const pop = Math.min(1, b.t / 0.18), scale = b.size * this.scale * (1 - Math.pow(1 - pop, 3) * 0.6) * (1 + Math.sin(b.t * 5) * 0.03);
      const fade = Math.min(1, (b.dur - b.t) / 0.35);
      b.s.scale.set(scale * (b.wide ? 3.2 : 1), scale, 1);
      b.s.position.set(p.x, p.y + b.y + b.t * 0.12 + Math.sin(b.t * 3) * 0.04, p.z);
      b.s.material.opacity = fade;
    }
  }
}
