// Загас барих: сувгийн эрэг дээр timing mini-game — modal-гүй, бүгд 3D ертөнцөд болно.
// Төлөв: idle → cast → wait → bite → caught | missed → cast …
import * as T from 'three';
import * as P from '../world/props.js';
import { toon, applyCurve, PALETTE } from '../gfx/materials.js';
import { $, toast, pop } from '../core/ui.js';

const SPOT = { x: 16, z: -25, r: 3 };       // эрэг дээрх зогсох цэг (загасчны хажууд)
const TARGET = { x: 21, z: -25 };            // хөвүүр буух цэг (сувгийн гол)
const CAST_DUR = 0.5, BITE_WINDOW = 1.0, MISS_DUR = 0.8, CAUGHT_DUR = 1.2;

export class FishingGame {
  constructor(scene) {
    this.scene = scene; this.state = scene.state;
    this.active = false; this.phase = 'idle'; this.t = 0; this.waitFor = 0;
    this.promptText = '';
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
    // Загас (барихад дүр рүү нисдэг)
    this.fish = new T.Group(); this.fish.visible = false; scene.add(this.fish);
    P.sphere(this.mats.fish, this.fish, 0, 0, 0, 0.18, 0.11, 0.09);
    P.mesh(new T.ConeGeometry(1, 1, 6), this.mats.fin, this.fish, -0.22, 0, 0, 0.08, 0.16, 0.05).rotation.z = Math.PI / 2;
    // Эрэг дээрх хувин + самбар
    P.cyl(toon(0x6d8fa8, { key: 'bucket' }), scene, SPOT.x - 0.9, 0.3, SPOT.z + 1.2, 0.3, 0.6, 0.25);
    P.sign(scene, 'ЗАГАСНЫ ЦЭГ', SPOT.x - 0.6, 2.6, SPOT.z - 1.6, { width: 3.2, bg: '#e6f6ff', fg: '#1f5f8a', border: '#4fb3e8', post: true });
    interactables.push({ x: SPOT.x, z: SPOT.z, r: SPOT.r, label: 'Загас барих', icon: '🎣', visible: () => !this.active, action: () => this.start() });
  }

  // ---------- Төлөв ----------
  start() {
    if (this.active) return;
    this.active = true;
    this.scene.player.heading = Math.PI / 2;   // суваг руу (+x) харна
    this.cast();
  }

  cast() {
    this.phase = 'cast'; this.t = 0;
    const pp = this.scene.player.pos;
    this.from = new T.Vector3(pp.x + 0.4, 1.4, pp.z);
    this.to = new T.Vector3(TARGET.x + (Math.random() - 0.5) * 2, -0.3, TARGET.z + (Math.random() - 0.5) * 2);
    this.float.visible = this.line.visible = true;
    this.float.position.copy(this.from);
    this.promptText = '🎣 Шидэж байна…';
    this.scene.audio.whoosh();
  }

  /** E дарахад (TownScene.interact-аас давуу эрхтэй дуудагдана) */
  press() {
    if (this.phase === 'bite') this.caught();
    else if (this.phase === 'wait') { toast('Хараахан хазаагүй… тэвчээртэй хүлээ', 1800, '🎣'); this.scene.audio.wrong(); this.cast(); }
  }

  caught() {
    this.phase = 'caught'; this.t = 0;
    const sc = this.scene;
    this.state.fishCaught();
    sc.character.cheer(); sc.audio.correct();
    sc.particles.burst(this.float.position.clone(), 0xffd24d, 16, { speed: 2.5, up: 4, size: 0.2, life: 0.7 });
    this.fishFrom = this.float.position.clone();
    this.fishTo = new T.Vector3(sc.player.pos.x, 1.6, sc.player.pos.z);
    this.fish.visible = true; this.fish.position.copy(this.fishFrom);
    this.float.visible = this.line.visible = false;
    this.promptText = '🐟 Барилаа!';
    toast('Загас барилаа! +8 од', 2200, '🐟');
    sc.progress('fish', 1); pop($('starCount')); sc.commit();
  }

  cancel() {
    this.active = false; this.phase = 'idle';
    this.float.visible = this.line.visible = this.fish.visible = false;
    this.promptText = '';
  }

  update(dt) {
    if (!this.active) return;
    const sc = this.scene, pl = sc.player, fl = this.float.position;
    // Хөдөлбөл / үсэрвэл / машинд суувал / цэс нээгдвэл / цэгээс холдвол зогсоно
    if (sc.vehicle || !sc.active || !pl.grounded || Math.hypot(pl.vel.x, pl.vel.z) > 0.5 || Math.hypot(pl.pos.x - SPOT.x, pl.pos.z - SPOT.z) > SPOT.r + 0.5) { this.cancel(); return; }
    this.t += dt;
    if (this.phase === 'cast') {
      const k = Math.min(1, this.t / CAST_DUR);
      fl.lerpVectors(this.from, this.to, k); fl.y += Math.sin(k * Math.PI) * 1.6;
      if (k >= 1) { this.phase = 'wait'; this.t = 0; this.waitFor = 2 + Math.random() * 4; this.promptText = '🎣 Хүлээ…'; sc.audio.splash(); sc.particles.burst(fl.clone(), 0xbff3ff, 8, { speed: 1.5, up: 2, size: 0.14, life: 0.5, gravity: 8 }); }
    } else if (this.phase === 'wait') {
      fl.y = -0.3 + Math.sin(sc.clock * 2.5) * 0.05;
      if (this.t >= this.waitFor) { this.phase = 'bite'; this.t = 0; this.promptText = '🎣 E — ТАТ!'; sc.audio.splash(); sc.particles.burst(fl.clone(), 0xbff3ff, 14, { speed: 2.5, up: 3, size: 0.18, life: 0.6, gravity: 8 }); }
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
    // Шугам: дүрийн гараас хөвүүр хүртэл
    const pos = this.lineGeo.attributes.position;
    pos.setXYZ(0, pl.pos.x + Math.sin(pl.heading) * 0.4, 1.5, pl.pos.z + Math.cos(pl.heading) * 0.4);
    pos.setXYZ(1, fl.x, fl.y, fl.z);
    pos.needsUpdate = true;
  }
}
