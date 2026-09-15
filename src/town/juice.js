// Шүүсний лаборатори: Kagome-ийн 4 амтыг лууван + жимс хольж "үйлдвэрлэх" mini-game (DOM).
import { FRUITS, PRODUCTS } from '../core/content.js';
import { $, modal, closeModal, toast } from '../core/ui.js';

const RECIPES = [
  { fruit: 1, name: 'Лууван & Жүрж', color: '#ff9a1f', fact: 'Жүрж витамин C-ээр баялаг — дархлааг дэмжинэ. Kagome 野菜生活100 нь 100% жимс ногооны шүүс!' },
  { fruit: 2, name: 'Лууван & Усан үзэм', color: '#8f5cd6', fact: 'Усан үзмийн полифенол зүрхэнд сайн. Ягаан өнгө нь усан үзмийн хальснаас!' },
  { fruit: 3, name: 'Лууван & Манго', color: '#ffc02e', fact: 'Лууван ба манго хоёулаа β-каротинтой — нүд, арьсанд тустай.' },
  { fruit: 0, name: 'Лууван & Алим', color: '#f0464f', fact: 'Алимны эслэг хоол боловсруулалтад тусална. Өдөрт нэг алим!' },
];

export class JuiceGame {
  constructor(scene) { this.scene = scene; this.state = scene.state; }

  /** Лангууны нөөц: өдөрт 4 лууван + жимс тус бүр 2 (тоглогчийн ургац дээр нэмэгдэнэ) */
  stock() {
    const s = this.state; s.juice = s.juice || { made: {}, stockDate: '', stock: {} };
    const today = new Date().toISOString().slice(0, 10);
    if (s.juice.stockDate !== today) { s.juice.stockDate = today; s.juice.stock = { 4: 4, 0: 2, 1: 2, 2: 2, 3: 2 }; }
    return s.juice.stock;
  }
  have(type) { return (this.state.inventory[type] || 0) + (this.stock()[type] || 0); }
  take(type, n) {
    const st = this.stock();
    for (let i = 0; i < n; i++) { if ((this.state.inventory[type] || 0) > 0) this.state.inventory[type]--; else if (st[type] > 0) st[type]--; }
  }

  open() {
    this.orders = 0; this.bonus = 3; this.timeLeft = 90; this.started = Date.now();
    this.newOrder();
  }

  newOrder() {
    const big = Math.random() < 0.4;
    const r = RECIPES[Math.floor(Math.random() * 4)];
    this.order = { recipe: r, big, need: { 4: big ? 3 : 2, [r.fruit]: big ? 3 : 2 }, sku: big ? r.fruit === 0 ? 3 : r.fruit - 1 : r.fruit === 0 ? 7 : r.fruit + 3 };
    // sku: 720ml = 0..3 (жүрж, үзэм, манго, алим), 200ml = 4..7
    this.mix = { 4: 0, 0: 0, 1: 0, 2: 0, 3: 0 };
    this.render();
  }

  render() {
    const o = this.order, r = o.recipe;
    const total = Object.values(this.mix).reduce((a, b) => a + b, 0), needTotal = Object.values(o.need).reduce((a, b) => a + b, 0);
    const fill = Math.min(100, total / needTotal * 100);
    const chips = [4, r.fruit, ...[0, 1, 2, 3].filter((t) => t !== r.fruit)].map((t) => `<button data-ing="${t}" ${this.have(t) <= 0 ? 'disabled' : ''}><span>${FRUITS[t].emoji}</span><small>${FRUITS[t].name}</small><b>${this.have(t)}</b></button>`).join('');
    const mixList = Object.entries(this.mix).filter(([, n]) => n > 0).map(([t, n]) => `${FRUITS[t].emoji}×${n}`).join(' ') || '—';
    const needList = Object.entries(o.need).map(([t, n]) => `${FRUITS[t].emoji}×${n}`).join(' + ');
    const made = this.state.juice.made[o.sku] || 0;
    modal(`<div class="eyebrow">KAGOME ШҮҮСНИЙ ЛАБОРАТОРИ · захиалга ${this.orders + 1}/3</div>
      <div class="juice-head"><img src="${PRODUCTS[o.sku].src}" alt=""><div><h2 style="margin:0">${r.name}</h2><p style="margin:4px 0"><b>${o.big ? '720 мл' : '200 мл'}</b> · Жор: ${needList}</p><small>Өмнө нь ${made} ш хийсэн</small></div></div>
      <div class="juice-area">
        <div class="blender ${this.shaking ? 'shake' : ''}"><div class="jar"><div class="liquid" style="height:${fill}%;background:${r.color}"></div><div class="mixlist">${mixList}</div></div><div class="base"></div></div>
        <div class="ings">${chips}</div>
      </div>
      <div class="row"><button class="primary" id="jMix" ${total === 0 ? 'disabled' : ''}>🌀 Холих</button><button id="jClear" class="ghost">Асгах</button><button id="jClose" class="ghost">Гарах</button></div>
      <p class="hint">Лууван цэцэрлэг/фермээс, жимс модноос түүсэн ургац чинь энд орно. Лангууны өдрийн нөөц: лууван 4, жимс тус бүр 2.</p>`);
    document.querySelectorAll('[data-ing]').forEach((b) => b.onclick = () => {
      const t = +b.dataset.ing;
      if (this.have(t) - (this.mix[t] || 0) <= 0) { this.scene.audio.wrong(); return; }
      this.mix[t] = (this.mix[t] || 0) + 1; this.scene.audio.pickup(t); this.render();
    });
    $('jMix').onclick = () => this.blend();
    $('jClear').onclick = () => { this.mix = { 4: 0, 0: 0, 1: 0, 2: 0, 3: 0 }; this.scene.audio.splash(); this.render(); };
    $('jClose').onclick = () => closeModal();
  }

  blend() {
    const o = this.order;
    const ok = Object.keys({ ...this.mix, ...o.need }).every((t) => (this.mix[t] || 0) === (o.need[t] || 0));
    this.scene.audio.spin();
    this.shaking = true; this.render(); this.shaking = false;
    setTimeout(() => {
      if (!ok) { this.scene.audio.wrong(); toast('Найрлага буруу байна — жорыг дахин хараарай', 2500, '🧪'); this.mix = { 4: 0, 0: 0, 1: 0, 2: 0, 3: 0 }; this.render(); return; }
      for (const [t, n] of Object.entries(o.need)) this.take(+t, n);
      const reward = o.big ? 35 : 20;
      const st = this.state; st.stars += reward; st.juice.made[o.sku] = (st.juice.made[o.sku] || 0) + 1;
      this.orders++;
      st.save(); this.scene.updateHUD(); this.scene.audio.correct(); this.scene.progress('juice', 1);
      const done = this.orders >= 3;
      modal(`<div class="reward"><img src="${PRODUCTS[o.sku].src}" alt="" style="height:150px" class="bottle-pop"></div><div class="eyebrow" style="text-align:center">ШҮҮС БЭЛЭН!</div><h2 style="text-align:center">${o.recipe.name} · ${o.big ? '720' : '200'} мл</h2><p style="text-align:center">+${reward} од ⭐</p><p class="hint">💡 ${o.recipe.fact}</p><div class="row" style="justify-content:center"><button class="primary" id="jNext">${done ? 'Дууслаа 🎉' : 'Дараагийн захиалга →'}</button></div>`);
      $('jNext').onclick = () => { if (done) { closeModal(); this.scene.character.cheer(); toast('Өнөөдрийн 3 захиалга бүгд бэлэн! Маргааш дахин ир.', 3000, '🧃'); } else this.newOrder(); };
    }, 1300);
  }
}
