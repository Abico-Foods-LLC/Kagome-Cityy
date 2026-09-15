// Тоглогчийн ахиц: localStorage-д хадгалагдана. Дүрслэлээс бүрэн тусдаа.
import { CHAPTERS, QUESTIONS } from './content.js';

const KEY = 'kagome-city-v2';

export class GameState {
  constructor(data = {}) {
    this.counts = { harvest: 0, math: 0, read: 0, logic: 0, drive: 0, runner: 0, ...(data.counts || {}) };
    this.stars = Number(data.stars) || 0;
    this.inventory = { ...(data.inventory || {}) };
    this.solved = new Set(data.solved || []);
    this.collected = new Set(data.collected || []);
    this.chapter = Math.min(CHAPTERS.length, Math.max(0, Number(data.chapter) || 0));
    this.runner = {
      unlocked: 0,
      best: [0, 0, 0, 0, 0],
      collection: [0, 0, 0, 0, 0, 0, 0, 0],
      ...(data.runner || {}),
    };
    this.settings = { sound: true, music: true, quality: 'auto', avatar: 'tomato', ...(data.settings || {}) };
    this.playtime = Number(data.playtime) || 0;
    this.wardrobe = { owned: [], equipped: {}, ...(data.wardrobe || {}) };
    this.regrow = { ...(data.regrow || {}) };          // crop id → дахин ургах цаг (ms)
    this.daily = data.daily || null;                     // { date, quests: [{id, goal, progress, done}] }
    this.juice = data.juice || { made: {}, stockDate: '', stock: {} };
    this.ensureDaily();
    this.applyRegrow();
  }

  // ---------- Жимс дахин ургах ----------
  static REGROW_MS = 4 * 60 * 1000;
  applyRegrow() {
    const now = Date.now();
    for (const [id, t] of Object.entries(this.regrow)) if (now >= t) { this.collected.delete(id); delete this.regrow[id]; }
  }
  /** Дахин ургасан crop id-уудыг буцаана (дүрслэл шинэчлэхэд) */
  pollRegrow() {
    const now = Date.now(), ready = [];
    for (const [id, t] of Object.entries(this.regrow)) if (now >= t) { this.collected.delete(id); delete this.regrow[id]; ready.push(id); }
    return ready;
  }

  // ---------- Өдрийн даалгавар ----------
  static DAILY_POOL = [
    { id: 'harvest', goal: 8, text: '8 жимс, ногоо түү', reward: 40, icon: '🍎' },
    { id: 'runnerScore', goal: 400, text: 'Runner-т нэг гүйлтэнд 400 оноо ав', reward: 60, icon: '🏃', max: true },
    { id: 'jumps', goal: 15, text: '15 удаа үсэр', reward: 20, icon: '⬆️' },
    { id: 'walk', goal: 300, text: '300 метр алх', reward: 25, icon: '👣' },
    { id: 'emotes', goal: 3, text: '3 удаа emote хий (1 / 2 / 3)', reward: 20, icon: '💃' },
    { id: 'swim', goal: 1, text: 'Сувагт сэл', reward: 30, icon: '🏊' },
    { id: 'talk', goal: 3, text: '3 иргэнтэй ярилц', reward: 25, icon: '💬' },
    { id: 'drive', goal: 200, text: 'Машинаар 200 метр яв', reward: 30, icon: '🚗' },
    { id: 'flips', goal: 5, text: '5 удаа давхар үсрэлт хий', reward: 25, icon: '🔄' },
    { id: 'juice', goal: 2, text: 'Лабораторид 2 шүүс хий', reward: 40, icon: '🧃' },
  ];
  ensureDaily() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.daily && this.daily.date === today) return;
    // Огноогоор seed-лэсэн 3 даалгавар
    let seed = 0; for (const ch of today) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const pool = [...GameState.DAILY_POOL];
    const quests = [];
    while (quests.length < 3 && pool.length) { const i = Math.floor(rnd() * pool.length); const q = pool.splice(i, 1)[0]; quests.push({ id: q.id, goal: q.goal, progress: 0, done: false }); }
    this.daily = { date: today, quests };
  }
  dailyDef(id) { return GameState.DAILY_POOL.find((q) => q.id === id); }
  /** Ахиц нэмнэ; шинээр дууссан даалгаврыг буцаана */
  dailyProgress(id, amount = 1) {
    this.ensureDaily();
    const q = this.daily.quests.find((x) => x.id === id);
    if (!q || q.done) return null;
    const def = this.dailyDef(id);
    q.progress = def.max ? Math.max(q.progress, amount) : q.progress + amount;
    if (q.progress >= q.goal) { q.done = true; this.stars += def.reward; return { ...def, ...q }; }
    return null;
  }
  get dailyDone() { return this.daily ? this.daily.quests.filter((q) => q.done).length : 0; }

  // ---------- Хувцас ----------
  buyAccessory(key, price) {
    if (this.wardrobe.owned.includes(key)) return true;
    if (this.stars < price) return false;
    this.stars -= price; this.wardrobe.owned.push(key);
    return true;
  }
  equip(key, slot) {
    if (this.wardrobe.equipped[slot] === key) delete this.wardrobe.equipped[slot]; else this.wardrobe.equipped[slot] = key;
  }

  static load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return new GameState(JSON.parse(raw));
    } catch (e) { /* хадгалалт эвдэрсэн бол шинээр эхэлнэ */ }
    return new GameState();
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.toJSON())); } catch (e) { /* private mode */ }
  }

  reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  toJSON() {
    return {
      counts: this.counts, stars: this.stars, inventory: this.inventory,
      solved: [...this.solved], collected: [...this.collected], chapter: this.chapter,
      runner: this.runner, settings: this.settings, playtime: this.playtime,
      wardrobe: this.wardrobe, regrow: this.regrow, daily: this.daily, juice: this.juice,
    };
  }

  get currentChapter() { return CHAPTERS[this.chapter] || null; }
  get done() { return this.chapter >= CHAPTERS.length; }

  /** Бүлэг дууссан эсэхийг шалгаж, шинэ бүлэг нээгдсэн бол true буцаана. */
  progress() {
    let changed = false;
    while (this.chapter < CHAPTERS.length && this.counts[CHAPTERS[this.chapter].key] >= CHAPTERS[this.chapter].goal) {
      this.chapter++;
      this.stars += 50;
      changed = true;
    }
    return changed;
  }

  harvest(id, type) {
    if (this.collected.has(id)) return false;
    this.collected.add(id);
    this.regrow[id] = Date.now() + GameState.REGROW_MS;
    this.inventory[type] = (this.inventory[type] || 0) + 1;
    this.counts.harvest++;
    this.stars += 5;
    return true;
  }

  collectPackage(id) {
    if (this.collected.has(id)) return false;
    this.collected.add(id);
    this.stars += 10;
    return true;
  }

  answer(type, index, choice) {
    const q = QUESTIONS[type][index];
    if (!q || q.a !== choice) return false;
    const key = type + index;
    if (!this.solved.has(key)) {
      this.solved.add(key);
      this.counts[type]++;
      this.stars += 15;
    }
    return true;
  }

  nextQuestion(type) {
    return QUESTIONS[type].findIndex((q, i) => !this.solved.has(type + i));
  }

  gate(index) {
    if (this.chapter !== 4 || index !== this.counts.drive) return false;
    this.counts.drive++;
    this.stars += 20;
    return true;
  }

  /** Runner үе дууссан үед дуудна. */
  runnerResult(level, score, collected) {
    this.runner.unlocked = Math.max(this.runner.unlocked, Math.min(4, level + 1));
    this.runner.best[level] = Math.max(this.runner.best[level] || 0, score);
    for (let i = 0; i < 8; i++) this.runner.collection[i] += collected[i] || 0;
    if (this.counts.runner < 1) this.counts.runner = 1;
    this.stars += Math.round(score / 20);
  }
}
