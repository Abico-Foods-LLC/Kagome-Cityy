// Дүрүүдийн яриа: монгол хоолой (Web Speech API, mn-MN, өндөр pitch = хүүхдийн хоолой) байвал уншина;
// байхгүй бол Animal Crossing маягийн хөөрхөн "бабабаа" procedural дуу хоолой (текстийн үеэр).
export class Voice {
  constructor(audio, state) {
    this.audio = audio; this.state = state; this.voice = null; this.ready = false; this.babbleT = 0;
    this.load();
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.addEventListener?.('voiceschanged', () => this.load());
  }
  get enabled() { return this.state.settings.voice !== false && this.state.settings.sound !== false; }
  load() {
    if (typeof speechSynthesis === 'undefined') return;
    const vs = speechSynthesis.getVoices() || [];
    // 1) Монгол хоолой: mn-MN (Edge: Yesui/Bataa Neural). 2) Үгүй бол орос хоолой — кирилл текстийг ойролцоо уншина (ө→о, ү→у)
    this.voice = vs.find((v) => /^mn/i.test(v.lang) && /yesui|female/i.test(v.name)) || vs.find((v) => /^mn/i.test(v.lang)) || null;
    this.ruVoice = vs.find((v) => /^ru/i.test(v.lang) && /female|milena|google|elena|svetlana|irina/i.test(v.name)) || vs.find((v) => /^ru/i.test(v.lang)) || null;
    this.ready = true;
  }
  get hasMongolian() { return !!this.voice; }
  get hasRussian() { return !!this.ruVoice; }
  get mode() { return this.voice ? 'mn' : this.ruVoice ? 'ru' : 'babble'; }
  /** Орос хоолойд зориулж монгол үсгийг ойролцоо болгоно */
  static toRu(t) { return t.replace(/ө/g, 'о').replace(/Ө/g, 'О').replace(/ү/g, 'у').replace(/Ү/g, 'У'); }

  /** Текст уншуулах. who: { pitch (0.8–2), gender } — дүр бүр өөр өнгө */
  speak(text, { pitch = 1.5, rate = 1.0, interrupt = true } = {}) {
    if (!this.enabled || !text) return false;
    const clean = String(text).replace(/[«»"“”*_<>]/g, '').replace(/\p{Extended_Pictographic}/gu, '').replace(/\s+/g, ' ').trim();
    if (!clean) return false;
    const v = this.voice || this.ruVoice;
    if (v && !this.ttsBroken) {
      try {
        if (interrupt) speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(this.voice ? clean : Voice.toRu(clean));
        u.voice = v; u.lang = v.lang; u.pitch = Math.min(2, pitch); u.rate = rate; u.volume = 1;
        let started = false;
        u.onstart = () => { started = true; this.ttsOk = true; };
        u.onerror = () => { if (!started) { this.ttsFails = (this.ttsFails || 0) + 1; if (this.ttsFails >= 2) this.ttsBroken = true; this.babble(clean, pitch); } };
        speechSynthesis.speak(u);
        // Хамгаалалт: 0.9с дотор эхлэхгүй бол (сүлжээний хоолой унтарсан г.м) babble
        setTimeout(() => { if (!started && !this.ttsOk) { try { speechSynthesis.cancel(); } catch (e) { /* ok */ } this.ttsFails = (this.ttsFails || 0) + 1; if (this.ttsFails >= 2) this.ttsBroken = true; this.babble(clean, pitch); } }, 900);
        return true;
      } catch (e) { /* доор babble */ }
    }
    this.babble(clean, pitch);
    return true;
  }
  stop() { try { speechSynthesis?.cancel(); } catch (e) { /* ok */ } this.babbleUntil = 0; }

  /** Procedural хүүхдийн "яриа": үе бүрд формант маягийн богино дуу (2 осциллятор), эгшгээр давтамж ялгаатай, төгсгөлд асуултын өгсөлт */
  babble(text, pitch = 1.5) {
    const a = this.audio; if (!a.ctx || !a.enabled) return;
    const vowels = { а: 0, о: 0.35, у: 0.5, э: 0.9, ө: 0.6, ү: 0.8, и: 1.0, е: 0.85, я: 0.1, ё: 0.4, ю: 0.55, ы: 0.7, a: 0, o: 0.35, u: 0.5, e: 0.9, i: 1.0 };
    const syl = []; for (const ch of text.toLowerCase()) { if (ch in vowels) syl.push(vowels[ch]); else if (ch === ' ' || ch === ',' || ch === '.') syl.push(null); }
    const n = Math.min(26, syl.length); if (!n) return;
    const base = 230 * pitch, question = /\?/.test(text), step = 0.085;
    let t = 0;
    for (let i = 0; i < n; i++) {
      const v = syl[i];
      if (v === null) { t += step * 0.7; continue; }
      const prog = i / n, contour = question ? (prog > 0.7 ? 1 + (prog - 0.7) * 0.9 : 1) : (1.06 - prog * 0.1);
      const f = base * contour * (0.92 + v * 0.22) * (1 + (Math.random() - 0.5) * 0.06);
      a.tone({ f, f2: f * (0.97 + Math.random() * 0.06), type: 'triangle', dur: step * 0.9, vol: 0.055, attack: 0.012, delay: t });
      a.tone({ f: f * (2.2 + v * 0.8), type: 'sine', dur: step * 0.7, vol: 0.018, attack: 0.008, delay: t });   // формант
      t += step * (0.9 + Math.random() * 0.3);
    }
    this.babbleUntil = performance.now() + t * 1000;
  }
  get speaking() { return (typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking) || performance.now() < (this.babbleUntil || 0); }
}

/** Дүрийн төрлөөр өөр өнгийн хоолой (хүүхдийн хүрээнд) */
export function voicePitch(kind) {
  const map = { tomato: 1.5, apple: 1.6, orange: 1.45, grape: 1.7, mango: 1.55, carrot: 1.4, pumpkin: 1.35, broccoli: 1.65, shiitake: 1.3, peach: 1.75, mushroom: 1.3, suit: 1.2 };
  return map[kind] || 1.5;
}
