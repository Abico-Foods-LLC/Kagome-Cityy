// Бусад тоглогчид: avatar + нэрийн label, 100мс хоцролттой interpolation, анимаци, машин, өргөгдсөн байрлал.
import * as T from 'three';
import { createAvatar } from '../world/avatar.js';
import { curveTree } from '../gfx/materials.js';
import { textTexture } from '../gfx/textures.js';
import { Interp, unpackState } from './proto.js';

export class RemotePlayers {
  /** scene: { scene: THREE.Scene, net, player, clock, town? }; zone: энэ scene-д харагдах zone (0 хот, 2 defense) */
  constructor(scene, zone = 0) { this.scene = scene; this.zone = zone; this.map = new Map(); }

  add(id, hello) {
    if (this.map.has(id)) return this.refresh(id, hello);
    const avatar = createAvatar(hello.avatar, {}, hello.equipped);
    avatar.root.visible = false;   // эхний state ирэх хүртэл
    this.scene.scene.add(avatar.root); curveTree(avatar.root);
    const label = new T.Sprite(new T.SpriteMaterial({ map: textTexture(hello.name, { bg: 'rgba(255,255,255,0.92)', fg: '#1e6b45', font: '800 96px Arial, sans-serif', w: 512, h: 160, radius: 70 }), transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false }));
    label.scale.set(1.3, 0.4, 1); label.renderOrder = 21; this.scene.scene.add(label);
    this.map.set(id, { id, avatar, label, name: hello.name, kind: hello.avatar, interp: new Interp(), baseScale: avatar.root.scale.x, st: null, anim: 'idle', speed: 0, carriedBy: null, pos: new T.Vector3(), heading: 0, joy: 0 });
  }
  refresh(id, hello) {
    const r = this.map.get(id); if (!r) return;
    if (r.kind !== hello.avatar) { this.remove(id); this.add(id, hello); return; }
    r.avatar.wear?.(hello.equipped);
  }
  remove(id) {
    const r = this.map.get(id); if (!r) return;
    r.avatar.root.removeFromParent(); r.label.removeFromParent(); r.label.material.map?.dispose();
    this.map.delete(id);
    for (const o of this.map.values()) if (o.carriedBy === id) o.carriedBy = null;
  }
  get(id) { return this.map.get(id) || null; }
  onState(id, arr) {
    const r = this.map.get(id); if (!r) return;
    r.st = unpackState(arr);
    r.interp.push({ x: r.st.x, y: r.st.y, z: r.st.z, h: r.st.h }, performance.now());
  }
  /** Ойрын (r м) чөлөөтэй remote тоглогч */
  nearest(pos, rad) {
    let best = null, bd = rad;
    for (const r of this.map.values()) {
      if (!r.st || r.st.inCar || r.st.zone !== this.zone || r.carriedBy || r.anim === 'carried' || r.anim === 'flung') continue;
      const d = Math.hypot(r.pos.x - pos.x, r.pos.z - pos.z);
      if (d < bd) { bd = d; best = r.id; }
    }
    return best;
  }
  /** Өргөгчийн (peer id эсвэл 'self') толгойн байрлал */
  carrierHead(by) {
    const sc = this.scene;
    if (by === sc.net.selfId) { const P = sc.player; return { x: P.pos.x + Math.sin(P.heading) * 0.15, y: P.visualY + 2.0, z: P.pos.z + Math.cos(P.heading) * 0.15, h: P.heading }; }
    const c = this.map.get(by); if (!c) return null;
    return { x: c.pos.x + Math.sin(c.heading) * 0.15, y: c.pos.y + 2.0, z: c.pos.z + Math.cos(c.heading) * 0.15, h: c.heading };
  }

  update(dt) {
    const sc = this.scene, now = performance.now(), car = sc.town?.car;
    let remoteDriver = null;
    for (const r of this.map.values()) {
      if (!r.st) continue;
      const root = r.avatar.root;
      const hidden = r.st.zone !== this.zone;
      root.visible = !hidden; r.label.visible = !hidden;
      if (hidden) continue;
      const s = r.interp.sample(now, 100) || r.st;
      if (r.carriedBy) {
        const h = this.carrierHead(r.carriedBy);
        if (h) { r.pos.set(h.x, h.y + Math.sin(sc.clock * 6) * 0.05, h.z); r.heading = h.h; }
        r.anim = 'carried';
      } else if (r.st.inCar) {
        remoteDriver = r;
        r.pos.set(r.st.carX, 0, r.st.carZ); r.heading = r.st.carH;
        r.anim = 'sit';
      } else { r.pos.set(s.x, s.y, s.z); r.heading = s.h; r.anim = r.st.anim; }
      r.speed = r.st.speed;
      if (car && r.st.inCar && !sc.vehicle) {
        // Бусдын машин: машины mesh-ийг жолоочийн state-ээр байрлуулна, тоглогчийг суудалд
        car.position.set(r.st.carX, 0, r.st.carZ); car.rotation.y = r.st.carH;
        car.userData.wheels.forEach((w) => { w.rotation.x += r.st.carSpeed * dt * 1.7; });
        root.position.set(car.position.x + Math.sin(r.heading) * 0.45, 1.42, car.position.z + Math.cos(r.heading) * 0.45);   // суудал (локал driver-тэй ижил offset)
        root.rotation.y = r.heading + Math.PI; root.scale.setScalar(r.baseScale * 0.72);
      } else {
        root.position.copy(r.pos); root.rotation.y = r.heading; root.scale.setScalar(r.baseScale);
      }
      r.joy = r.anim === 'carried' ? Math.min(1, (r.joy || 0) + dt / 4) : 0;
      r.avatar.update(dt, { state: r.anim === 'flung' ? 'jump' : r.anim, speed: r.speed, joy: r.joy });
      if (r.anim === 'flung') root.rotation.x += dt * 8; else root.rotation.x = 0;
      r.label.position.set(root.position.x, root.position.y + (r.st.inCar ? 2.3 : 2.8), root.position.z);
    }
    this.remoteDriver = remoteDriver;
  }
}
