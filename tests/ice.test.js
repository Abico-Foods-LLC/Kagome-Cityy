import { describe, it, expect, vi } from 'vitest';
import { getTurnServers, STUN_ONLY, CACHE_KEY, CACHE_MS, STALE_MS } from '../src/net/ice.js';

const TURN = { urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'u', credential: 'c' };
const okFetch = (body = { iceServers: [{ urls: ['stun:stun.cloudflare.com:3478'] }, TURN] }) => vi.fn(async () => ({ ok: true, json: async () => body }));
const mem = (init = {}) => { const m = { ...init }; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; }, _m: m }; };
const opts = (o = {}) => ({ url: 'https://turn.example/', fetchFn: okFetch(), storage: mem(), now: () => 1_000_000, timeoutMs: 50, ...o });

describe('getTurnServers', () => {
  it('URL байхгүй бол зөвхөн STUN (fetch дуудахгүй)', async () => {
    const f = okFetch(); const r = await getTurnServers(opts({ url: '', fetchFn: f }));
    expect(r.source).toBe(STUN_ONLY); expect(r.turn).toEqual([]); expect(f).not.toHaveBeenCalled();
  });
  it('Worker-оос TURN авч, cache-д хадгална', async () => {
    const st = mem(); const r = await getTurnServers(opts({ storage: st }));
    expect(r.source).toBe('turn'); expect(r.turn).toEqual([TURN]);
    expect(JSON.parse(st._m[CACHE_KEY])).toEqual({ at: 1_000_000, turn: [TURN] });
  });
  it('шинэ cache байвал fetch дуудахгүй', async () => {
    const f = okFetch(); const st = mem({ [CACHE_KEY]: JSON.stringify({ at: 1_000_000 - CACHE_MS + 1, turn: [TURN] }) });
    const r = await getTurnServers(opts({ fetchFn: f, storage: st }));
    expect(r.source).toBe('cache'); expect(r.turn).toEqual([TURN]); expect(f).not.toHaveBeenCalled();
  });
  it('cache хуучирсан бол дахин fetch хийнэ', async () => {
    const f = okFetch(); const st = mem({ [CACHE_KEY]: JSON.stringify({ at: 1_000_000 - CACHE_MS - 1, turn: [TURN] }) });
    const r = await getTurnServers(opts({ fetchFn: f, storage: st })); expect(r.source).toBe('turn'); expect(f).toHaveBeenCalledTimes(1);
  });
  it('fetch алдаа → STUN; хуучин ч гэсэн хүчинтэй cache байвал түүнийг', async () => {
    const bad = vi.fn(async () => { throw new Error('net'); });
    expect((await getTurnServers(opts({ fetchFn: bad }))).source).toBe(STUN_ONLY);
    const st = mem({ [CACHE_KEY]: JSON.stringify({ at: 1_000_000 - STALE_MS + 1, turn: [TURN] }) });
    const r = await getTurnServers(opts({ fetchFn: bad, storage: st })); expect(r.source).toBe('cache'); expect(r.turn).toEqual([TURN]);
    const st2 = mem({ [CACHE_KEY]: JSON.stringify({ at: 1_000_000 - STALE_MS - 1, turn: [TURN] }) });
    expect((await getTurnServers(opts({ fetchFn: bad, storage: st2 }))).source).toBe(STUN_ONLY);
  });
  it('timeout → STUN (abort signal дамжуулна)', async () => {
    const slow = vi.fn((_u, { signal }) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(new Error('aborted')))));
    const r = await getTurnServers(opts({ fetchFn: slow, timeoutMs: 20 })); expect(r.source).toBe(STUN_ONLY); expect(slow).toHaveBeenCalled();
  });
  it('буруу хариу (TURN entry байхгүй / ok биш) → STUN, cache бичихгүй', async () => {
    const st = mem();
    expect((await getTurnServers(opts({ fetchFn: okFetch({ iceServers: [{ urls: ['stun:x'] }] }), storage: st }))).source).toBe(STUN_ONLY);
    expect((await getTurnServers(opts({ fetchFn: vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })), storage: st }))).source).toBe(STUN_ONLY);
    expect(st._m[CACHE_KEY]).toBeUndefined();
  });
  it('storage байхгүй/алдаатай байсан ч ажиллана', async () => {
    const broken = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    expect((await getTurnServers(opts({ storage: broken }))).source).toBe('turn');
    expect((await getTurnServers(opts({ storage: null }))).source).toBe('turn');
  });
});
