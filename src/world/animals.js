// Амьтад: дагадаг нохой, сувгийн нугас, сандал дээрх муур. Бүгд procedural, зөөлөн материал.
import * as T from 'three';
import { soft } from './mascot.js';

const S = new T.SphereGeometry(1, 18, 12);
function part(geo, mat, parent, x, y, z, sx = 1, sy = sx, sz = sx) { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; parent.add(m); return m; }

/** Нохой: бөөрөнхий бие, унжсан чих, сүүл савлана. Тоглогчийг дагана. */
export class Dog {
  constructor(color = 0xf2c58a) {
    const root = new T.Group(); root.name = 'Dog'; this.root = root;
    const fur = soft(color), dark = soft(0x8a6a48), ink = soft(0x2b2320, { glow: 0.05 }), pink = soft(0xff9aa8);
    const body = new T.Group(); body.position.y = 0.45; root.add(body); this.body = body;
    part(S, fur, body, 0, 0, 0, 0.42, 0.36, 0.52);
    const head = new T.Group(); head.position.set(0, 0.28, 0.42); body.add(head); this.head = head;
    part(S, fur, head, 0, 0, 0, 0.34, 0.32, 0.32);
    part(S, fur, head, 0, -0.06, 0.26, 0.16, 0.13, 0.16);       // хошуу
    part(S, ink, head, 0, -0.02, 0.4, 0.06);                    // хамар
    for (const s of [-1, 1]) { part(S, ink, head, s * 0.13, 0.08, 0.27, 0.045, 0.055, 0.03); const ear = part(S, dark, head, s * 0.3, 0.12, -0.02, 0.1, 0.22, 0.14); ear.rotation.z = s * 0.6; part(S, pink, head, s * 0.2, -0.02, 0.24, 0.05, 0.03, 0.02); }
    part(new T.CylinderGeometry(0.03, 0.03, 0.2, 6), ink, head, 0, -0.16, 0.3).rotation.x = 0.4; // хэл
    this.legs = [];
    for (const [x, z] of [[-0.2, 0.28], [0.2, 0.28], [-0.2, -0.28], [0.2, -0.28]]) { const l = new T.Group(); l.position.set(x, -0.2, z); body.add(l); part(new T.CapsuleGeometry(0.08, 0.16, 4, 8), fur, l, 0, -0.14, 0); this.legs.push(l); }
    const tail = new T.Group(); tail.position.set(0, 0.1, -0.5); body.add(tail); this.tail = tail;
    part(new T.CapsuleGeometry(0.05, 0.3, 4, 8), fur, tail, 0, 0.15, -0.05).rotation.x = -0.8;
    // Хүзүүвч
    part(new T.TorusGeometry(0.3, 0.05, 8, 20), soft(0xe83a4a), body, 0, 0.16, 0.3).rotation.x = Math.PI / 2 - 0.3;
    part(S, soft(0xffd24d), body, 0, 0.02, 0.62, 0.06);
    const shadow = new T.Mesh(new T.CircleGeometry(0.45, 20), new T.MeshBasicMaterial({ color: 0x0f2a1c, transparent: true, opacity: 0.2, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.03; root.add(shadow);
    this.vel = new T.Vector3(); this.heading = 0; this.t = 0; this.idleT = 0; this.sniff = 0; this.happy = 0;
  }
  /** target: тоглогчийн байрлал; blocked(x,z) collision */
  update(dt, target, blocked, playerState, stopDist = 3.2) {
    this.t += dt;
    const r = this.root, p = r.position;
    const dx = target.x - p.x, dz = target.z - p.z, d = Math.hypot(dx, dz);
    let moving = false;
    if (d > stopDist) {
      const sp = d > 9 || stopDist < 2 ? 9.5 : 5;   // хол хоцорсон эсвэл яаралтай (унасан иргэн рүү) бол гүйнэ
      const h = Math.atan2(dx, dz);
      this.heading += Math.atan2(Math.sin(h - this.heading), Math.cos(h - this.heading)) * Math.min(1, dt * 8);
      const nx = p.x + Math.sin(this.heading) * sp * dt, nz = p.z + Math.cos(this.heading) * sp * dt;
      if (!blocked(nx, nz, 0.3, { canal: true })) { p.x = nx; p.z = nz; moving = true; } else { this.heading += 1.5 * dt; }
      if (d > 30) { p.x = target.x - Math.sin(this.heading) * 2; p.z = target.z - Math.cos(this.heading) * 2; }  // хэт хоцорвол тэлпорт
      this.idleT = 0;
    } else {
      this.idleT += dt;
      // Зогсоод тоглогч руу харна
      const h = Math.atan2(dx, dz);
      this.heading += Math.atan2(Math.sin(h - this.heading), Math.cos(h - this.heading)) * Math.min(1, dt * 3);
    }
    r.rotation.y = this.heading;
    // Animation
    const ph = this.t * (d > 9 ? 16 : 11);
    this.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(ph + (i % 2 ? Math.PI : 0) + (i < 2 ? 0 : 0.5)) * 0.7 : 0; });
    this.body.position.y = 0.45 + (moving ? Math.abs(Math.sin(ph)) * 0.06 : Math.sin(this.t * 3) * 0.01);
    this.body.rotation.x = moving ? -0.08 : 0;
    const wag = playerState === 'idle' || moving ? 1 : 0.4;
    this.tail.rotation.y = Math.sin(this.t * 14) * 0.6 * wag;
    // Үнэрлэх / толгой хазайх
    if (!moving && this.idleT > 2 && this.sniff <= 0 && Math.random() < dt * 0.3) this.sniff = 1.5;
    this.sniff = Math.max(0, this.sniff - dt);
    this.head.rotation.x = this.sniff > 0 ? 0.5 + Math.sin(this.t * 12) * 0.08 : (moving ? 0.1 : Math.sin(this.t * 1.5) * 0.08);
    this.head.rotation.z = !moving && this.idleT > 4 ? Math.sin(this.t * 0.8) * 0.25 : 0;
  }
}

/** Нугас: усан дээр хөвж, толгойгоо дүрнэ. */
export function createDuck(color = 0xfff3d6) {
  const g = new T.Group(); g.name = 'Duck';
  const fur = soft(color), orange = soft(0xff9a1f), ink = soft(0x2b2320, { glow: 0.05 });
  part(S, fur, g, 0, 0.18, 0, 0.3, 0.22, 0.38);
  const head = new T.Group(); head.position.set(0, 0.42, 0.22); g.add(head);
  part(S, fur, head, 0, 0, 0, 0.17);
  part(new T.BoxGeometry(0.14, 0.05, 0.16), orange, head, 0, -0.02, 0.2);
  for (const s of [-1, 1]) part(S, ink, head, s * 0.08, 0.04, 0.13, 0.03);
  part(S, fur, g, 0, 0.26, -0.3, 0.12, 0.1, 0.16).rotation.x = -0.5;   // сүүл
  const wings = [];
  for (const s of [-1, 1]) { const w = new T.Group(); w.position.set(s * 0.24, 0.24, -0.02); g.add(w); part(S, fur, w, s * 0.1, 0, 0, 0.16, 0.06, 0.24); wings.push({ w, s }); }
  g.userData = { head, wings, phase: Math.random() * 6, dip: 0, flee: 0, off: new T.Vector3(), fleeDir: new T.Vector3() };
  return g;
}
/** Нугас сувагт тойрон хөвнө; threats[] (Vector3) 2.5м-т ойртвол далавч дэвсэн зугтана (буцаж тойрогтоо ирнэ). onFlee() — дуу/үсрэлт. */
export function updateDuck(g, dt, t, cx, cz, radius, threats = [], onFlee = null) {
  const u = g.userData, a = t * 0.25 + u.phase;
  const ox = cx + Math.sin(a) * radius * 0.6, oz = cz + Math.cos(a * 0.7) * radius;
  // Зугтах: хамгийн ойрын аюулаас холдох чиглэл
  if (u.flee <= 0) {
    for (const th of threats) {
      const dx = g.position.x - th.x, dz = g.position.z - th.z, d = Math.hypot(dx, dz);
      if (d < 2.5) { u.flee = 1.3; u.fleeDir.set(dx / (d || 1), 0, dz / (d || 1)); if (onFlee) onFlee(g); break; }
    }
  }
  if (u.flee > 0) {
    u.flee -= dt;
    const sp = 4.5 * Math.min(1, u.flee / 0.4 + 0.4);
    u.off.x += u.fleeDir.x * sp * dt; u.off.z += u.fleeDir.z * sp * dt;
    // Сувгаас гарахгүй: хажуу тийш бага, дагуу их
    u.off.x = Math.max(-1.6, Math.min(1.6, u.off.x)); u.off.z = Math.max(-6, Math.min(6, u.off.z));
  } else { u.off.x *= Math.exp(-dt * 0.5); u.off.z *= Math.exp(-dt * 0.5); }
  const fleeing = u.flee > 0;
  g.position.set(ox + u.off.x, -0.32 + Math.sin(t * 2 + u.phase) * 0.03 + (fleeing ? Math.abs(Math.sin(t * 18)) * 0.08 : 0), oz + u.off.z);
  g.rotation.y = fleeing ? Math.atan2(u.fleeDir.x, u.fleeDir.z) : Math.atan2(Math.cos(a) * radius * 0.6 * 0.25, -Math.sin(a * 0.7) * radius * 0.175);
  g.rotation.z = Math.sin(t * 2.2 + u.phase) * 0.05;
  for (const { w, s } of u.wings) w.rotation.z = fleeing ? s * (0.9 + Math.sin(t * 26) * 0.7) : 0;
  if (!fleeing && u.dip <= 0 && Math.random() < dt * 0.08) u.dip = 1.4;
  u.dip = Math.max(0, u.dip - dt);
  u.head.rotation.x = fleeing ? -0.3 : u.dip > 0 ? Math.sin(Math.min(1, u.dip / 1.4) * Math.PI) * 1.2 : Math.sin(t * 1.3 + u.phase) * 0.1;
}

/** Муур: сандал дээр хэвтэж, сүүл хөдөлгөнө, хааяа шинэ. */
export function createCat(color = 0x8a8a8a) {
  const g = new T.Group(); g.name = 'Cat';
  const fur = soft(color), ink = soft(0x2b2320, { glow: 0.05 }), pink = soft(0xffa0b0);
  part(S, fur, g, 0, 0.2, 0, 0.32, 0.2, 0.42);                       // хэвтсэн бие
  const head = new T.Group(); head.position.set(0, 0.32, 0.32); g.add(head);
  part(S, fur, head, 0, 0, 0, 0.2, 0.18, 0.2);
  for (const s of [-1, 1]) { part(new T.ConeGeometry(0.07, 0.14, 4), fur, head, s * 0.13, 0.17, -0.02).rotation.z = s * -0.3; part(S, ink, head, s * 0.08, 0.02, 0.17, 0.035, 0.045, 0.02); }
  part(S, pink, head, 0, -0.05, 0.2, 0.03, 0.02, 0.02);
  const tail = new T.Group(); tail.position.set(0.2, 0.15, -0.35); g.add(tail);
  part(new T.CapsuleGeometry(0.035, 0.4, 4, 8), fur, tail, 0, 0, -0.2).rotation.x = Math.PI / 2;
  g.userData = { head, tail, phase: Math.random() * 6, stretch: 0, pet: 0 };
  return g;
}
/** u.pet > 0 үед илүүлж байна: толгойгоо налан, сүүл хурдан, бие чичирнэ (purr). */
export function updateCat(g, dt, t) {
  const u = g.userData;
  u.pet = Math.max(0, u.pet - dt);
  const pet = u.pet > 0 ? Math.min(1, u.pet / 0.3) : 0;
  u.tail.rotation.y = Math.sin(t * (1.8 + pet * 4) + u.phase) * 0.6;
  u.head.rotation.y = Math.sin(t * 0.6 + u.phase) * 0.4 * (1 - pet);
  u.head.rotation.z = pet * (0.45 + Math.sin(t * 5) * 0.1);
  u.head.rotation.x = pet * -0.25;
  g.scale.y = 1 + Math.sin(t * 2.5 + u.phase) * 0.015 + pet * Math.sin(t * 24) * 0.02;
}
