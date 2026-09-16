// Иргэдийн өдрийн хүсэлт: өдөр бүр 2 иргэн жимс эсвэл Луувсайтай уулзахыг хүснэ (❗). Логик GameState.ensureRequests/fulfillRequest.
import * as T from 'three';
import { FRUITS } from '../core/content.js';
import { GameState } from '../core/state.js';
import { $, modal, closeModal, toast } from '../core/ui.js';

export class CitizenRequests {
  constructor(scene) { this.scene = scene; this.bubbleT = 0; }

  setup() { this.scene.state.ensureRequests(this.scene.citizens.length); }

  /** Иргэний биелээгүй хүсэлт */
  of(c) { return this.scene.state.requestFor(this.scene.citizens.indexOf(c)); }

  text(req) {
    if (req.type === 'fruit') { const f = FRUITS[req.fruit]; return `${f.emoji} ${f.name} ${req.n} ширхэг олж өгөөч!`; }
    return 'Луувсайтай уулзмаар байна, дагуулж ирээч!';
  }

  update(dt) {
    const sc = this.scene;
    sc.state.ensureRequests(sc.citizens.length);   // шөнө дунд өдөр солигдвол
    this.bubbleT += dt;
    if (this.bubbleT < 6) return;
    this.bubbleT = 0;
    for (const r of sc.state.requests.list) {
      const c = sc.citizens[r.c];
      if (!r.done && c && !c.carried && !c.knock && !c.upset) sc.bubbles.show(c.m.root, '❗', { dur: 1.6 });
    }
  }

  dogNear(c) {
    const sc = this.scene; if (!sc.state.pet) return false;
    const d = sc.dog.root.position, p = c.m.root.position;
    return Math.hypot(d.x - p.x, d.z - p.z) < 4;
  }

  /** Ярилцах цонхны хүсэлтийн хэсэг: { html, bind() } */
  panel(c, req) {
    const sc = this.scene, st = sc.state;
    let btn, why = '';
    if (req.type === 'fruit') {
      const f = FRUITS[req.fruit], have = st.inventory[req.fruit] || 0, ok = have >= req.n;
      btn = `<button id="reqGive" class="primary" ${ok ? '' : 'disabled'}>Өгөх (${f.emoji} ×${req.n})</button>`;
      if (!ok) why = `<small class="hint">Танд ${f.emoji} ${have} байна — ${f.name} түүгээд ирээрэй.</small>`;
    } else {
      const ok = this.dogNear(c);
      btn = `<button id="reqGive" class="primary" ${ok ? '' : 'disabled'}>Луувсай энд байна! 🐶</button>`;
      if (!ok) why = `<small class="hint">${st.pet ? 'Луувсайг дагуулж ирээрэй.' : 'Эхлээд усан оргилуурын дэргэд Луувсайг дагуул.'}</small>`;
    }
    const html = `<div class="req"><p><b>❗ Хүсэлт:</b> «${this.text(req)}»</p>${btn} ${why}</div>`;
    const bind = () => { const b = $('reqGive'); if (b) b.onclick = () => this.fulfill(c, req); };
    return { html, bind };
  }

  fulfill(c, req) {
    const sc = this.scene;
    const r = sc.state.fulfillRequest(req, { dogNear: this.dogNear(c) });
    if (!r.ok) return sc.audio.wrong();
    closeModal();
    c.m.cheer(); sc.character.cheer(); c.m.setMood('happy', 2);
    sc.bubbles.show(c.m.root, '❤️', { dur: 2 });
    sc.particles.burst(c.m.root.position.clone().add(new T.Vector3(0, 1.8, 0)), 0xffa7c0, 16, { speed: 2.5, up: 3, size: 0.18, life: 0.9, gravity: 3 });
    sc.audio.correct();
    toast(`${c.name}: «Баярлалаа!» +${GameState.REQUEST_REWARD} од`, 3000, '❤️'); sc.say?.(c.m.root, 'Баярлалаа! Чи үнэхээр сайн найз юм!', 1.6);
    sc.progress('request', 1);
    sc.state.save(); sc.updateHUD();
  }
}
