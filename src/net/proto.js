// Сүлжээний цэвэр функцууд (DOM/Three-гүй): state pack/unpack, host сонголт, interpolation, өрөөний код.
export const PROTO_VER = 1;
export const ANIMS = ['idle', 'walk', 'run', 'jump', 'fall', 'swim', 'roll', 'sit', 'carried', 'flung'];

const r2 = (v) => Math.round((v || 0) * 100) / 100;

/** Тоглогчийн төлөв → компакт массив (15Hz илгээнэ) */
/** zone: 0 хот, 1 runner, 2 хортон хамгаалалт (runner:true = zone 1, хуучин нийцтэй) */
export function packState(p) {
  const zone = p.zone ?? (p.runner ? 1 : 0);
  return [r2(p.x), r2(p.y), r2(p.z), r2(p.h), Math.max(0, ANIMS.indexOf(p.anim)), r2(p.speed), p.inCar ? 1 : 0, r2(p.carX), r2(p.carZ), r2(p.carH), r2(p.carSpeed), zone];
}
export function unpackState(a) {
  const zone = a[11] || 0;
  return { x: a[0], y: a[1], z: a[2], h: a[3], anim: ANIMS[a[4]] || 'idle', speed: a[5], inCar: !!a[6], carX: a[7], carZ: a[8], carH: a[9], carSpeed: a[10], zone, runner: zone !== 0 };
}

/** Host = хамгийн эрт нэгдсэн peer; тэнцвэл id үсгээр */
export function pickHost(peers) {
  if (!peers.length) return null;
  return [...peers].sort((a, b) => a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : 1))[0].id;
}

/** Сүүлийн 2 sample-ийн хооронд хоцролттой lerp */
export class Interp {
  constructor() { this.a = null; this.b = null; }
  push(s, now) { this.a = this.b; this.b = { ...s, t: now }; }
  sample(now, delay = 100) {
    if (!this.b) return null;
    if (!this.a) return { x: this.b.x, y: this.b.y, z: this.b.z, h: this.b.h };
    const t = now - delay, k = Math.max(0, Math.min(1, (t - this.a.t) / Math.max(1, this.b.t - this.a.t)));
    const A = this.a, B = this.b;
    const dh = Math.atan2(Math.sin(B.h - A.h), Math.cos(B.h - A.h));
    return { x: A.x + (B.x - A.x) * k, y: A.y + (B.y - A.y) * k, z: A.z + (B.z - A.z) * k, h: A.h + dh * k };
  }
}

export function roomCode() {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789'; let s = '';
  for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}
