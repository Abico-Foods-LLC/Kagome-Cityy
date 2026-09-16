// Зөөлөн mascot дүрүүд (хулуу, тоор, мөөг, улаан лооль, алим, жүрж, усан үзэм, лууван):
// бөөрөнхий бие, жижиг гар хөл, том жимсэн толгой, цэгэн нүд, ягаан хацар, гөлгөр сүүдэрлэлт.
// Character-тэй ижил API: root, shadow, update(dt, p), play(), flip(), roll(), cheer(), setMood(), busy, onStep.
import * as T from 'three';
import { ACCESSORIES } from '../core/content.js';

const sphereGeo = new T.SphereGeometry(1, 28, 20);
let _bodyGeo = null;
function bodyGeo() {
  if (_bodyGeo) return _bodyGeo;
  const pts = [[0, -0.66], [0.3, -0.64], [0.55, -0.5], [0.66, -0.25], [0.66, 0.02], [0.58, 0.25], [0.45, 0.42], [0.28, 0.53], [0.0, 0.58]];
  const curve = new T.CatmullRomCurve3(pts.map(([r, y]) => new T.Vector3(r, y, 0)));
  const prof = curve.getPoints(40).map((v) => new T.Vector2(Math.max(0, v.x), v.y));
  _bodyGeo = new T.LatheGeometry(prof, 36);
  return _bodyGeo;
}
const capsuleCache = new Map();
function capsule(r, len) { const k = r + ':' + len; if (!capsuleCache.has(k)) capsuleCache.set(k, new T.CapsuleGeometry(r, len, 8, 18)); return capsuleCache.get(k); }
const lerp = (a, b, k) => a + (b - a) * k;
const MOODS = ['smile', 'blink', 'happy', 'surprised', 'focus', 'hurt', 'talk'];

const matCache = new Map();
/** Зөөлөн, гөлгөр материал (toon биш) */
export function soft(color, { glow = 0.3 } = {}) {
  const k = color + '|' + glow;
  // Сүүдэр тал нь хэт бараантахгүй — өөрийн өнгөөр бага зэрэг гэрэлтэнэ (pastel харагдац)
  if (!matCache.has(k)) matCache.set(k, new T.MeshStandardMaterial({ color: new T.Color(color), roughness: 0.95, metalness: 0, emissive: new T.Color(color), emissiveIntensity: glow }));
  return matCache.get(k);
}

function part(geo, mat, parent, x, y, z, sx = 1, sy = sx, sz = sx) {
  const m = new T.Mesh(geo, mat);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz);
  m.castShadow = true; m.receiveShadow = false;
  parent.add(m);
  return m;
}

/** Mascot-ын нүүр: цэгэн нүд, жижиг ам, ягаан хацар. */
export function mascotFace(mood = 'smile', { skin = '#fff3e0' } = {}) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 256, 256);
  x.lineCap = 'round'; x.lineJoin = 'round';
  const ink = '#2b2320';
  const EY = 126, EX = [96, 160];
  // Хөмсөг (зөвхөн зарим илэрхийлэлд)
  if (mood === 'focus' || mood === 'hurt' || mood === 'surprised') {
    x.strokeStyle = ink; x.lineWidth = 5;
    EX.forEach((ex, i) => { const s = i ? 1 : -1; x.beginPath();
      if (mood === 'focus') { x.moveTo(ex - 14, 100 + s * -5); x.lineTo(ex + 14, 100 + s * 5); }
      else if (mood === 'hurt') { x.moveTo(ex - 14, 102 + s * 5); x.lineTo(ex + 14, 102 + s * -5); }
      else { x.moveTo(ex - 13, 96); x.quadraticCurveTo(ex, 88, ex + 13, 96); }
      x.stroke(); });
  }
  // Нүд
  x.fillStyle = ink; x.strokeStyle = ink;
  for (const ex of EX) {
    if (mood === 'blink') { x.lineWidth = 6; x.beginPath(); x.moveTo(ex - 10, EY); x.quadraticCurveTo(ex, EY + 7, ex + 10, EY); x.stroke(); }
    else if (mood === 'happy') { x.lineWidth = 6; x.beginPath(); x.moveTo(ex - 11, EY + 4); x.quadraticCurveTo(ex, EY - 12, ex + 11, EY + 4); x.stroke(); }
    else if (mood === 'hurt') { x.lineWidth = 6; x.beginPath(); x.moveTo(ex - 9, EY - 9); x.lineTo(ex + 9, EY + 9); x.moveTo(ex + 9, EY - 9); x.lineTo(ex - 9, EY + 9); x.stroke(); }
    else {
      const r = mood === 'surprised' ? 14 : 11.5;
      x.beginPath(); x.ellipse(ex, EY, r * 0.85, r * (mood === 'focus' ? 0.8 : 1.15), 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(ex + 3, EY - 4, 3, 0, Math.PI * 2); x.fill(); x.fillStyle = ink;
    }
  }
  // Ам — жижигхэн
  x.strokeStyle = '#5a2a28'; x.lineWidth = 4;
  x.beginPath();
  if (mood === 'happy' || mood === 'talk') { x.fillStyle = '#5a2a28'; x.moveTo(116, 152); x.quadraticCurveTo(128, 170, 140, 152); x.closePath(); x.fill(); }
  else if (mood === 'surprised') { x.fillStyle = '#5a2a28'; x.ellipse(128, 156, 6, 8, 0, 0, Math.PI * 2); x.fill(); }
  else if (mood === 'focus') { x.moveTo(120, 154); x.lineTo(136, 154); x.stroke(); }
  else if (mood === 'hurt') { x.moveTo(118, 160); x.quadraticCurveTo(128, 150, 138, 160); x.stroke(); }
  else { x.moveTo(120, 152); x.quadraticCurveTo(128, 158, 136, 152); x.stroke(); }
  // Хацар
  x.fillStyle = mood === 'happy' ? 'rgba(255,120,130,.55)' : 'rgba(255,130,140,.42)';
  x.beginPath(); x.ellipse(70, 146, 15, 9, 0, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.ellipse(186, 146, 15, 9, 0, 0, Math.PI * 2); x.fill();
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}

// ---------- Дүрийн төрлүүд ----------
export const MASCOTS = {
  tomato: { name: 'Улаан лооль', emoji: '🍅', body: 0xf0483d, head: 0xf0483d, limb: 0xd93a30 },
  pumpkin: { name: 'Хулуу', emoji: '🎃', body: 0xf5922e, head: 0xf5922e, limb: 0xe07f1c },
  peach: { name: 'Тоор', emoji: '🍑', body: 0xf7a8b8, head: 0xf7a8b8, limb: 0xf0a0b0 },
  mushroom: { name: 'Мөөг', emoji: '🍄', body: 0xfff3e0, head: 0xfff3e0, cap: 0xe83a3a, dots: true },
  shiitake: { name: 'Хар мөөг', emoji: '🟤', body: 0xfff3e0, head: 0xfff3e0, cap: 0x5a3a2a, dots: false },
  apple: { name: 'Алим', emoji: '🍎', body: 0xf0464f, head: 0xf0464f, limb: 0xd83540 },
  orange: { name: 'Жүрж', emoji: '🍊', body: 0xffa030, head: 0xffa030, limb: 0xf08d1e },
  grape: { name: 'Усан үзэм', emoji: '🍇', body: 0x9a6bd8, head: 0x9a6bd8, limb: 0x875bc4 },
  carrot: { name: 'Лууван', emoji: '🥕', body: 0xff8a3c, head: 0xff8a3c, limb: 0xee7a2c },
  mango: { name: 'Манго', emoji: '🥭', body: 0xffc23c, head: 0xffc23c, limb: 0xf0b02a },
  broccoli: { name: 'Брокколи', emoji: '🥦', body: 0xa4d65e, head: 0x5fbb5a, limb: 0x93c94f },
};
/** FRUITS индекс → mascot төрөл */
export const FRUIT_TO_MASCOT = ['apple', 'orange', 'grape', 'mango', 'carrot', 'tomato', 'broccoli', 'pumpkin'];
export const DEFAULT_MASCOT = 'tomato';

export class Mascot {
  constructor({ kind = DEFAULT_MASCOT, scale = 1 } = {}) {
    const def = MASCOTS[kind] || MASCOTS[DEFAULT_MASCOT];
    this.kind = kind; this.def = def;
    const root = new T.Group(); root.name = 'Mascot_' + kind; this.root = root;
    this.scale = scale; root.scale.setScalar(scale);
    const bodyM = soft(def.body), headM = soft(def.head);
    const leaf = soft(0x5fbb5a), leafD = soft(0x3f8f45), stem = soft(0x7a5a3a), cream = soft(0xfff3e0);

    // ---- Бие: R6 шиг тус бүр НЭГ бүхэл хэсэг, гэхдээ зөөлөн дугуй хэлбэртэй ----
    //   их бие = нэг лийр (lathe), гар = нэг капсул, хөл = нэг капсул, толгой = нэг жимс
    const roll = new T.Group(); roll.position.y = 1.15; root.add(roll); this.rollPivot = roll;   // эргэлтийн төв
    const body = new T.Group(); body.position.y = -1.15; roll.add(body); this.body = body;      // газраас
    const torso = new T.Group(); torso.position.y = 0.98; body.add(torso); this.torso = torso;  // их биеийн төв
    const limbM = soft(def.limb ?? def.body);
    part(bodyGeo(), bodyM, torso, 0, 0, 0, 1.1, 1, 1.0);
    // ---- Хөл: богино, бүдүүн капсул (ташаанаас доош) ----
    this.legs = [];
    for (const s of [-1, 1]) {
      const hip = new T.Group(); hip.position.set(s * 0.27, -0.5, 0); torso.add(hip);
      part(capsule(0.21, 0.18), limbM, hip, 0, -0.2, 0.02);
      this.legs.push({ hip, s });
    }
    // ---- Гар: жижиг хиам капсул (мөрнөөс) ----
    this.arms = [];
    for (const s of [-1, 1]) {
      const sh = new T.Group(); sh.position.set(s * 0.56, 0.16, 0.06); torso.add(sh);
      part(capsule(0.13, 0.3), limbM, sh, 0, -0.24, 0);
      sh.rotation.z = s * 0.5;
      this.arms.push({ sh, s, base: s * 0.5 });
    }
    // ---- Толгой ----
    const neck = new T.Group(); neck.position.y = 0.55; torso.add(neck); this.neck = neck;
    const head = new T.Group(); head.position.y = 0.42; neck.add(head); this.head = head;
    this.buildHead(kind, def, head, { headM, leaf, leafD, stem, cream });

    // Нүүр
    this.faces = {}; for (const m of MOODS) this.faces[m] = mascotFace(m);
    const faceMat = new T.MeshBasicMaterial({ map: this.faces.smile, transparent: true, depthWrite: false, toneMapped: false });
    const fr = this.faceRadius;
    const face = new T.Mesh(new T.SphereGeometry(fr + 0.012, 32, 20, Math.PI * 0.12, Math.PI * 0.76, Math.PI * 0.33, Math.PI * 0.42), faceMat);
    face.position.copy(this.faceCenter); face.userData.noOutline = true; face.castShadow = false;
    head.add(face); this.faceMat = faceMat;

    // Сүүдэр диск
    const shadow = new T.Mesh(new T.CircleGeometry(0.62, 24), new T.MeshBasicMaterial({ color: 0x0f2a1c, transparent: true, opacity: 0.22, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.03; root.add(shadow); this.shadow = shadow;

    // Төлөв
    this.state = 'idle'; this.time = 0;
    this.blinkT = 2 + Math.random() * 3; this.blinking = 0;
    this.speedNorm = 0; this.lean = 0; this.landT = 0; this.cheerT = 0;
    this.actionT = 0; this.action = null; this.actionDur = 0;
    this.idleT = 0; this.mood = 'smile'; this.moodHold = 0;
    this.flipT = 0; this.rollT = 0; this.rollDur = 0.45;
    this.footPhase = 0; this.onStep = null; this._lastStepSide = 0; this._prevSpeed = 0;
    this.headYaw = 0; this.headPitchLook = 0; this.headYawIdle = 0;
    this.wobble = 0; this.wobbleV = 0;
  }

  buildHead(kind, def, head, m) {
    const { headM, leaf, leafD, stem, cream } = m;
    const R = 0.72;
    this.faceRadius = R; this.faceCenter = new T.Vector3(0, 0.1, 0);
    const leafAt = (x, y, z, rz = 0, sx = 0.26) => { const l = part(sphereGeo, leaf, head, x, y, z, sx, 0.05, sx * 0.55); l.rotation.z = rz; return l; };
    switch (kind) {
      case 'mushroom': case 'shiitake': {
        this.hatY = 1.18;
        part(sphereGeo, cream, head, 0, 0.05, 0, 0.66, 0.62, 0.62);
        this.faceRadius = 0.66; this.faceCenter.set(0, 0.05, 0);
        part(sphereGeo, soft(def.cap), head, 0, 0.5, 0, 0.98, 0.56, 0.98);      // малгай — нэг хавтгай бөмбөрцөг
        if (def.dots) { const dot = soft(0xfff6e8); for (let i = 0; i < 8; i++) { const a = i * 2.4, r = 0.35 + (i % 3) * 0.2; part(sphereGeo, dot, head, Math.sin(a) * r, 0.68 + Math.cos(i) * 0.1 - r * 0.15, Math.cos(a) * r, 0.1 + (i % 2) * 0.04, 0.04, 0.1 + (i % 2) * 0.04); } }
        break;
      }
      case 'pumpkin': {
        part(sphereGeo, headM, head, 0, 0.06, 0, R * 1.08, R * 0.9, R * 1.08);
        part(new T.CylinderGeometry(0.07, 0.11, 0.35, 8), stem, head, 0.04, 0.78, 0).rotation.z = 0.25;
        leafAt(0.3, 0.76, 0.05, -0.3);
        break;
      }
      case 'peach': {
        part(sphereGeo, headM, head, 0, 0.1, 0, R, R * 1.02, R);
        // Навчин зах (хүзүү) — зургийн дагуу
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const l = part(sphereGeo, leaf, head, Math.sin(a) * 0.5, -0.55, Math.cos(a) * 0.5, 0.24, 0.05, 0.13); l.rotation.y = a; l.rotation.x = 0.35; }
        break;
      }
      case 'tomato': {
        part(sphereGeo, headM, head, 0, 0.08, 0, R * 1.02, R * 0.94, R * 1.02);
        for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const l = part(sphereGeo, leafD, head, Math.sin(a) * 0.3, 0.73, Math.cos(a) * 0.3, 0.3, 0.05, 0.11); l.rotation.y = a; l.rotation.x = -0.35; }
        part(new T.CylinderGeometry(0.05, 0.06, 0.22, 8), leafD, head, 0, 0.82, 0);
        break;
      }
      case 'apple': {
        part(sphereGeo, headM, head, 0, 0.08, 0, R, R * 0.94, R);
        part(new T.CylinderGeometry(0.04, 0.05, 0.3, 8), stem, head, 0, 0.82, 0).rotation.z = 0.15;
        leafAt(0.2, 0.86, 0, 0.3);
        break;
      }
      case 'orange': {
        part(sphereGeo, headM, head, 0, 0.1, 0, R);
        part(sphereGeo, soft(0xe07a18), head, 0, 0.8, 0, 0.07, 0.05, 0.07);
        leafAt(0.14, 0.82, 0, -0.3);
        break;
      }
      case 'grape': {
        part(sphereGeo, headM, head, 0, 0.1, 0, R);
        leafAt(0.1, 0.8, 0.05, 0, 0.3);
        break;
      }
      case 'carrot': {
        this.hatY = 1.55;
        part(sphereGeo, headM, head, 0, 0.1, 0, R * 0.95, R * 1.05, R * 0.95);
        part(new T.ConeGeometry(0.5, 1.0, 16), headM, head, 0, 0.95, 0);
        for (let i = 0; i < 4; i++) { const l = part(sphereGeo, leaf, head, (i - 1.5) * 0.12, 1.5, 0, 0.1, 0.32, 0.06); l.rotation.z = (i - 1.5) * 0.35; }
        break;
      }
      case 'broccoli': {
        part(sphereGeo, headM, head, 0, 0.1, 0, R * 0.96, R * 0.94, R * 0.96);
        // Цэцэгс: толгойн дээд/ар талд бөөгнөрсөн бөмбөлгүүд (үс шиг)
        const fl = soft(0x3f9e4a);
        for (let i = 0; i < 14; i++) { const a = i * 2.4, e = 0.35 + (i % 3) * 0.25; part(sphereGeo, fl, head, Math.sin(a) * Math.cos(e) * R * 0.75, 0.1 + Math.sin(e) * R * 0.8, Math.cos(a) * Math.cos(e) * R * 0.75 - (Math.cos(a) > 0 ? 0.25 : 0), 0.26 + (i % 2) * 0.06); }
        this.hatY = 1.05;
        break;
      }
      case 'mango': {
        part(sphereGeo, headM, head, 0, 0.1, 0, R * 0.92, R * 1.08, R * 0.9).rotation.z = 0.15;
        leafAt(-0.15, 0.85, 0, 0.5, 0.3);
        break;
      }
      default: part(sphereGeo, headM, head, 0, 0.1, 0, R);
    }
  }

  setMood(m, hold = 0) { this.mood = m; this.moodHold = hold; }
  /** Update дуудагдахгүй статик дүрд нүүр/гар шууд тохируулна */
  pose(mood = 'smile', { armsUp = false } = {}) {
    this.faceMat.map = this.faces[mood] || this.faces.smile;
    for (const a of this.arms) { a.sh.rotation.x = armsUp ? -2.3 : 0; a.sh.rotation.z = armsUp ? a.s * 0.55 : a.base; }
  }
  cheer() { this.cheerT = 1.6; this.setMood('happy', 1.6); }
  play(action, dur = 0.7) { this.action = action; this.actionT = dur; this.actionDur = dur; const md = { wave: 'talk', hurt: 'hurt', pick: 'focus', dance: 'happy', throw: 'focus', lift: 'happy' }[action]; if (md) this.setMood(md, dur); }
  flip() { this.flipT = 0.55; this.setMood('surprised', 0.55); }
  roll(dur = 0.45) { this.rollT = dur; this.rollDur = dur; this.setMood('focus', dur); }
  /** Буудалтын ухралт (aim төлөвд гар хойш цохигдоно) */
  recoil(t = 0.14) { this.recoilT = t; }
  /** Үсрэлт эхлэх: сунах (stretch) */
  jumpStart() { this.jumpT = 0.18; }
  /** Буулт: хүчээр хавчих (0..1) + сэргэлт */
  land(force = 0.5) { this.landT = 0.22 + force * 0.12; this.landF = Math.min(1, force); }
  /** Гулсах (тоормослох) */
  skid(dur = 0.22) { this.skidT = dur; }
  get busy() { return this.actionT > 0; }

  update(dt, p) {
    this.time += dt;
    const prev = this.state; this.state = p.state;
    const air = (s) => s === 'jump' || s === 'fall';
    if (air(prev) && !air(p.state) && p.state !== 'swim') this.landT = 0.22;
    this.landT = Math.max(0, this.landT - dt); this.jumpT = Math.max(0, (this.jumpT || 0) - dt); this.skidT = Math.max(0, (this.skidT || 0) - dt);
    // Эргэлтийн хурд (банк): heading-ийн өөрчлөлт
    const turn = p.turn || 0; this.turnV = lerp(this.turnV || 0, turn, Math.min(1, dt * 8));
    this.cheerT = Math.max(0, this.cheerT - dt);
    this.actionT = Math.max(0, this.actionT - dt); if (this.actionT === 0) this.action = null;
    this.flipT = Math.max(0, this.flipT - dt);
    this.rollT = Math.max(0, this.rollT - dt);
    this.moodHold = Math.max(0, this.moodHold - dt);
    if (this.state === 'idle') this.idleT += dt; else this.idleT = 0;

    // Нүүр
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blinking = 0.12; this.blinkT = 2.5 + Math.random() * 4; }
    if (this.blinking > 0) this.blinking -= dt;
    let mood = this.moodHold > 0 ? this.mood : (this.cheerT > 0 ? 'happy' : this.state === 'run' ? 'focus' : this.state === 'jump' ? 'surprised' : (this.state === 'swim' || this.state === 'slide') ? 'focus' : 'smile');
    if (this.blinking > 0 && !['happy', 'hurt', 'surprised'].includes(mood)) mood = 'blink';
    const tex = this.faces[mood] || this.faces.smile;
    if (this.faceMat.map !== tex) this.faceMat.map = tex;

    const target = Math.min(1, p.speed);
    this.speedNorm += (target - this.speedNorm) * Math.min(1, dt * 10);
    this.lean += ((p.lean || 0) - this.lean) * Math.min(1, dt * 8);
    const accel = (target - this._prevSpeed) / Math.max(dt, 0.001); this._prevSpeed = target;
    const s = this.speedNorm, t = this.time;
    const gait = s > 0.6 ? 13 : 9.5;
    this.footPhase += dt * gait * Math.max(0.15, s);
    const ph = this.footPhase;
    const k8 = Math.min(1, dt * 8), k12 = Math.min(1, dt * 12);

    const stepSide = Math.sin(ph) > 0 ? 1 : -1;
    if (this.state === 'walk' || this.state === 'run') {
      if (stepSide !== this._lastStepSide && this.onStep && s > 0.2) this.onStep(stepSide);
      this._lastStepSide = stepSide;
    }

    let bodyY = 0, torsoPitch = 0, torsoRoll = 0, headPitch = 0, headRoll = 0, rollX = 0, squash = 0;
    const setLegs = (fn) => { for (const l of this.legs) fn(l); };
    const setArms = (fn) => { for (const a of this.arms) fn(a); };
    const easeLegs = (rx, k = k12) => setLegs((l) => { l.hip.rotation.x = lerp(l.hip.rotation.x, rx(l), k); });
    const easeArms = (rx, rz, k = k12) => setArms((a) => { a.sh.rotation.x = lerp(a.sh.rotation.x, rx(a), k); a.sh.rotation.z = lerp(a.sh.rotation.z, rz(a), k); });

    switch (this.state) {
      case 'walk': case 'run': {
        const amp = 0.6 + s * 0.7, run = s > 0.6;
        if (p.carry) {
          // Өргөж явах: хоёр гар дээш, толгой дээрх ачааг тэнцвэржүүлэн, намуухан алхаа
          setLegs((l) => { l.hip.rotation.x = Math.sin(ph + (l.s > 0 ? 0 : Math.PI)) * amp * 0.7; });
          setArms((a) => { a.sh.rotation.x = -2.9 + Math.sin(ph * 0.5) * 0.05; a.sh.rotation.z = a.s * 0.25; });
          bodyY = Math.abs(Math.cos(ph)) * 0.03; torsoPitch = -0.05; torsoRoll = Math.sin(ph) * 0.04 - this.turnV * 0.15; headPitch = -0.1;
          break;
        }
        setLegs((l) => { l.hip.rotation.x = Math.sin(ph + (l.s > 0 ? 0 : Math.PI)) * amp; });
        setArms((a) => { const v = Math.sin(ph + (a.s > 0 ? Math.PI : 0)); a.sh.rotation.x = v * amp * (run ? 0.95 : 0.7) - (run ? 0.35 : 0); a.sh.rotation.z = a.base + (run ? -a.s * 0.35 : 0); });
        bodyY = Math.abs(Math.cos(ph)) * (0.04 + s * 0.1);
        torsoPitch = 0.05 + s * 0.28;
        torsoRoll = Math.sin(ph) * (0.08 + s * 0.05) - this.turnV * (0.25 + s * 0.2);   // дэгжин алхаа + эргэлтэд банк
        headRoll = -Math.sin(ph) * 0.06 + this.turnV * 0.1;
        headPitch = -0.04 - s * 0.08 + Math.cos(ph * 2) * 0.03 * s;                    // толгой алхаа бүрд бага зэрэг хоцорно
        squash = -Math.abs(Math.cos(ph)) * 0.025 * s + Math.sin(ph * 2) * 0.01 * s;
        if (this.skidT > 0) { const k = this.skidT / 0.22; torsoPitch = -0.35 * k; setLegs((l) => { l.hip.rotation.x = 0.7 * k * (l.s > 0 ? 1 : 0.6); }); setArms((a) => { a.sh.rotation.x = -1.2 * k; a.sh.rotation.z = a.base + a.s * 0.5 * k; }); bodyY -= 0.08 * k; headPitch = 0.2 * k; }
        break;
      }
      case 'jump': case 'fall': {
        const up = this.state === 'jump';
        if (p.carry) { easeLegs((l) => up ? -0.4 : 0.25); easeArms(() => -2.9, (a) => a.s * 0.25); torsoPitch = -0.05; squash = up ? 0.05 : -0.02; break; }
        easeLegs((l) => up ? -0.6 + l.s * 0.15 : 0.35, Math.min(1, dt * 14));
        easeArms(() => up ? -2.7 : -1.4, (a) => a.base * (up ? 0.5 : 0.9), Math.min(1, dt * 12));
        torsoPitch = up ? -0.12 : 0.2; headPitch = up ? -0.25 : 0.15; torsoRoll = -this.turnV * 0.2;
        squash = (up ? 0.1 : -0.04) + (this.jumpT > 0 ? Math.sin(this.jumpT / 0.18 * Math.PI) * 0.16 : 0);   // takeoff stretch
        break;
      }
      case 'swim': {
        const sw = t * 7;
        setArms((a) => { a.sh.rotation.x = -1.4 + Math.sin(sw + (a.s > 0 ? 0 : Math.PI)) * 1.2; a.sh.rotation.z = a.base * 0.9; });
        setLegs((l) => { l.hip.rotation.x = Math.sin(sw * 1.4 + (l.s > 0 ? 0 : Math.PI)) * 0.5; });
        torsoPitch = 1.15 - s * 0.1; headPitch = -0.95; bodyY = -0.62 + Math.sin(t * 3) * 0.04;
        break;
      }
      case 'slide': {
        setLegs((l) => { l.hip.rotation.x = -1.2; }); setArms((a) => { a.sh.rotation.x = -2.6; a.sh.rotation.z = a.base * 0.5; });
        torsoPitch = 1.2; headPitch = -0.8; bodyY = -0.5;
        break;
      }
      case 'hang': {
        setLegs((l) => { l.hip.rotation.x = Math.sin(t * 5 + l.s) * 0.3; }); setArms((a) => { a.sh.rotation.x = -Math.PI + 0.1; a.sh.rotation.z = a.base * 0.2; });
        torsoPitch = 0.1 + Math.sin(t * 5) * 0.05; headPitch = -0.2;
        break;
      }
      case 'sit': {
        setLegs((l) => { l.hip.rotation.x = -1.3; }); setArms((a) => { a.sh.rotation.x = -1.0 + (p.lean || 0) * a.s * 0.3; a.sh.rotation.z = a.base * 0.5; });
        torsoPitch = 0.05;
        break;
      }
      case 'aim': {
        // Цацуур/буу барьж чиглүүлэх: хоёр гар урагш, баруун гар зэвсэгтэй; recoil-д хойш цохигдоно
        this.recoilT = Math.max(0, (this.recoilT || 0) - dt);
        const rc = this.recoilT > 0 ? Math.sin(this.recoilT / 0.14 * Math.PI) : 0;
        const bob = this.speedNorm > 0.1 ? Math.sin(ph) * 0.05 : Math.sin(t * 2) * 0.02;
        setArms((a) => { a.sh.rotation.x = lerp(a.sh.rotation.x, (a.s > 0 ? -1.5 : -1.25) + rc * 0.45 + bob, k12); a.sh.rotation.z = lerp(a.sh.rotation.z, a.s > 0 ? 0.05 : 0.35, k12); });
        if (this.speedNorm > 0.1) { setLegs((l) => { l.hip.rotation.x = Math.sin(ph + (l.s > 0 ? 0 : Math.PI)) * (0.5 + this.speedNorm * 0.5); }); bodyY = Math.abs(Math.cos(ph)) * 0.05; }
        else easeLegs(() => 0, k8);
        torsoPitch = 0.12 + rc * -0.08; headPitch = -0.05; squash = rc * 0.02;
        break;
      }
      case 'carried': {
        // Тоглогчийн толгой дээр өргөгдсөн: хөл савчина, гар дэлгэнэ; p.joy > 0 бол баярлаж гараа өргөнө
        const joy = Math.min(1, p.joy || 0), f = t * (joy ? 7 : 11);
        setLegs((l) => { l.hip.rotation.x = Math.sin(f + (l.s > 0 ? 0 : Math.PI)) * (0.9 - joy * 0.5); });
        setArms((a) => { a.sh.rotation.x = lerp(-0.6 + Math.sin(f * 0.8 + a.s) * 0.4, -Math.PI + 0.25 + Math.sin(f + a.s) * 0.2, joy); a.sh.rotation.z = lerp(a.s * 1.4, a.base * 0.5, joy); });
        torsoPitch = -0.12 + Math.sin(f * 0.5) * 0.05 * (1 - joy); torsoRoll = Math.sin(f * 0.6) * 0.12 * (1 - joy);
        headPitch = -0.15; headRoll = Math.sin(f * 0.5) * 0.08;
        squash = Math.sin(f) * 0.02;
        break;
      }
      default: {
        const iv = this.idleT > 6 ? (Math.floor(this.idleT / 6) % 3) + 1 : 0;
        const ph2 = (this.idleT % 6) / 6;
        easeLegs(() => 0, k8);
        if (iv === 2) { const st = Math.sin(ph2 * Math.PI); easeArms(() => -2.6 * st, (a) => a.base * (1 - st * 0.6), k8); bodyY = st * 0.05; headPitch = -0.2 * st; squash = st * 0.05; }
        else { easeArms((a) => Math.sin(t * 2.2 + a.s) * 0.05, (a) => a.base + Math.sin(t * 2.2) * 0.03, k8); bodyY = Math.sin(t * 2.2) * 0.012; squash = Math.sin(t * 2.2) * 0.015; headPitch = Math.sin(t * 1.3) * 0.03; torsoRoll = Math.sin(t * 0.7) * 0.02; }
        if (p.carry) { setArms((a) => { a.sh.rotation.x = -2.9 + Math.sin(t * 2) * 0.04; a.sh.rotation.z = a.s * 0.25; }); headPitch = -0.1; }
        // Зогсоод эргэхэд хөл шаваасалж, бие банкална
        if (Math.abs(this.turnV) > 0.6) { const tp = t * 14; setLegs((l) => { l.hip.rotation.x = Math.sin(tp + (l.s > 0 ? 0 : Math.PI)) * 0.25; }); bodyY += Math.abs(Math.sin(tp)) * 0.02; torsoRoll -= this.turnV * 0.12; }
        this.headYawIdle = iv === 1 ? Math.sin(ph2 * Math.PI * 2) * 0.7 : 0;
        if (iv === 3) { bodyY += Math.max(0, Math.sin(t * 6)) * 0.03; headRoll = Math.sin(t * 6) * 0.06; }
      }
    }

    // ---- Нэг удаагийн үйлдэл ----
    if (this.action) {
      const q = 1 - this.actionT / this.actionDur, bell = Math.sin(q * Math.PI);
      if (this.action === 'pick') {
        // 2 фаз: бөхийж авах (0–0.55) → өргөж дээш (0.55–1) + жижиг үсрэлт
        const down = q < 0.55 ? Math.sin(q / 0.55 * Math.PI) : 0, up = q >= 0.55 ? Math.sin((q - 0.55) / 0.45 * Math.PI) : 0;
        torsoPitch = lerp(torsoPitch, 0.9, down) - up * 0.15; bodyY += -down * 0.2 + up * 0.12; headPitch = lerp(headPitch, 0.35, down) - up * 0.2;
        setLegs((l) => { l.hip.rotation.x = lerp(l.hip.rotation.x, -0.9 * down, 0.6); });
        setArms((a) => { a.sh.rotation.x = lerp(a.sh.rotation.x, -1.5 * down - 2.9 * up, 0.7); a.sh.rotation.z = lerp(a.sh.rotation.z, 0.1 * down + a.s * 0.3 * up, 0.7); });
        squash = -down * 0.06 + up * 0.05;
      } else if (this.action === 'throw') {
        // Wind-up (0–0.4: гар хойш, бие хойш) → snap (0.4–1: гар урагш, бие урагш, follow-through)
        const w = q < 0.4 ? Math.sin(q / 0.4 * Math.PI / 2) : 1, sn = q >= 0.4 ? Math.min(1, (q - 0.4) / 0.25) : 0, ft = q >= 0.65 ? (q - 0.65) / 0.35 : 0;
        setArms((a) => { a.sh.rotation.x = lerp(a.sh.rotation.x, -3.0 * w + 1.6 * sn * (1 - ft * 0.5), 0.8); a.sh.rotation.z = lerp(a.sh.rotation.z, a.s * 0.4, 0.5); });
        torsoPitch = -0.3 * w + 0.55 * sn - 0.2 * ft; headPitch = -0.15 * w + 0.25 * sn; bodyY += sn * 0.06;
        squash = 0.05 * w - 0.04 * sn;
      } else if (this.action === 'lift') {
        // Өргөж авсны дараа баярлан дээш тэлэх (богино)
        setArms((a) => { a.sh.rotation.x = -2.9; a.sh.rotation.z = a.s * 0.25; }); bodyY += bell * 0.1; squash = bell * 0.06;
      } else if (this.action === 'wave') {
        const a = this.arms[1]; const k = Math.min(1, q * 4) * (q > 0.85 ? (1 - q) / 0.15 : 1);
        a.sh.rotation.x = lerp(a.sh.rotation.x, -2.8, k); a.sh.rotation.z = lerp(a.sh.rotation.z, 0.7 + Math.sin(t * 16) * 0.4, k);
        headRoll += 0.1 * bell;
      } else if (this.action === 'dance') {
        const b = t * 9;
        torsoRoll = Math.sin(b) * 0.22; bodyY += Math.abs(Math.sin(b)) * 0.08; squash = Math.abs(Math.sin(b)) * 0.05;
        setArms((a) => { const up = Math.sin(b + (a.s > 0 ? 0 : Math.PI)); a.sh.rotation.x = -1.4 - up * 1.3; a.sh.rotation.z = a.base * 0.4 + a.s * up * 0.3; });
        setLegs((l) => { l.hip.rotation.x = Math.sin(b + (l.s > 0 ? 0 : Math.PI)) * 0.3; });
        headRoll = Math.sin(b) * 0.15; this.headYawIdle = Math.sin(b * 0.5) * 0.4;
      } else if (this.action === 'hurt') {
        torsoPitch = lerp(torsoPitch, -0.35, bell); bodyY -= bell * 0.08;
        setArms((a) => { a.sh.rotation.x = lerp(a.sh.rotation.x, -1.6, bell); a.sh.rotation.z = lerp(a.sh.rotation.z, a.s * 1.3, bell); });
        headPitch = lerp(headPitch, -0.35, bell);
      }
    }
    if (this.cheerT > 0) {
      const c = this.cheerT;
      setArms((a) => { a.sh.rotation.x = -Math.PI + 0.2 + Math.sin(t * 14 + a.s) * 0.25; a.sh.rotation.z = a.base * 0.6; });
      bodyY += Math.abs(Math.sin(c * 12)) * 0.25 * Math.min(1, c); headPitch = -0.15; squash = Math.abs(Math.sin(c * 12)) * 0.06;
    }
    if (this.flipT > 0) {
      const q = 1 - this.flipT / 0.55, e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
      rollX = e * Math.PI * 2;
      setLegs((l) => { l.hip.rotation.x = -1.4; }); setArms((a) => { a.sh.rotation.x = -0.9; a.sh.rotation.z = a.base * 0.3; });
      torsoPitch = 0.3;
    }
    if (this.rollT > 0) {
      rollX = (1 - this.rollT / this.rollDur) * Math.PI * 2; bodyY -= 0.2;
      setLegs((l) => { l.hip.rotation.x = -1.5; }); setArms((a) => { a.sh.rotation.x = -1.0; a.sh.rotation.z = a.base * 0.3; });
      torsoPitch = 0.4; headPitch = 0.4;
    }
    if (this.landT > 0) { const f = 0.6 + (this.landF ?? 0.5) * 0.8, q = Math.min(1, this.landT / 0.22); bodyY -= q * 0.12 * f; squash -= q * 0.14 * f; torsoPitch += q * 0.18 * f; setLegs((l) => { l.hip.rotation.x = lerp(l.hip.rotation.x, -0.5 * q * f, 0.5); }); if (!p.carry) setArms((a) => { a.sh.rotation.x = lerp(a.sh.rotation.x, -0.8 * q * f, 0.5); a.sh.rotation.z = lerp(a.sh.rotation.z, a.base + a.s * 0.5 * q * f, 0.5); }); }

    // Толгой харах
    let wantYaw = this.headYawIdle || 0, wantPitch = 0;
    if (p.lookAt && !this.action && this.state !== 'swim') {
      const local = this.root.worldToLocal(p.lookAt.clone());
      const yaw = Math.atan2(local.x, local.z);
      if (Math.abs(yaw) < 1.35) { wantYaw = T.MathUtils.clamp(yaw, -0.8, 0.8); wantPitch = T.MathUtils.clamp(-Math.atan2(local.y - 1.9, Math.hypot(local.x, local.z)), -0.3, 0.4); }
    }
    this.headYaw = lerp(this.headYaw, wantYaw, Math.min(1, dt * 5));
    this.headPitchLook = lerp(this.headPitchLook, wantPitch, Math.min(1, dt * 5));

    // Толгойн зөөлөн ганхалт (secondary): хурдлах/тоормослоход
    this.wobbleV += (-accel * 0.6 - this.wobble * 70 - this.wobbleV * 9) * dt;
    this.wobble += this.wobbleV * dt;

    // Apply
    this.body.position.y = -1.15 + bodyY;
    if (rollX === 0 && this.rollPivot.rotation.x > Math.PI * 1.9) this.rollPivot.rotation.x = 0;
    this.rollPivot.rotation.x = lerp(this.rollPivot.rotation.x, rollX, rollX === 0 ? Math.min(1, dt * 14) : 1);
    this.torso.rotation.x = lerp(this.torso.rotation.x, torsoPitch, k12);
    this.torso.rotation.z = lerp(this.torso.rotation.z, torsoRoll - this.lean * 0.3, Math.min(1, dt * 10));
    this.neck.rotation.x = lerp(this.neck.rotation.x, headPitch + this.headPitchLook + T.MathUtils.clamp(this.wobble, -0.3, 0.3), Math.min(1, dt * 10));
    this.head.rotation.z = headRoll + this.lean * 0.12;
    this.head.rotation.y = this.headYaw;
    // Аксессуарын хөдөлгөөн: далавч дэвэх, шаар хөвөх
    if (this.accTorso) for (const g of this.accTorso.children) {
      if (g.userData.wings) for (const w of g.children) w.rotation.y = w.userData.wing * (0.5 + Math.sin(t * 9) * 0.45);
      if (g.userData.balloon) { g.rotation.z = Math.sin(t * 1.3) * 0.12; g.rotation.x = Math.cos(t * 1.1) * 0.1; }
    }
    // Squash & stretch
    const st = squash + (this.state === 'jump' ? 0.06 : this.state === 'fall' ? -0.03 : 0);
    this.root.scale.set(this.scale * (1 - st * 0.7), this.scale * (1 + st), this.scale * (1 - st * 0.7));
    this.shadow.scale.setScalar(1 / (1 - st * 0.7));
  }
}

// ---------- Аксессуар (wardrobe) ----------
export { ACCESSORIES };

let _kTex = null;
function textTextureK() {
  if (_kTex) return _kTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#e81e39'; x.beginPath(); x.arc(64, 64, 62, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#fff'; x.font = '900 84px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('K', 64, 68);
  _kTex = new T.CanvasTexture(c); _kTex.colorSpace = T.SRGBColorSpace; return _kTex;
}
const acc = {
  cap(h, y, R) {
    const red = soft(0xe81e39), white = soft(0xfff6ee);
    part(sphereGeo, white, h, 0, y - 0.05, 0, R * 0.78, R * 0.5, R * 0.78);
    const brim = part(new T.CylinderGeometry(R * 0.7, R * 0.7, 0.06, 20, 1, false, 0, Math.PI), red, h, 0, y - 0.02, R * 0.15); brim.rotation.y = -Math.PI / 2; brim.scale.z = 1.4;
    const k = new T.Mesh(new T.CircleGeometry(0.17, 20), new T.MeshBasicMaterial({ map: textTextureK(), toneMapped: false })); k.position.set(0, y + 0.06, R * 0.62); k.rotation.x = -0.45; h.add(k);
    part(sphereGeo, red, h, 0, y + R * 0.45, 0, 0.06);
  },
  straw(h, y, R) {
    const m = soft(0xf2d27a);
    part(new T.CylinderGeometry(R * 1.35, R * 1.45, 0.06, 24), m, h, 0, y - 0.02, 0);
    part(new T.CylinderGeometry(R * 0.7, R * 0.78, 0.36, 20), m, h, 0, y + 0.16, 0);
    part(new T.CylinderGeometry(R * 0.79, R * 0.79, 0.1, 20), soft(0xe83a4a), h, 0, y + 0.06, 0);
  },
  crown(h, y, R, fc, color = 0xffd24d) {
    const g = soft(color);
    part(new T.CylinderGeometry(R * 0.6, R * 0.55, 0.28, 12), g, h, 0, y + 0.1, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; part(new T.ConeGeometry(0.09, 0.22, 6), g, h, Math.sin(a) * R * 0.58, y + 0.34, Math.cos(a) * R * 0.58); part(sphereGeo, soft([0xff4d6d, 0x4dd2ff, 0x7dff6f][i % 3]), h, Math.sin(a) * R * 0.6, y + 0.14, Math.cos(a) * R * 0.6, 0.05); }
  },
  goldcrown(h, y, R, fc) { acc.crown(h, y, R, fc, 0xffe066); const g = soft(0xfff3b0); for (let i = 0; i < 6; i++) { const a = (i + 0.5) / 6 * Math.PI * 2; part(sphereGeo, g, h, Math.sin(a) * R * 0.62, y + 0.22, Math.cos(a) * R * 0.62, 0.035); } },
  party(h, y, R) {
    const c = part(new T.ConeGeometry(0.27, 0.72, 16), soft(0x5cb8ff), h, 0, y + 0.32, 0);
    for (let i = 0; i < 3; i++) part(new T.TorusGeometry(0.26 - i * 0.075, 0.025, 6, 20), soft(0xfff05a), h, 0, y + 0.12 + i * 0.2, 0).rotation.x = Math.PI / 2;
    part(sphereGeo, soft(0xff6fb0), h, 0, y + 0.7, 0, 0.07);
    c.rotation.z = 0.12;
  },
  flower(h, y, R) {
    const p = soft(0xff8fc0);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; part(sphereGeo, p, h, R * 0.55 + Math.sin(a) * 0.14, y - 0.05 + Math.cos(a) * 0.14, R * 0.45, 0.09, 0.09, 0.04); }
    part(sphereGeo, soft(0xfff05a), h, R * 0.55, y - 0.05, R * 0.47, 0.06);
  },
  headphones(h, y, R) {
    const d = soft(0x2a2f3a), c = soft(0xff5a7a);
    part(new T.TorusGeometry(R * 0.98, 0.05, 8, 24, Math.PI), d, h, 0, 0.1, 0);
    for (const s of [-1, 1]) { part(new T.CylinderGeometry(0.2, 0.2, 0.12, 16), c, h, s * R * 1.0, 0.1, 0).rotation.z = Math.PI / 2; }
  },
  sun(h, y, R, fc) {
    const d = new T.MeshStandardMaterial({ color: 0x1c2330, roughness: 0.25, metalness: 0.1 }), frame = soft(0xffd24d);
    for (const s of [-1, 1]) {
      const lens = part(new T.CylinderGeometry(0.17, 0.17, 0.05, 20), d, h, fc.x + s * 0.24, fc.y + 0.05, fc.z + R * 0.98); lens.rotation.x = Math.PI / 2; lens.scale.x = 1.15;
      part(new T.TorusGeometry(0.17, 0.02, 6, 20), frame, h, fc.x + s * 0.24, fc.y + 0.05, fc.z + R * 0.99).scale.x = 1.15;
    }
    part(new T.BoxGeometry(0.1, 0.03, 0.03), frame, h, fc.x, fc.y + 0.06, fc.z + R * 0.99);
  },
  round(h, y, R, fc) {
    const g = soft(0x6a4a2a);
    for (const s of [-1, 1]) part(new T.TorusGeometry(0.15, 0.025, 6, 20), g, h, fc.x + s * 0.24, fc.y + 0.05, fc.z + R * 0.98);
    part(new T.BoxGeometry(0.16, 0.03, 0.03), g, h, fc.x, fc.y + 0.06, fc.z + R * 0.98);
  },
  scarf(t) {
    const r = soft(0xe83a4a);
    part(new T.TorusGeometry(0.5, 0.13, 8, 24), r, t, 0, 0.5, 0).rotation.x = Math.PI / 2;
    part(new T.BoxGeometry(0.2, 0.55, 0.08), r, t, 0.25, 0.22, 0.42).rotation.z = 0.2;
  },
  wings(t) {
    const m = new T.MeshStandardMaterial({ color: 0xbfe9ff, emissive: 0x88c8ff, emissiveIntensity: 0.35, transparent: true, opacity: 0.85, side: T.DoubleSide, roughness: 0.6 });
    const g = new T.Group(); g.position.set(0, 0.25, -0.5); t.add(g);
    for (const s of [-1, 1]) { const w = new T.Mesh(new T.CircleGeometry(0.5, 20), m); w.scale.set(1, 1.6, 1); w.position.set(s * 0.45, 0.2, 0); w.rotation.y = s * 0.5; w.userData.wing = s; g.add(w); const w2 = new T.Mesh(new T.CircleGeometry(0.3, 16), m); w2.position.set(s * 0.35, -0.35, 0); w2.rotation.y = s * 0.5; w2.userData.wing = s; g.add(w2); }
    g.userData.wings = true;
  },
  balloon(t) {
    const g = new T.Group(); g.position.set(0.55, 0.5, -0.2); t.add(g);
    part(new T.CylinderGeometry(0.01, 0.01, 1.6, 4), soft(0xffffff), g, 0, 0.8, 0);
    part(sphereGeo, soft(0xff4d6d), g, 0, 1.85, 0, 0.32, 0.38, 0.32);
    part(new T.ConeGeometry(0.05, 0.08, 6), soft(0xff4d6d), g, 0, 1.45, 0).rotation.x = Math.PI;
    g.userData.balloon = true;
  },
  bag(t) {
    const b = soft(0x5cb8ff), d = soft(0x3a86c8);
    part(new T.BoxGeometry(0.5, 0.5, 0.22), b, t, 0, 0.1, -0.62);
    part(new T.BoxGeometry(0.52, 0.16, 0.24), d, t, 0, 0.3, -0.62);
    for (const s of [-1, 1]) part(new T.BoxGeometry(0.07, 0.6, 0.06), d, t, s * 0.28, 0.2, -0.45).rotation.x = 0.3;
  },
};

/** Аксессуар өмсгөх: equipped = { hat, glasses, extra } */
Mascot.prototype.wear = function (equipped = {}) {
  if (this.accGroup) this.accGroup.removeFromParent();
  if (this.accTorso) this.accTorso.removeFromParent();
  this.accGroup = new T.Group(); this.head.add(this.accGroup);
  this.accTorso = new T.Group(); this.torso.add(this.accTorso);
  const R = this.faceRadius, fc = this.faceCenter;
  const hatY = this.hatY ?? (fc.y + R * 0.95);
  for (const key of Object.values(equipped)) {
    const fn = acc[key]; if (!fn) continue;
    const slot = ACCESSORIES[key].slot;
    if (slot === 'hat' || slot === 'glasses') fn(this.accGroup, hatY, R, fc); else fn(this.accTorso);
  }
  this.equipped = { ...equipped };
};

/** Хөөрхөн жимсэн бөмбөг: нэг бөмбөрцөг + нүүр + навч (өнхөрдөг саад, хөшөө) */
export function cuteFruitBall(kind = 'orange', mood = 'surprised', r = 0.65) {
  const def = MASCOTS[kind] || MASCOTS.orange;
  const g = new T.Group();
  part(sphereGeo, soft(def.head), g, 0, 0, 0, r);
  const face = new T.Mesh(new T.SphereGeometry(r + 0.012, 32, 20, Math.PI * 0.12, Math.PI * 0.76, Math.PI * 0.33, Math.PI * 0.42), new T.MeshBasicMaterial({ map: mascotFace(mood), transparent: true, depthWrite: false, toneMapped: false }));
  face.castShadow = false; g.add(face);
  part(sphereGeo, soft(0x5fbb5a), g, 0.15, r * 1.02, 0, 0.3, 0.06, 0.16).rotation.z = 0.3;
  part(new T.CylinderGeometry(0.03, 0.04, 0.2, 6), soft(0x7a5a3a), g, 0, r * 1.05, 0);
  return g;
}
