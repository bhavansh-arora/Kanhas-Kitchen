// Shared helpers for the admin and owner panels.
const BIZ = new URLSearchParams(location.search).get('b'); // set when an admin opens a business

async function api(path, { method = 'GET', body, raw } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (BIZ) headers['X-Business-Id'] = BIZ;
  const res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (res.status === 401) {
    location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search);
    throw new Error('Please sign in');
  }
  if (raw) return res;
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

function fmtDate(t, withTime = true) {
  const d = new Date(t);
  const opts = { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' };
  if (withTime) Object.assign(opts, { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleString(undefined, opts);
}
function ago(t) {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return fmtDate(t, false);
}
const num = (n) => Number(n || 0).toLocaleString();

let toastTimer;
function toast(msg, bad = false) {
  let el = $('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.toggle('bad', bad);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, bad ? 6000 : 3000);
}

// Opens a modal; `build(el, close)` fills it. Returns a promise resolved by close(value).
function modal(html, build) {
  return new Promise((resolve) => {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(back);
    const close = (v) => { back.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };
    document.addEventListener('keydown', onKey);
    back.addEventListener('mousedown', (e) => { if (e.target === back) close(null); });
    $$('[data-close]', back).forEach((b) => b.addEventListener('click', () => close(null)));
    build?.(back.firstElementChild, close);
    const first = $('input, textarea, select, button.primary', back);
    first?.focus();
  });
}

async function confirmBox(message, okLabel = 'Delete') {
  return modal(`<h2>Are you sure?</h2><p>${esc(message)}</p><div class="actions"><button data-close>Cancel</button><button class="primary ok">${esc(okLabel)}</button></div>`,
    (el, close) => { $('.ok', el).onclick = () => close(true); });
}

async function copy(text, label = 'Copied') {
  try { await navigator.clipboard.writeText(text); toast(label); } catch { toast('Copy failed — select the text and copy it manually.', true); }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(new Error(`Could not read ${file.name}`));
    r.readAsDataURL(file);
  });
}

// Very small Markdown renderer for assistant replies (escapes everything first).
function md(text) {
  const lines = esc(text).split('\n');
  let html = '';
  let list = null;
  const inline = (s) => s
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  for (const line of lines) {
    const ul = line.match(/^\s*[-*•]\s+(.*)/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
    const want = ul ? 'ul' : ol ? 'ol' : null;
    if (list && want !== list) { html += `</${list}>`; list = null; }
    if (want) {
      if (!list) { html += `<${want}>`; list = want; }
      html += `<li>${inline((ul || ol)[1])}</li>`;
    } else if (/^#{1,6}\s/.test(line)) html += `<p><b>${inline(line.replace(/^#+\s*/, ''))}</b></p>`;
    else if (line.trim()) html += `<p>${inline(line)}</p>`;
  }
  if (list) html += `</${list}>`;
  return html;
}

async function signOut() {
  await fetch('/api/logout', { method: 'POST' });
  location.href = '/login';
}
