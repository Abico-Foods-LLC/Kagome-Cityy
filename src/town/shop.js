// Kagome маркет: 5 tab (хувцас, машин, Луувсай, эффект, гэр). Логик GameState.buy/equip, дүрслэл scene.applyEquipment().
import { SHOP, SHOP_TABS } from '../core/content.js';
import { $, modal, closeModal, toast } from '../core/ui.js';

export class ShopUI {
  constructor(scene) { this.scene = scene; this.cat = 'wear'; }

  open(cat = this.cat) {
    this.cat = cat;
    const { state: st, audio } = this.scene;
    const isMascot = st.settings.avatar !== 'suit';
    const tabs = SHOP_TABS.map((t) => `<button class="tab ${t.cat === cat ? 'on' : ''}" data-tab="${t.cat}">${t.emoji} ${t.label}</button>`).join('');
    const items = SHOP.filter((i) => i.cat === cat && (!i.secret || st.owns(i.id))).map((i) => {
      const owned = st.owns(i.id), on = i.slot ? st.equipped(i.slot) === i.id : owned;
      let btn;
      if (!owned) btn = `<button data-buy="${i.id}" ${st.stars < i.price ? 'disabled' : ''}>⭐ ${i.price}</button>`;
      else if (!i.slot) btn = `<button class="primary" disabled>Байрлуулсан ✓</button>`;
      else btn = `<button data-wear="${i.id}" class="${on ? 'primary' : ''}">${on ? 'Тайлах' : 'Өмсөх'}</button>`;
      return `<div class="shop-item ${on ? 'on' : ''}"><span class="em">${i.emoji}</span><small>${i.name}</small>${btn}</div>`;
    }).join('') || '<p class="hint">Энд одоогоор бараа алга.</p>';
    const note = { wear: isMascot ? 'Оддоо цуглуулаад дүрээ гоёорой.' : '<i>Аксессуар mascot дүрүүдэд л харагдана.</i>', car: 'Жимсэн машинаа будаж, чимэглэ.', dog: st.pet ? 'Луувсайгаа гоё.' : '<i>Эхлээд Луувсайг дагуул (усан оргилуурын дэргэд).</i>', trail: 'Алхахад ард чинь эффект үлдэнэ.', home: 'Талбайн дэргэдэх «Миний булан»-д байрлана.' }[cat];
    modal(`<div class="eyebrow">KAGOME МАРКЕТ</div><h2>Од ⭐ <b id="shopStars">${st.stars}</b></h2><div class="tabs">${tabs}</div><p>${note}</p><div class="shop">${items}</div><div class="row"><button id="shopCollection">🧃 Цуглуулга</button><button class="ghost" id="shopClose">Хаах</button></div>`);
    document.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { audio.ui(); this.open(b.dataset.tab); });
    document.querySelectorAll('[data-buy]').forEach((b) => b.onclick = () => {
      const item = SHOP.find((i) => i.id === b.dataset.buy);
      if (!st.buy(item.id, item.price)) return audio.wrong();
      if (item.slot) st.wardrobe.equipped[item.slot] = item.id;
      st.save(); this.scene.applyEquipment(); audio.correct();
      toast(item.name + (item.slot ? ' авлаа!' : ' байрлууллаа!'), 2000, item.emoji);
      this.scene.updateHUD(); this.open(cat);
    });
    document.querySelectorAll('[data-wear]').forEach((b) => b.onclick = () => {
      const item = SHOP.find((i) => i.id === b.dataset.wear);
      st.equip(item.id, item.slot); st.save(); this.scene.applyEquipment(); audio.ui(); this.open(cat);
    });
    $('shopCollection').onclick = () => this.scene.collection();
    $('shopClose').onclick = closeModal;
  }
}
