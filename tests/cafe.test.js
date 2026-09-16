import { describe, it, expect } from 'vitest';
import { CafeCore, RECIPES, PATIENCE, DAY_ORDERS, CHOP_TAPS, HOLD_T, COOK_T } from '../src/cafe/CafeCore.js';

const run = (c, secs, step = 0.1) => { for (let t = 0; t < secs; t += step) c.tick(step); };

describe('CafeCore', () => {
  it('захиалагч ирж, тэвчээр дуусвал явна', () => {
    const c = new CafeCore({ rand: () => 0 }); c.tick(2.1); expect(c.queue).toHaveLength(1); expect(c.queue[0].recipe).toBe('juice');
    const first = c.queue[0].id; run(c, PATIENCE + 1); expect(c.queue.find((q) => q.id === first)).toBeUndefined(); expect(c.failed).toBeGreaterThanOrEqual(1);
  });
  it('шүүс: хөргөгч → шахагч ×2 → барих → таваг → лангуу', () => {
    const c = new CafeCore({ rand: () => 0 }); c.tick(2.1);
    expect(c.neededIngredient()).toBe('carrot');
    expect(c.takeIngredient('carrot')).toBe(true); expect(c.takeIngredient('orange')).toBe(false);   // гар дүүрэн
    expect(c.act('juicer')).toBe(true); expect(c.hand).toBeNull(); expect(c.neededIngredient()).toBe('orange');
    c.takeIngredient('orange'); c.act('juicer');
    for (let i = 0; i < 25; i++) c.holdTick('juicer', 0.1);
    expect(c.st.juicer.state).toBe('ready');
    expect(c.act('juicer')).toBe(true); expect(c.hand.kind).toBe('dish'); expect(c.hand.recipe).toBe('juice');
    expect(c.serve()).toBe(true); expect(c.served).toBe(1); expect(c.coins).toBeGreaterThan(RECIPES.juice.price); expect(c.queue).toHaveLength(0);
  });
  it('салат: зүсэх (E ×5) 3 орц → тавагт → бэлэн', () => {
    const c = new CafeCore({ rand: () => 0.3 }); c.tick(2.1); expect(c.queue[0].recipe).toBe('salad');
    for (const id of ['apple', 'grape', 'mango']) { c.takeIngredient(id); c.act('chop'); for (let i = 0; i < CHOP_TAPS; i++) c.act('chop'); expect(c.st.chop.state).toBe('ready'); c.act('chop'); expect(c.hand.kind).toBe('prep'); c.act('plate'); }
    expect(c.st.plate.state).toBe('ready'); c.act('plate'); expect(c.hand.recipe).toBe('salad'); expect(c.act('counter')).toBe(true);
  });
  it('шөл: зүссэн орц зууханд, 4с болно, 6с орхивол түлэгдэнэ', () => {
    const c = new CafeCore({ rand: () => 0.5 }); c.tick(2.1); expect(c.queue[0].recipe).toBe('soup');
    for (const id of ['carrot', 'tomato']) { c.takeIngredient(id); c.act('chop'); for (let i = 0; i < CHOP_TAPS; i++) c.act('chop'); c.act('chop'); c.act('stove'); }
    expect(c.st.stove.state).toBe('working'); run(c, COOK_T + 0.2); expect(c.st.stove.state).toBe('ready');
    run(c, 6.5); expect(c.st.stove.state).toBe('burnt'); c.act('stove'); expect(c.hand.burnt).toBe(true);
    const coins = c.coins; c.serve(); expect(c.coins - coins).toBe(Math.round(RECIPES.soup.price * 0.3));
  });
  it('таарахгүй орц станцад орохгүй', () => { const c = new CafeCore({ rand: () => 0 }); c.takeIngredient('apple'); expect(c.act('juicer')).toBe(false); expect(c.hand.id).toBe('apple'); c.trash(); c.takeIngredient('carrot'); c.act('juicer'); c.takeIngredient('carrot'); expect(c.act('juicer')).toBe(false); });
  it('буруу хоол өгвөл false, хогийн сав', () => {
    const c = new CafeCore({ rand: () => 0 }); c.tick(2.1); c.hand = { kind: 'dish', recipe: 'pizza' };
    expect(c.serve()).toBe(false); expect(c.trash()).toBe(true); expect(c.hand).toBeNull();
  });
  it('өдөр: 8 захиалга дуусаад дараалал хоосон бол over, од = score/20', () => {
    const c = new CafeCore({ rand: () => 0 });
    for (let i = 0; i < DAY_ORDERS; i++) { c.spawnT = 0; c.tick(0.01); c.hand = { kind: 'dish', recipe: c.queue[0].recipe }; c.serve(); }
    c.tick(0.1); expect(c.over).toBe(true); expect(c.result().served).toBe(8); expect(c.result().stars).toBe(Math.floor(c.score / 20));
  });
});
