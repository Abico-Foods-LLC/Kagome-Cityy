// Нэгдсэн удирдлага: гар, хулгана, мэдрэгч дэлгэц (joystick + swipe), gamepad.
// Тоглоомын логик зөвхөн "action" нэрээр асууна: move axis, jump, interact, run, pause...

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'jump', KeyE: 'interact', Enter: 'interact', ShiftLeft: 'run', ShiftRight: 'run',
  Escape: 'pause', KeyP: 'pause', KeyM: 'map', KeyQ: 'camLeft', KeyR: 'camRight', Tab: 'map', KeyC: 'roll', ControlLeft: 'roll', Digit1: 'emote1', Digit2: 'emote2', Digit3: 'emote3',
};

export class Input {
  constructor() {
    this.keys = new Set();
    this.pressedNow = new Set();   // энэ frame дээр шинээр дарагдсан
    this.releasedNow = new Set();
    this.stick = { x: 0, y: 0, active: false };
    this.look = { dx: 0, dy: 0 };
    this.swipe = null;              // 'left' | 'right' | 'up' | 'down'
    this.enabled = true;
    this.isTouch = matchMedia('(pointer: coarse)').matches;
    this.gamepadIndex = null;
    this.gpPrev = {};
    this.listeners = new Map();

    addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      e.preventDefault();
      if (e.repeat) return;
      this.press(a);
    });
    addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code];
      if (a) this.release(a);
    });
    addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); });
    addEventListener('gamepadconnected', (e) => { this.gamepadIndex = e.gamepad.index; });
    addEventListener('gamepaddisconnected', () => { this.gamepadIndex = null; });
  }

  on(action, fn) {
    if (!this.listeners.has(action)) this.listeners.set(action, new Set());
    this.listeners.get(action).add(fn);
    return () => this.listeners.get(action).delete(fn);
  }

  press(a) {
    if (!this.keys.has(a)) {
      this.pressedNow.add(a);
      const set = this.listeners.get(a);
      if (set && this.enabled) for (const fn of set) fn();
    }
    this.keys.add(a);
  }

  release(a) {
    if (this.keys.has(a)) this.releasedNow.add(a);
    this.keys.delete(a);
  }

  /** Товч дарагдсан үед нэг удаа. Дүрслэлийн frame бүрийн эхэнд шалгана. */
  justPressed(a) { return this.enabled && this.pressedNow.has(a); }
  held(a) { return this.enabled && this.keys.has(a); }

  clear() {
    this.keys.clear();
    this.stick.x = this.stick.y = 0;
    this.stick.active = false;
  }

  /** Хөдөлгөөний вектор: x (баруун +), y (урагш -). Хэмжээ 0..1. */
  axis() {
    if (!this.enabled) return { x: 0, y: 0 };
    let x = (this.keys.has('right') ? 1 : 0) - (this.keys.has('left') ? 1 : 0) + this.stick.x;
    let y = (this.keys.has('down') ? 1 : 0) - (this.keys.has('up') ? 1 : 0) + this.stick.y;
    const gp = this.gamepad();
    if (gp) {
      const gx = dead(gp.axes[0]), gy = dead(gp.axes[1]);
      x += gx; y += gy;
    }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  }

  gamepad() {
    if (this.gamepadIndex === null || !navigator.getGamepads) return null;
    return navigator.getGamepads()[this.gamepadIndex] || null;
  }

  /** Frame бүрийн төгсгөлд дуудна. */
  endFrame() {
    this.pressedNow.clear();
    this.releasedNow.clear();
    this.look.dx = this.look.dy = 0;
    this.swipe = null;
    // Gamepad товчийг гар товч шиг хувиргана
    const gp = this.gamepad();
    if (gp) {
      const map = { 0: 'jump', 1: 'interact', 2: 'roll', 9: 'pause', 3: 'map', 4: 'camLeft', 5: 'camRight', 6: 'run', 7: 'run' };
      for (const [i, a] of Object.entries(map)) {
        const down = gp.buttons[i]?.pressed;
        if (down && !this.gpPrev[i]) this.press(a);
        if (!down && this.gpPrev[i]) this.release(a);
        this.gpPrev[i] = down;
      }
      const rx = dead(gp.axes[2] || 0);
      this.look.dx += rx * 0.05;
    }
  }

  /** Виртуал joystick DOM элементийг холбоно. */
  bindStick(el, knob, radius = 34) {
    const move = (e) => {
      const r = el.getBoundingClientRect();
      let x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
      const d = Math.hypot(x, y) || 1;
      const k = Math.min(1, d / radius);
      x = x / d * k; y = y / d * k;
      this.stick.x = x; this.stick.y = y; this.stick.active = true;
      knob.style.transform = `translate(${x * radius}px,${y * radius}px)`;
    };
    const end = () => { this.stick.x = this.stick.y = 0; this.stick.active = false; knob.style.transform = ''; };
    el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); move(e); });
    el.addEventListener('pointermove', (e) => { if (el.hasPointerCapture(e.pointerId)) move(e); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(ev, end);
  }

  /** Виртуал товчлуур: дарж байх хугацаанд held, дарсан мөчид justPressed. */
  bindButton(el, action) {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); this.press(action); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(ev, () => this.release(action));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Canvas дээр чирэх = камер эргүүлэх, богино swipe = runner-ийн үйлдэл. */
  bindPointer(canvas, { swipe = false } = {}) {
    let active = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      active = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!active || e.pointerId !== active.id) return;
      this.look.dx += (e.clientX - active.x) * 0.0055;
      this.look.dy += (e.clientY - active.y) * 0.0035;
      active.x = e.clientX; active.y = e.clientY;
    });
    const end = (e) => {
      if (!active || e.pointerId !== active.id) return;
      if (swipe) {
        const dx = e.clientX - active.sx, dy = e.clientY - active.sy;
        const dt = performance.now() - active.t;
        if (dt < 600 && Math.max(Math.abs(dx), Math.abs(dy)) > 24) {
          this.swipe = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        }
      }
      active = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }
}

function dead(v) { return Math.abs(v) < 0.15 ? 0 : v; }
