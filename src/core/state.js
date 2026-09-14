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
    this.settings = { sound: true, music: true, quality: 'auto', ...(data.settings || {}) };
    this.playtime = Number(data.playtime) || 0;
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
