// Ертөнцийн sync: host иргэд/өдрийн цаг/улирлыг 5Hz түгээнэ; event-ууд (иргэн мөргөх/өргөх/шидэх, эвдрэл, мод, машин, амжилт) бүгдэд.
import * as T from 'three';
import { toast } from '../core/ui.js';

const NPC_ST = { idle: 0, walk: 1, knock: 2, carried: 3 };

export class WorldSync {
  constructor(scene) { this.scene = scene; this.tick = 0; this.npc = null; this.npcAt = 0; this.npcPrev = null; this.carBy = null; }

  get isHost() { return this.scene.net.isHost; }

  update(dt) {
    const sc = this.scene, net = sc.net;
    if (!net.active) return;
    if (this.isHost) {
      this.tick += dt;
      if (this.tick >= 0.2) { this.tick = 0; net.sendWorld({ day: sc.dayTime, season: sc.season, npc: this.npcPack() }); }
    } else this.applyNpc(dt);
  }

  // ---------------------------------------------------------------- Host → guest: иргэд
  npcPack() {
    return this.scene.citizens.map((c) => {
      const r = c.m.root, st = (c.carried || c.carriedBy) ? 3 : c.knock ? 2 : (c.wait > 0 || c.chat || c.stareT > 0) ? 0 : c.dodge ? 1 : c.target ? 1 : 0;
      return [Math.round(r.position.x * 100) / 100, Math.round(r.position.z * 100) / 100, Math.round(c.heading * 100) / 100, st, c.carriedBy || (c.carried ? this.scene.net.selfId : '')];
    });
  }
  onWorld(d) {
    const sc = this.scene;
    if (this.isHost) return;
    this.npcPrev = this.npc; this.npc = d.npc; this.npcAt = performance.now();
    this.day = d.day; if (d.season !== undefined && d.season !== sc.season) sc.applySeason?.(d.season);
  }
  /** Guest: иргэдийг host-ын төлөвөөр interpolate */
  applyNpc(dt) {
    const sc = this.scene; if (!this.npc) return;
    // Өдрийн цаг host руу зөөлөн
    if (this.day !== undefined) { let d = this.day - sc.dayTime; if (d > 0.5) d -= 1; if (d < -0.5) d += 1; sc.dayTime = (sc.dayTime + d * Math.min(1, dt * 2) + 1) % 1; }
    const k = Math.min(1, (performance.now() - this.npcAt) / 200);
    sc.citizens.forEach((c, i) => {
      const cur = this.npc[i]; if (!cur) return;
      const prev = this.npcPrev?.[i] || cur, r = c.m.root;
      const st = cur[3], by = cur[4];
      if (st === 3) {
        // Өргөгдсөн: өргөгчийн толгой дээр (локал тоглогч эсвэл remote)
        const h = sc.remote.carrierHead(by);
        if (h) { r.position.set(h.x, h.y + Math.sin(sc.clock * 6) * 0.05, h.z); r.rotation.set(0, h.h, 0); }
        c.carriedBy = by; c.carried = sc.carry === c;
        if (c.carried) return;   // би өргөж яваа — updateCarry байрлуулна
        c.m.update(dt, { state: 'carried', speed: 0, joy: Math.min(1, ((c.carryT = (c.carryT || 0) + dt) - 4) / 0.6) });
        return;
      }
      c.carriedBy = null; c.knock = null; c.carried = sc.carry === c; if (!c.carried) c.carryT = 0;
      if (c.carried) return;   // би дөнгөж өргөсөн (host хараахан баталгаажуулаагүй) — updateCarry байрлуулна
      const x = prev[0] + (cur[0] - prev[0]) * k, z = prev[1] + (cur[1] - prev[1]) * k;
      const dh = Math.atan2(Math.sin(cur[2] - prev[2]), Math.cos(cur[2] - prev[2]));
      c.heading = prev[2] + dh * k;
      r.position.x = x; r.position.z = z; r.rotation.y = c.heading;
      if (st === 2) { r.rotation.x += (-Math.PI / 2 - r.rotation.x) * Math.min(1, dt * 8); r.position.y = 0; c.m.update(dt, { state: 'idle', speed: 0 }); if (!c.knockShown) { c.knockShown = true; c.m.play('hurt', 1.2); } return; }
      c.knockShown = false; r.rotation.x *= Math.exp(-dt * 10); r.position.y = 0;
      const near = Math.hypot(sc.player.pos.x - x, sc.player.pos.z - z) < 4;
      c.m.update(dt, { state: st === 1 ? 'walk' : 'idle', speed: st === 1 ? 0.45 : 0, lookAt: near ? new T.Vector3(sc.player.pos.x, 1.5, sc.player.pos.z) : null });
    });
  }

  // ---------------------------------------------------------------- Event-ууд
  send(obj) { this.scene.net.sendEvent(obj); }

  onEvent(d, from) {
    const sc = this.scene, name = sc.net.peers.get(from)?.name || 'Тоглогч';
    switch (d.t) {
      case 'npcKnock': if (this.isHost) { const c = sc.citizens[d.i]; if (c && !c.knock && !c.carried) sc.knock(c, d.dx, d.dz, d.speed); } break;
      case 'npcCarry': { const c = sc.citizens[d.i]; if (!c) break; c.carriedBy = from; c.chat = null; c.target = null; c.carryT = 0; if (this.isHost) c.knock = null; sc.bubbles.show(c.m.root, '😮', { dur: 1.4 }); break; }
      case 'npcDrop': { const c = sc.citizens[d.i]; if (!c) break; c.carriedBy = null; if (this.isHost) { c.m.root.position.set(d.x, 0, d.z); c.m.root.rotation.set(0, d.h, 0); c.wait = 1.5; c.target = null; c.m.setMood('happy', 1.5); } sc.bubbles.show(c.m.root, '❤️', { dur: 1.5 }); break; }
      case 'npcThrow': { const c = sc.citizens[d.i]; if (!c) break; c.carriedBy = null; if (this.isHost) { c.m.root.position.set(d.x, 1.8, d.z); c.knock = { t: 2.0, dur: 2.0, vx: d.vx, vz: d.vz, vy: d.vy }; c.m.play('hurt', 2); c.m.roll(0.7); sc.upsetCitizen(c); } sc.bubbles.show(c.m.root, '😵', { dur: 1.6, y: 1.6 }); break; }
      case 'wreck': sc.wreck.hit(d.x, d.z, d.dx, d.dz, d.speed, true); break;
      case 'fix': { const it = sc.wreck.items[d.i]; if (it && it.broken) sc.wreck.applyRepair(it, true); break; }
      case 'tree': sc.treeHit({ x: d.x, z: d.z }, d.dx, d.dz, 10, true); break;
      case 'carEnter': {
        // Хоёулаа зэрэг суусан бол эрт дарсан нь ялна
        if (sc.vehicle && sc.carEnterAt && sc.carEnterAt < d.at) break;
        if (sc.vehicle) { sc.exitCar(); toast(`${name} машиныг түрүүлж авлаа`, 2200, '🚗'); }
        this.carBy = from; break;
      }
      case 'carExit': if (this.carBy === from) this.carBy = null; break;
      case 'feat': toast(`${name} ${d.text}`, 3000, d.icon || '🎉'); break;
      case 'chat': sc.chat?.receive(from, d.text); break;
    }
  }
  /** Peer гарахад түүний барьсан зүйлсийг чөлөөлнө */
  onPeerLeave(id) {
    const sc = this.scene;
    for (const c of sc.citizens) if (c.carriedBy === id) { c.carriedBy = null; if (this.isHost) { c.m.root.position.y = 0; c.wait = 1; } }
    if (this.carBy === id) this.carBy = null;
  }
}
