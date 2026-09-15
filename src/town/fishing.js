// Загас барих: сувгийн эрэг дээр mini-game — modal-гүй, бүгд 3D ертөнцөд болно.
// Төлөв: idle → cast → wait (загасны мөр ойртоно) → bite (E) → reel (E барьж чангалалтыг ногоон бүсэд) → caught | missed → cast …
import * as T from 'three';
import * as P from '../world/props.js';
import { toon, applyCurve } from '../gfx/materials.js';
import { $, toast, pop } from '../core/ui.js';

const SPOT = { x: 16, z: -25, r: 3 };       // эрэг дээрх зогсох цэг (загасчны хажууд)
const TARGET = { x: 21, z: -25 };            // хөвүүр буух цэг (сувгийн гол)
const CAST_DUR = 0.5, BITE_WINDOW = 1.0, MISS_DUR = 0.8, CAUGHT_DUR = 1.2;
const TRAIL_DUR = 2.0;                                   // хазахын өмнө загасны мөр хөвүүр рүү ойртох хугацаа
const REEL_DUR = 4.0, ZONE = [0.35, 0.7];                // татах: ногоон бүсэд нийт ийм хугацаа байвал барина
const REEL_IN = 0.9, REEL_OUT = 0.7, SLIP = 0.15;        // чангалалт: E барих +, тавих −, бүсээс гарвал progress алдах
const SHORE_X = 17.6;                                    // татахад хөвүүр ирэх эргийн усны цэг
const ROD_LEN = 2.4, ROD_BASE = new T.Vector3(0.42, 0.95, 0.25), ROD_DIR = new T.Vector3(0, 0.55, 0.835).normalize();   // дүрийн локал (урд = +z)

export class FishingGame {
  constructor(scene) {
    this.scene = scene; this.state = scene.state;
    this.active = false; this.phase = 'idle'; this.t = 0; this.waitFor = 0;
    this.promptText = '';
    this.ui = { bar: $('reelBar'), marker: $('reelMarker'), prog: $('reelProg') };
    this.setup();
  }

  setup() {
    const { scene, interactables } = this.scene;
    this.mats = { float: toon(0xe83a4a, { key: 'floatR' }), fish: toon(0x7fc8ff, { key: 'fishB' }), fin: toon(0x4f8fd0, { key: 'fishD' }) };
    Object.values(this.mats).forEach(applyCurve);
    // Хөвүүр + шугам (идэвхгүй үед нуугдана)
    this.float = P.sphere(this.mats.float, scene, TARGET.x, -0.3, TARGET.z, 0.12); this.float.visible = false;
    P.sphere(toon(0xffffff, { key: 'white' }), this.float, 0, 0.6, 0, 0.7);
    this.lineGeo = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]);
    this.line = new T.Line(this.lineGeo, new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
    this.line.visible = false; this.line.frustumCulled = false; scene.add(this.line);
    // Загасны саваа: дүрийн гарт, урагш-дээш чиглэнэ (идэвхтэй үед л харагдана); шугам үзүүрээс гарна
    this.rod = new T.Group(); this.rod.visible = false; scene.add(this.rod);
    const rodMat = toon(0x6a4a2a, { key: 'rodW' });
    const rodM = P.mesh(new T.CylinderGeometry(0.025, 0.055, ROD_LEN, 6), rodMat, this.rod, 0, 0, 0);
    rodM.position.copy(ROD_BASE).addScaledVector(ROD_DIR, ROD_LEN / 2); rodM.rotation.x = Math.atan2(ROD_DIR.z, ROD_DIR.y);
    P.cyl(toon(0x3b3b3b, { key: 'reel' }), this.rod, ROD_BASE.x + 0.08, ROD_BASE.y + 0.12, ROD_BASE.z + 0.18, 0.07, 0.06).rotation.z = Math.PI / 2;
    this.rodTip = new T.Vector3();
    // Загас (барихад дүр рүү нисдэг)
    this.fish = new T.Group(); this.fish.visible = false; scene.add(this.fish);
    P.sphere(this.mats.fish, this.fish, 0, 0, 0, 0.18, 0.11, 0.09);
    P.mesh(new T.ConeGeometry(1, 1, 6), this.mats.fin, this.fish, -0.22, 0, 0, 0.08, 0.16, 0.05).rotation.z = Math.PI / 2;
    // Эрэг дээрх хувин + самбар
    P.cyl(toon(0x6d8fa8, { key: 'bucket' }), scene, SPOT.x - 1.3, 0.3, SPOT.z + 1.7, 0.3, 0.6, 0.25);
    P.sign(scene, 'ЗАГАСНЫ ЦЭГ', SPOT.x - 0.6, 2.6, SPOT.z - 1.6, { width: 3.2, bg: '#e6f6ff', fg: '#1f5f8a', border: '#4fb3e8', post: true });
    interactables.push({ x: SPOT.x, z: SPOT.z, r: SPOT.r, label: 'Загас барих', icon: '🎣', visible: () => !this.active, action: () => this.start() });
  }

  // ---------- Төлөв ----------
  start() {
    if (this.active || this.scene.inWater(this.scene.player.pos.x, this.scene.player.pos.z)) return;
    this.active = true;
    this.scene.player.heading = Math.PI / 2;   // суваг руу (+x) харна
    this.cast();
  }

  /** Саваагаа дүр дээр байрлуулж, үзүүрийн дэлхийн координатыг тооцно */
  updateRod() {
    const pl = this.scene.player;
    this.rod.position.set(pl.pos.x, pl.visualY, pl.pos.z); this.rod.rotation.y = pl.heading;
    this.rod.updateMatrixWorld();
    this.rodTip.copy(ROD_BASE).addScaledVector(ROD_DIR, ROD_LEN); this.rod.localToWorld(this.rodTip);
    return this.rodTip;
  }

  cast() {
    this.phase = 'cast'; this.t = 0;
    this.rod.visible = true;
    this.from = this.updateRod().clone();
    this.to = new T.Vector3(TARGET.x + (Math.random() - 0.5) * 2, -0.3, TARGET.z + (Math.random() - 0.5) * 2);
    this.float.visible = this.line.visible = true;
    this.float.position.copy(this.from);
    this.trailFrom = null;
    this.promptText = '🎣 Шидэж байна…';
    this.scene.audio.whoosh();
  }

  /** E дарахад (TownScene.interact-аас давуу эрхтэй дуудагдана) */
  press() {
    if (this.phase === 'bite') this.startReel();
    else if (this.phase === 'wait') { toast('Хараахан хазаагүй… тэвчээртэй хүлээ', 1800, '🎣'); this.scene.audio.wrong(); this.cast(); }
  }

  /** Хазсан: татах mini-game эхэлнэ — чангалалт (tension) 0..1, ногоон бүсэд байлгаж progress дүүргэнэ */
  startReel() {
    this.phase = 'reel'; this.t = 0;
    this.tension = 0.45; this.progress = 0; this.perfect = true;
    this.tugT = 0.5; this.tugForce = 0; this.fishPhase = Math.random() * 6;
    this.castPos = this.float.position.clone();
    this.shorePos = new T.Vector3(SHORE_X, -0.35, this.castPos.z);
    this.promptText = '🎣 E барь — заагчийг ногоонд байлга!';
    this.ui.bar.classList.remove('hidden');
    this.scene.audio.ui();
  }

  updateReel(dt) {
    const sc = this.scene, fl = this.float.position;
    // Загасны тэмцэл: зөөлөн долгион + 0.6–1.2 сек тутам огцом татлага (аажуу суларна)
    this.tugT -= dt;
    if (this.tugT <= 0) {
      this.tugT = 0.6 + Math.random() * 0.6; this.tugForce = (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.3);
      sc.particles.burst(fl.clone(), 0xbff3ff, 6, { speed: 1.5, up: 2, size: 0.14, life: 0.5, gravity: 8 });
    }
    this.tugForce *= Math.exp(-dt * 3);
    const held = sc.input.held('interact');
    this.tension += ((held ? REEL_IN : -REEL_OUT) + Math.sin(this.t * 3 + this.fishPhase) * 0.25 + this.tugForce) * dt;
    this.tension = Math.max(0, Math.min(1, this.tension));
    if (this.tension >= 1) { this.snap(); return; }
    const inZone = this.tension >= ZONE[0] && this.tension <= ZONE[1];
    if (inZone) this.progress = Math.min(1, this.progress + dt / REEL_DUR);
    else { this.progress = Math.max(0, this.progress - dt * SLIP); this.perfect = false; }
    // Хөвүүр эрэг рүү ойртож, зүүн-баруун тэмцэнэ
    fl.lerpVectors(this.castPos, this.shorePos, this.progress);
    fl.z += Math.sin(this.t * 7 + this.fishPhase) * 0.3 * (1 - this.progress * 0.6);
    fl.y = -0.4 + Math.sin(this.t * 12) * 0.08;
    // UI
    this.ui.marker.style.left = (this.tension * 100) + '%';
    this.ui.prog.style.width = (this.progress * 100) + '%';
    this.ui.bar.classList.toggle('hot', this.tension > 0.85);
    if (this.progress >= 1) this.caught(this.perfect);
  }

  /** Хэт чангалсан — шугам тасарна */
  snap() {
    this.phase = 'missed'; this.t = 0;
    this.ui.bar.classList.add('hidden');
    this.line.visible = false;
    this.promptText = '💥 Шугам тасарлаа…';
    toast('Хэт чангалчихлаа — шугам тасарлаа! Ногоон бүсэд барь', 2200, '🎣');
    this.scene.audio.hurt();
    this.scene.particles.burst(this.float.position.clone(), 0xbff3ff, 12, { speed: 2.5, up: 3, size: 0.16, life: 0.6, gravity: 8 });
  }

  caught(perfect = false) {
    this.phase = 'caught'; this.t = 0;
    const sc = this.scene;
    this.ui.bar.classList.add('hidden');
    this.state.fishCaught(perfect);
    sc.character.cheer(); sc.audio.correct();
    sc.particles.burst(this.float.position.clone(), 0xffd24d, 16, { speed: 2.5, up: 4, size: 0.2, life: 0.7 });
    this.fishFrom = this.float.position.clone();
    this.fishTo = new T.Vector3(sc.player.pos.x, 1.6, sc.player.pos.z);
    this.fish.visible = true; this.fish.position.copy(this.fishFrom);
    this.float.visible = this.line.visible = false;
    this.promptText = perfect ? '⭐ Төгс тат!' : '🐟 Барилаа!';
    toast(perfect ? 'Төгс тат! Загас барилаа! +12 од' : 'Загас барилаа! +8 од', 2200, perfect ? '⭐' : '🐟');
    sc.progress('fish', 1); pop($('starCount')); sc.commit();
  }

  cancel() {
    this.active = false; this.phase = 'idle';
    this.float.visible = this.line.visible = this.fish.visible = this.rod.visible = false;
    this.ui.bar.classList.add('hidden');
    this.promptText = '';
  }

  update(dt) {
    if (!this.active) return;
    const sc = this.scene, pl = sc.player, fl = this.float.position;
    // Хөдөлбөл / үсэрвэл / машинд суувал / цэс нээгдвэл / цэгээс холдвол зогсоно
    if (sc.vehicle || sc.inWater(pl.pos.x, pl.pos.z) || !sc.active || !pl.grounded || Math.hypot(pl.vel.x, pl.vel.z) > 0.5 || Math.hypot(pl.pos.x - SPOT.x, pl.pos.z - SPOT.z) > SPOT.r + 0.5) { this.cancel(); return; }
    this.t += dt;
    if (this.phase === 'cast') {
      const k = Math.min(1, this.t / CAST_DUR);
      fl.lerpVectors(this.from, this.to, k); fl.y += Math.sin(k * Math.PI) * 1.6;
      if (k >= 1) { this.phase = 'wait'; this.t = 0; this.waitFor = 2 + Math.random() * 4; this.promptText = '🎣 Хүлээ…'; sc.audio.splash(); sc.particles.burst(fl.clone(), 0xbff3ff, 8, { speed: 1.5, up: 2, size: 0.14, life: 0.5, gravity: 8 }); }
    } else if (this.phase === 'wait') {
      fl.y = -0.3 + Math.sin(sc.clock * 2.5) * 0.05;
      // Загасны мөр: хазахын өмнө усны цацрал холоос хөвүүр рүү ойртоно (Minecraft шиг)
      const tk = (this.t - (this.waitFor - TRAIL_DUR)) / TRAIL_DUR;
      if (tk >= 0) {
        if (!this.trailFrom) { const a = Math.random() * Math.PI * 2; this.trailFrom = new T.Vector3(fl.x + Math.cos(a) * 3.5, -0.3, fl.z + Math.sin(a) * 2.5); }
        this.trailT = (this.trailT || 0) - dt;
        if (this.trailT <= 0) {
          this.trailT = 0.08;
          const p = new T.Vector3().lerpVectors(this.trailFrom, fl, tk); p.z += Math.sin(tk * 14) * 0.25 * (1 - tk);
          sc.particles.burst(p, 0xd8f6ff, 2, { speed: 0.6, up: 0.8, size: 0.13, life: 0.45, gravity: 5 });
        }
      }
      if (this.t >= this.waitFor) {
        this.trailFrom = null; this.phase = 'bite'; this.t = 0; this.promptText = '🎣 E — ТАТ!'; sc.audio.splash(); sc.particles.burst(fl.clone(), 0xbff3ff, 14, { speed: 2.5, up: 3, size: 0.18, life: 0.6, gravity: 8 }); }
    } else if (this.phase === 'reel') {
      this.updateReel(dt);
    } else if (this.phase === 'bite') {
      fl.y = -0.65 + Math.sin(sc.clock * 18) * 0.06;
      if (this.t >= BITE_WINDOW) { this.phase = 'missed'; this.t = 0; this.promptText = '💨 Мултарлаа…'; toast('Загас мултарлаа… дахин оролд', 1800, '🎣'); sc.audio.wrong(); }
    } else if (this.phase === 'missed') {
      fl.y = -0.3;
      if (this.t >= MISS_DUR) this.cast();
    } else if (this.phase === 'caught') {
      const k = Math.min(1, this.t / 0.6);
      this.fish.position.lerpVectors(this.fishFrom, this.fishTo, k); this.fish.position.y += Math.sin(k * Math.PI) * 2;
      this.fish.rotation.y = sc.clock * 6;
      if (k >= 1) this.fish.visible = false;
      if (this.t >= CAUGHT_DUR) this.cast();
    }
    // Шугам: савааны үзүүрээс хөвүүр хүртэл
    const tip = this.updateRod(), pos = this.lineGeo.attributes.position;
    pos.setXYZ(0, tip.x, tip.y, tip.z);
    pos.setXYZ(1, fl.x, fl.y, fl.z);
    pos.needsUpdate = true;
  }
}
