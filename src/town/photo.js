// Photo mode: P / 📷 — HUD нуугдаж тоглоом царцана (render үргэлжилнэ), камер чөлөөтэй, PNG хадгална.
import * as T from 'three';
import { $, toast } from '../core/ui.js';

export class PhotoMode {
  constructor(scene) { this.scene = scene; this.active = false; this.dist = 8; this.yaw = 0; this.pitch = 0.3; this.target = new T.Vector3(); }

  setup() {
    $('photoButton').onclick = () => this.toggle();
    $('photoSave').onclick = () => this.save();
    $('photoReset').onclick = () => this.reset();
    $('photoExit').onclick = () => this.exit();
  }

  toggle() { this.active ? this.exit() : this.enter(); }

  enter() {
    const sc = this.scene;
    if (!sc.started || this.active) return;
    this.active = true;
    this.saved = { yaw: sc.cam.yaw, pitch: sc.cam.pitch };
    this.reset();
    document.body.classList.add('photo'); $('photoBar').classList.remove('hidden');
    sc.hint.visible = false;   // харилцааны icon зурган дээр орохгүй
    sc.audio.ui();
    if (!this.hinted) { this.hinted = true; toast('Чирэх — эргүүлэх · Дугуй — zoom · WASD/QE — хөдлөх', 3200, '📷'); }
  }

  /** Камер тоглогчийн одоогийн орбит руу буцна */
  reset() {
    const sc = this.scene, base = sc.vehicle ? sc.vehicle.position : sc.player.pos;
    this.target.set(base.x, base.y + 1.2, base.z);
    this.yaw = sc.cam.yaw; this.pitch = Math.max(0.05, sc.cam.pitch); this.dist = sc.cam.dist;
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    document.body.classList.remove('photo'); $('photoBar').classList.add('hidden');
    this.scene.audio.ui();
  }

  update(dt) {
    const sc = this.scene, input = sc.input, cam = sc.camera;
    if (input.justPressed('pause') || input.justPressed('photo')) return this.exit();
    this.yaw -= input.look.dx; this.pitch = T.MathUtils.clamp(this.pitch + input.look.dy, -0.6, 1.5);
    if (input.zoom) this.dist = T.MathUtils.clamp(this.dist + input.zoom * 0.8, 2, 30);
    // WASD — харах чиглэлийн дагуу, Q/E — дээш/доош
    const a = input.axis(), sp = (input.held('run') ? 15 : 6) * dt;
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);              // камерын урд (яв)
    this.target.x += (fx * a.y + fz * a.x) * sp; this.target.z += (fz * a.y - fx * a.x) * sp;
    if (input.held('camLeft')) this.target.y -= sp; if (input.held('camRight')) this.target.y += sp;
    this.target.y = Math.max(-0.5, this.target.y);
    const h = Math.sin(this.pitch) * this.dist, r = Math.cos(this.pitch) * this.dist;
    cam.position.set(this.target.x + Math.sin(this.yaw) * r, this.target.y + h, this.target.z + Math.cos(this.yaw) * r);
    cam.lookAt(this.target);
  }

  save() {
    const sc = this.scene, c = sc.app.renderer.domElement;
    sc.render();   // buffer-ийг шинээр зурж шууд уншина (preserveDrawingBuffer шаардлагагүй)
    const d = new Date(), pad = (n) => String(n).padStart(2, '0');
    const name = `kagome-city-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.png`;
    const download = (url, revoke) => { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); if (revoke) setTimeout(() => URL.revokeObjectURL(url), 5000); };
    if (c.toBlob) c.toBlob((b) => { if (b) download(URL.createObjectURL(b), true); else download(c.toDataURL('image/png')); }, 'image/png');
    else download(c.toDataURL('image/png'));
    sc.audio.tone({ f: 1200, f2: 800, type: 'square', dur: 0.08, vol: 0.1 });
    sc.particles.burst(this.target.clone(), 0xffffff, 10, { speed: 1, up: 1, size: 0.12, life: 0.5, gravity: 0 });
    toast('Зураг хадгалагдлаа 📷', 2000, '✅');
  }
}
