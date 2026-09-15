import { describe, it, expect } from 'vitest';
import { GameState } from '../src/core/state.js';

const MIN = 60 * 1000;

describe('GameState — загас', () => {
  it('fishCaught тоолж од өгнө', () => {
    const s = new GameState();
    s.fishCaught();
    expect(s.counts.fish).toBe(1);
    expect(s.stars).toBe(8);
  });
});

describe('GameState — талбай', () => {
  it('default 6 хоосон нүхтэй', () => {
    const s = new GameState();
    expect(s.farm).toHaveLength(6);
    expect(s.farm[0]).toEqual({ type: null, stage: 0, since: null });
  });

  it('plant: од хүрэлцэхгүй бол false', () => {
    const s = new GameState({ stars: 5 });
    expect(s.plant(0, 4)).toBe(false);
    expect(s.farm[0].stage).toBe(0);
  });

  it('plant: амжилттай бол од хасаж stage 1 болно', () => {
    const s = new GameState({ stars: 25 });
    expect(s.plant(0, 4)).toBe(true);
    expect(s.stars).toBe(15);
    expect(s.farm[0]).toEqual({ type: 4, stage: 1, since: null });
  });

  it('plant: хоосон бус нүхэнд false', () => {
    const s = new GameState({ stars: 50 });
    s.plant(1, 5);
    expect(s.plant(1, 6)).toBe(false);
    expect(s.stars).toBe(40);
  });

  it('water: тарьсан нүхийг услахад since тавигдана; давхар услахгүй', () => {
    const s = new GameState({ stars: 50 });
    s.plant(0, 4);
    expect(s.water(0, 1000)).toBe(true);
    expect(s.farm[0].since).toBe(1000);
    expect(s.water(0, 2000)).toBe(false);
    expect(s.farm[0].since).toBe(1000);
  });

  it('water: хоосон нүх ба ургац бэлэн нүхийг услахгүй', () => {
    const s = new GameState({ stars: 50, farm: [{ type: 4, stage: 4, since: null }] });
    expect(s.water(0, 1)).toBe(false);
    expect(s.water(1, 1)).toBe(false);
  });

  it('farmTick: услаагүй бол хөдлөхгүй', () => {
    const s = new GameState({ stars: 50 });
    s.plant(0, 4);
    expect(s.farmTick(10 * MIN)).toEqual([]);
    expect(s.farm[0].stage).toBe(1);
  });

  it('farmTick: 60 сек дараа нэг шат ахиж, дахин услах шаардлагатай болно', () => {
    const s = new GameState({ stars: 50 });
    s.plant(0, 4); s.water(0, 0);
    expect(s.farmTick(MIN - 1)).toEqual([]);
    expect(s.farmTick(MIN)).toEqual([0]);
    expect(s.farm[0]).toEqual({ type: 4, stage: 2, since: null });
    // Удаан хугацаа өнгөрсөн ч услаагүй тул дахин ахихгүй
    expect(s.farmTick(10 * MIN)).toEqual([]);
  });

  it('farmTick: 3 удаа услахад stage 4 (ургац), цаашид ахихгүй', () => {
    const s = new GameState({ stars: 50 });
    s.plant(2, 7);
    let now = 0;
    for (let k = 0; k < 3; k++) { s.water(2, now); now += MIN; s.farmTick(now); }
    expect(s.farm[2].stage).toBe(4);
    expect(s.water(2, now)).toBe(false);
    expect(s.farmTick(now + 10 * MIN)).toEqual([]);
  });

  it('farmHarvest: stage 4 биш бол false', () => {
    const s = new GameState({ stars: 50 });
    s.plant(0, 4);
    expect(s.farmHarvest(0)).toBe(false);
  });

  it('farmHarvest: ургац 2, од 15, тоолуур, нүх хоосорно', () => {
    const s = new GameState({ farm: [{ type: 5, stage: 4, since: null }] });
    expect(s.farmHarvest(0)).toBe(true);
    expect(s.inventory[5]).toBe(2);
    expect(s.counts.farm).toBe(1);
    expect(s.counts.harvest).toBe(2);
    expect(s.stars).toBe(15);
    expect(s.farm[0]).toEqual({ type: null, stage: 0, since: null });
  });
});

describe('GameState — хүргэлт', () => {
  it('deliveryDone хугацаанд нь +30, хоцорвол +15', () => {
    const s = new GameState();
    s.deliveryDone(true);
    s.deliveryDone(false);
    expect(s.delivery.done).toBe(2);
    expect(s.counts.delivery).toBe(2);
    expect(s.stars).toBe(45);
  });
});

describe('GameState — хадгалалт нийцтэй', () => {
  it('хуучин save (шинэ талбаргүй) default утгуудаар ачаалагдана', () => {
    const old = { counts: { harvest: 3, math: 1, read: 0, logic: 0, drive: 0, runner: 0 }, stars: 40, chapter: 1 };
    const s = new GameState(old);
    expect(s.counts.fish).toBe(0);
    expect(s.counts.farm).toBe(0);
    expect(s.counts.delivery).toBe(0);
    expect(s.counts.harvest).toBe(3);
    expect(s.farm).toHaveLength(6);
    expect(s.delivery).toEqual({ done: 0 });
  });

  it('toJSON → шинэ GameState тойрог хадгална', () => {
    const s = new GameState({ stars: 50 });
    s.plant(3, 6); s.water(3, 123); s.fishCaught(); s.deliveryDone(true);
    const r = new GameState(JSON.parse(JSON.stringify(s.toJSON())));
    expect(r.farm[3]).toEqual({ type: 6, stage: 1, since: 123 });
    expect(r.counts.fish).toBe(1);
    expect(r.delivery.done).toBe(1);
  });
});

describe('GameState — өдрийн даалгавар', () => {
  it('fish / farm / delivery id-ууд pool-д байна', () => {
    const ids = GameState.DAILY_POOL.map((q) => q.id);
    expect(ids).toEqual(expect.arrayContaining(['fish', 'farm', 'delivery']));
    expect(GameState.DAILY_POOL.find((q) => q.id === 'fish').goal).toBe(3);
    expect(GameState.DAILY_POOL.find((q) => q.id === 'farm').goal).toBe(1);
    expect(GameState.DAILY_POOL.find((q) => q.id === 'delivery').goal).toBe(2);
  });

  it('dailyProgress шинэ id-тай ажиллана', () => {
    const s = new GameState();
    s.daily = { date: s.daily.date, quests: [{ id: 'fish', goal: 3, progress: 0, done: false }] };
    expect(s.dailyProgress('fish', 1)).toBeNull();
    expect(s.dailyProgress('fish', 2)).toMatchObject({ id: 'fish', done: true });
    expect(s.stars).toBe(30);
  });
});
