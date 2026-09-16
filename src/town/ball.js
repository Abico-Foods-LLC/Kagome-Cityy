// Луувсайн бөмбөг: F / 🎾 дарж шидэхэд нохой гүйж очоод амандаа зуугаад буцааж авчирна.
import * as T from 'three';
import * as P from '../world/props.js';
import { toon } from '../gfx/materials.js';
import { toast } from '../core/ui.js';

const G = 20;

export class FetchBall {
  constructor(scene) { this.scene = scene; this.state = 'idle'; this.v = new T.Vector3(); this.bounced = false; }

  setup() {
    const g = new T.Group(); g.name = 'Ball'; g.visible = false;
    P.sphere(toon(0xffe35a, { key: 'ballY' }), g, 0, 0, 0, 0.18);
    const stripe = P.mesh(new T.TorusGeometry(0.18, 0.025, 6, 24), toon(0xe83a4a, { key: 'kagomeRed' }), g, 0, 0, 0); stripe.rotation.x = 0.6;
    this.mesh = g; this.scene.scene.add(g);
  }

  /** Тоглогч хөл дээрээ, нохой дагадаг, бөмбөг гарт (idle/ground ойр) үед шиднэ */
  throw() {
    const sc = this.scene, P0 = sc.player;
    if (!sc.active || sc.vehicle || !sc.state.pet || sc.carry) return;
    if (this.state !== 'idle' && this.state !== 'ground') return;
    if (this.state === 'ground' && Math.hypot(this.mesh.position.x - P0.pos.x, this.mesh.position.z - P0.pos.z) > 2.2) return;   // хол хэвтэж байна — очиж авна
    const h = P0.heading;
    this.mesh.position.set(P0.pos.x + Math.sin(h) * 0.6, P0.visualY + 1.4, P0.pos.z + Math.cos(h) * 0.6);
    this.v.set(Math.sin(h) * 9, 6, Math.cos(h) * 9);
    this.state = 'air'; this.bounced = false; this.mesh.visible = true;
    sc.character.play('pick', 0.4); sc.audio.whoosh();
    sc.bubbles.show(sc.dog.root, '🎾', { dur: 1.2, y: 1.3, size: 0.7 }); sc.audio.bark(2, 0.1);
    sc.dogMode = 'fetch';
    if (!this.hinted) { this.hinted = true; toast('Луувсай бөмбөг авчирна!', 2200, '🎾'); }
  }

  update(dt) {
    const sc = this.scene, m = this.mesh, dog = sc.dog, pp = sc.player.pos;
    if (this.state === 'air') {
      this.v.y -= G * dt;
      const nx = m.position.x + this.v.x * dt, nz = m.position.z + this.v.z * dt;
      if (sc.blocked(nx, nz, 0.2)) { this.v.x *= -0.4; this.v.z *= -0.4; } else { m.position.x = nx; m.position.z = nz; }
      m.position.y += this.v.y * dt;
      m.rotation.x += this.v.length() * dt * 2;
      if (m.position.y <= 0.18) {
        m.position.y = 0.18;
        if (!this.bounced && this.v.y < -2) { this.bounced = true; this.v.y *= -0.45; this.v.x *= 0.7; this.v.z *= 0.7; sc.particles.dust(m.position, 2); }
        else { this.state = 'ground'; this.v.set(0, 0, 0); }
      }
    } else if (this.state === 'ground') {
      // Тоглогч дээгүүр нь алхвал авна
      if (sc.dogMode !== 'fetch' && Math.hypot(m.position.x - pp.x, m.position.z - pp.z) < 1.2) { this.state = 'idle'; m.visible = false; sc.audio.ui(); }
    } else if (this.state === 'mouth') {
      m.position.copy(dog.head.getWorldPosition(new T.Vector3())).add(new T.Vector3(Math.sin(dog.heading) * 0.42, -0.1, Math.cos(dog.heading) * 0.42));
    }
    // Нохой: очих → зуух → буцах
    if (sc.dogMode === 'fetch') {
      if (this.state === 'idle') sc.dogMode = null;
      else if (this.state !== 'air' && Math.hypot(dog.root.position.x - m.position.x, dog.root.position.z - m.position.z) < 0.9) { this.state = 'mouth'; sc.dogMode = 'return'; sc.audio.ui(); }
    } else if (sc.dogMode === 'return') {
      if (Math.hypot(dog.root.position.x - pp.x, dog.root.position.z - pp.z) < 1.8) {
        this.state = 'ground'; sc.dogMode = null; dog.happy = 2;
        m.position.set(dog.root.position.x + Math.sin(dog.heading) * 0.6, 0.18, dog.root.position.z + Math.cos(dog.heading) * 0.6);
        sc.bubbles.show(dog.root, '❤️', { dur: 1.4, y: 1.3, size: 0.7 }); sc.audio.bark(1, 0.08);
        sc.audio.tone({ f: 880, f2: 1400, type: 'sine', dur: 0.15, vol: 0.08 });
      }
    }
  }
}
