// Хүргэлтийн даалгавар: хотын төвийн захиалгын самбараас хугацаатай захиалга авч, NPC-д жимс хүргэнэ.
// Идэвхтэй захиалга session-д л амьдарна (хадгалахгүй).
import * as T from 'three';
import * as P from '../world/props.js';
import { toon, PALETTE } from '../gfx/materials.js';
import { FRUITS } from '../core/content.js';
import { $, modal, closeModal, toast, pop } from '../core/ui.js';

const BOARD = { x: 5, z: -19 };
const MIN_DIST = 25;   // самбараас дор хаяж ийм зайтай NPC л хүлээн авагч болно

export class DeliveryBoard {
  constructor(scene) {
    this.scene = scene; this.state = scene.state;
    this.active = null;   // { npc, type, count, sec, start }
    this.offer = null;    // самбар дээр санал болгож буй захиалга
    this.hud = $('deliveryHud');
    this.setup();
  }

  setup() {
    const { scene, town, interactables } = this.scene;
    // Зарлалын самбар: 2 шон, модон самбар, дээвэр, урд талд нэр + наасан цаас, дугтуй (урд тал +z — усан оргилуур руу)
    const wood = toon(PALETTE.woodDark, { key: 'woodD' }), plank = toon(0xc99a5b, { key: 'boardPlank' });
    for (const s of [-1, 1]) P.cyl(wood, scene, BOARD.x + s * 1.05, 1.1, BOARD.z, 0.07, 2.2);
    P.box(plank, scene, BOARD.x, 1.5, BOARD.z, 2.4, 1.2, 0.1);
    P.box(wood, scene, BOARD.x, 2.18, BOARD.z, 2.7, 0.12, 0.3);
    P.sign(scene, 'ЗАХИАЛГА', BOARD.x, 1.82, BOARD.z + 0.07, { width: 2.0, bg: '#fff1d6', fg: '#8a4a12', border: '#e07a3f', double: false });
    const paper = toon(0xfffdf0, { key: 'boardPaper' });
    P.box(paper, scene, BOARD.x - 0.65, 1.2, BOARD.z + 0.07, 0.5, 0.42, 0.02).rotation.z = 0.08;
    P.box(paper, scene, BOARD.x + 0.05, 1.18, BOARD.z + 0.07, 0.5, 0.42, 0.02).rotation.z = -0.06;
    P.box(toon(0xe07a3f, { key: 'boardOr' }), scene, BOARD.x + 0.75, 1.2, BOARD.z + 0.07, 0.42, 0.28, 0.03);   // дугтуй
    P.contactShadow(scene, 1.5, BOARD.x, BOARD.z, 0.5);
    town.colliders.push({ x: BOARD.x - 1.05, z: BOARD.z, r: 0.25 }, { x: BOARD.x + 1.05, z: BOARD.z, r: 0.25 }, { x: BOARD.x, z: BOARD.z, r: 0.2 });
    interactables.push({ x: BOARD.x, z: BOARD.z, r: 3, label: 'Захиалгын самбар', icon: '📬', action: () => this.open() });
  }

  dist(npc) { return Math.hypot(npc.x - BOARD.x, npc.z - BOARD.z); }

  newOffer() {
    const all = this.scene.town.npcs, far = all.filter((n) => this.dist(n) >= MIN_DIST);
    const npcs = far.length ? far : all;   // бүгд ойрхон бол хамаагүй
    const npc = npcs[Math.floor(Math.random() * npcs.length)];
    const type = Math.floor(Math.random() * FRUITS.length);
    const count = Math.random() < 0.6 ? 2 : 3;
    const sec = Math.round(30 + this.dist(npc) * 1.2);
    this.offer = { npc, type, count, sec };
    return this.offer;
  }

  // ---------- Самбарын modal ----------
  open() {
    if (this.active) return this.activeModal();
    if (!this.offer) this.newOffer();
    const o = this.offer, f = FRUITS[o.type], have = this.state.inventory[o.type] || 0, ok = have >= o.count;
    modal(`<div class="eyebrow">ЗАХИАЛГЫН САМБАР</div><h2>Хүргэлтийн даалгавар</h2>
      <div class="npc-head"><div class="reward">${FRUITS[o.npc.type].emoji}</div><div><div class="eyebrow">ХҮЛЭЭН АВАГЧ</div><h2 style="margin:0">${o.npc.name}</h2></div></div>
      <p>«${f.emoji} ${f.name} ×${o.count} хэрэгтэй байна — <b>${o.sec} секунд</b> дотор авчирч өгөөч!»</p>
      <p>Зай: <b>${Math.round(this.dist(o.npc))} м</b> · Хугацаанд нь хүрвэл <b>+30 од</b>, хоцорвол +15 од. Жимсэн машинаар хурдан хүрнэ 🚗</p>
      ${ok ? '' : `<p class="hint">${f.emoji} ${o.count} хэрэгтэй, чамд ${have} байна — цэцэрлэг эсвэл фермээс түүгээд ир.</p>`}
      <div class="row"><button id="dlAccept" class="primary" ${ok ? '' : 'disabled'}>Хүлээн авах</button><button id="dlOther" class="ghost">Өөр захиалга</button><button id="dlClose" class="ghost">Хаах</button></div>`);
    $('dlAccept').onclick = () => this.accept();
    $('dlOther').onclick = () => { this.newOffer(); this.scene.audio.ui(); this.open(); };
    $('dlClose').onclick = () => closeModal();
  }

  activeModal() {
    const a = this.active, f = FRUITS[a.type];
    modal(`<div class="eyebrow">ЗАХИАЛГЫН САМБАР</div><h2>Идэвхтэй хүргэлт</h2><p>${f.emoji} ${f.name} ×${a.count} → <b>${a.npc.name}</b> · үлдсэн <b>${this.fmtLeft()}</b></p><div class="row"><button id="dlCancel">Цуцлах</button><button id="dlClose" class="ghost">Хаах</button></div>`);
    $('dlCancel').onclick = () => { this.finish(); closeModal(); toast('Захиалга цуцлагдлаа', 2000, '📬'); };
    $('dlClose').onclick = () => closeModal();
  }

  accept() {
    const o = this.offer; this.offer = null;
    this.active = { ...o, start: performance.now() };
    closeModal();
    this.scene.setGoal({ x: o.npc.x, z: o.npc.z });
    this.hud.classList.remove('hidden', 'urgent');
    this.scene.audio.ui();
    toast(`Захиалга авлаа! ${o.npc.name} руу алтан тэмдгийг дагаарай`, 3000, '📬');
    this.render();
  }

  elapsed() { return (performance.now() - this.active.start) / 1000; }
  left() { return this.active.sec - this.elapsed(); }
  fmtLeft() { const s = Math.max(0, Math.ceil(this.left())); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

  finish() {
    this.active = null;
    this.hud.classList.add('hidden');
    this.scene.setGoalForChapter();
  }

  // ---------- Хүргэх ----------
  /** NPC-д E дарахад TownScene дуудна. Идэвхтэй захиалгын хүлээн авагч биш бол false (энгийн яриа үргэлжилнэ). */
  deliver(npc) {
    const a = this.active;
    if (!a || a.npc !== npc) return false;
    const sc = this.scene, f = FRUITS[a.type], have = this.state.inventory[a.type] || 0;
    if (have < a.count) {
      sc.audio.wrong();
      modal(`<div class="npc-head"><div class="reward">${FRUITS[npc.type].emoji}</div><div><div class="eyebrow">ХҮРГЭЛТ</div><h2>${npc.name}</h2></div></div><p>«${f.emoji} ${f.name} ${a.count} хэрэгтэй, чамд ${have} л байна. Түүгээд дахин ирээрэй!»</p><div class="row"><button id="dlOk" class="primary">За</button></div>`);
      $('dlOk').onclick = () => closeModal();
      return true;
    }
    const onTime = this.elapsed() <= a.sec;
    this.state.inventory[a.type] -= a.count;
    this.state.deliveryDone(onTime);
    npc.m.cheer(); sc.character.play('wave', 1.1);
    sc.particles.burst(new T.Vector3(npc.x, 1.8, npc.z), 0xffd24d, 26, { speed: 4, up: 4 });
    if (onTime) sc.audio.fanfare(); else sc.audio.correct();
    modal(`<div class="npc-head"><div class="reward">${FRUITS[npc.type].emoji}</div><div><div class="eyebrow">ХҮРГЭЛТ ${onTime ? 'АМЖИЛТТАЙ' : 'ХОЦОРСОН'}</div><h2>${npc.name}</h2></div></div><p>«${onTime ? 'Яг цагтаа! Маш их баярлалаа!' : 'Жаахан хоцорсон ч баярлалаа!'}» ${f.emoji}×${a.count}</p><p><b>+${onTime ? 30 : 15} од ⭐</b></p><div class="row"><button id="dlOk" class="primary">Үргэлжлүүлэх</button></div>`);
    $('dlOk').onclick = () => closeModal();
    this.finish();
    sc.progress('delivery', 1); pop($('starCount')); sc.commit();
    return true;
  }

  // ---------- HUD ----------
  render() {
    const a = this.active, l = this.left();
    const txt = `📬 ${a.npc.name} · ${FRUITS[a.type].emoji}×${a.count} · ${this.fmtLeft()}${l < 0 ? ' · хоцорч байна' : ''}`;
    if (this.hud.textContent !== txt) this.hud.textContent = txt;
    this.hud.classList.toggle('urgent', l <= 10);
  }

  update() { if (this.active) this.render(); }
}
