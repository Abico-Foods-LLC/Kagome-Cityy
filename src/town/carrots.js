// Алтан лууван ×20: хотоор нуусан цуглуулга. Дээгүүр нь алхахад (эсвэл сэлж/машинаар очиход) автоматаар авна.
import * as T from 'three';
import * as P from '../world/props.js';
import { glow, toon } from '../gfx/materials.js';
import { GameState } from '../core/state.js';
import { toast } from '../core/ui.js';

/** id, x, y, z, hint — hint нь авахад toast-д гарна (дараагийнхыг хайхад санаа өгнө) */
export const CARROT_SPOTS = [
  { id: 'c0', x: 0, y: 0.3, z: -5, hint: 'Усан оргилуурын урд' },
  { id: 'c1', x: -5.5, y: 1.0, z: -20.6, hint: 'Сандлын дэргэд' },
  { id: 'c2', x: 21, y: -0.2, z: 15, hint: 'Сувгийн усанд (сэлж)' },
  { id: 'c3', x: 21, y: -0.2, z: -50, hint: 'Сувгийн хойд усанд' },
  { id: 'c4', x: -33, y: 0.3, z: -56, hint: 'Алимын гудамжны байшингийн ард' },
  { id: 'c5', x: 40, y: 0.3, z: -55, hint: 'Манго кафены ард' },
  { id: 'c6', x: -48, y: 0.3, z: 24, hint: 'Усан үзмийн гэрийн хажууд' },
  { id: 'c7', x: 52, y: 0.3, z: 8, hint: 'Жүржийн буудлын ард' },
  { id: 'c8', x: -52, y: 0.3, z: -32, hint: 'Хулууны гэрийн ард' },
  { id: 'c9', x: 52, y: 0.3, z: -52, hint: 'Ширэнгийн хаалганы дэргэд' },
  { id: 'c10', x: 28, y: 0.3, z: -47, hint: 'Фермийн булан' },
  { id: 'c11', x: 59, y: 0.3, z: -26, hint: 'Миний булангийн зах' },
  { id: 'c12', x: 38, y: 0.3, z: 27, hint: 'Логикийн хүрдний доор' },
  { id: 'c13', x: -28, y: 0.3, z: 31, hint: 'Маркетын ард' },
  { id: 'c14', x: -16, y: 0.3, z: 10, hint: 'Лабораторийн хажууд' },
  { id: 'c15', x: -36, y: 0.3, z: 0, hint: 'Жимсний цэцэрлэгт' },
  { id: 'c16', x: 44, y: 0.3, z: -20, hint: 'Номын цэцэрлэгийн ард' },
  { id: 'c17', x: 0, y: 0.3, z: 42, hint: 'Арлын урд үзүүрт' },
  { id: 'c18', x: 0, y: 0.3, z: -66, hint: 'Арлын хойд үзүүрт' },
  { id: 'c19', x: 14, y: 0.3, z: -26, hint: 'Загасчны ойролцоо' },
];

export class GoldenCarrots {
  constructor(scene) { this.scene = scene; this.items = []; this.sparkT = 0; this.pingT = 0; }

  setup() {
    const { scene, state } = this.scene;
    const gold = glow(0xffc93c, 0.8), leaf = toon(0x5fbb5a, { key: 'carrotLeaf' });
    for (const s of CARROT_SPOTS) {
      if (state.carrots.has(s.id)) continue;
      const g = new T.Group(); g.position.set(s.x, s.y, s.z); scene.add(g);
      const body = P.mesh(new T.ConeGeometry(0.22, 0.7, 8), gold, g, 0, 0.35, 0); body.rotation.x = Math.PI;
      for (const a of [0, 1.2, -1.2]) { const l = P.mesh(new T.ConeGeometry(0.06, 0.32, 5), leaf, g, Math.sin(a) * 0.08, 0.82, Math.cos(a) * 0.08); l.rotation.z = Math.sin(a) * 0.4; l.rotation.x = -Math.cos(a) * 0.3; }
      const ring = P.mesh(new T.TorusGeometry(0.4, 0.03, 6, 24), glow(0xffe38a, 1.2), g, 0, 0.05, 0); ring.rotation.x = Math.PI / 2; ring.castShadow = false;
      this.items.push({ ...s, g, ring, phase: Math.random() * 6 });
    }
    this.spots = CARROT_SPOTS;
  }

  update(dt) {
    const sc = this.scene, t = sc.clock, pp = sc.vehicle ? sc.vehicle.position : sc.player.pos, py = sc.vehicle ? 0 : sc.player.y;
    const low = sc.app.quality === 'low';
    this.sparkT += dt; const spark = this.sparkT > (low ? 1 : 0.5); if (spark) this.sparkT = 0;
    let nearest = null, nd = 12;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i], g = it.g;
      g.rotation.y = t * 2 + it.phase; g.position.y = it.y + Math.sin(t * 2.5 + it.phase) * 0.12;
      it.ring.scale.setScalar(1 + Math.sin(t * 4 + it.phase) * 0.12);
      const d = Math.hypot(pp.x - it.x, pp.z - it.z);
      if (spark && d < 40) sc.particles.sparkle(new T.Vector3(it.x + (Math.random() - 0.5) * 0.6, g.position.y + 0.5 + Math.random() * 0.5, it.z + (Math.random() - 0.5) * 0.6), 0xffe38a);
      if (d < nd) { nd = d; nearest = it; }
      if (d < 1.4 && Math.abs(py - Math.max(0, it.y)) < 1.6) this.collect(i);
    }
    // Ойртох чимээ: ойр байх тусам өндөр
    if (nearest) { this.pingT += dt; if (this.pingT > 2) { this.pingT = 0; sc.audio.tone({ f: 600 + (12 - nd) * 60, f2: 700 + (12 - nd) * 60, type: 'sine', dur: 0.12, vol: 0.05 }); } }
  }

  collect(i) {
    const it = this.items[i], sc = this.scene;
    const r = sc.state.collectCarrot(it.id);
    this.items.splice(i, 1); it.g.removeFromParent();
    if (!r) return;
    sc.particles.burst(it.g.position.clone().add(new T.Vector3(0, 0.6, 0)), 0xffd24d, 18, { speed: 3, up: 4, size: 0.18, life: 0.9, gravity: 5 });
    sc.character.cheer?.();
    if (r.done) { sc.audio.fanfare(); toast(`Бүх алтан лууван олдлоо! +300 од, Алтан титэм 👑 маркетад нээгдэв`, 5000, '🥕'); }
    else { sc.audio.correct(); toast(`🥕 Алтан лууван ${r.count}/${GameState.CARROT_TOTAL} — ${it.hint} (+${r.reward} од)`, 2800, '✨'); }
    sc.state.save(); sc.updateHUD();
  }
}
