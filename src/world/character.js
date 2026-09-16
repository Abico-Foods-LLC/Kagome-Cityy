// Chibi костюмтай аялагч: хоёр горимд хоёуланд нь ашиглагдана.
// Procedural animation state machine:
//   idle / walk / run / jump / fall / flip / roll / swim / slide / hang / sit
//   + нэг удаагийн үйлдэл (pick, wave, cheer) + нүүрний илэрхийлэл + хоёрдогч хөдөлгөөн (зангиа, цүнх, үс)
import * as T from 'three';
import { toon, PALETTE, outlineGroup } from '../gfx/materials.js';
import { faceTexture } from '../gfx/textures.js';

const sphereGeo = new T.SphereGeometry(1, 20, 14);
const boxGeo = new T.BoxGeometry(1, 1, 1);
const cylGeo = new T.CylinderGeometry(1, 1, 1, 12);
const capsuleCache = new Map();
function capsule(r, len) {
  const k = r + ':' + len;
  if (!capsuleCache.has(k)) capsuleCache.set(k, new T.CapsuleGeometry(r, len, 6, 14));
  return capsuleCache.get(k);
}

function part(geo, mat, parent, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new T.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true; m.receiveShadow = false;
  parent.add(m);
  return m;
}
const lerp = (a, b, k) => a + (b - a) * k;
const MOODS = ['smile', 'blink', 'happy', 'surprised', 'focus', 'hurt', 'talk'];

export class Character {
  constructor({ outline = true, scale = 1 } = {}) {
    const root = new T.Group();
    root.name = 'Traveler';
    this.root = root;
    this.scale = scale;
    root.scale.setScalar(scale);

    const suit = toon(PALETTE.suit, { key: 'suit' });
    const suitL = toon(PALETTE.suitLight, { key: 'suitL' });
    const shirt = toon(PALETTE.shirt, { key: 'shirt' });
    const tie = toon(PALETTE.tie, { key: 'tie' });
    const skin = toon(PALETTE.skin, { key: 'skin' });
    const hair = toon(PALETTE.hair, { key: 'hair' });
    const shoe = toon(0x141212, { key: 'shoe' });
    const sole = toon(0x5a4a3a, { key: 'sole' });
    const gold = toon(PALETTE.gold, { key: 'gold' });
    const belt = toon(0x2b1c14, { key: 'belt' });
    const bag = toon(0x9a6b3d, { key: 'bag' });
    const bagD = toon(0x6e4a28, { key: 'bagD' });
    const pin = toon(0xe81e39, { key: 'pin' });

    // ---------- Их бие ----------
    // Тулгуур цэгүүд (pivot): бүх animation эдгээр Group-ийг эргүүлнэ
    const roll = new T.Group(); roll.position.y = 1.4; root.add(roll); this.rollPivot = roll;   // биеийн төв — өнхрөх/эргэлтийн тэнхлэг
    const hips = new T.Group(); hips.position.y = -0.38; roll.add(hips); this.hips = hips;
    const torso = new T.Group(); hips.add(torso); this.torso = torso;

    part(capsule(0.36, 0.45), suit, torso, 0, 0.42, 0, 1.05, 1, 0.78);           // пиджак
    part(sphereGeo, suit, torso, 0, 0.05, 0, 0.42, 0.22, 0.34);                 // бэлхүүс
    part(cylGeo, belt, torso, 0, 0.06, 0, 0.4, 0.09, 0.32);                     // бүс
    part(boxGeo, gold, torso, 0, 0.06, 0.31, 0.1, 0.08, 0.03);                  // бүсний тэврэг
    const shirtM = part(boxGeo, shirt, torso, 0, 0.5, 0.31, 0.24, 0.55, 0.05); shirtM.userData.noOutline = true;
    // Цамцны зах — хоёр гурвалжин
    for (const s of [-1, 1]) { const col = part(boxGeo, shirt, torso, s * 0.1, 0.77, 0.3, 0.12, 0.1, 0.05); col.rotation.z = s * -0.7; col.userData.noOutline = true; }
    // Зангиа: тусдаа pivot — хоёрдогч хөдөлгөөн
    const tiePivot = new T.Group(); tiePivot.position.set(0, 0.74, 0.33); torso.add(tiePivot); this.tiePivot = tiePivot;
    part(sphereGeo, tie, tiePivot, 0, 0, 0.02, 0.06, 0.05, 0.03).userData.noOutline = true;   // зангилаа
    const tieM = part(boxGeo, tie, tiePivot, 0, -0.27, 0.025, 0.09, 0.5, 0.03); tieM.userData.noOutline = true;
    part(boxGeo, toon(0xb52a35, { key: 'tieStripe' }), tiePivot, 0, -0.22, 0.045, 0.09, 0.05, 0.01).userData.noOutline = true;
    for (const s of [-1, 1]) {
      const lapel = part(boxGeo, suitL, torso, s * 0.17, 0.58, 0.3, 0.17, 0.44, 0.04); lapel.rotation.z = s * 0.45;
      part(boxGeo, suit, torso, s * 0.21, 0.2, 0.31, 0.16, 0.05, 0.02);          // халаасны хавтас
      part(sphereGeo, suit, torso, s * 0.4, 0.74, 0, 0.16, 0.13, 0.16);          // мөр
    }
    part(sphereGeo, pin, torso, -0.26, 0.66, 0.34, 0.035, 0.035, 0.02).userData.noOutline = true;   // Kagome pin
    for (const y of [0.28, 0.18]) part(sphereGeo, belt, torso, 0.06, y, 0.32, 0.022, 0.022, 0.015).userData.noOutline = true; // товч
    // Цүнх (аялагчийн хүзүүвч цүнх): ар талд, тусдаа pivot
    const bagPivot = new T.Group(); bagPivot.position.set(0.32, 0.25, -0.28); torso.add(bagPivot); this.bagPivot = bagPivot;
    part(boxGeo, bag, bagPivot, 0, 0, 0, 0.34, 0.3, 0.16);
    part(boxGeo, bagD, bagPivot, 0, 0.1, 0.02, 0.36, 0.12, 0.18);                // хавтас
    part(sphereGeo, gold, bagPivot, 0, 0.02, 0.09, 0.03, 0.03, 0.02).userData.noOutline = true;
    const strap = part(boxGeo, bagD, torso, 0.02, 0.42, 0, 0.055, 0.62, 0.6); strap.rotation.z = 0.6; strap.userData.noOutline = true; // оосор

    // ---------- Толгой (chibi — том) ----------
    const neck = new T.Group(); neck.position.y = 0.86; torso.add(neck); this.neck = neck;
    const head = new T.Group(); head.position.y = 0.1; neck.add(head); this.head = head;
    part(capsule(0.06, 0.1), skin, neck, 0, 0, 0);
    part(sphereGeo, skin, head, 0, 0.5, 0, 0.56, 0.58, 0.54).name = 'skull';
    // Үс: хойд тал + дээд + урд хэсэг (эх зургийн богино засалт, зүүн тийш самнасан)
    const hairG = new T.Group(); hairG.position.y = 0.5; head.add(hairG); this.hairG = hairG;
    part(sphereGeo, hair, hairG, 0, 0.12, -0.06, 0.58, 0.5, 0.56);
    part(sphereGeo, hair, hairG, 0, 0.28, 0.02, 0.5, 0.36, 0.5);
    part(sphereGeo, hair, hairG, -0.2, 0.36, 0.3, 0.32, 0.2, 0.26).rotation.z = 0.35;    // урд үс (зүүн)
    part(sphereGeo, hair, hairG, 0.14, 0.4, 0.28, 0.3, 0.16, 0.24).rotation.z = -0.4;
    part(sphereGeo, hair, hairG, 0.3, 0.3, 0.2, 0.2, 0.14, 0.22).rotation.z = -0.6;      // хажуу
    part(sphereGeo, hair, hairG, -0.02, 0.44, 0.38, 0.14, 0.08, 0.14).rotation.x = 0.4;  // ирмэг
    for (const s of [-1, 1]) {
      part(sphereGeo, hair, hairG, s * 0.44, 0.1, -0.05, 0.16, 0.26, 0.28);              // чамархай
      part(sphereGeo, skin, head, s * 0.54, 0.46, 0, 0.1, 0.13, 0.09);                    // чих
    }
    // Нүүр: texture, бөмбөрцгийн урд наалдана
    this.faces = {}; for (const m of MOODS) this.faces[m] = faceTexture(m);
    const faceMat = new T.MeshBasicMaterial({ map: this.faces.smile, transparent: true, depthWrite: false, toneMapped: false });
    const face = new T.Mesh(new T.SphereGeometry(0.58, 24, 16, Math.PI * 0.08, Math.PI * 0.84, Math.PI * 0.26, Math.PI * 0.52), faceMat);
    face.position.set(0, 0.5, 0); face.scale.set(1, 1.02, 0.97);
    face.userData.noOutline = true; face.castShadow = false;
    head.add(face);
    this.faceMat = faceMat;
    part(sphereGeo, toon(PALETTE.skinDark, { key: 'skinD' }), head, 0, 0.42, 0.53, 0.06, 0.05, 0.05);   // хамар

    // ---------- Гар: мөр → тохой ----------
    this.arms = [];
    for (const s of [-1, 1]) {
      const shoulder = new T.Group(); shoulder.position.set(s * 0.44, 0.72, 0); torso.add(shoulder);
      part(capsule(0.11, 0.24), suit, shoulder, 0, -0.2, 0);
      const elbow = new T.Group(); elbow.position.y = -0.4; shoulder.add(elbow);
      part(capsule(0.1, 0.22), suit, elbow, 0, -0.18, 0);
      part(boxGeo, shirt, elbow, 0, -0.35, 0, 0.22, 0.05, 0.22);                   // ханцуйны цамц
      part(sphereGeo, gold, elbow, s * 0.1, -0.35, 0.05, 0.025, 0.025, 0.02).userData.noOutline = true; // ханцуйны товч
      const hand = part(sphereGeo, skin, elbow, 0, -0.46, 0, 0.11, 0.13, 0.09);
      part(sphereGeo, skin, elbow, s * 0.07, -0.42, 0.05, 0.04, 0.06, 0.04).userData.noOutline = true;   // эрхий
      this.arms.push({ shoulder, elbow, hand, s });
    }
    // ---------- Хөл: ташаа → өвдөг ----------
    this.legs = [];
    for (const s of [-1, 1]) {
      const hip = new T.Group(); hip.position.set(s * 0.17, 0.02, 0); hips.add(hip);
      part(capsule(0.14, 0.26), suit, hip, 0, -0.22, 0);
      const knee = new T.Group(); knee.position.y = -0.45; hip.add(knee);
      part(capsule(0.13, 0.24), suit, knee, 0, -0.2, 0);
      part(boxGeo, suit, knee, 0, -0.36, 0, 0.3, 0.06, 0.3);                        // өмдний хормой
      const foot = part(boxGeo, shoe, knee, 0, -0.43, 0.07, 0.24, 0.12, 0.4);
      part(boxGeo, sole, knee, 0, -0.5, 0.07, 0.26, 0.04, 0.42);                    // ул
      part(sphereGeo, shoe, knee, 0, -0.42, 0.27, 0.12, 0.07, 0.1);                 // хошуу
      foot.name = 'foot';
      this.legs.push({ hip, knee, foot, s });
    }

    // Сүүдэр диск
    const shadow = new T.Mesh(new T.CircleGeometry(0.55, 24), new T.MeshBasicMaterial({ color: 0x0f2a1c, transparent: true, opacity: 0.22, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.03; shadow.userData.noOutline = true;
    root.add(shadow); this.shadow = shadow;

    if (outline) outlineGroup(root, 0.06);

    // ---------- Animation төлөв ----------
    this.state = 'idle';
    this.time = 0;
    this.blinkT = 2 + Math.random() * 3;
    this.blinking = 0;
    this.speedNorm = 0;
    this.lean = 0;
    this.airT = 0;
    this.landT = 0;
    this.cheerT = 0;
    this.actionT = 0; this.action = null; this.actionDur = 0;   // нэг удаагийн үйлдэл
    this.idleT = 0; this.idleVariant = 0;                       // удаан зогсоход
    this.mood = 'smile'; this.moodHold = 0;
    this.flipT = 0;                                              // давхар үсрэлтийн эргэлт
    this.rollT = 0; this.rollDur = 0.45;
    this.footPhase = 0;
    this.onStep = null;
    this._lastStepSide = 0;
    this._prevSpeed = 0;
    this.tieSwing = 0; this.tieVel = 0;
    this.headYaw = 0; this.headPitchLook = 0;
  }

  // ---------- Гаднаас дуудах үйлдлүүд ----------
  setMood(m, hold = 0) { this.mood = m; this.moodHold = hold; }
  cheer() { this.cheerT = 1.6; this.setMood('happy', 1.6); }
  /** Нэг удаагийн үйлдэл: 'pick' (жимс түүх), 'wave' (даллах), 'hurt' */
  play(action, dur = 0.7) { this.action = action; this.actionT = dur; this.actionDur = dur; if (action === 'wave') this.setMood('talk', dur); if (action === 'hurt') this.setMood('hurt', dur); if (action === 'pick') this.setMood('focus', dur); if (action === 'dance') this.setMood('happy', dur); }
  flip() { this.flipT = 0.55; this.setMood('surprised', 0.55); }
  roll(dur = 0.45) { this.rollT = dur; this.rollDur = dur; this.setMood('focus', dur); }
  recoil(t = 0.14) { this.recoilT = t; }
  get busy() { return this.actionT > 0; }

  /**
   * @param {number} dt
   * @param {{state:string, speed:number, lean?:number, lookAt?:T.Vector3|null, accel?:number}} p
   */
  update(dt, p) {
    this.time += dt;
    const prev = this.state;
    this.state = p.state;
    const air = (s) => s === 'jump' || s === 'fall';
    if (!air(prev) && air(p.state)) this.airT = 0;
    if (air(prev) && !air(p.state) && p.state !== 'swim') this.landT = 0.22;
    this.airT += dt;
    this.landT = Math.max(0, this.landT - dt);
    this.cheerT = Math.max(0, this.cheerT - dt);
    this.actionT = Math.max(0, this.actionT - dt); if (this.actionT === 0) this.action = null;
    this.flipT = Math.max(0, this.flipT - dt);
    this.rollT = Math.max(0, this.rollT - dt);
    this.moodHold = Math.max(0, this.moodHold - dt);
    if (this.state === 'idle') this.idleT += dt; else { this.idleT = 0; this.idleVariant = 0; }

    // ---------- Нүүрний илэрхийлэл ----------
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blinking = 0.12; this.blinkT = 2.5 + Math.random() * 4; }
    if (this.blinking > 0) this.blinking -= dt;
    let mood = this.moodHold > 0 ? this.mood : (
      this.cheerT > 0 ? 'happy' : this.state === 'run' ? 'focus' : this.state === 'jump' ? 'surprised' : this.state === 'swim' ? 'focus' : this.state === 'slide' ? 'focus' : 'smile');
    if (this.blinking > 0 && !['happy', 'hurt', 'surprised'].includes(mood)) mood = 'blink';
    const tex = this.faces[mood] || this.faces.smile;
    if (this.faceMat.map !== tex) this.faceMat.map = tex;

    const target = Math.min(1, p.speed);
    this.speedNorm += (target - this.speedNorm) * Math.min(1, dt * 10);
    this.lean += ((p.lean || 0) - this.lean) * Math.min(1, dt * 8);
    const accel = (target - this._prevSpeed) / Math.max(dt, 0.001); this._prevSpeed = target;

    const s = this.speedNorm, t = this.time;
    const gait = s > 0.6 ? 12.5 : 9;
    this.footPhase += dt * gait * Math.max(0.15, s);
    const ph = this.footPhase;
    const { hips, torso, head, neck } = this;
    const k8 = Math.min(1, dt * 8), k12 = Math.min(1, dt * 12);

    // Алхмын дуу
    const stepSide = Math.sin(ph) > 0 ? 1 : -1;
    if (this.state === 'walk' || this.state === 'run') {
      if (stepSide !== this._lastStepSide && this.onStep && s > 0.2) this.onStep(stepSide);
      this._lastStepSide = stepSide;
    }

    let hipY = 0, torsoPitch = 0, torsoRoll = 0, headPitch = 0, rollX = 0;
    const setLegs = (fn) => { for (const l of this.legs) fn(l); };
    const setArms = (fn) => { for (const a of this.arms) fn(a); };
    const easeLegs = (hip, knee, foot, k = k12) => setLegs((l) => { l.hip.rotation.x = lerp(l.hip.rotation.x, hip(l), k); l.knee.rotation.x = lerp(l.knee.rotation.x, knee(l), k); l.foot.rotation.x = lerp(l.foot.rotation.x, foot(l), k); });
    const easeArms = (sh, shZ, el, k = k12) => setArms((a) => { a.shoulder.rotation.x = lerp(a.shoulder.rotation.x, sh(a), k); a.shoulder.rotation.z = lerp(a.shoulder.rotation.z, shZ(a), k); a.elbow.rotation.x = lerp(a.elbow.rotation.x, el(a), k); });

    switch (this.state) {
      case 'walk':
      case 'run': {
        const amp = 0.55 + s * 0.55;
        setLegs((l) => {
          const v = Math.sin(ph + (l.s > 0 ? 0 : Math.PI));
          l.hip.rotation.x = v * amp;
          l.knee.rotation.x = Math.max(0, -Math.sin(ph + (l.s > 0 ? 0 : Math.PI) - 0.9)) * (0.9 + s * 0.7);
          l.foot.rotation.x = -Math.max(0, v) * 0.2;
        });
        setArms((a) => {
          const v = Math.sin(ph + (a.s > 0 ? Math.PI : 0));
          a.shoulder.rotation.x = v * amp * (0.6 + s * 0.4);
          a.shoulder.rotation.z = a.s * (0.12 + s * 0.15);
          a.elbow.rotation.x = -0.4 - s * 0.9 - Math.max(0, -v) * 0.5;
        });
        hipY = Math.abs(Math.cos(ph)) * (0.03 + s * 0.06);
        torsoPitch = 0.06 + s * 0.24;
        torsoRoll = Math.sin(ph) * 0.05 * s;
        headPitch = -0.05 - s * 0.08;
        break;
      }
      case 'jump':
      case 'fall': {
        const up = this.state === 'jump';
        easeLegs((l) => (up ? -0.9 : -0.3) * (l.s > 0 ? 1 : 0.5), () => up ? 1.6 : 0.6, () => 0.2);
        easeArms(() => up ? -2.4 : -1.3, (a) => a.s * 0.5, () => -0.5, Math.min(1, dt * 10));
        torsoPitch = up ? -0.12 : 0.18;
        headPitch = up ? -0.25 : 0.1;
        break;
      }
      case 'swim': {
        // Хэвтээ байрлал, гараар сэлэх, хөлөөр цохих
        const sw = t * 7;
        setArms((a) => { a.shoulder.rotation.x = -Math.PI * 0.5 + Math.sin(sw + (a.s > 0 ? 0 : Math.PI)) * 1.3; a.shoulder.rotation.z = a.s * 0.35; a.elbow.rotation.x = -0.6; });
        setLegs((l) => { l.hip.rotation.x = Math.sin(sw * 1.4 + (l.s > 0 ? 0 : Math.PI)) * 0.35; l.knee.rotation.x = 0.3; l.foot.rotation.x = 0.4; });
        torsoPitch = 1.25 - s * 0.15;
        headPitch = -0.95;
        hipY = -0.75 + Math.sin(t * 3) * 0.04;
        break;
      }
      case 'slide': {
        setLegs((l) => { l.hip.rotation.x = -1.2 + (l.s > 0 ? 0.3 : 0); l.knee.rotation.x = 0.5; l.foot.rotation.x = 0.4; });
        setArms((a) => { a.shoulder.rotation.x = -2.6; a.shoulder.rotation.z = a.s * 0.3; a.elbow.rotation.x = -0.3; });
        torsoPitch = 1.15; headPitch = -0.7; hipY = -0.45;
        break;
      }
      case 'hang': {
        setLegs((l) => { l.hip.rotation.x = Math.sin(t * 5 + l.s) * 0.25 + 0.15; l.knee.rotation.x = 0.35; l.foot.rotation.x = 0.3; });
        setArms((a) => { a.shoulder.rotation.x = -Math.PI + 0.1; a.shoulder.rotation.z = a.s * 0.12; a.elbow.rotation.x = 0.05; });
        torsoPitch = 0.1 + Math.sin(t * 5) * 0.05; headPitch = -0.2;
        break;
      }
      case 'sit': {
        setLegs((l) => { l.hip.rotation.x = -1.45; l.knee.rotation.x = 1.5; l.foot.rotation.x = 0; });
        setArms((a) => { a.shoulder.rotation.x = -0.9 + (p.lean || 0) * a.s * 0.3; a.shoulder.rotation.z = a.s * 0.1; a.elbow.rotation.x = -0.8; });
        torsoPitch = 0.1;
        break;
      }
      case 'aim': {
        this.recoilT = Math.max(0, (this.recoilT || 0) - dt);
        const rc = this.recoilT > 0 ? Math.sin(this.recoilT / 0.14 * Math.PI) : 0;
        setArms((a) => { a.shoulder.rotation.x = lerp(a.shoulder.rotation.x, (a.s > 0 ? -1.35 : -1.1) + rc * 0.4, k12); a.shoulder.rotation.z = lerp(a.shoulder.rotation.z, a.s > 0 ? -0.15 : 0.35, k12); a.elbow.rotation.x = lerp(a.elbow.rotation.x, a.s > 0 ? -0.35 : -0.9, k12); });
        if (this.speedNorm > 0.1) { setLegs((l) => { l.hip.rotation.x = Math.sin(ph + (l.s > 0 ? 0 : Math.PI)) * (0.5 + this.speedNorm * 0.4); l.knee.rotation.x = Math.max(0, -Math.sin(ph + (l.s > 0 ? 0 : Math.PI))) * 0.9; l.foot.rotation.x = 0; }); hipY = Math.abs(Math.cos(ph)) * 0.05; }
        else easeLegs(() => 0, () => 0.06, () => 0, k8);
        torsoPitch = 0.1 + rc * -0.08; headPitch = -0.05;
        break;
      }
      case 'carried': {
        // Өргөгдсөн: хөл савчина, гар дэлгэнэ; p.joy бол баярлаж гараа өргөнө
        const joy = Math.min(1, p.joy || 0), f = t * (joy ? 7 : 11);
        setLegs((l) => { l.hip.rotation.x = Math.sin(f + (l.s > 0 ? 0 : Math.PI)) * (0.8 - joy * 0.4); l.knee.rotation.x = 0.6; l.foot.rotation.x = 0; });
        setArms((a) => { a.shoulder.rotation.x = lerp(-0.6 + Math.sin(f * 0.8 + a.s) * 0.4, -Math.PI + 0.25, joy); a.shoulder.rotation.z = lerp(a.s * 1.3, a.s * 0.2, joy); a.elbow.rotation.x = -0.3; });
        torsoPitch = -0.1; headPitch = -0.15;
        break;
      }
      default: { // idle + удаан зогсоход хувилбарууд
        const iv = this.idleT > 6 ? (Math.floor(this.idleT / 6) % 3) + 1 : 0;   // 1: эргэн тойрноо харах, 2: сунах, 3: хөл тогшилт
        const ph2 = (this.idleT % 6) / 6;
        easeLegs(() => 0, (l) => 0.06 + (iv === 3 && l.s > 0 ? Math.max(0, Math.sin(t * 6)) * 0.5 : 0), (l) => (iv === 3 && l.s > 0 ? -Math.max(0, Math.sin(t * 6)) * 0.4 : 0), k8);
        if (iv === 2) {
          const st = Math.sin(ph2 * Math.PI);
          easeArms(() => -Math.PI * 0.9 * st, (a) => a.s * 0.4 * st, () => -0.2 * st, k8);
          torsoPitch = -0.12 * st; headPitch = -0.3 * st; hipY = st * 0.04;
        } else {
          easeArms((a) => Math.sin(t * 2.2 + a.s) * 0.04, (a) => a.s * 0.14, () => -0.35, k8);
          hipY = Math.sin(t * 2.2) * 0.012;
          torsoPitch = 0.02;
          headPitch = Math.sin(t * 1.3) * 0.03;
        }
        if (iv === 1) this.headYawIdle = Math.sin(ph2 * Math.PI * 2) * 0.8; else this.headYawIdle = 0;
        if (iv === 3) hipY += Math.max(0, Math.sin(t * 6)) * 0.02;
      }
    }

    // ---------- Нэг удаагийн үйлдэл (arm override) ----------
    if (this.action) {
      const q = 1 - this.actionT / this.actionDur;          // 0 → 1
      const bell = Math.sin(q * Math.PI);                    // 0 → 1 → 0
      if (this.action === 'pick') {
        // Бөхийж баруун гараараа шүүрч аваад буцна
        torsoPitch = lerp(torsoPitch, 0.75, bell);
        hipY -= bell * 0.22;
        setLegs((l) => { l.knee.rotation.x = lerp(l.knee.rotation.x, 0.9, bell); l.hip.rotation.x = lerp(l.hip.rotation.x, -0.5, bell); });
        const a = this.arms[1];
        a.shoulder.rotation.x = lerp(a.shoulder.rotation.x, -1.9, bell); a.shoulder.rotation.z = lerp(a.shoulder.rotation.z, 0.2, bell); a.elbow.rotation.x = lerp(a.elbow.rotation.x, -0.3 + (q > 0.5 ? -0.8 : 0), bell);
        headPitch = lerp(headPitch, 0.35, bell);
      } else if (this.action === 'wave') {
        const a = this.arms[1];
        a.shoulder.rotation.x = lerp(a.shoulder.rotation.x, -Math.PI * 0.85, Math.min(1, q * 4));
        a.shoulder.rotation.z = lerp(a.shoulder.rotation.z, 0.5 + Math.sin(t * 16) * 0.35, Math.min(1, q * 4)) * (q > 0.85 ? (1 - q) / 0.15 : 1);
        a.elbow.rotation.x = -0.4;
        headPitch += -0.1 * bell;
      } else if (this.action === 'dance') {
        // Бүжиг: ташаа савлаж, гар ээлжлэн дээш
        const b = t * 9;
        torsoRoll = Math.sin(b) * 0.18; hipY += Math.abs(Math.sin(b)) * 0.06;
        setArms((a) => { const up = Math.sin(b + (a.s > 0 ? 0 : Math.PI)); a.shoulder.rotation.x = -1.2 - up * 1.2; a.shoulder.rotation.z = a.s * (0.5 + up * 0.3); a.elbow.rotation.x = -0.9; });
        setLegs((l) => { l.hip.rotation.x = Math.sin(b + (l.s > 0 ? 0 : Math.PI)) * 0.25; l.knee.rotation.x = 0.3 + Math.max(0, Math.sin(b + (l.s > 0 ? 0 : Math.PI))) * 0.4; });
        headPitch = Math.sin(b * 0.5) * 0.15; this.headYawIdle = Math.sin(b * 0.5) * 0.4;
        if (q > 0.9) this.actionBlend = (1 - q) / 0.1;
      } else if (this.action === 'hurt') {
        torsoPitch = lerp(torsoPitch, -0.35, bell); hipY -= bell * 0.1;
        setArms((a) => { a.shoulder.rotation.x = lerp(a.shoulder.rotation.x, -1.4, bell); a.shoulder.rotation.z = lerp(a.shoulder.rotation.z, a.s * 1.2, bell); });
        headPitch = lerp(headPitch, -0.4, bell);
      }
    }

    // ---------- Баярлах ----------
    if (this.cheerT > 0) {
      const c = this.cheerT;
      setArms((a) => { a.shoulder.rotation.x = -Math.PI + 0.3 + Math.sin(t * 14 + a.s) * 0.25; a.shoulder.rotation.z = a.s * 0.5; a.elbow.rotation.x = -0.3; });
      hipY += Math.abs(Math.sin(c * 12)) * 0.25 * Math.min(1, c);
      headPitch = -0.2;
    }

    // ---------- Давхар үсрэлт: урагш эргэлт ----------
    if (this.flipT > 0) {
      const q = 1 - this.flipT / 0.55;
      const e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;   // ease in-out
      rollX = e * Math.PI * 2;
      setLegs((l) => { l.hip.rotation.x = -2.0; l.knee.rotation.x = 2.4; l.foot.rotation.x = 0.3; });       // бөмбөг шиг эвхэгдэнэ
      setArms((a) => { a.shoulder.rotation.x = -0.6; a.elbow.rotation.x = -2.2; a.shoulder.rotation.z = a.s * 0.3; });
      torsoPitch = 0.5; headPitch = 0.4;
    }
    // ---------- Өнхрөх ----------
    if (this.rollT > 0) {
      const q = 1 - this.rollT / this.rollDur;
      rollX = q * Math.PI * 2;
      hipY -= 0.35;
      setLegs((l) => { l.hip.rotation.x = -1.7; l.knee.rotation.x = 2.3; l.foot.rotation.x = 0.3; });
      setArms((a) => { a.shoulder.rotation.x = -0.8; a.elbow.rotation.x = -2.3; a.shoulder.rotation.z = a.s * 0.25; });
      torsoPitch = 0.6;
      headPitch = 0.5;
    }

    // Газардах squash
    if (this.landT > 0) {
      const q = this.landT / 0.22;
      hipY -= q * 0.16;
      torsoPitch += q * 0.25;
    }

    // ---------- Толгой харах ----------
    let wantYaw = this.headYawIdle || 0, wantPitch = 0;
    if (p.lookAt && !this.action && this.state !== 'swim') {
      const local = this.root.worldToLocal(p.lookAt.clone());
      const yaw = Math.atan2(local.x, local.z);
      if (Math.abs(yaw) < 1.35) { wantYaw = T.MathUtils.clamp(yaw, -0.9, 0.9); wantPitch = T.MathUtils.clamp(-Math.atan2(local.y - 2.3, Math.hypot(local.x, local.z)), -0.35, 0.45); }
    }
    this.headYaw = lerp(this.headYaw, wantYaw, Math.min(1, dt * 5));
    this.headPitchLook = lerp(this.headPitchLook, wantPitch, Math.min(1, dt * 5));

    // ---------- Apply ----------
    hips.position.y = -0.38 + hipY;
    if (rollX === 0 && this.rollPivot.rotation.x > Math.PI * 1.9) this.rollPivot.rotation.x = 0;
    this.rollPivot.rotation.x = lerp(this.rollPivot.rotation.x, rollX, rollX === 0 ? Math.min(1, dt * 14) : 1);
    torso.rotation.x = lerp(torso.rotation.x, torsoPitch, k12);
    torso.rotation.z = lerp(torso.rotation.z, torsoRoll - this.lean * 0.25, Math.min(1, dt * 10));
    neck.rotation.x = lerp(neck.rotation.x, headPitch + this.headPitchLook, Math.min(1, dt * 10));
    head.rotation.z = Math.sin(t * 1.7) * 0.02 + this.lean * 0.1;
    head.rotation.y = this.headYaw;

    // ---------- Хоёрдогч хөдөлгөөн: зангиа, цүнх, үс ----------
    const bobV = (hipY - (this._prevHipY ?? hipY)) / Math.max(dt, 0.001); this._prevHipY = hipY;
    this.tieVel += (-accel * 0.9 - bobV * 0.5 - this.tieSwing * 60 - this.tieVel * 9) * dt;
    this.tieSwing += this.tieVel * dt;
    this.tiePivot.rotation.x = T.MathUtils.clamp(this.tieSwing, -0.9, 0.35) + (this.state === 'run' ? -0.25 - Math.sin(ph * 2) * 0.08 : 0) + (this.state === 'swim' ? 0.4 : 0);
    this.bagPivot.rotation.x = -this.tieSwing * 0.35;
    this.bagPivot.position.y = 0.25 + Math.sin(ph) * 0.02 * s;
    this.hairG.rotation.x = -this.tieSwing * 0.12 + (this.state === 'jump' ? 0.08 : this.state === 'fall' ? -0.08 : 0);

    // Squash & stretch: агаарт сунана
    const stretch = (this.state === 'jump' ? 0.08 : this.state === 'fall' ? -0.04 : 0) + (this.landT > 0 ? -0.12 * this.landT / 0.22 : 0);
    this.root.scale.set(this.scale * (1 - stretch * 0.6), this.scale * (1 + stretch), this.scale * (1 - stretch * 0.6));
    this.shadow.scale.setScalar(1 / (1 - stretch * 0.6));
  }
}
