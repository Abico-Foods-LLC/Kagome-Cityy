// Procedural дуу: файл ашиглахгүй, WebAudio-оор бүх SFX, ambient, хөгжмийг үүсгэнэ.

export class AudioSystem {
  constructor(state) {
    this.state = state;
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.ambBus = null;
    this.engineNode = null;
    this.music = null;
    this.unlocked = false;
  }

  get enabled() { return this.state.settings.sound; }

  /** Хэрэглэгчийн анхны товшилтоор дуудна — browser autoplay бодлого. */
  unlock() {
    if (this.unlocked) { this.ctx?.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.mkBus(0.8);
      this.musicBus = this.mkBus(this.state.settings.music ? 0.32 : 0);
      this.ambBus = this.mkBus(0.5);
      this.unlocked = true;
      this.ctx.resume();
    } catch (e) { this.ctx = null; }
  }

  mkBus(v) { const g = this.ctx.createGain(); g.gain.value = v; g.connect(this.master); return g; }

  applySettings() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.enabled ? 0.9 : 0, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.state.settings.music ? 0.32 : 0, t, 0.2);
  }

  // ---------- Энгийн синтез туслахууд ----------
  tone({ f = 440, f2 = null, type = 'sine', dur = 0.2, vol = 0.2, attack = 0.005, bus = this.sfxBus, delay = 0 }) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noise({ dur = 0.15, vol = 0.15, hp = 800, lp = 6000, bus = this.sfxBus, delay = 0, pitchDecay = false }) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + delay;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const h = this.ctx.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp;
    const l = this.ctx.createBiquadFilter(); l.type = 'lowpass'; l.frequency.setValueAtTime(lp, t);
    if (pitchDecay) l.frequency.exponentialRampToValueAtTime(200, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(h); h.connect(l); l.connect(g); g.connect(bus);
    src.start(t);
  }

  // ---------- ASMR (obby) дуунууд: зөөлөн, богино, цуурайтай ----------
  /** Калимба/маримба маягийн pluck: үндсэн + 2 гармоник, хурдан унтрах, зөөлөн цуурай */
  pluck(f, vol = 0.12, { echo = true } = {}) {
    if (!this.ctx || !this.enabled) return;
    const hit = (d, v) => { this.tone({ f, type: 'sine', dur: 0.7, vol: v, attack: 0.003, delay: d }); this.tone({ f: f * 2.01, type: 'sine', dur: 0.25, vol: v * 0.35, attack: 0.002, delay: d }); this.tone({ f: f * 3.99, type: 'triangle', dur: 0.08, vol: v * 0.15, attack: 0.001, delay: d }); };
    hit(0, vol); if (echo) { hit(0.19, vol * 0.32); hit(0.38, vol * 0.12); }
    this.noise({ dur: 0.03, vol: vol * 0.25, hp: 2500, lp: 7000 });   // модны "тик"
  }
  /** Bubble wrap: 3–5 pop дараалан */
  pops(n = 4, vol = 0.09) { for (let i = 0; i < n; i++) { const d = i * 0.055 + Math.random() * 0.02; this.tone({ f: 900 + Math.random() * 900, f2: 300, type: 'sine', dur: 0.06, vol, attack: 0.001, delay: d }); this.noise({ dur: 0.03, vol: vol * 0.5, hp: 1500, lp: 6000, delay: d }); } }
  /** Желе: доороос дээш "boing" + чичиргээ */
  squish(vol = 0.1) { this.tone({ f: 140, f2: 620, type: 'sine', dur: 0.32, vol, attack: 0.01 }); this.tone({ f: 260, f2: 900, type: 'triangle', dur: 0.22, vol: vol * 0.4, attack: 0.02, delay: 0.03 }); this.noise({ dur: 0.08, vol: vol * 0.3, hp: 300, lp: 1800 }); }
  /** Элс: зөөлөн шиширгэх */
  hiss(vol = 0.07, dur = 0.5) { this.noise({ dur, vol, hp: 500, lp: 4500, pitchDecay: true }); this.noise({ dur: dur * 0.6, vol: vol * 0.5, hp: 2000, lp: 8000, delay: 0.05 }); }
  /** Слайм: доошоо "gloop" */
  gloop(vol = 0.09) { this.tone({ f: 420, f2: 110, type: 'sine', dur: 0.3, vol, attack: 0.01 }); this.tone({ f: 600, f2: 200, type: 'sine', dur: 0.18, vol: vol * 0.4, delay: 0.06 }); }
  /** Хонх (checkpoint): партиалтай */
  bell(f = 880, vol = 0.12, delay = 0) { for (const [m, v, d] of [[1, 1, 1.6], [2.76, 0.35, 1.0], [5.4, 0.15, 0.5]]) this.tone({ f: f * m, type: 'sine', dur: d, vol: vol * v, attack: 0.002, delay }); }
  /** Салхи шиг зөөлөн whoosh (үсрэлт) */
  swish(vol = 0.05) { this.noise({ dur: 0.22, vol, hp: 600, lp: 3000 }); }

  // ---------- Тоглоомын дуунууд ----------
  ui() { this.tone({ f: 880, f2: 1200, type: 'triangle', dur: 0.08, vol: 0.12 }); }
  pickup(i = 0) {
    this.tone({ f: 660 + i * 40, f2: 1320 + i * 40, type: 'sine', dur: 0.14, vol: 0.18 });
    this.tone({ f: 990 + i * 40, f2: 1980, type: 'sine', dur: 0.18, vol: 0.12, delay: 0.06 });
  }
  jump() { this.tone({ f: 300, f2: 620, type: 'square', dur: 0.14, vol: 0.06 }); this.noise({ dur: 0.08, vol: 0.05, hp: 2000 }); }
  land() { this.noise({ dur: 0.1, vol: 0.12, hp: 100, lp: 900, pitchDecay: true }); }
  step(i = 0, wood = false) { if (wood) { this.tone({ f: 140 + (i % 2) * 25, f2: 90, type: 'triangle', dur: 0.07, vol: 0.05 }); this.noise({ dur: 0.05, vol: 0.03, hp: 150, lp: 900 }); } else this.noise({ dur: 0.06, vol: 0.035 + (i % 2) * 0.01, hp: 200, lp: 1600 + (i % 2) * 400 }); }
  correct() { [523, 659, 784, 1047].forEach((f, i) => this.tone({ f, type: 'triangle', dur: 0.25, vol: 0.14, delay: i * 0.08 })); }
  wrong() { this.tone({ f: 220, f2: 160, type: 'sawtooth', dur: 0.28, vol: 0.08 }); }
  fanfare() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone({ f, type: 'triangle', dur: 0.3, vol: 0.15, delay: i * 0.1 })); }
  hurt() { this.tone({ f: 180, f2: 60, type: 'sawtooth', dur: 0.3, vol: 0.14 }); this.noise({ dur: 0.2, vol: 0.14, hp: 100, lp: 3000, pitchDecay: true }); }
  whoosh() { this.noise({ dur: 0.22, vol: 0.1, hp: 500, lp: 4000 }); }
  shield() { this.tone({ f: 500, f2: 1500, type: 'sine', dur: 0.3, vol: 0.12 }); this.tone({ f: 750, f2: 2250, type: 'sine', dur: 0.3, vol: 0.08, delay: 0.05 }); }
  gate() { [784, 988, 1175].forEach((f, i) => this.tone({ f, type: 'square', dur: 0.18, vol: 0.07, delay: i * 0.07 })); }
  carIn() { this.tone({ f: 120, f2: 260, type: 'sawtooth', dur: 0.4, vol: 0.08 }); }
  purr() { for (let i = 0; i < 8; i++) this.tone({ f: 95 + (i % 2) * 8, f2: 80, type: 'triangle', dur: 0.09, vol: 0.09, delay: i * 0.1 }); }
  quack(n = 2) { for (let i = 0; i < n; i++) { this.tone({ f: 540, f2: 360, type: 'sawtooth', dur: 0.11, vol: 0.07, delay: i * 0.17 }); this.noise({ dur: 0.06, vol: 0.03, hp: 1200, lp: 4000, delay: i * 0.17 }); } }
  splash() { this.noise({ dur: 0.3, vol: 0.12, hp: 300, lp: 5000, pitchDecay: true }); }
  spin() { for (let i = 0; i < 14; i++) this.tone({ f: 800, type: 'square', dur: 0.03, vol: 0.05, delay: i * i * 0.012 }); }

  /** Машины хөдөлгүүрийн дуу: тасралтгүй, хурднаас хамаарна. */
  engine(on, speed = 0) {
    if (!this.ctx) return;
    if (on && !this.engineNode) {
      const o = this.ctx.createOscillator(), o2 = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
      o.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 600;
      o.frequency.value = 60; o2.frequency.value = 90; g.gain.value = 0;
      o.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfxBus);
      o.start(); o2.start();
      this.engineNode = { o, o2, g, f };
      g.gain.setTargetAtTime(0.05, this.ctx.currentTime, 0.2);
    }
    if (this.engineNode) {
      const t = this.ctx.currentTime;
      const base = 55 + Math.abs(speed) * 6;
      this.engineNode.o.frequency.setTargetAtTime(base, t, 0.1);
      this.engineNode.o2.frequency.setTargetAtTime(base * 1.5, t, 0.1);
      this.engineNode.f.frequency.setTargetAtTime(400 + Math.abs(speed) * 60, t, 0.1);
      if (!on) {
        this.engineNode.g.gain.setTargetAtTime(0, t, 0.15);
        const n = this.engineNode; this.engineNode = null;
        setTimeout(() => { try { n.o.stop(); n.o2.stop(); } catch (e) { /* */ } }, 600);
      }
    }
  }

  /** Ambient: салхи + үе үе шувууны жиргээ. */
  startAmbient() {
    if (!this.ctx || this.ambient) return;
    const n = this.ctx.sampleRate * 2, buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { last = (last + (Math.random() * 2 - 1) * 0.02); last *= 0.98; d[i] = last * 6; }
    const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    const g = this.ctx.createGain(); g.gain.value = 0.18;
    src.connect(f); f.connect(g); g.connect(this.ambBus); src.start();
    this.ambient = { src, g };
    const bird = () => {
      if (!this.ambient) return;
      if (Math.random() < 0.7) {
        const base = 1800 + Math.random() * 1500;
        for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) this.tone({ f: base, f2: base * (1.2 + Math.random() * 0.3), type: 'sine', dur: 0.09, vol: 0.05, bus: this.ambBus, delay: i * 0.13 });
      }
      this.birdTimer = setTimeout(bird, 3000 + Math.random() * 6000);
    };
    bird();
  }

  /** Борооны шуугиан (0..1) */
  rain(level) {
    if (!this.ctx) return;
    if (level > 0 && !this.rainNode) {
      const n = this.ctx.sampleRate * 2, buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1);
      const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.5;
      const g = this.ctx.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(this.ambBus); src.start();
      this.rainNode = { src, g };
    }
    if (this.rainNode) {
      this.rainNode.g.gain.setTargetAtTime(level * 0.25, this.ctx.currentTime, 0.5);
      if (level <= 0) { const r = this.rainNode; this.rainNode = null; setTimeout(() => { try { r.src.stop(); } catch (e) { /* */ } }, 2000); }
    }
  }

  stopAmbient() {
    if (!this.ambient) return;
    try { this.ambient.src.stop(); } catch (e) { /* */ }
    clearTimeout(this.birdTimer);
    this.ambient = null;
  }

  /** Хөгжим: энгийн арпеджио + бас, 4 хөвчний давталт. mood: 'town' | 'runner' */
  /** Хөгжмийн хувилбарууд: chords (хагас тонын offset), root Hz, bpm, дууны хэлбэр, хэмжээ */
  static MUSIC = {
    town: { chords: [[0, 4, 7, 11], [5, 9, 12, 16], [7, 11, 14, 17], [2, 5, 9, 12]], root: 261.63, bpm: 96, type: 'triangle', vol: 0.09, bass: 0.14 },
    night: { chords: [[0, 3, 7, 10], [-4, 0, 3, 7], [5, 8, 12, 15], [-2, 2, 5, 9]], root: 196, bpm: 72, type: 'sine', vol: 0.06, bass: 0.1, dur: 1.4 },
    car: { chords: [[0, 4, 7, 11], [5, 9, 12, 16], [7, 11, 14, 17], [2, 5, 9, 12]], root: 261.63, bpm: 124, type: 'square', vol: 0.05, bass: 0.12, hat: true, bass8: true },
    winter: { chords: [[0, 4, 7, 11], [5, 9, 12, 16], [7, 11, 14, 17], [2, 5, 9, 12]], root: 523.25, bpm: 84, type: 'triangle', vol: 0.07, bass: 0, dur: 1.6, bell: true },
    asmr: { chords: [[0, 4, 7, 11], [2, 5, 9, 12], [-3, 0, 4, 7], [5, 9, 12, 16]], root: 392, bpm: 60, type: 'sine', vol: 0.045, bass: 0.06, dur: 2.2, bell: true },
    runner: { chords: [[0, 3, 7, 10], [-2, 2, 5, 9], [3, 7, 10, 14], [5, 8, 12, 15]], root: 196, bpm: 138, type: 'square', vol: 0.06, bass: 0.14, hat: true },
  };

  startMusic(mood = 'town') {
    if (!this.ctx) return;
    this.stopMusic();
    const M = AudioSystem.MUSIC[mood] || AudioSystem.MUSIC.town;
    this.mood = mood;
    const beat = 60 / M.bpm;
    let bar = 0, step = 0;
    const g = this.ctx.createGain(); g.gain.value = 0; g.connect(this.musicBus);
    g.gain.setTargetAtTime(1, this.ctx.currentTime, 0.5);   // crossfade: аажим орж ирнэ
    const self = this;
    function schedule() {
      if (!self.music || self.music.g !== g) return;
      const chord = M.chords[bar % M.chords.length];
      const note = chord[step % chord.length] + (step % 8 >= 4 ? 12 : 0);
      const f = M.root * Math.pow(2, note / 12);
      self.tone({ f, type: M.type, dur: beat * (M.dur || 0.9), vol: M.vol, bus: g });
      if (M.bell && step % 2 === 0) self.tone({ f: f * 2, type: 'sine', dur: beat * 1.2, vol: M.vol * 0.4, bus: g });   // өвөл: хонхны дээд өнгө
      if (M.bass && step % (M.bass8 ? 2 : 4) === 0) self.tone({ f: M.root / 2 * Math.pow(2, chord[0] / 12), type: 'sine', dur: beat * 1.8, vol: M.bass, bus: g });
      if (M.hat && step % 2 === 1) self.noise({ dur: 0.05, vol: 0.05, hp: 3000, bus: g });
      step++;
      if (step % 8 === 0) bar++;
      self.music.timer = setTimeout(schedule, beat * 500);
    }
    this.music = { g, timer: null };
    schedule();
  }

  /** Хувилбар солих (ижил бол юу ч хийхгүй): хуучин нь 0.6с fade, шинэ нь орж ирнэ */
  setMood(mood) {
    if (!this.ctx || this.mood === mood) return;
    this.startMusic(mood);
  }

  stopMusic() {
    if (!this.music) return;
    clearTimeout(this.music.timer);
    const m = this.music; this.music = null; this.mood = null;
    m.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.6);
    setTimeout(() => m.g.disconnect(), 2000);
  }
}
