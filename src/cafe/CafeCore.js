// «Манго кафе» — хоол хийх minigame-ийн цэвэр логик (Vitest): жор, захиалга, станцын ажил, тэвчээр, оноо.
export const INGREDIENTS = {
  carrot: { name: 'Лууван', emoji: '🥕' }, orange: { name: 'Жүрж', emoji: '🍊' }, apple: { name: 'Алим', emoji: '🍎' }, grape: { name: 'Усан үзэм', emoji: '🍇' },
  mango: { name: 'Манго', emoji: '🥭' }, tomato: { name: 'Улаан лооль', emoji: '🍅' }, broccoli: { name: 'Брокколи', emoji: '🥦' }, peach: { name: 'Тоор', emoji: '🍑' },
};
/** Жор: орцууд → станц (chop: E дараалан, juicer/blender: E барих, stove/oven: ногоон бүсэд E) → таваг */
export const RECIPES = {
  juice: { name: 'Лууван-жүржийн шүүс', emoji: '🧃', items: ['carrot', 'orange'], station: 'juicer', price: 30 },
  salad: { name: 'Жимсний салат', emoji: '🥗', items: ['apple', 'grape', 'mango'], station: 'chop', price: 40 },
  soup: { name: 'Луувангийн шөл', emoji: '🍲', items: ['carrot', 'tomato'], station: 'stove', prep: 'chop', price: 45 },
  smoothie: { name: 'Манго смүүти', emoji: '🥤', items: ['mango', 'peach'], station: 'blender', price: 35 },
  pizza: { name: 'Ногоотой пицца', emoji: '🍕', items: ['tomato', 'broccoli'], station: 'oven', prep: 'chop', price: 50 },
};
export const STATIONS = { fridge: 'Хөргөгч', chop: 'Зүсэх самбар', juicer: 'Шахагч', blender: 'Блендер', stove: 'Зуух', oven: 'Шарах зуух', plate: 'Тавагны ширээ', counter: 'Лангуу' };
export const PATIENCE = 60, DAY_ORDERS = 8, MAX_QUEUE = 3, CHOP_TAPS = 5, HOLD_T = 2.0, COOK_T = 4.0, STARS_DIV = 20;

export class CafeCore {
  constructor({ rand = Math.random } = {}) {
    this.rand = rand; this.time = 0; this.queue = []; this.served = 0; this.spawned = 0; this.coins = 0; this.score = 0; this.tips = 0; this.failed = 0;
    this.spawnT = 2; this.nextId = 1; this.over = false; this.events = [];
    // Тоглогчийн гар: null | { kind: 'ing', id } | { kind: 'prep', id } (зүссэн) | { kind: 'dish', recipe }
    this.hand = null;
    // Станц бүрийн төлөв: { items: [], progress, state: 'idle'|'working'|'ready'|'burnt', recipe }
    this.st = { chop: this.mk(), juicer: this.mk(), blender: this.mk(), stove: this.mk(), oven: this.mk(), plate: this.mk() };
  }
  mk() { return { items: [], progress: 0, state: 'idle', recipe: null, taps: 0 }; }
  emit(t, d = {}) { this.events.push({ t, ...d }); }

  // ---------------------------------------------------------------- Захиалга
  spawnCustomer() {
    if (this.spawned >= DAY_ORDERS || this.queue.length >= MAX_QUEUE) return null;
    const keys = Object.keys(RECIPES), recipe = keys[Math.floor(this.rand() * keys.length)];
    const c = { id: this.nextId++, recipe, patience: PATIENCE, kind: ['apple', 'orange', 'grape', 'mango', 'peach', 'broccoli'][this.spawned % 6] };
    this.queue.push(c); this.spawned++; this.emit('customer', { id: c.id, recipe }); return c;
  }
  tick(dt) {
    if (this.over) return;
    this.time += dt; this.spawnT -= dt;
    if (this.spawnT <= 0 && this.spawned < DAY_ORDERS) { this.spawnCustomer(); this.spawnT = 9 + this.rand() * 5; }
    for (const c of [...this.queue]) { c.patience -= dt; if (c.patience <= 0) { this.queue.splice(this.queue.indexOf(c), 1); this.failed++; this.emit('leave', { id: c.id }); } }
    for (const [k, s] of Object.entries(this.st)) {
      if (s.state === 'working' && (k === 'stove' || k === 'oven')) { s.progress += dt / COOK_T; if (s.progress >= 1 && s.state === 'working') { s.state = 'ready'; s.readyT = 0; this.emit('ready', { station: k }); } }
      if (s.state === 'ready' && (k === 'stove' || k === 'oven')) { s.readyT += dt; if (s.readyT > 6) { s.state = 'burnt'; this.emit('burnt', { station: k }); } }
    }
    if (this.spawned >= DAY_ORDERS && !this.queue.length && !this.over) this.finish();
  }
  finish() { this.over = true; this.emit('over', this.result()); }
  result() { return { score: this.score, served: this.served, failed: this.failed, tips: this.tips, stars: Math.floor(this.score / STARS_DIV), time: Math.round(this.time) }; }

  // ---------------------------------------------------------------- Станцын үйлдэл (E)
  /** Хөргөгчөөс орц авах (гар хоосон үед) */
  takeIngredient(id) { if (this.hand || !INGREDIENTS[id]) return false; this.hand = { kind: 'ing', id }; this.emit('take', { id }); return true; }
  /** Хамгийн хэрэгтэй орц: дарааллын эхний захиалгын дутуу орц */
  neededIngredient() {
    const c = this.queue[0]; if (!c) return null;
    const r = RECIPES[c.recipe], have = [...this.st.chop.items, ...this.st[r.station].items, ...this.st.plate.items].map((i) => i.id);
    return r.items.find((i) => !have.includes(i)) || null;
  }
  /** Жорын орц бүрд ямар боловсруулалт хэрэгтэй: 'chop' | station */
  static needsChop(recipe, id) { const r = RECIPES[recipe]; return r.prep === 'chop' || r.station === 'chop'; }
  /** Станц дээр E: гартаа юу байгаагаас хамаарна */
  act(station) {
    const s = this.st[station], h = this.hand;
    if (station === 'counter') return this.serve();
    if (station === 'plate') {
      if (h?.kind === 'dish') return false;
      if (h?.kind === 'prep' || h?.kind === 'ing') { s.items.push(h); this.hand = null; return this.tryPlate(); }
      if (s.state === 'ready' && !h) { this.hand = { kind: 'dish', recipe: s.recipe }; this.st.plate = this.mk(); this.emit('pickDish', { recipe: this.hand.recipe }); return true; }
      return false;
    }
    if (station === 'chop') {
      if (h?.kind === 'ing') { if (s.items.length) return false; s.items = [h]; s.taps = 0; s.state = 'working'; this.hand = null; this.emit('put', { station, id: h.id }); return true; }
      if (s.state === 'working' && !h) { s.taps++; s.progress = s.taps / CHOP_TAPS; this.emit('chop', { taps: s.taps }); if (s.taps >= CHOP_TAPS) { s.state = 'ready'; } return true; }
      if (s.state === 'ready' && !h) { this.hand = { kind: 'prep', id: s.items[0].id }; this.st.chop = this.mk(); this.emit('take', { id: this.hand.id, prep: true }); return true; }
      return false;
    }
    if (station === 'juicer' || station === 'blender') {
      if (h?.kind === 'ing') { s.items.push(h); this.hand = null; this.emit('put', { station, id: h.id }); return true; }
      if (s.state === 'ready' && !h) { this.hand = { kind: 'dish', recipe: s.recipe }; this.st[station] = this.mk(); this.emit('pickDish', { recipe: this.hand.recipe }); return true; }
      return false;
    }
    if (station === 'stove' || station === 'oven') {
      if (h?.kind === 'prep' || h?.kind === 'ing') { if (s.state !== 'idle') return false; s.items.push(h); this.hand = null; this.emit('put', { station, id: h.id }); const r = this.matchRecipe(station, s.items); if (r) { s.recipe = r; s.state = 'working'; s.progress = 0; } return true; }
      if ((s.state === 'ready' || s.state === 'burnt') && !h) { const burnt = s.state === 'burnt'; this.hand = burnt ? { kind: 'dish', recipe: s.recipe, burnt: true } : { kind: 'dish', recipe: s.recipe }; this.st[station] = this.mk(); this.emit('pickDish', { recipe: this.hand.recipe, burnt }); return true; }
      return false;
    }
    return false;
  }
  /** Барих (juicer/blender): секундэд dt-ээр ахина */
  holdTick(station, dt) {
    const s = this.st[station]; if (!s || !s.items.length || s.state === 'ready' || this.hand) return false;
    const r = this.matchRecipe(station, s.items); if (!r) return false;
    s.state = 'working'; s.progress = Math.min(1, s.progress + dt / HOLD_T);
    if (s.progress >= 1) { s.state = 'ready'; s.recipe = r; this.emit('ready', { station }); }
    return true;
  }
  matchRecipe(station, items) {
    const ids = items.map((i) => i.id).sort().join(',');
    for (const [k, r] of Object.entries(RECIPES)) if (r.station === station && [...r.items].sort().join(',') === ids && (!r.prep || items.every((i) => i.kind === 'prep'))) return k;
    return null;
  }
  tryPlate() {
    const s = this.st.plate, r = this.matchRecipe('chop', s.items);
    if (r) { s.recipe = r; s.state = 'ready'; this.emit('ready', { station: 'plate' }); }
    return true;
  }
  /** Лангуу: гартаа хоол байвал тохирох захиалагчид өгнө */
  serve() {
    const h = this.hand; if (h?.kind !== 'dish') return false;
    const c = this.queue.find((q) => q.recipe === h.recipe);
    if (!c) { this.emit('wrong', { recipe: h.recipe }); return false; }
    this.queue.splice(this.queue.indexOf(c), 1); this.hand = null; this.served++;
    const r = RECIPES[h.recipe], tip = h.burnt ? 0 : Math.round(r.price * 0.5 * (c.patience / PATIENCE));
    const gain = h.burnt ? Math.round(r.price * 0.3) : r.price + tip;
    this.coins += gain; this.score += gain; this.tips += tip;
    this.emit('served', { id: c.id, recipe: h.recipe, gain, tip, burnt: !!h.burnt });
    return true;
  }
  /** Гартаа байгааг хогийн саванд хаяна */
  trash() { if (!this.hand) return false; this.hand = null; this.emit('trash'); return true; }
}
