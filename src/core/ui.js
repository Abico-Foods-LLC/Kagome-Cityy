// DOM UI туслахууд: toast, modal, fade, HUD.
export const $ = (id) => document.getElementById(id);

let toastTimer = null;
export function toast(text, ms = 3200, icon = '') {
  const el = $('toast');
  el.innerHTML = (icon ? `<span class="ti">${icon}</span>` : '') + `<span>${text}</span>`;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

const modalStack = [];
export function modal(html, { onClose = null, closable = true, cls = '' } = {}) {
  const d = $('panel');
  $('panelBody').innerHTML = html;
  d.className = cls;
  d.querySelector('.close').style.display = closable ? '' : 'none';
  d.dataset.closable = closable ? '1' : '0';
  d.querySelector('.close').onclick = () => d.close();
  d.oncancel = (e) => { if (!closable) e.preventDefault(); };
  if (!d.open) d.showModal();
  d.onclose = () => { onClose?.(); d.onclose = null; };
  return d;
}
export function closeModal() { const d = $('panel'); if (d.open) d.close(); }
export function isModalOpen() { return $('panel').open || $('welcome').open; }

export function fade(toBlack, ms = 500) {
  const el = $('fade');
  el.style.transitionDuration = ms + 'ms';
  el.classList.toggle('on', toBlack);
  return new Promise((r) => setTimeout(r, ms));
}

export function show(id, on = true) { $(id).classList.toggle('hidden', !on); }

export function setLoading(pct, label) {
  const bar = $('loadBar');
  if (bar) bar.style.width = pct + '%';
  const l = $('loadLabel');
  if (l && label) l.textContent = label;
}

/** Товч дарахад жижиг "pop" animation */
export function pop(el) {
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

export function fmt(n) { return Math.round(n).toLocaleString('mn-MN'); }
