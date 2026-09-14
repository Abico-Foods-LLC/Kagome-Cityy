// Chibi костюмтай аялагч: хоёр горимд хоёуланд нь ашиглагдана.
// Procedural animation state machine: idle / walk / run / jump / fall / land / slide / hang / sit / cheer.
import * as T from 'three';
import { toon, standard, PALETTE, outlineGroup } from '../gfx/materials.js';
import { faceTexture } from '../gfx/textures.js';

const sphereGeo = new T.SphereGeometry(1, 20, 14);
const boxGeo = new T.BoxGeometry(1, 1, 1);
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

    // Тулгуур цэгүүд (pivot): бүх animation эдгээр Group-ийг эргүүлнэ
    const hips = new T.Group(); hips.position.y = 1.02; root.add(hips); this.hips = hips;
    const torso = new T.Group(); hips.add(torso); this.torso = torso;

    // Их бие: бага зэрэг дээшээ өргөссөн капсул хэлбэр
    part(capsule(0.36, 0.45), suit, torso, 0, 0.42, 0, 1.05, 1, 0.78);
    const shirtM = part(boxGeo, shirt, torso, 0, 0.5, 0.31, 0.26, 0.55, 0.05); shirtM.userData.noOutline = true; // цамц
    const tieM = part(boxGeo, tie, torso, 0, 0.46, 0.35, 0.09, 0.5, 0.03); tieM.rotation.z = 0.04; tieM.userData.noOutline = true;
    part(sphereGeo, tie, torso, 0, 0.72, 0.35, 0.06, 0.05, 0.03).userData.noOutline = true; // зангианы зангилаа
    for (const s of [-1, 1]) {
      const lapel = part(boxGeo, suitL, torso, s * 0.17, 0.58, 0.3, 0.16, 0.42, 0.04);
      lapel.rotation.z = s * 0.45;
      part(boxGeo, suit, torso, s * 0.2, 0.2, 0.31, 0.16, 0.05, 0.02);    // халаасны хавтас
    }
    part(sphereGeo, suit, torso, 0, 0.05, 0, 0.42, 0.22, 0.34);            // бэлхүүс
    // Мөр
    for (const s of [-1, 1]) part(sphereGeo, suit, torso, s * 0.4, 0.74, 0, 0.16, 0.13, 0.16);

    // Толгой (chibi — том)
    const neck = new T.Group(); neck.position.y = 0.86; torso.add(neck); this.neck = neck;
    const head = new T.Group(); head.position.y = 0.1; neck.add(head); this.head = head;
    part(capsule(0.06, 0.1), skin, neck, 0, 0, 0);                        // хүзүү
    const skull = part(sphereGeo, skin, head, 0, 0.5, 0, 0.56, 0.58, 0.54);
    skull.name = 'skull';
    // Үс: хойд тал + дээд + урд хэсэг (эх зургийн богино засалттай үс)
    part(sphereGeo, hair, head, 0, 0.62, -0.06, 0.58, 0.5, 0.56);
    part(sphereGeo, hair, head, 0, 0.78, 0.02, 0.5, 0.36, 0.5);
    part(sphereGeo, hair, head, -0.18, 0.86, 0.3, 0.3, 0.2, 0.26).rotation.z = 0.3;
    part(sphereGeo, hair, head, 0.16, 0.9, 0.28, 0.28, 0.16, 0.24).rotation.z = -0.4;
    for (const s of [-1, 1]) {
      part(sphereGeo, hair, head, s * 0.44, 0.6, -0.05, 0.16, 0.26, 0.28);   // чамархайн үс
      part(sphereGeo, skin, head, s * 0.54, 0.46, 0, 0.1, 0.13, 0.09);        // чих
    }
    // Нүүр: texture-тэй хавтгай, бөмбөрцгийн урд наалдана
    this.faceSmile = faceTexture({ smile: true });
    this.faceBlink = faceTexture({ smile: true, blink: true });
    this.faceOh = faceTexture({ smile: false });
    const faceMat = new T.MeshBasicMaterial({ map: this.faceSmile, transparent: true, depthWrite: false, toneMapped: false });
    const face = new T.Mesh(new T.SphereGeometry(0.58, 24, 16, Math.PI * 0.08, Math.PI * 0.84, Math.PI * 0.26, Math.PI * 0.52), faceMat);
    face.position.set(0, 0.5, 0); face.scale.set(1, 1.02, 0.97);
    face.userData.noOutline = true; face.castShadow = false;
    head.add(face);
    this.faceMat = faceMat;
    // Хамар
    part(sphereGeo, toon(PALETTE.skinDark, { key: 'skinD' }), head, 0, 0.42, 0.53, 0.06, 0.05, 0.05);

    // Гар: мөр → тохой
    this.arms = [];
    for (const s of [-1, 1]) {
      const shoulder = new T.Group(); shoulder.position.set(s * 0.44, 0.72, 0); torso.add(shoulder);
      part(capsule(0.11, 0.24), suit, shoulder, 0, -0.2, 0);
      const elbow = new T.Group(); elbow.position.y = -0.4; shoulder.add(elbow);
      part(capsule(0.1, 0.22), suit, elbow, 0, -0.18, 0);
      part(boxGeo, shirt, elbow, 0, -0.35, 0, 0.22, 0.05, 0.22);           // ханцуйны цамц
      part(sphereGeo, skin, elbow, 0, -0.45, 0, 0.11, 0.12, 0.1);          // гар
      this.arms.push({ shoulder, elbow, s });
    }
    // Хөл: ташаа → өвдөг
    this.legs = [];
    for (const s of [-1, 1]) {
      const hip = new T.Group(); hip.position.set(s * 0.17, 0.02, 0); hips.add(hip);
      part(capsule(0.14, 0.26), suit, hip, 0, -0.22, 0);
      const knee = new T.Group(); knee.position.y = -0.45; hip.add(knee);
      part(capsule(0.13, 0.24), suit, knee, 0, -0.2, 0);
      const foot = part(boxGeo, shoe, knee, 0, -0.42, 0.07, 0.24, 0.13, 0.4);
      foot.name = 'foot';
      this.legs.push({ hip, knee, foot, s });
    }

    // Сүүдэр диск
    const shadow = new T.Mesh(new T.CircleGeometry(0.55, 24), new T.MeshBasicMaterial({ color: 0x0f2a1c, transparent: true, opacity: 0.22, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.03; shadow.userData.noOutline = true;
    root.add(shadow); this.shadow = shadow;

    if (outline) outlineGroup(root, 0.06);

    this.state = 'idle';
    this.time = 0;
    this.blinkT = 2 + Math.random() * 3;
    this.blinking = 0;
    this.speedNorm = 0;      // 0..1 хөдөлгөөний хурд
    this.lean = 0;           // хажуу тийш налах
    this.airT = 0;
    this.landT = 0;
    this.cheerT = 0;
    this.footPhase = 0;
    this.onStep = null;      // callback(index)
    this._lastStepSide = 0;
  }

  setExpression(kind) {
    this.faceMat.map = kind === 'oh' ? this.faceOh : this.faceSmile;
  }

  cheer() { this.cheerT = 1.6; }

  /**
   * @param {number} dt
   * @param {{state:string, speed:number, lean?:number, vy?:number}} p
   */
  update(dt, p) {
    this.time += dt;
    const prev = this.state;
    this.state = p.state;
    if (prev !== 'jump' && prev !== 'fall' && (p.state === 'jump' || p.state === 'fall')) this.airT = 0;
    if ((prev === 'jump' || prev === 'fall') && p.state !== 'jump' && p.state !== 'fall') this.landT = 0.22;
    this.airT += dt;
    this.landT = Math.max(0, this.landT - dt);
    this.cheerT = Math.max(0, this.cheerT - dt);

    // Анивчих
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blinking = 0.12; this.blinkT = 2.5 + Math.random() * 4; }
    if (this.blinking > 0) { this.blinking -= dt; this.faceMat.map = this.faceBlink; }
    else if (this.faceMat.map === this.faceBlink) this.faceMat.map = this.faceSmile;

    const target = Math.min(1, p.speed);
    this.speedNorm += (target - this.speedNorm) * Math.min(1, dt * 10);
    this.lean += ((p.lean || 0) - this.lean) * Math.min(1, dt * 8);

    const s = this.speedNorm, t = this.time;
    const gait = s > 0.6 ? 12.5 : 9;           // алхах/гүйх давтамж
    this.footPhase += dt * gait * Math.max(0.15, s);
    const ph = this.footPhase;
    const hips = this.hips, torso = this.torso, head = this.head, neck = this.neck;

    // Хөлийн алхаа
    const step = Math.sin(ph);
    const stepSide = step > 0 ? 1 : -1;
    if (this.state === 'walk' || this.state === 'run') {
      if (stepSide !== this._lastStepSide && this.onStep && s > 0.2) this.onStep(stepSide);
      this._lastStepSide = stepSide;
    }

    let hipY = 0, torsoPitch = 0, torsoRoll = 0, headPitch = 0;
    const idleBreath = Math.sin(t * 2.2) * 0.012;

    switch (this.state) {
      case 'walk':
      case 'run': {
        const amp = 0.55 + s * 0.55;
        for (const l of this.legs) {
          const v = Math.sin(ph + (l.s > 0 ? 0 : Math.PI));
          l.hip.rotation.x = v * amp;
          l.knee.rotation.x = Math.max(0, -Math.sin(ph + (l.s > 0 ? 0 : Math.PI) - 0.9)) * (0.9 + s * 0.7);
          l.foot.rotation.x = -Math.max(0, v) * 0.2;
        }
        for (const a of this.arms) {
          const v = Math.sin(ph + (a.s > 0 ? Math.PI : 0));
          a.shoulder.rotation.x = v * amp * (0.6 + s * 0.4);
          a.shoulder.rotation.z = a.s * (0.12 + s * 0.15);
          a.elbow.rotation.x = -0.4 - s * 0.9 - Math.max(0, -v) * 0.5;
        }
        hipY = Math.abs(Math.cos(ph)) * (0.03 + s * 0.06);
        torsoPitch = 0.06 + s * 0.22;
        torsoRoll = Math.sin(ph) * 0.05 * s;
        headPitch = -0.05 - s * 0.08;
        break;
      }
      case 'jump':
      case 'fall': {
        const up = this.state === 'jump';
        for (const l of this.legs) {
          l.hip.rotation.x += ((up ? -0.9 : -0.3) * (l.s > 0 ? 1 : 0.5) - l.hip.rotation.x) * Math.min(1, dt * 12);
          l.knee.rotation.x += ((up ? 1.6 : 0.6) - l.knee.rotation.x) * Math.min(1, dt * 12);
          l.foot.rotation.x = 0.2;
        }
        for (const a of this.arms) {
          a.shoulder.rotation.x += ((up ? -2.4 : -1.3) - a.shoulder.rotation.x) * Math.min(1, dt * 10);
          a.shoulder.rotation.z += (a.s * 0.5 - a.shoulder.rotation.z) * Math.min(1, dt * 10);
          a.elbow.rotation.x += (-0.5 - a.elbow.rotation.x) * Math.min(1, dt * 10);
        }
        torsoPitch = up ? -0.12 : 0.18;
        headPitch = up ? -0.25 : 0.1;
        break;
      }
      case 'slide': {
        for (const l of this.legs) { l.hip.rotation.x = -1.2 + (l.s > 0 ? 0.3 : 0); l.knee.rotation.x = 0.5; l.foot.rotation.x = 0.4; }
        for (const a of this.arms) { a.shoulder.rotation.x = -2.6; a.shoulder.rotation.z = a.s * 0.3; a.elbow.rotation.x = -0.3; }
        torsoPitch = 1.15;
        headPitch = -0.7;
        hipY = -0.45;
        break;
      }
      case 'hang': {
        for (const l of this.legs) { l.hip.rotation.x = Math.sin(t * 5 + l.s) * 0.25 + 0.15; l.knee.rotation.x = 0.35; l.foot.rotation.x = 0.3; }
        for (const a of this.arms) { a.shoulder.rotation.x = -Math.PI + 0.1; a.shoulder.rotation.z = a.s * 0.12; a.elbow.rotation.x = 0.05; }
        torsoPitch = 0.1 + Math.sin(t * 5) * 0.05;
        headPitch = -0.2;
        break;
      }
      case 'sit': {
        for (const l of this.legs) { l.hip.rotation.x = -1.45; l.knee.rotation.x = 1.5; l.foot.rotation.x = 0; }
        for (const a of this.arms) { a.shoulder.rotation.x = -0.9; a.shoulder.rotation.z = a.s * 0.1; a.elbow.rotation.x = -0.8; }
        torsoPitch = 0.1;
        break;
      }
      default: { // idle
        const k = Math.min(1, dt * 8);
        for (const l of this.legs) {
          l.hip.rotation.x += (0 - l.hip.rotation.x) * k;
          l.knee.rotation.x += (0.06 - l.knee.rotation.x) * k;
          l.foot.rotation.x += (0 - l.foot.rotation.x) * k;
        }
        for (const a of this.arms) {
          a.shoulder.rotation.x += (Math.sin(t * 2.2 + a.s) * 0.04 - a.shoulder.rotation.x) * k;
          a.shoulder.rotation.z += (a.s * 0.14 - a.shoulder.rotation.z) * k;
          a.elbow.rotation.x += (-0.35 - a.elbow.rotation.x) * k;
        }
        hipY = idleBreath;
        torsoPitch = 0.02;
        headPitch = Math.sin(t * 1.3) * 0.03;
      }
    }

    // Баярлах: гараа дээш өргөж үсэрнэ
    if (this.cheerT > 0) {
      const c = this.cheerT;
      for (const a of this.arms) { a.shoulder.rotation.x = -Math.PI + 0.3 + Math.sin(t * 14 + a.s) * 0.25; a.shoulder.rotation.z = a.s * 0.5; a.elbow.rotation.x = -0.3; }
      hipY += Math.abs(Math.sin(c * 12)) * 0.25 * Math.min(1, c);
      headPitch = -0.2;
    }

    // Газардах squash
    if (this.landT > 0) {
      const q = this.landT / 0.22;
      hipY -= q * 0.16;
      torsoPitch += q * 0.25;
    }

    hips.position.y = 1.02 + hipY;
    torso.rotation.x += (torsoPitch - torso.rotation.x) * Math.min(1, dt * 12);
    torso.rotation.z += (torsoRoll - this.lean * 0.25 - torso.rotation.z) * Math.min(1, dt * 10);
    neck.rotation.x += (headPitch - neck.rotation.x) * Math.min(1, dt * 10);
    head.rotation.z = Math.sin(t * 1.7) * 0.02 + this.lean * 0.1;
    head.rotation.y += ((p.headYaw || 0) - head.rotation.y) * Math.min(1, dt * 6);

    // Squash & stretch: агаарт сунана
    const stretch = (this.state === 'jump' ? 0.08 : this.state === 'fall' ? -0.04 : 0) + (this.landT > 0 ? -0.12 * this.landT / 0.22 : 0);
    this.root.scale.set(this.scale * (1 - stretch * 0.6), this.scale * (1 + stretch), this.scale * (1 - stretch * 0.6));
    this.shadow.scale.setScalar(1 / (1 - stretch * 0.6));
  }
}
