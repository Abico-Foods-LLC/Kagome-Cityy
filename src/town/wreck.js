// Эвдрэх зүйлс: сандал, хашаа — машинд хурдтай мөргөгдвөл хэсгүүд нь унаж тарна; алхаж байгаа тоглогч E дарж засна.
// Эвдэрсэн байдал хадгалагдахгүй (reload → бүгд бүтэн).
import * as T from 'three';
import { toast } from '../core/ui.js';

const HIT_SPEED = 8, RADIUS = 2.6, REPAIR_DUR = 1.5, FALL_T = 1.2;

export class Wreckables {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.fixing = null;   // { it, t }
    for (const w of scene.town.wreckables) this.register(w);
  }

  register({ group, kind, collider }) {
    const pieces = [];
    group.traverse((o) => { if (o.isMesh && !o.userData.shadow) pieces.push({ mesh: o, home: { p: o.position.clone(), r: o.rotation.clone() }, broken: false, v: null, spin: null, t: 0 }); });
    const it = { group, kind, collider, pieces, broken: 0, hint: new T.Vector3(), label: kind === 'bench' ? 'Сандал' : 'Хашаа' };
    this.items.push(it);
    this.scene.interactables.push({ dynamic: () => it.hint, r: 2.8, hintY: 1.5, label: () => `${it.label} засах`, icon: '🔧', visible: () => it.broken > 0 && !this.scene.vehicle, action: () => this.repair(it) });
  }

  /** Машины урд цэг (x,z), чиглэл (dx,dz), хурд — ойролцоох хэсгүүдийг эвдэнэ. true = ямар нэг зүйл эвдэрсэн */
  hit(x, z, dx, dz, speed) {
    if (Math.abs(speed) < HIT_SPEED) return false;
    let any = false;
    const pt = new T.Vector3(x, 0, z), local = new T.Vector3();
    for (const it of this.items) {
      local.copy(pt); it.group.worldToLocal(local);
      let n = 0; const sum = new T.Vector3();
      for (const pc of it.pieces) {
        if (pc.broken || Math.hypot(pc.mesh.position.x - local.x, pc.mesh.position.z - local.z) > RADIUS) continue;
        pc.broken = true; pc.t = 0;
        const push = Math.min(10, 2 + Math.abs(speed) * 0.35);
        // Түлхэлт: машины чиглэл (групийн локал руу) + санамсаргүй тархалт
        const dir = new T.Vector3(dx, 0, dz).transformDirection(it.group.matrixWorld.clone().invert());
        pc.v = new T.Vector3(dir.x * push + (Math.random() - 0.5) * 3, 2.5 + Math.random() * 2.5, dir.z * push + (Math.random() - 0.5) * 3);
        pc.spin = new T.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 8);
        pc.mesh.getWorldPosition(sum.length() ? new T.Vector3() : sum); n++;
        any = true;
      }
      if (n) {
        it.broken += n;
        if (it.collider) it.collider.disabled = true;
        // Засварын цэг: эвдэрсэн хэсгүүдийн голд
        const c = new T.Vector3(), w = new T.Vector3(); let k = 0;
        for (const pc of it.pieces) if (pc.broken) { pc.mesh.getWorldPosition(w); c.add(w); k++; }
        it.hint.copy(c.divideScalar(k)); it.hint.y = 0;
      }
    }
    return any;
  }

  repair(it) {
    if (this.scene.vehicle || this.fixing) return;
    this.fixing = { it, t: 0 };
    this.scene.character.play('pick', REPAIR_DUR);
    this.scene.audio.ui();
  }

  update(dt) {
    // Унаж буй хэсгүүд
    for (const it of this.items) for (const pc of it.pieces) {
      if (!pc.broken || pc.t >= FALL_T) continue;
      pc.t += dt;
      const m = pc.mesh;
      m.position.addScaledVector(pc.v, dt); pc.v.y -= 12 * dt;
      m.rotation.x += pc.spin.x * dt; m.rotation.y += pc.spin.y * dt; m.rotation.z += pc.spin.z * dt;
      if (m.position.y < 0.12) { m.position.y = 0.12; pc.v.set(pc.v.x * 0.5, 0, pc.v.z * 0.5); pc.spin.multiplyScalar(0.3); }
      if (pc.t >= FALL_T) { pc.v.set(0, 0, 0); pc.spin.set(0, 0, 0); }
    }
    // Засвар
    const f = this.fixing;
    if (!f) return;
    const pl = this.scene.player;
    if (this.scene.vehicle || Math.hypot(pl.pos.x - f.it.hint.x, pl.pos.z - f.it.hint.z) > 3.5 || Math.hypot(pl.vel.x, pl.vel.z) > 0.5) { this.fixing = null; return; }
    f.t += dt;
    if (Math.random() < dt * 12) this.scene.particles.sparkle(new T.Vector3(f.it.hint.x + (Math.random() - 0.5) * 1.5, 0.6 + Math.random(), f.it.hint.z + (Math.random() - 0.5) * 1.5), 0xffe27a, 1);
    if (f.t < REPAIR_DUR) return;
    const it = f.it; this.fixing = null;
    for (const pc of it.pieces) if (pc.broken) { pc.broken = false; pc.mesh.position.copy(pc.home.p); pc.mesh.rotation.copy(pc.home.r); }
    it.broken = 0;
    if (it.collider) it.collider.disabled = false;
    this.scene.particles.burst(new T.Vector3(it.hint.x, 0.8, it.hint.z), 0xffe27a, 18, { speed: 2, up: 3, size: 0.18, life: 0.7 });
    this.scene.audio.correct(); this.scene.character.cheer();
    toast(`${it.label} засагдлаа! ✨`, 2000, '🔧');
    this.scene.progress('repair', 1);
  }
}
