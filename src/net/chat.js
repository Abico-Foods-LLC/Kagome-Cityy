// Чат: бэлэн үг + emoji (чөлөөт бичихгүй — хүүхдэд аюулгүй). T / 💬 → цонх; сонгоход бүгдэд бөмбөлөг + лог.
import { $ } from '../core/ui.js';

export const PHRASES = ['Сайн уу! 👋', 'Ирээрэй!', 'Хөөх! 😮', 'Баярлалаа 🙏', 'Хамт машинаар явъя 🚗', 'Намайг өргөөч 🙌', 'Буулгаач! 😅', 'Загас барья 🎣', 'Талбай руу 🌱', 'Ширэнгэ рүү 🌴', 'Баяртай 👋', 'Ха-ха 😂'];
export const EMOJIS = ['😀', '😂', '😮', '😍', '😎', '🎉', '👍', '👋', '❤️', '🥕', '🍎', '🐶'];
const ALLOWED = new Set([...PHRASES, ...EMOJIS]);

export class Chat {
  constructor(scene) { this.scene = scene; this.open = false; this.log = []; }

  setup() {
    const box = $('chatBox');
    box.innerHTML = `<div class="chatRow">${PHRASES.map((p, i) => `<button data-ph="${i}">${p}</button>`).join('')}</div><div class="chatRow em">${EMOJIS.map((e, i) => `<button data-em="${i}">${e}</button>`).join('')}</div>`;
    box.querySelectorAll('[data-ph]').forEach((b) => b.onclick = () => this.send(PHRASES[+b.dataset.ph]));
    box.querySelectorAll('[data-em]').forEach((b) => b.onclick = () => this.send(EMOJIS[+b.dataset.em]));
    $('chatButton').onclick = () => this.toggle();
  }
  toggle(force) {
    const sc = this.scene;
    if (!sc.net.active) return;
    this.open = force ?? !this.open;
    $('chatBox').classList.toggle('hidden', !this.open);
    sc.audio.ui();
  }
  send(text) {
    if (!ALLOWED.has(text)) return;
    this.scene.net.sendEvent({ t: 'chat', text });
    this.receive(this.scene.net.selfId, text);
    this.toggle(false);
  }
  /** Ирсэн (эсвэл өөрийн) үг: толгой дээр бөмбөлөг + лог */
  receive(from, text) {
    if (!ALLOWED.has(text)) return;
    const sc = this.scene, me = from === sc.net.selfId;
    const name = me ? (sc.state.settings.name || 'Та') : (sc.net.peers.get(from)?.name || 'Тоглогч');
    const root = me ? sc.character.root : sc.remote.get(from)?.avatar.root;
    if (root) { if (EMOJIS.includes(text)) sc.bubbles.show(root, text, { dur: 2.2 }); else sc.bubbles.showText(root, text, { dur: 3 }); }
    this.log.push({ name, text, t: performance.now() });
    if (this.log.length > 5) this.log.shift();
    this.render();
    if (!me) sc.audio.tone({ f: 880, f2: 1100, type: 'sine', dur: 0.1, vol: 0.06 });
  }
  render() {
    const el = $('chatLog');
    el.innerHTML = this.log.map((l) => `<div><b>${l.name}:</b> ${l.text}</div>`).join('');
    el.classList.toggle('hidden', !this.log.length);
  }
  update() {
    if (!this.log.length) return;
    const now = performance.now();
    if (now - this.log[0].t > 8000) { this.log.shift(); this.render(); }
    $('chatButton').classList.toggle('hidden', !this.scene.net.active);
  }
}
