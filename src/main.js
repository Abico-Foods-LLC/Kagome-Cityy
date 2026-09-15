// Kagome City — эхлүүлэгч: renderer, ачаалалт, горим солилт, гол давталт.
import * as T from 'three';
import { GameState } from './core/state.js';
import { Input } from './core/input.js';
import { AudioSystem } from './core/audio.js';
import { $, toast, setLoading, fade, show, closeModal } from './core/ui.js';
import { createPost } from './gfx/post.js';
import { PRODUCTS } from './core/content.js';
import { TownScene } from './town/TownScene.js';
import { RunnerScene } from './runner/RunnerScene.js';

class App {
  constructor() {
    this.state = GameState.load();
    this.input = new Input();
    this.audio = new AudioSystem(this.state);
    this.canvas = $('world');
    this.scenes = {};
    this.current = null;
    this.last = performance.now();
    this.fpsSamples = [];
    this.autoQuality = 'high';
    this.timeScale = 1;   // debug: удаашруулах
  }

  async init() {
    setLoading(5, 'WebGL асааж байна…');
    try {
      this.renderer = new T.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
      $('loadLabel').innerHTML = '<b>3D дүрслэл асахгүй байна.</b><br>Төхөөрөмжийн hardware acceleration тохиргоог асаагаад дахин нээгээрэй.';
      return;
    }
    const r = this.renderer;
    r.outputColorSpace = T.SRGBColorSpace;
    r.toneMapping = T.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = T.PCFSoftShadowMap;
    r.setSize(innerWidth, innerHeight);

    setLoading(20, 'Kagome бүтээгдэхүүнийг ачаалж байна…');
    this.productTextures = await this.loadTextures();

    setLoading(45, 'Ертөнцийг барьж байна…');
    await nextFrame();
    // Post-processing (bloom) нь чанараас хамаарна
    this.post = createPost(r, new T.Scene(), new T.PerspectiveCamera(), { bloom: true });
    this.applyQuality();

    this.scenes.town = new TownScene(this);
    setLoading(80, 'Ширэнгийг ургуулж байна…');
    await nextFrame();
    this.scenes.runner = new RunnerScene(this);
    setLoading(100, 'Бэлэн!');
    await nextFrame();

    this.input.bindPointer(this.canvas, { swipe: true });
    addEventListener('resize', () => this.resize());
    this.resize();
    this.switchTo('town', { instant: true });
    $('loading').classList.add('off');
    setTimeout(() => $('loading').remove(), 800);
    this.welcome();
    requestAnimationFrame((t) => this.loop(t));
  }

  loadTextures() {
    const loader = new T.TextureLoader();
    let done = 0;
    return Promise.all(PRODUCTS.map((p) => new Promise((res) => {
      loader.load(p.src, (t) => { t.colorSpace = T.SRGBColorSpace; t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy()); done++; setLoading(20 + done / PRODUCTS.length * 25); res(t); },
        undefined, () => { done++; res(new T.Texture()); });
    })));
  }

  applyQuality() {
    const q = this.state.settings.quality === 'auto' ? this.autoQuality : this.state.settings.quality;
    const r = this.renderer;
    const ratio = { high: Math.min(devicePixelRatio, 2), medium: Math.min(devicePixelRatio, 1.5), low: 1 }[q];
    r.setPixelRatio(ratio);
    r.shadowMap.enabled = q !== 'low';
    if (this.post.bloomPass) this.post.bloomPass.enabled = q === 'high';
    this.post.setSize(innerWidth, innerHeight);
    for (const s of Object.values(this.scenes)) if (s.sun) { s.sun.castShadow = q !== 'low'; s.sun.shadow.mapSize.setScalar(q === 'high' ? 2048 : 1024); if (s.sun.shadow.map) { s.sun.shadow.map.dispose(); s.sun.shadow.map = null; } }
  }

  setAvatar(kind) {
    this.state.settings.avatar = kind;
    this.state.save();
    for (const s of Object.values(this.scenes)) s.buildAvatar?.(kind);
  }

  resize() {
    this.renderer.setSize(innerWidth, innerHeight);
    this.post.setSize(innerWidth, innerHeight);
    for (const s of Object.values(this.scenes)) s.resize?.();
  }

  welcome() {
    const d = $('welcome');
    const hasSave = this.state.stars > 0 || this.state.chapter > 0 || this.state.counts.harvest > 0;
    if (hasSave) {
      $('start').textContent = 'Аяллаа үргэлжлүүлэх →';
      $('welcomeSave').textContent = `Хадгалсан аялал: ${this.state.chapter}/6 бүлэг · ⭐ ${this.state.stars} од · Ширэнгэ ${this.state.runner.unlocked}/5 үе`;
    } else $('welcomeSave').textContent = 'Алхах · Машин унах · Бодох · Гүйх · Судлах';
    d.showModal();
    $('start').onclick = () => { this.audio.unlock(); this.audio.ui(); d.close(); if (hasSave) this.scenes.town.start(); else this.scenes.town.pickAvatar(() => this.scenes.town.start()); };
    $('startRunner').onclick = async () => { this.audio.unlock(); this.audio.ui(); d.close(); this.scenes.town.started = true; await this.switchTo('runner'); };
    d.addEventListener('cancel', (e) => e.preventDefault());
  }

  async switchTo(name, { instant = false } = {}) {
    if (this.current === this.scenes[name]) return;
    if (!instant) await fade(true, 450);
    closeModal();
    this.current?.exit();
    this.current = this.scenes[name];
    this.current.enter();
    this.input.clear();
    if (!instant) { await nextFrame(); await fade(false, 450); }
  }

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.05, (now - this.last) / 1000 || 0) * this.timeScale;
    this.last = now;
    if (!this.current) return;
    this.current.update(dt);
    this.current.render();
    this.input.endFrame();
    // Автомат чанар: FPS удаан бол бууруулна
    if (this.state.settings.quality === 'auto' && dt > 0) {
      this.fpsSamples.push(1 / dt);
      if (this.fpsSamples.length >= 120) {
        const avg = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
        this.fpsSamples.length = 0;
        const next = avg < 30 ? (this.autoQuality === 'high' ? 'medium' : 'low') : this.autoQuality;
        if (next !== this.autoQuality) { this.autoQuality = next; this.applyQuality(); }
      }
    }
  }
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

const app = new App();
window.KagomeCity = app;
app.init().catch((e) => {
  console.error(e);
  const l = $('loadLabel'); if (l) l.innerHTML = '<b>Алдаа гарлаа:</b> ' + (e.message || e);
});
