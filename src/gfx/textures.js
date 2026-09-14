// Procedural canvas texture-ууд: файлгүй, ачаалалт тэг.
import * as T from 'three';

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function finish(c, { repeat = 1, srgb = true, nearest = false } = {}) {
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  if (srgb) t.colorSpace = T.SRGBColorSpace;
  if (nearest) { t.magFilter = T.NearestFilter; }
  t.anisotropy = 4;
  return t;
}

const cache = {};

export function grassTexture() {
  if (cache.grass) return cache.grass;
  const [c, x] = canvas(512), r = rng(7);
  x.fillStyle = '#6cbf58'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const v = r();
    x.fillStyle = v < 0.4 ? '#63b552' : v < 0.7 ? '#78cb62' : v < 0.9 ? '#5aa94a' : '#8ad86f';
    const px = r() * 512, py = r() * 512;
    x.fillRect(px, py, 2 + r() * 5, 2 + r() * 3);
  }
  for (let i = 0; i < 1500; i++) {
    x.strokeStyle = r() < 0.5 ? '#4f9e42' : '#88d66e';
    x.lineWidth = 1.2;
    const px = r() * 512, py = r() * 512;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 6, py - 5 - r() * 8); x.stroke();
  }
  cache.grass = finish(c, { repeat: 24 });
  return cache.grass;
}

export function roadTexture() {
  if (cache.road) return cache.road;
  const [c, x] = canvas(256), r = rng(3);
  x.fillStyle = '#f0d9a8'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2500; i++) {
    x.fillStyle = r() < 0.5 ? '#e8cf9c' : '#f6e3b8';
    x.fillRect(r() * 256, r() * 256, 2 + r() * 3, 2 + r() * 3);
  }
  // Чулуун хавтан
  x.strokeStyle = 'rgba(190,150,100,.35)'; x.lineWidth = 2;
  for (let yy = 0; yy < 256; yy += 64) {
    for (let xx = 0; xx < 256; xx += 64) {
      const off = (yy / 64) % 2 ? 32 : 0;
      x.strokeRect(xx + off + 2, yy + 2, 60, 60);
    }
  }
  cache.road = finish(c, { repeat: 1 });
  return cache.road;
}

export function woodTexture(base = '#a9773f', dark = '#7c5328') {
  const k = 'wood' + base;
  if (cache[k]) return cache[k];
  const [c, x] = canvas(256), r = rng(11);
  x.fillStyle = base; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) {
    x.strokeStyle = r() < 0.5 ? dark : '#c08d55';
    x.globalAlpha = 0.25 + r() * 0.3;
    x.lineWidth = 1 + r() * 3;
    const y = r() * 256;
    x.beginPath(); x.moveTo(0, y);
    for (let px = 0; px <= 256; px += 32) x.lineTo(px, y + Math.sin(px * 0.05 + i) * 3);
    x.stroke();
  }
  x.globalAlpha = 1;
  x.strokeStyle = dark; x.lineWidth = 3;
  for (let y = 0; y < 256; y += 64) { x.beginPath(); x.moveTo(0, y); x.lineTo(256, y); x.stroke(); }
  cache[k] = finish(c, { repeat: 1 });
  return cache[k];
}

export function roofTexture(color = '#e05a4f') {
  const k = 'roof' + color;
  if (cache[k]) return cache[k];
  const [c, x] = canvas(256);
  x.fillStyle = color; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(0,0,0,.22)'; x.lineWidth = 3;
  for (let y = 0; y < 256; y += 32) {
    x.beginPath(); x.moveTo(0, y); x.lineTo(256, y); x.stroke();
    const off = (y / 32) % 2 ? 32 : 0;
    for (let px = off; px < 256; px += 64) { x.beginPath(); x.moveTo(px, y); x.lineTo(px, y + 32); x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(0, y + 2, 256, 6);
  }
  cache[k] = finish(c, { repeat: 1 });
  return cache[k];
}

export function stoneTexture() {
  if (cache.stone) return cache.stone;
  const [c, x] = canvas(256), r = rng(5);
  x.fillStyle = '#9b988a'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6000; i++) {
    const q = Math.floor(120 + r() * 70);
    x.fillStyle = `rgba(${q},${q},${q - 12},.35)`;
    x.fillRect(r() * 256, r() * 256, 1 + r() * 4, 1 + r() * 3);
  }
  x.strokeStyle = '#5b5a50'; x.lineWidth = 3;
  for (let y = 0; y < 256; y += 64) {
    x.strokeRect(0, y, 256, 64);
    for (let j = 0; j < 4; j++) x.strokeRect((j * 80 + (y % 128 ? 30 : 0)) % 256, y, 80, 64);
  }
  cache.stone = finish(c, { repeat: 1 });
  return cache.stone;
}

/** Дугуй soft particle sprite. */
export function spotTexture() {
  if (cache.spot) return cache.spot;
  const [c, x] = canvas(64);
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  cache.spot = finish(c, { srgb: false });
  cache.spot.wrapS = cache.spot.wrapT = T.ClampToEdgeWrapping;
  return cache.spot;
}

/** Хавтан дээрх текст (нэрийн самбар). */
export function textTexture(text, { bg = '#fff8e0', fg = '#1e6b45', font = '800 84px Arial, sans-serif', w = 1024, h = 256, radius = 40, border = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.clearRect(0, 0, w, h);
  x.fillStyle = bg;
  roundRect(x, 6, 6, w - 12, h - 12, radius); x.fill();
  if (border) { x.strokeStyle = border; x.lineWidth = 12; x.stroke(); }
  x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = fg;
  x.fillText(text, w / 2, h / 2 + 4, w - 80);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function roundRect(x, px, py, w, h, r) {
  x.beginPath();
  x.moveTo(px + r, py); x.lineTo(px + w - r, py); x.quadraticCurveTo(px + w, py, px + w, py + r);
  x.lineTo(px + w, py + h - r); x.quadraticCurveTo(px + w, py + h, px + w - r, py + h);
  x.lineTo(px + r, py + h); x.quadraticCurveTo(px, py + h, px, py + h - r);
  x.lineTo(px, py + r); x.quadraticCurveTo(px, py, px + r, py); x.closePath();
}

/** Дүрийн нүүрний texture: нүд, хөмсөг, инээмсэглэл, сахал. */
export function faceTexture({ smile = true, blink = false } = {}) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 256, 256);
  // Нүд
  for (const ex of [88, 168]) {
    if (blink) {
      x.strokeStyle = '#2a1d18'; x.lineWidth = 6; x.lineCap = 'round';
      x.beginPath(); x.moveTo(ex - 16, 116); x.quadraticCurveTo(ex, 124, ex + 16, 116); x.stroke();
    } else {
      x.fillStyle = '#fff'; x.beginPath(); x.ellipse(ex, 116, 18, 22, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#2a1d18'; x.beginPath(); x.ellipse(ex + 2, 119, 11, 14, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(ex + 6, 112, 4, 0, Math.PI * 2); x.fill();
    }
    // Хөмсөг
    x.strokeStyle = '#1a1414'; x.lineWidth = 7; x.lineCap = 'round';
    x.beginPath(); x.moveTo(ex - 20, 86); x.quadraticCurveTo(ex, 78, ex + 20, 86); x.stroke();
  }
  // Хамар
  x.strokeStyle = 'rgba(120,70,50,.6)'; x.lineWidth = 4;
  x.beginPath(); x.moveTo(128, 128); x.lineTo(124, 148); x.lineTo(132, 150); x.stroke();
  // Сахал (эх зургийн дагуу — нимгэн)
  x.strokeStyle = '#2a1d18'; x.lineWidth = 5;
  x.beginPath(); x.moveTo(104, 164); x.quadraticCurveTo(128, 158, 152, 164); x.stroke();
  // Ам
  x.strokeStyle = '#7a3a30'; x.lineWidth = 6;
  x.beginPath();
  if (smile) { x.moveTo(104, 180); x.quadraticCurveTo(128, 200, 152, 180); }
  else { x.moveTo(108, 186); x.lineTo(148, 186); }
  x.stroke();
  // Хацар
  x.fillStyle = 'rgba(255,120,110,.35)';
  x.beginPath(); x.ellipse(70, 150, 14, 9, 0, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.ellipse(186, 150, 14, 9, 0, 0, Math.PI * 2); x.fill();
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}
