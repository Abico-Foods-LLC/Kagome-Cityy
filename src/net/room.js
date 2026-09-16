// Өрөө: Trystero (Nostr signaling → WebRTC) — сервергүй. Peer жагсаалт, host сонголт, 4 суваг (hello/state/event/world).
import { joinRoom, selfId } from 'trystero';
import { PROTO_VER, pickHost, roomCode } from './proto.js';
import { $, modal, closeModal, toast } from '../core/ui.js';

const APP_ID = 'kagome-city-v1';
export const MAX_PEERS = 8;

export class Net {
  constructor(scene) {
    this.scene = scene; this.selfId = selfId;
    this.room = null; this.code = null; this.peers = new Map();   // id → { name, avatar, equipped, joinedAt }
    this.joinedAt = 0; this.hostId = null; this.handlers = {};
  }
  get active() { return !!this.room; }
  get isHost() { return !this.room || this.hostId === this.selfId; }
  get count() { return this.peers.size + (this.room ? 1 : 0); }
  on(evt, fn) { (this.handlers[evt] = this.handlers[evt] || []).push(fn); return this; }
  emit(evt, ...a) { for (const f of this.handlers[evt] || []) f(...a); }

  /** Өрөөнд нэгдэх (код байхгүй бол шинээр үүсгэнэ) */
  join(code = roomCode()) {
    if (this.room) return;
    this.code = code; this.joinedAt = Date.now(); this.peers.clear(); this.hostId = this.selfId;
    const url = new URL(location.href); url.searchParams.set('room', code); history.replaceState(null, '', url);
    try {
      this.room = joinRoom({ appId: APP_ID }, 'kc-' + code, { onJoinError: (d) => this.fail('Холбогдож чадсангүй: ' + (d?.error?.message || d?.error || 'сүлжээ')) });
    } catch (e) { this.fail('Холбогдож чадсангүй: ' + e.message); return; }
    // Trystero 0.25: makeAction → { send, onMessage }; onMessage(data, { peerId })
    const mk = (name) => { const a = this.room.makeAction(name); return { send: (d, t) => a.send(d, t), recv: (fn) => { a.onMessage = (d, meta) => fn(d, typeof meta === 'string' ? meta : meta?.peerId); } }; };
    this.act = { hello: mk('hello'), state: mk('state'), event: mk('event'), world: mk('world') };
    this.act.hello.recv((d, from) => this.onHello(d, from));
    this.act.state.recv((d, from) => { if (this.peers.has(from)) this.emit('state', from, d); });
    this.act.event.recv((d, from) => { if (this.peers.has(from)) this.emit('event', d, from); });
    this.act.world.recv((d, from) => { if (from === this.hostId) this.emit('world', d, from); });
    this.room.onPeerJoin = (id) => this.sendHello(id);
    this.room.onPeerLeave = (id) => { if (!this.peers.has(id)) return; const p = this.peers.get(id); this.peers.delete(id); this.recomputeHost(); this.emit('peerLeave', id, p); toast(`${p.name} гарлаа`, 2000, '👋'); this.refreshHud(); };
    this.refreshHud();
    // Линкээр орсон бол 20с дотор хэн ч ирэхгүй бол анхааруулна (host нь өрөөнд ганцаараа хүлээж болно)
    this.waitT = 0;
    toast(`Өрөө: ${code} — бусдыг линкээр урь`, 3500, '👥');
  }

  fail(msg) { toast(msg + '. Өөр сүлжээ/утасны интернет туршаад дахин оролдоорой.', 6000, '⚠️'); this.leave(); }

  leave() {
    if (this.room) { try { this.room.leave(); } catch (e) { /* аль хэдийн хаагдсан */ } }
    const had = [...this.peers.keys()];
    this.room = null; this.code = null; this.peers.clear(); this.hostId = null;
    for (const id of had) this.emit('peerLeave', id, null);
    const url = new URL(location.href); url.searchParams.delete('room'); history.replaceState(null, '', url);
    this.refreshHud();
  }

  profile() {
    const st = this.scene.state.settings;
    return { ver: PROTO_VER, name: st.name || 'Тоглогч', avatar: st.avatar, equipped: this.scene.state.wardrobe.equipped, joinedAt: this.joinedAt };
  }
  sendHello(target) { if (this.act) this.act.hello.send(this.profile(), target); }
  sendState(arr) { if (this.act && this.peers.size) this.act.state.send(arr); }
  sendEvent(obj, target) { if (this.act && this.peers.size) this.act.event.send(obj, target); }
  sendWorld(obj) { if (this.act && this.peers.size) this.act.world.send(obj); }

  onHello(d, from) {
    if (!d || d.ver !== PROTO_VER) { if (!this.badVer?.has(from)) { (this.badVer = this.badVer || new Set()).add(from); toast('Нэг тоглогчийн тоглоомын хувилбар өөр байна — хуудсаа шинэчлээрэй', 4000, '⚠️'); } return; }
    if (!this.peers.has(from) && this.peers.size >= MAX_PEERS - 1) return;   // өрөө дүүрсэн
    const isNew = !this.peers.has(from);
    this.peers.set(from, { name: String(d.name || 'Тоглогч').slice(0, 12), avatar: d.avatar, equipped: d.equipped || {}, joinedAt: d.joinedAt });
    this.recomputeHost();
    this.emit('hello', from, this.peers.get(from), isNew);
    if (isNew) { toast(`${this.peers.get(from).name} нэгдлээ`, 2200, '👥'); this.scene.audio.ui(); }
    this.refreshHud();
  }
  recomputeHost() {
    const all = [{ id: this.selfId, joinedAt: this.joinedAt }, ...[...this.peers].map(([id, p]) => ({ id, joinedAt: p.joinedAt }))];
    const h = pickHost(all);
    if (h !== this.hostId) { this.hostId = h; this.emit('host', h === this.selfId); }
  }
  update(dt) {
    if (!this.room) return;
    if (this.peers.size === 0 && this.fromLink) { this.waitT += dt; if (this.waitT > 20 && !this.warned) { this.warned = true; toast('Өрөөнд одоогоор хэн ч алга — линк үүсгэсэн хүн тоглоомоо нээсэн эсэхийг шалгаарай', 5000, '👥'); } }
  }
  refreshHud() {
    const b = $('netButton'); if (!b) return;
    b.classList.toggle('hidden', !this.room); $('netCount').textContent = this.count;
  }

  // ---------------------------------------------------------------- UI
  /** Нэр асуух (нэг удаа) */
  askName(cb) {
    const st = this.scene.state;
    if (st.settings.name) return cb();
    modal(`<div class="eyebrow">ХАМТ ТОГЛОХ</div><h2>Нэрээ оруулаарай</h2><p>Бусад тоглогчид таны толгой дээр энэ нэрийг харна.</p><input id="netName" maxlength="12" placeholder="Жишээ: Бат" style="font-size:18px;padding:10px 14px;border-radius:12px;border:2px solid #cfe3d4;width:100%"><div class="row" style="margin-top:12px"><button id="netNameOk" class="primary">Болсон →</button></div>`, { closable: false });
    const ok = () => { const v = $('netName').value.trim().slice(0, 12) || 'Тоглогч'; st.settings.name = v; st.save(); closeModal(); cb(); };
    $('netNameOk').onclick = ok; $('netName').onkeydown = (e) => { if (e.key === 'Enter') ok(); e.stopPropagation(); }; $('netName').focus();
  }
  /** Өрөөний модал: линк, тоглогчид, гарах */
  roomModal() {
    const st = this.scene.state;
    if (!this.room) {
      modal(`<div class="eyebrow">ХАМТ ТОГЛОХ</div><h2>👥 Найзуудаа урь</h2><p>Өрөө үүсгээд линкийг найздаа илгээ — тэр линкээр ороход нэг хотод хамт тоглоно (8 хүртэл). Сервергүй, шууд холбогдоно.</p><div class="row"><button id="netCreate" class="primary">Өрөө үүсгэх</button><button id="netClose" class="ghost">Хаах</button></div>`);
      $('netCreate').onclick = () => { closeModal(); this.askName(() => { this.join(); this.roomModal(); }); };
      $('netClose').onclick = closeModal; return;
    }
    const link = location.origin + location.pathname + '?room=' + this.code;
    const list = [{ id: this.selfId, name: (st.settings.name || 'Тоглогч') + ' (та)' }, ...[...this.peers].map(([id, p]) => ({ id, name: p.name }))]
      .map((p) => `<li>${p.id === this.hostId ? '⭐ ' : ''}${p.name}</li>`).join('');
    modal(`<div class="eyebrow">ӨРӨӨ · ${this.code}</div><h2>👥 Хамт тоглож байна</h2><p>Линк:</p><input id="netLink" readonly value="${link}" style="width:100%;font-size:13px;padding:8px 10px;border-radius:10px;border:2px solid #cfe3d4"><div class="row" style="margin:8px 0"><button id="netCopy" class="primary">📋 Линк хуулах</button></div><p>Тоглогчид (${this.count}/${MAX_PEERS}):</p><ul class="netList">${list}</ul><div class="row"><button id="netLeave" class="ghost">Өрөөнөөс гарах</button><button id="netClose">Хаах</button></div>`);
    $('netCopy').onclick = async () => { try { await navigator.clipboard.writeText(link); toast('Линк хуулагдлаа', 1800, '📋'); } catch (e) { $('netLink').select(); document.execCommand?.('copy'); toast('Линкийг сонгоод хуулаарай', 2000, '📋'); } };
    $('netLeave').onclick = () => { this.leave(); closeModal(); toast('Өрөөнөөс гарлаа', 2000, '👋'); };
    $('netClose').onclick = closeModal;
  }
}
