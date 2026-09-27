/* Kanha's Kitchen — orders, payments and analytics panel. Plain JS, no build step. */
'use strict';

// ---------- helpers ----------
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const inr = (n) => '₹' + num(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const inrShort = (n) => {
  n = num(n);
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(1).replace(/\.0$/, '') + 'Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1).replace(/\.0$/, '') + 'L';
  if (n >= 1e3) return '₹' + (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return '₹' + Math.round(n);
};
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ymd(new Date());
const parseYmd = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (s, n) => {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
const monthKey = (s) => s.slice(0, 7);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (key, withYear = true) => {
  const [y, m] = key.split('-').map(Number);
  return MONTHS[m - 1] + (withYear ? ` ${y}` : '');
};
const niceDate = (s) => {
  if (!s) return '';
  const d = parseYmd(s);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};
const shortDate = (s) => (s ? parseYmd(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');
const monthsBack = (key, n) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 - n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const lastDayOfMonth = (key) => {
  const [y, m] = key.split('-').map(Number);
  return ymd(new Date(y, m, 0));
};
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const PAY_MODES = ['UPI', 'Cash', 'Card', 'Bank transfer', 'Other'];
const OUTSIDE = 'outside';

// ---------- storage (server API, or this browser's localStorage as a fallback) ----------
const LS_KEY = 'kanhas-kitchen-data-v1';
let S = { orders: [], menu: [], societies: [] };

function goToLogin() {
  location.href = 'login?next=' + encodeURIComponent(location.pathname + location.hash);
  return new Promise(() => {}); // stop here while the browser navigates
}

const Store = {
  mode: 'server',
  user: null,
  async init() {
    let res;
    try {
      res = await fetch('api/state', { cache: 'no-store' });
    } catch {}
    if (res && res.status === 401) return goToLogin();
    try {
      if (!res || !res.ok || !(res.headers.get('content-type') || '').includes('json')) throw new Error('no api');
      S = await res.json();
      this.mode = 'server';
      try {
        const me = await (await fetch('api/session', { cache: 'no-store' })).json();
        this.user = me.auth ? me.user : null;
      } catch {}
    } catch {
      this.mode = 'local';
      let saved = null;
      try {
        saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      } catch {}
      S = saved || structuredClone(window.KK_DEFAULTS);
    }
    for (const k of ['orders', 'menu', 'societies']) if (!Array.isArray(S[k])) S[k] = [];
  },
  persistLocal() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(S));
    } catch (e) {
      toast('Could not save in this browser: ' + e.message, true);
    }
  },
  async api(method, url, body) {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 401) {
      goToLogin();
      throw new Error('Signed out — please sign in again');
    }
    if (!res.ok) {
      let msg = res.statusText;
      try {
        msg = (await res.json()).error || msg;
      } catch {}
      throw new Error(msg);
    }
    return res.status === 204 ? null : res.json();
  },
  async save(col, doc) {
    doc = { ...doc, id: doc.id || uid() };
    const exists = S[col].some((d) => d.id === doc.id);
    if (this.mode === 'server') {
      doc = exists
        ? await this.api('PUT', `api/${col}/${encodeURIComponent(doc.id)}`, doc)
        : await this.api('POST', `api/${col}`, doc);
    }
    if (exists) S[col] = S[col].map((d) => (d.id === doc.id ? doc : d));
    else S[col].push(doc);
    if (this.mode === 'local') this.persistLocal();
    return doc;
  },
  async remove(col, id) {
    if (this.mode === 'server') await this.api('DELETE', `api/${col}/${encodeURIComponent(id)}`);
    S[col] = S[col].filter((d) => d.id !== id);
    if (this.mode === 'local') this.persistLocal();
  },
  async importAll(data) {
    for (const k of ['orders', 'menu', 'societies']) {
      if (!Array.isArray(data[k])) throw new Error(`Backup file is missing "${k}"`);
    }
    if (this.mode === 'server') S = await this.api('POST', 'api/import', data);
    else {
      S = { orders: data.orders, menu: data.menu, societies: data.societies };
      this.persistLocal();
    }
  },
};

async function guarded(fn, okMsg) {
  try {
    const r = await fn();
    if (okMsg) toast(okMsg);
    return r;
  } catch (e) {
    toast('Error: ' + e.message, true);
    throw e;
  }
}

// ---------- domain helpers ----------
const societyById = (id) => S.societies.find((s) => s.id === id);
const isGrid = (soc) => soc && soc.floors > 0 && soc.unitsPerFloor > 0;
const flatNo = (floor, unit) => String(floor * 100 + unit);
const societyName = (id) => (id === OUTSIDE ? 'Outside' : societyById(id)?.name || 'Unknown society');

function houseLabel(o) {
  if (o.society === OUTSIDE) return o.customer || 'Outside customer';
  const flat = o.flat || '?';
  return o.block ? `${o.block}-${flat}` : flat;
}
function fullHouseLabel(o) {
  if (o.society === OUTSIDE) return `${o.customer || 'Outside customer'} (Outside)`;
  return `${societyName(o.society)} · ${houseLabel(o)}`;
}
function houseKey(o) {
  if (o.society === OUTSIDE) {
    return `outside|${(o.customer || '').trim().toLowerCase()}|${(o.phone || '').replace(/\D/g, '')}`;
  }
  return `${o.society}|${(o.block || '').toUpperCase()}|${o.flat || ''}`;
}
const itemsTotal = (items) => items.reduce((s, it) => s + num(it.price) * num(it.qty), 0);
const itemsText = (o) => (o.items?.length ? o.items.map((it) => `${it.name} × ${it.qty}`).join(', ') : 'Custom amount');
const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '');
const inRange = (o, from, to) => (!from || o.date >= from) && (!to || o.date <= to);

function summarize(orders) {
  let revenue = 0,
    received = 0;
  for (const o of orders) {
    revenue += num(o.amount);
    if (o.paid) received += num(o.amount);
  }
  return { count: orders.length, revenue, received, pending: revenue - received };
}

function productStats(orders) {
  const m = new Map();
  for (const o of orders) {
    for (const it of o.items || []) {
      const key = it.menuId || 'name:' + it.name.trim().toLowerCase();
      const cur = m.get(key) || { name: it.name, qty: 0, revenue: 0, orders: 0 };
      cur.qty += num(it.qty);
      cur.revenue += num(it.qty) * num(it.price);
      cur.orders += 1;
      m.set(key, cur);
    }
  }
  return [...m.values()];
}

function houseStats(orders) {
  const m = new Map();
  for (const o of orders) {
    const key = houseKey(o);
    const cur = m.get(key) || { key, label: fullHouseLabel(o), orders: 0, revenue: 0, pending: 0, last: '' };
    cur.orders += 1;
    cur.revenue += num(o.amount);
    if (!o.paid) cur.pending += num(o.amount);
    if (o.date > cur.last) cur.last = o.date;
    m.set(key, cur);
  }
  return [...m.values()];
}

function monthStats(orders, months) {
  const m = new Map(months.map((k) => [k, { key: k, orders: 0, revenue: 0, received: 0, pending: 0 }]));
  for (const o of orders) {
    const cur = m.get(monthKey(o.date));
    if (!cur) continue;
    cur.orders += 1;
    cur.revenue += num(o.amount);
    if (o.paid) cur.received += num(o.amount);
    else cur.pending += num(o.amount);
  }
  return months.map((k) => m.get(k));
}

function lastOrderFor(key, excludeId) {
  return S.orders.filter((o) => o.id !== excludeId && houseKey(o) === key).sort(byDateDesc)[0];
}

// ---------- UI state ----------
const ui = {
  date: today(),
  orderSociety: '',
  qa: { society: 'vaishnavi-gardenia', block: 'A', floor: 1 },
  payTab: 'pending',
  payMonth: monthKey(today()),
  paySearch: '',
  range: 'this-month',
  from: '',
  to: '',
  settingsTab: 'societies',
};
try {
  Object.assign(ui.qa, JSON.parse(localStorage.getItem('kk-ui-qa') || '{}'));
} catch {}
const rememberQa = () => {
  try {
    localStorage.setItem('kk-ui-qa', JSON.stringify(ui.qa));
  } catch {}
};

// ---------- colour theme (see theme.js) ----------
function getTheme() {
  try {
    return localStorage.getItem('kk-theme') || 'light';
  } catch {
    return 'light';
  }
}
function setTheme(theme) {
  try {
    localStorage.setItem('kk-theme', theme);
  } catch {}
  if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
}

// ---------- toast / tooltip / modal ----------
let toastTimer;
function toast(msg, error = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast' + (error ? ' error' : '');
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), error ? 5000 : 2200);
}

document.addEventListener('mouseover', (e) => {
  const el = e.target.closest('[data-tip]');
  const tip = $('#tooltip');
  if (!el) return (tip.hidden = true);
  tip.textContent = el.dataset.tip;
  tip.hidden = false;
});
document.addEventListener('mousemove', (e) => {
  const tip = $('#tooltip');
  if (tip.hidden) return;
  const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
  const y = e.clientY - tip.offsetHeight - 12;
  tip.style.left = x + 'px';
  tip.style.top = (y < 8 ? e.clientY + 18 : y) + 'px';
});

function openModal(html, small = false) {
  const box = $('#modal-box');
  box.className = 'modal' + (small ? ' modal-sm' : '');
  box.innerHTML = html;
  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';
  const first = box.querySelector('[autofocus]');
  if (first) first.focus();
}
function closeModal() {
  $('#modal').hidden = true;
  $('#modal-box').innerHTML = '';
  document.body.style.overflow = '';
  draft = null;
}
$('#modal').addEventListener('mousedown', (e) => {
  if (e.target.id === 'modal') closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
});

// ---------- charts (plain HTML bars) ----------
function hbars(rows, { value, label, fmt = (v) => v, tip }) {
  if (!rows.length) return `<div class="empty">No data yet</div>`;
  const max = Math.max(...rows.map(value), 0) || 1;
  return `<div class="hbars">${rows
    .map((r) => {
      const v = value(r);
      return `<div class="hbar" data-tip="${esc(tip ? tip(r) : `${label(r)}: ${fmt(v)}`)}">
        <div class="hlabel">${esc(label(r))}</div>
        <div class="track"><div class="fill" style="width:${(v / max) * 100}%"></div></div>
        <div class="hval">${esc(fmt(v))}</div></div>`;
    })
    .join('')}</div>`;
}

function columns(rows, { value, label, tip, currentKey }) {
  const max = Math.max(...rows.map(value), 0);
  const top = max || 1;
  const maxIdx = rows.findIndex((r) => value(r) === max && max > 0);
  const grid = [0.5, 1]
    .map((f) => `<div class="gridline" style="bottom:${f * (200 - 22)}px"></div>`)
    .join('');
  const cols = rows
    .map((r, i) => {
      const v = value(r);
      const h = (v / top) * 100;
      const showCap = i === maxIdx || r.key === currentKey;
      return `<div class="col ${r.key === currentKey ? 'current' : ''}" data-tip="${esc(tip(r))}">
        ${showCap && v > 0 ? `<div class="cap" style="bottom:${h}%">${inrShort(v)}</div>` : ''}
        <div class="bar" style="height:${h}%"></div></div>`;
    })
    .join('');
  const labels = rows
    .map((r) => `<span class="${r.key === currentKey ? 'current' : ''}">${esc(label(r))}</span>`)
    .join('');
  return `<div class="cols">${grid}${cols}</div><div class="col-labels">${labels}</div>`;
}

// ---------- router ----------
const views = {};
function currentView() {
  const v = location.hash.replace('#', '') || 'dashboard';
  return views[v] ? v : 'dashboard';
}
function render() {
  const v = currentView();
  $$('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === v));
  $('#view').innerHTML = views[v]();
  const signedIn = Store.mode === 'server' && Store.user;
  $('#account-who').textContent = signedIn ? `Signed in as ${Store.user}` : '';
  $$('[data-act="sign-out"], #account-who').forEach((el) => (el.hidden = !signedIn));
  $('#storage-badge').innerHTML =
    Store.mode === 'server'
      ? 'Data saved on server'
      : 'Data saved in this browser only &mdash; export backups from Settings';
}
window.addEventListener('hashchange', () => {
  render();
  window.scrollTo(0, 0);
});

// ---------- views ----------
function kpi(label, value, sub = '') {
  return `<div class="card kpi"><div class="label">${esc(label)}</div><div class="value">${value}</div>${
    sub ? `<div class="sub">${sub}</div>` : ''
  }</div>`;
}

function orderTable(orders, { showDate = false } = {}) {
  if (!orders.length) return `<div class="empty">No orders</div>`;
  const tot = summarize(orders);
  return `<div class="table-wrap"><table>
    <thead><tr>${showDate ? '<th>Date</th>' : ''}<th>House</th><th>Items</th><th class="right">Amount</th><th>Payment</th><th></th></tr></thead>
    <tbody>${orders
      .map(
        (o) => `<tr>
        ${showDate ? `<td class="num">${esc(shortDate(o.date))}</td>` : ''}
        <td class="house">${esc(houseLabel(o))}<div class="muted small">${esc(
          o.society === OUTSIDE ? 'Outside' + (o.phone ? ' · ' + o.phone : '') : societyName(o.society)
        )}</div></td>
        <td><span class="items">${esc(itemsText(o))}</span>${o.notes ? `<div class="muted small">${esc(o.notes)}</div>` : ''}</td>
        <td class="right num"><b>${inr(o.amount)}</b></td>
        <td>${payBadge(o)}</td>
        <td class="right"><button class="btn-sm btn-ghost" data-act="edit-order" data-id="${o.id}">Edit</button></td>
      </tr>`
      )
      .join('')}</tbody>
    <tfoot><tr>${showDate ? '<td></td>' : ''}<td>${tot.count} order${tot.count === 1 ? '' : 's'}</td><td></td><td class="right num">${inr(
    tot.revenue
  )}</td><td colspan="2" class="small muted">${inr(tot.received)} received · ${inr(tot.pending)} pending</td></tr></tfoot>
  </table></div>`;
}

function payBadge(o) {
  return o.paid
    ? `<button class="badge badge-good" data-act="toggle-paid" data-id="${o.id}" data-tip="Received ${esc(
        o.paidOn ? shortDate(o.paidOn) : ''
      )} via ${esc(o.paymentMode || '—')}. Click to mark pending.">✓ Received${o.paymentMode ? ' · ' + esc(o.paymentMode) : ''}</button>`
    : `<button class="badge badge-warn" data-act="toggle-paid" data-id="${o.id}" data-tip="Click to record payment">● Pending</button>`;
}

views.dashboard = () => {
  const t = today();
  const mk = monthKey(t);
  const prevMk = monthsBack(mk, 1);
  const todays = S.orders.filter((o) => o.date === t);
  const month = S.orders.filter((o) => monthKey(o.date) === mk);
  const prevMonth = S.orders.filter((o) => monthKey(o.date) === prevMk);
  const sT = summarize(todays);
  const sM = summarize(month);
  const sP = summarize(prevMonth);
  const pending = S.orders.filter((o) => !o.paid);
  const pendingHouses = new Set(pending.map(houseKey)).size;
  const months = Array.from({ length: 12 }, (_, i) => monthsBack(mk, 11 - i));
  const ms = monthStats(S.orders, months);
  let change = '';
  if (sP.revenue > 0) {
    const pct = Math.round(((sM.revenue - sP.revenue) / sP.revenue) * 100);
    change = `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs ${monthLabel(prevMk, false)} (${inr(sP.revenue)})`;
  } else change = `${sM.count} orders so far`;
  const prods = productStats(month).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const houses = houseStats(month).sort((a, b) => b.orders - a.orders || b.revenue - a.revenue).slice(0, 5);

  return `
  <div class="page-head">
    <div><h1>Dashboard</h1><p>${esc(niceDate(t))}</p></div>
    <div class="row"><a class="btn btn-primary" href="#quick">+ Quick add order</a></div>
  </div>
  ${!S.menu.length ? `<div class="notice" style="margin-bottom:16px">Start by adding your dishes and prices in <a href="#menu">Menu</a> — prices then fill in automatically when you log orders.</div>` : ''}
  <div class="kpis">
    ${kpi("Today's revenue", inr(sT.revenue), `${sT.count} order${sT.count === 1 ? '' : 's'} · ${inr(sT.pending)} pending`)}
    ${kpi(`${monthLabel(mk)} revenue`, inr(sM.revenue), change)}
    ${kpi('Received this month', inr(sM.received), `${inr(sM.pending)} still to collect`)}
    ${kpi('All pending dues', inr(summarize(pending).revenue), `${pendingHouses} house${pendingHouses === 1 ? '' : 's'} · <a href="#payments">view</a>`)}
  </div>
  <div class="card" style="margin-bottom:16px">
    <div class="card-head"><h2>Month-wise revenue</h2><span class="muted">Last 12 months · hover a bar for details</span></div>
    ${columns(ms, {
      value: (r) => r.revenue,
      label: (r) => monthLabel(r.key, false),
      currentKey: mk,
      tip: (r) =>
        `${monthLabel(r.key)}\nRevenue: ${inr(r.revenue)}\nOrders: ${r.orders}\nReceived: ${inr(r.received)}\nPending: ${inr(r.pending)}`,
    })}
  </div>
  <div class="grid-2" style="margin-bottom:16px">
    <div class="card"><div class="card-head"><h2>Top products this month</h2><a href="#analytics" class="small">All analytics</a></div>
      ${hbars(prods, { value: (r) => r.revenue, label: (r) => r.name, fmt: inr, tip: (r) => `${r.name}\n${r.qty} sold · ${inr(r.revenue)}` })}</div>
    <div class="card"><div class="card-head"><h2>Top houses this month</h2><span class="muted">by orders</span></div>
      ${hbars(houses, { value: (r) => r.orders, label: (r) => r.label, fmt: (v) => plural(v, 'order'), tip: (r) => `${r.label}\n${r.orders} orders · ${inr(r.revenue)}` })}</div>
  </div>
  <div class="card">
    <div class="card-head"><h2>Today's orders</h2><a href="#orders" class="small">Open daily log</a></div>
    ${orderTable(todays.sort(byDateDesc))}
  </div>`;
};

views.orders = () => {
  const d = ui.date;
  let dayOrders = S.orders.filter((o) => o.date === d);
  if (ui.orderSociety) dayOrders = dayOrders.filter((o) => o.society === ui.orderSociety);
  dayOrders.sort((a, b) => fullHouseLabel(a).localeCompare(fullHouseLabel(b), undefined, { numeric: true }));
  const s = summarize(dayOrders);
  const prep = productStats(dayOrders).sort((a, b) => b.qty - a.qty);
  return `
  <div class="page-head">
    <div><h1>Daily orders</h1><p>${esc(niceDate(d))}</p></div>
    <div class="row">
      <button data-act="day" data-n="-1" aria-label="Previous day">◀</button>
      <input type="date" id="day-input" value="${d}">
      <button data-act="day" data-n="1" aria-label="Next day">▶</button>
      ${d !== today() ? `<button data-act="day-today">Today</button>` : ''}
      <button class="btn-primary" data-act="new-order">+ New order</button>
    </div>
  </div>
  <div class="kpis">
    ${kpi('Orders', s.count)}
    ${kpi('Revenue', inr(s.revenue))}
    ${kpi('Received', inr(s.received))}
    ${kpi('Pending', inr(s.pending))}
  </div>
  <div class="card" style="margin-bottom:16px">
    <div class="card-head"><h2>Items to prepare</h2><span class="muted">total quantity for this day</span></div>
    ${prep.length ? `<div class="prep-list">${prep.map((p) => `<div class="prep-item">${esc(p.name)} <b>× ${p.qty}</b></div>`).join('')}</div>` : `<div class="muted">Nothing yet</div>`}
  </div>
  <div class="card">
    <div class="card-head"><h2>Orders</h2>
      <select id="order-society" aria-label="Filter by society">
        <option value="">All locations</option>
        ${S.societies.map((so) => `<option value="${so.id}" ${ui.orderSociety === so.id ? 'selected' : ''}>${esc(so.name)}</option>`).join('')}
        <option value="${OUTSIDE}" ${ui.orderSociety === OUTSIDE ? 'selected' : ''}>Outside</option>
      </select>
    </div>
    ${orderTable(dayOrders)}
  </div>`;
};

views.quick = () => {
  const qa = ui.qa;
  if (qa.society !== OUTSIDE && !societyById(qa.society)) qa.society = S.societies[0]?.id || OUTSIDE;
  const soc = societyById(qa.society);
  const tabs = [...S.societies.map((s) => [s.id, s.name]), [OUTSIDE, 'Outside order']]
    .map(([id, name]) => `<button class="chip ${qa.society === id ? 'active' : ''}" data-act="qa-society" data-id="${id}">${esc(name)}</button>`)
    .join('');

  let body;
  if (qa.society === OUTSIDE) body = quickOutside();
  else if (isGrid(soc)) body = quickGrid(soc);
  else body = quickFree(soc);

  return `
  <div class="page-head">
    <div><h1>Quick add</h1><p>Pick the house, then choose items — prices fill in from the menu.</p></div>
    <label class="field">Order date <input type="date" id="qa-date" value="${ui.date}"></label>
  </div>
  <div class="card" style="margin-bottom:16px">
    <div class="step-label">Location</div>
    <div class="chips">${tabs}</div>
  </div>
  ${body}`;
};

function houseMeta(society, block, flat) {
  const key = `${society}|${(block || '').toUpperCase()}|${flat}`;
  const orders = S.orders.filter((o) => houseKey(o) === key);
  const onDay = orders.filter((o) => o.date === ui.date).length;
  const due = orders.filter((o) => !o.paid).reduce((s, o) => s + num(o.amount), 0);
  return { onDay, due, total: orders.length };
}

function quickGrid(soc) {
  const qa = ui.qa;
  const blocks = soc.blocks.length ? soc.blocks : [''];
  if (!blocks.includes(qa.block)) qa.block = blocks[0];
  if (!(qa.floor >= 1 && qa.floor <= soc.floors)) qa.floor = 1;
  const floorsWithOrders = new Set(
    S.orders
      .filter((o) => o.society === soc.id && (o.block || '') === qa.block && o.date === ui.date)
      .map((o) => Math.floor(num(o.flat) / 100))
  );
  const units = Array.from({ length: soc.unitsPerFloor }, (_, i) => {
    const flat = flatNo(qa.floor, i + 1);
    const m = houseMeta(soc.id, qa.block, flat);
    const meta = [m.onDay ? `${m.onDay} order${m.onDay > 1 ? 's' : ''} on this day` : '', m.due ? `${inr(m.due)} due` : '']
      .filter(Boolean)
      .join(' · ');
    return `<button class="unit ${m.onDay ? 'has-dot' : ''}" data-act="qa-house" data-block="${esc(qa.block)}" data-flat="${flat}">
      <span class="unit-no">${qa.block ? esc(qa.block) + '-' : ''}${flat}</span>
      <span class="unit-meta">${meta || (m.total ? `${m.total} past orders` : 'New')}</span></button>`;
  }).join('');
  return `
  <div class="card stack">
    ${
      soc.blocks.length
        ? `<div><div class="step-label">Block</div><div class="block-picker">${soc.blocks
            .map((b) => `<button class="${b === qa.block ? 'active' : ''}" data-act="qa-block" data-id="${esc(b)}">${esc(b)}</button>`)
            .join('')}</div></div>`
        : ''
    }
    <div><div class="step-label">Floor</div><div class="floor-picker">${Array.from({ length: soc.floors }, (_, i) => i + 1)
      .map(
        (f) =>
          `<button class="${f === qa.floor ? 'active' : ''} ${floorsWithOrders.has(f) ? 'has-dot' : ''}" data-act="qa-floor" data-id="${f}">${f}</button>`
      )
      .join('')}</div></div>
    <div><div class="step-label">House — ${esc(soc.name)}${qa.block ? `, Block ${esc(qa.block)}` : ''}, Floor ${qa.floor}</div>
      <div class="unit-picker">${units}</div></div>
    <p class="muted small" style="margin:0">A dot means the house already has an order on ${esc(shortDate(ui.date))}.</p>
  </div>`;
}

function recentHouses(filter, limit = 12) {
  const seen = new Map();
  for (const o of [...S.orders].sort(byDateDesc)) {
    if (!filter(o)) continue;
    const k = houseKey(o);
    if (!seen.has(k)) seen.set(k, o);
    if (seen.size >= limit) break;
  }
  return [...seen.values()];
}

function quickFree(soc) {
  const recent = recentHouses((o) => o.society === soc.id);
  return `
  <div class="card stack">
    <form id="qa-free-form" class="form-grid" autocomplete="off">
      <label class="field">Block / tower (optional)<input name="block" placeholder="e.g. B"></label>
      <label class="field">House / flat number<input name="flat" required placeholder="e.g. 304"></label>
      <div class="field" style="justify-content:flex-end"><button class="btn-primary" type="submit">Start order →</button></div>
    </form>
    ${
      recent.length
        ? `<div><div class="step-label">Recent houses</div><div class="chips">${recent
            .map((o) => `<button class="chip" data-act="qa-house" data-block="${esc(o.block || '')}" data-flat="${esc(o.flat)}">${esc(houseLabel(o))}</button>`)
            .join('')}</div></div>`
        : ''
    }
    <p class="muted small" style="margin:0">Tip: add blocks, floors and flats per floor for ${esc(soc.name)} in <a href="#settings">Settings</a> to get a tap-to-pick grid like Vaishnavi Gardenia.</p>
  </div>`;
}

function quickOutside() {
  const recent = recentHouses((o) => o.society === OUTSIDE);
  return `
  <div class="card stack">
    <form id="qa-outside-form" class="form-grid" autocomplete="off">
      <label class="field">Customer name<input name="customer" required placeholder="Name"></label>
      <label class="field">Phone<input name="phone" inputmode="tel" placeholder="Optional"></label>
      <label class="field" style="grid-column:1/-1">Address<input name="address" placeholder="Optional"></label>
      <div class="field"><button class="btn-primary" type="submit">Start order →</button></div>
    </form>
    ${
      recent.length
        ? `<div><div class="step-label">Recent outside customers</div><div class="chips">${recent
            .map((o) => `<button class="chip" data-act="qa-outside-repeat" data-id="${o.id}">${esc(o.customer)}${o.phone ? ' · ' + esc(o.phone) : ''}</button>`)
            .join('')}</div></div>`
        : ''
    }
  </div>`;
}

views.payments = () => {
  const tabs = `<div class="tabs">
    <button class="tab ${ui.payTab === 'pending' ? 'active' : ''}" data-act="pay-tab" data-id="pending">Pending dues</button>
    <button class="tab ${ui.payTab === 'received' ? 'active' : ''}" data-act="pay-tab" data-id="received">Received log</button>
  </div>`;
  return `
  <div class="page-head"><div><h1>Payments</h1><p>Track who has paid and who still owes.</p></div></div>
  ${tabs}
  ${ui.payTab === 'pending' ? paymentsPending() : paymentsReceived()}`;
};

function paymentsPending() {
  const q = ui.paySearch.trim().toLowerCase();
  const pending = S.orders.filter((o) => !o.paid);
  const groups = new Map();
  for (const o of pending) {
    const k = houseKey(o);
    if (!groups.has(k)) groups.set(k, { key: k, label: fullHouseLabel(o), phone: o.phone, orders: [] });
    const g = groups.get(k);
    g.orders.push(o);
    if (o.phone) g.phone = o.phone;
  }
  let list = [...groups.values()].map((g) => ({ ...g, due: g.orders.reduce((s, o) => s + num(o.amount), 0) }));
  if (q) list = list.filter((g) => g.label.toLowerCase().includes(q) || (g.phone || '').includes(q));
  list.sort((a, b) => b.due - a.due);
  const s = summarize(pending);
  return `
  <div class="kpis">
    ${kpi('Total pending', inr(s.revenue))}
    ${kpi('Houses owing', groups.size)}
    ${kpi('Unpaid orders', s.count)}
    ${kpi('Oldest unpaid', pending.length ? esc(shortDate(pending.map((o) => o.date).sort()[0])) : '—')}
  </div>
  <div class="card">
    <div class="card-head"><h2>Pending by house</h2><input id="pay-search" type="search" placeholder="Search house / name / phone" value="${esc(ui.paySearch)}"></div>
    ${
      list.length
        ? list
            .map(
              (g) => `<details class="group">
        <summary class="group-head">
          <span><span class="who">${esc(g.label)}</span> <span class="muted small">${g.orders.length} order${g.orders.length > 1 ? 's' : ''}${g.phone ? ' · ' + esc(g.phone) : ''}</span></span>
          <span class="row"><b class="num">${inr(g.due)}</b><button class="btn-sm btn-primary" data-act="pay-house" data-key="${esc(g.key)}">Mark all received</button></span>
        </summary>
        <div class="group-body">${orderTable(g.orders.sort(byDateDesc), { showDate: true })}</div>
      </details>`
            )
            .join('')
        : `<div class="empty">${q ? 'No match' : 'No pending payments 🎉'}</div>`
    }
  </div>`;
}

function paymentsReceived() {
  const mk = ui.payMonth;
  const rows = S.orders
    .filter((o) => o.paid && monthKey(o.paidOn || o.date) === mk)
    .sort((a, b) => (b.paidOn || b.date).localeCompare(a.paidOn || a.date));
  const total = rows.reduce((s, o) => s + num(o.amount), 0);
  const byMode = {};
  for (const o of rows) byMode[o.paymentMode || 'Unspecified'] = (byMode[o.paymentMode || 'Unspecified'] || 0) + num(o.amount);
  return `
  <div class="card">
    <div class="card-head">
      <h2>Payments received in ${esc(monthLabel(mk))}</h2>
      <input type="month" id="pay-month" value="${mk}">
    </div>
    <div class="row" style="margin-bottom:12px">
      <span class="badge badge-good">Total ${inr(total)}</span>
      ${Object.entries(byMode).map(([m, v]) => `<span class="badge badge-neutral">${esc(m)}: ${inr(v)}</span>`).join('')}
    </div>
    ${
      rows.length
        ? `<div class="table-wrap"><table><thead><tr><th>Received on</th><th>House</th><th>Order date</th><th>Mode</th><th class="right">Amount</th><th></th></tr></thead><tbody>
      ${rows
        .map(
          (o) => `<tr><td class="num">${esc(shortDate(o.paidOn || o.date))}</td><td class="house">${esc(fullHouseLabel(o))}</td>
        <td class="num">${esc(shortDate(o.date))}</td><td>${esc(o.paymentMode || '—')}</td><td class="right num"><b>${inr(o.amount)}</b></td>
        <td class="right"><button class="btn-sm btn-ghost" data-act="toggle-paid" data-id="${o.id}">Mark pending</button></td></tr>`
        )
        .join('')}</tbody></table></div>`
        : `<div class="empty">No payments recorded for this month</div>`
    }
  </div>`;
}

function rangeDates() {
  const t = today();
  const mk = monthKey(t);
  switch (ui.range) {
    case 'this-month':
      return [mk + '-01', lastDayOfMonth(mk), monthLabel(mk)];
    case 'last-month': {
      const p = monthsBack(mk, 1);
      return [p + '-01', lastDayOfMonth(p), monthLabel(p)];
    }
    case '3-months':
      return [monthsBack(mk, 2) + '-01', lastDayOfMonth(mk), 'Last 3 months'];
    case 'this-year':
      return [t.slice(0, 4) + '-01-01', t.slice(0, 4) + '-12-31', t.slice(0, 4)];
    case 'custom':
      return [ui.from, ui.to, `${ui.from ? shortDate(ui.from) : 'Start'} – ${ui.to ? shortDate(ui.to) : 'today'}`];
    default:
      return ['', '', 'All time'];
  }
}

views.analytics = () => {
  const [from, to, rangeName] = rangeDates();
  const orders = S.orders.filter((o) => inRange(o, from, to));
  const s = summarize(orders);
  const prods = productStats(orders);
  const houses = houseStats(orders);
  const soc = new Map();
  for (const o of orders) {
    const n = societyName(o.society);
    const cur = soc.get(n) || { name: n, orders: 0, revenue: 0 };
    cur.orders += 1;
    cur.revenue += num(o.amount);
    soc.set(n, cur);
  }
  // Month-wise: from the first order month in range to the last.
  const keys = orders.map((o) => monthKey(o.date)).sort();
  let months = [];
  if (keys.length) {
    const start = from ? monthKey(from) : keys[0];
    const end = to ? monthKey(to) : keys[keys.length - 1];
    for (let k = end; k >= start && months.length < 60; k = monthsBack(k, 1)) months.unshift(k);
  }
  const ms = monthStats(orders, months);
  const ranges = [
    ['this-month', 'This month'],
    ['last-month', 'Last month'],
    ['3-months', 'Last 3 months'],
    ['this-year', 'This year'],
    ['all', 'All time'],
    ['custom', 'Custom'],
  ];
  const byQty = [...prods].sort((a, b) => b.qty - a.qty);
  const byRev = [...prods].sort((a, b) => b.revenue - a.revenue);
  const hByOrders = [...houses].sort((a, b) => b.orders - a.orders || b.revenue - a.revenue);
  const hByRev = [...houses].sort((a, b) => b.revenue - a.revenue);
  const itemRevenue = prods.reduce((x, p) => x + p.revenue, 0) || 1;

  return `
  <div class="page-head"><div><h1>Analytics</h1><p>${esc(rangeName)} · ${s.count} orders</p></div></div>
  <div class="card" style="margin-bottom:16px">
    <div class="chips">${ranges.map(([id, n]) => `<button class="chip ${ui.range === id ? 'active' : ''}" data-act="range" data-id="${id}">${n}</button>`).join('')}</div>
    ${
      ui.range === 'custom'
        ? `<div class="row" style="margin-top:12px"><label class="field">From<input type="date" id="range-from" value="${ui.from}"></label>
           <label class="field">To<input type="date" id="range-to" value="${ui.to}"></label></div>`
        : ''
    }
  </div>
  <div class="kpis">
    ${kpi('Revenue', inr(s.revenue), `${inr(s.received)} received`)}
    ${kpi('Orders', s.count)}
    ${kpi('Average order', inr(s.count ? s.revenue / s.count : 0))}
    ${kpi('Houses served', houses.length)}
  </div>

  <h2 style="margin:22px 0 10px">Products</h2>
  <div class="grid-2" style="margin-bottom:16px">
    <div class="card"><div class="card-head"><h2>Most sold (quantity)</h2></div>
      ${hbars(byQty.slice(0, 10), { value: (r) => r.qty, label: (r) => r.name, fmt: (v) => `${v} sold`, tip: (r) => `${r.name}\n${r.qty} sold in ${r.orders} orders\n${inr(r.revenue)}` })}</div>
    <div class="card"><div class="card-head"><h2>Most revenue</h2></div>
      ${hbars(byRev.slice(0, 10), { value: (r) => r.revenue, label: (r) => r.name, fmt: inr, tip: (r) => `${r.name}\n${inr(r.revenue)} from ${r.qty} sold` })}</div>
  </div>
  <div class="card" style="margin-bottom:16px">
    <div class="card-head"><h2>All products</h2><span class="muted">Revenue here is item price × quantity</span></div>
    ${
      byRev.length
        ? `<div class="table-wrap"><table><thead><tr><th>#</th><th>Product</th><th class="right">Qty sold</th><th class="right">Orders</th><th class="right">Revenue</th><th class="right">Share</th></tr></thead><tbody>
      ${byRev
        .map(
          (p, i) => `<tr><td class="muted">${i + 1}</td><td><b>${esc(p.name)}</b></td><td class="right num">${p.qty}</td><td class="right num">${p.orders}</td>
          <td class="right num"><b>${inr(p.revenue)}</b></td><td class="right num">${Math.round((p.revenue / itemRevenue) * 100)}%</td></tr>`
        )
        .join('')}</tbody></table></div>`
        : `<div class="empty">No product sales in this range</div>`
    }
  </div>

  <h2 style="margin:22px 0 10px">Houses</h2>
  <div class="grid-2" style="margin-bottom:16px">
    <div class="card"><div class="card-head"><h2>Most orders</h2></div>
      ${hbars(hByOrders.slice(0, 10), { value: (r) => r.orders, label: (r) => r.label, fmt: (v) => plural(v, 'order'), tip: (r) => `${r.label}\n${r.orders} orders · ${inr(r.revenue)}` })}</div>
    <div class="card"><div class="card-head"><h2>Most revenue</h2></div>
      ${hbars(hByRev.slice(0, 10), { value: (r) => r.revenue, label: (r) => r.label, fmt: inr, tip: (r) => `${r.label}\n${inr(r.revenue)} from ${r.orders} orders` })}</div>
  </div>
  <div class="card" style="margin-bottom:16px">
    <div class="card-head"><h2>All houses</h2><span class="muted">${houses.length} total</span></div>
    ${
      hByOrders.length
        ? `<div class="table-wrap"><table><thead><tr><th>#</th><th>House</th><th class="right">Orders</th><th class="right">Revenue</th><th class="right">Pending</th><th>Last order</th></tr></thead><tbody>
      ${hByOrders
        .map(
          (h, i) => `<tr><td class="muted">${i + 1}</td><td class="house">${esc(h.label)}</td><td class="right num">${h.orders}</td>
          <td class="right num"><b>${inr(h.revenue)}</b></td><td class="right num">${h.pending ? inr(h.pending) : '—'}</td><td class="num">${esc(shortDate(h.last))}</td></tr>`
        )
        .join('')}</tbody></table></div>`
        : `<div class="empty">No orders in this range</div>`
    }
  </div>

  <h2 style="margin:22px 0 10px">Locations &amp; months</h2>
  <div class="card" style="margin-bottom:16px">
    <div class="card-head"><h2>Revenue by location</h2></div>
    ${hbars([...soc.values()].sort((a, b) => b.revenue - a.revenue), { value: (r) => r.revenue, label: (r) => r.name, fmt: inr, tip: (r) => `${r.name}\n${inr(r.revenue)} from ${r.orders} orders` })}
  </div>
  <div class="card">
    <div class="card-head"><h2>Month-wise revenue</h2></div>
    ${
      ms.length
        ? `${ms.length > 1 ? columns(ms, { value: (r) => r.revenue, label: (r) => monthLabel(r.key, ms.length > 12), currentKey: monthKey(today()), tip: (r) => `${monthLabel(r.key)}\nRevenue: ${inr(r.revenue)}\nOrders: ${r.orders}` }) : ''}
      <div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>Month</th><th class="right">Orders</th><th class="right">Revenue</th><th class="right">Received</th><th class="right">Pending</th></tr></thead><tbody>
      ${[...ms]
        .reverse()
        .map(
          (m) => `<tr><td><b>${esc(monthLabel(m.key))}</b></td><td class="right num">${m.orders}</td><td class="right num"><b>${inr(m.revenue)}</b></td>
          <td class="right num">${inr(m.received)}</td><td class="right num">${inr(m.pending)}</td></tr>`
        )
        .join('')}</tbody></table></div>`
        : `<div class="empty">No orders in this range</div>`
    }
  </div>`;
};

views.menu = () => {
  const sold = new Map();
  for (const o of S.orders) for (const it of o.items || []) if (it.menuId) sold.set(it.menuId, (sold.get(it.menuId) || 0) + num(it.qty));
  const items = [...S.menu].sort((a, b) => a.name.localeCompare(b.name));
  return `
  <div class="page-head"><div><h1>Menu</h1><p>Dishes and prices used when logging orders.</p></div></div>
  <div class="card" style="margin-bottom:16px">
    <form id="menu-form" class="form-grid" autocomplete="off">
      <label class="field">Dish name<input name="name" required placeholder="e.g. Rajma Chawal"></label>
      <label class="field">Price (₹)<input name="price" type="number" min="0" step="any" required placeholder="0"></label>
      <div class="field" style="justify-content:flex-end"><button class="btn-primary" type="submit">Add to menu</button></div>
    </form>
  </div>
  <div class="card">
    ${
      items.length
        ? `<div class="table-wrap"><table><thead><tr><th>Dish</th><th>Price (₹)</th><th class="right">Sold (all time)</th><th>Show in orders</th><th></th></tr></thead><tbody>
      ${items
        .map(
          (m) => `<tr>
          <td><input value="${esc(m.name)}" data-menu-field="name" data-id="${m.id}" aria-label="Dish name" style="width:100%"></td>
          <td><input type="number" min="0" step="any" value="${num(m.price)}" data-menu-field="price" data-id="${m.id}" aria-label="Price" style="width:110px"></td>
          <td class="right num">${sold.get(m.id) || 0}</td>
          <td><label class="check"><input type="checkbox" data-menu-field="active" data-id="${m.id}" ${m.active !== false ? 'checked' : ''}> Active</label></td>
          <td class="right"><button class="btn-sm btn-ghost btn-danger" data-act="del-menu" data-id="${m.id}">Delete</button></td></tr>`
        )
        .join('')}</tbody></table></div>
      <p class="muted small">Changes save automatically. Changing a price only affects new orders — past orders keep the price they were logged with.</p>`
        : `<div class="empty">No dishes yet — add your first one above.</div>`
    }
  </div>`;
};

views.settings = () => {
  const counts = new Map();
  for (const o of S.orders) counts.set(o.society, (counts.get(o.society) || 0) + 1);
  return `
  <div class="page-head"><div><h1>Settings</h1><p>Societies, backups and exports.</p></div></div>
  <div class="card" style="margin-bottom:16px">
    <div class="card-head"><h2>Societies</h2><span class="muted">Set floors &amp; flats per floor to get the tap-to-pick grid. Leave 0 to type the flat number.</span></div>
    <div class="table-wrap"><table><thead><tr><th>Name</th><th>Blocks (comma separated)</th><th>Floors</th><th>Flats / floor</th><th class="right">Orders</th><th></th></tr></thead><tbody>
    ${S.societies
      .map(
        (s) => `<tr>
        <td><input value="${esc(s.name)}" data-soc-field="name" data-id="${s.id}" aria-label="Society name"></td>
        <td><input value="${esc(s.blocks.join(', '))}" data-soc-field="blocks" data-id="${s.id}" placeholder="none" aria-label="Blocks"></td>
        <td><input type="number" min="0" max="200" value="${s.floors}" data-soc-field="floors" data-id="${s.id}" style="width:80px" aria-label="Floors"></td>
        <td><input type="number" min="0" max="99" value="${s.unitsPerFloor}" data-soc-field="unitsPerFloor" data-id="${s.id}" style="width:80px" aria-label="Flats per floor"></td>
        <td class="right num">${counts.get(s.id) || 0}</td>
        <td class="right">${counts.get(s.id) ? '' : `<button class="btn-sm btn-ghost btn-danger" data-act="del-society" data-id="${s.id}">Delete</button>`}</td></tr>`
      )
      .join('')}</tbody></table></div>
    <div style="margin-top:12px"><button data-act="add-society">+ Add society</button></div>
  </div>
  <div class="card" style="margin-bottom:16px">
    <div class="card-head"><h2>Appearance</h2><span class="muted">Saved on this device</span></div>
    <div class="seg theme-seg" role="group" aria-label="Colour theme">
      ${[['light', 'Light'], ['dark', 'Dark'], ['auto', 'Match device']]
        .map(([id, n]) => `<button class="${getTheme() === id ? 'active' : ''}" data-act="theme" data-id="${id}" aria-pressed="${getTheme() === id}">${n}</button>`)
        .join('')}
    </div>
  </div>
  <div class="card">
    <div class="card-head"><h2>Data</h2><span class="muted">${
      Store.mode === 'server' ? 'Saved on the server (data/db.json).' : 'Saved in this browser only. Export a backup regularly.'
    }</span></div>
    <div class="row">
      <button data-act="export-json">Download backup (JSON)</button>
      <button data-act="export-csv">Export orders (CSV)</button>
      <label class="btn">Restore backup…<input type="file" id="import-file" accept="application/json,.json" hidden></label>
    </div>
    <p class="muted small">${S.orders.length} orders · ${S.menu.length} menu items · ${S.societies.length} societies</p>
  </div>`;
};

// ---------- order modal ----------
let draft = null;

function newDraft(preset = {}) {
  return {
    id: null,
    date: ui.date,
    society: preset.society || ui.qa.society || S.societies[0]?.id || OUTSIDE,
    block: '',
    flat: '',
    customer: '',
    phone: '',
    address: '',
    items: [],
    customAmount: false,
    amount: 0,
    paid: false,
    paymentMode: 'UPI',
    paidOn: today(),
    notes: '',
    ...preset,
  };
}

function openOrderModal(order, preset) {
  draft = order
    ? structuredClone({ ...order, customAmount: order.customAmount ?? Math.abs(itemsTotal(order.items || []) - num(order.amount)) > 0.001 })
    : newDraft(preset);
  if (!draft.paidOn) draft.paidOn = today();
  if (!draft.paymentMode) draft.paymentMode = 'UPI';
  openModal(`
    <div class="modal-head"><h2>${order ? 'Edit order' : 'New order'}</h2><button class="btn-ghost" data-act="close-modal" aria-label="Close">✕</button></div>
    <form id="order-form" autocomplete="off">
      <div class="modal-body">
        <div class="form-grid">
          <label class="field">Date<input type="date" name="date" value="${draft.date}" required></label>
          <label class="field" style="grid-column:span 2">Location<select name="society">
            ${S.societies.map((s) => `<option value="${s.id}" ${draft.society === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
            <option value="${OUTSIDE}" ${draft.society === OUTSIDE ? 'selected' : ''}>Outside (other address)</option>
          </select></label>
        </div>
        <div id="loc-fields"></div>
        <div>
          <div class="section-title">Items</div>
          <div id="repeat-slot"></div>
          <div class="item-rows" id="item-rows"></div>
          <details style="margin-top:8px"><summary class="small" style="cursor:pointer">+ Add an item not on the menu</summary>
            <div class="form-grid" style="margin-top:8px">
              <label class="field">Name<input id="ci-name" placeholder="Item name"></label>
              <label class="field">Price (₹)<input id="ci-price" type="number" min="0" step="any" placeholder="0"></label>
              <label class="check" style="align-self:end;padding-bottom:8px"><input type="checkbox" id="ci-save" checked> Save to menu</label>
              <div class="field" style="justify-content:flex-end"><button type="button" data-act="add-custom-item">Add item</button></div>
            </div>
          </details>
        </div>
        <div class="total-box">
          <div><div class="small muted">Amount for this house</div><div class="total" id="total-display"></div></div>
          <div class="row">
            <label class="check"><input type="checkbox" name="customAmount" ${draft.customAmount ? 'checked' : ''}> Enter amount manually</label>
            <input type="number" name="amount" min="0" step="any" style="width:120px" value="${num(draft.amount) || ''}" placeholder="₹" ${draft.customAmount ? '' : 'hidden'}>
          </div>
        </div>
        <div>
          <div class="section-title">Payment</div>
          <div class="row">
            <div class="seg" role="group" aria-label="Payment status">
              <button type="button" class="warn ${draft.paid ? '' : 'active'}" data-act="set-paid" data-id="0">Pending</button>
              <button type="button" class="good ${draft.paid ? 'active' : ''}" data-act="set-paid" data-id="1">Received</button>
            </div>
            <span id="paid-fields" class="row" ${draft.paid ? '' : 'hidden'}>
              <select name="paymentMode" aria-label="Payment mode">${PAY_MODES.map((m) => `<option ${draft.paymentMode === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
              <input type="date" name="paidOn" value="${draft.paidOn}" aria-label="Received on">
            </span>
          </div>
        </div>
        <label class="field">Notes<input name="notes" value="${esc(draft.notes)}" placeholder="Optional — e.g. less spicy"></label>
      </div>
      <div class="modal-foot">
        <div>${order ? `<button type="button" class="btn-danger" data-act="delete-order">Delete</button>` : ''}</div>
        <div class="row"><button type="button" data-act="close-modal">Cancel</button><button type="submit" class="btn-primary">Save order</button></div>
      </div>
    </form>`);
  renderLocFields();
  renderItemRows();
  renderTotal();
}

function renderLocFields() {
  const soc = societyById(draft.society);
  let html;
  if (draft.society === OUTSIDE) {
    html = `<div class="form-grid">
      <label class="field">Customer name<input name="customer" value="${esc(draft.customer)}" required></label>
      <label class="field">Phone<input name="phone" value="${esc(draft.phone)}" inputmode="tel"></label>
      <label class="field" style="grid-column:1/-1">Address<input name="address" value="${esc(draft.address)}"></label></div>`;
  } else if (isGrid(soc)) {
    const f = Math.floor(num(draft.flat) / 100);
    const u = num(draft.flat) % 100;
    html = `<div class="form-grid">
      ${soc.blocks.length ? `<label class="field">Block<select name="block">${soc.blocks.map((b) => `<option ${draft.block === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></label>` : ''}
      <label class="field">Floor<select name="floor">${Array.from({ length: soc.floors }, (_, i) => i + 1).map((x) => `<option ${x === f ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label class="field">Flat<select name="unit">${Array.from({ length: soc.unitsPerFloor }, (_, i) => i + 1)
        .map((x) => `<option value="${x}" ${x === u ? 'selected' : ''}>${x}</option>`)
        .join('')}</select></label>
      <label class="field">Name (optional)<input name="customer" value="${esc(draft.customer)}"></label>
      <label class="field">Phone (optional)<input name="phone" value="${esc(draft.phone)}" inputmode="tel"></label></div>`;
  } else {
    html = `<div class="form-grid">
      <label class="field">Block (optional)<input name="block" value="${esc(draft.block)}"></label>
      <label class="field">Flat number<input name="flat" value="${esc(draft.flat)}" required></label>
      <label class="field">Name (optional)<input name="customer" value="${esc(draft.customer)}"></label>
      <label class="field">Phone (optional)<input name="phone" value="${esc(draft.phone)}" inputmode="tel"></label></div>`;
  }
  $('#loc-fields').innerHTML = html;
  syncLocation();
}

// Read location inputs back into the draft (grid societies compose the flat number).
function syncLocation() {
  const form = $('#order-form');
  if (!form || !draft) return;
  const soc = societyById(draft.society);
  const val = (n) => form.elements[n]?.value ?? '';
  if (draft.society === OUTSIDE) {
    Object.assign(draft, { block: '', flat: '', customer: val('customer').trim(), phone: val('phone').trim(), address: val('address').trim() });
  } else if (isGrid(soc)) {
    draft.block = soc.blocks.length ? val('block') : '';
    draft.flat = flatNo(num(val('floor')) || 1, num(val('unit')) || 1);
    draft.customer = val('customer').trim();
    draft.phone = val('phone').trim();
  } else {
    draft.block = val('block').trim().toUpperCase();
    draft.flat = val('flat').trim();
    draft.customer = val('customer').trim();
    draft.phone = val('phone').trim();
  }
  renderRepeat();
}

function renderRepeat() {
  const slot = $('#repeat-slot');
  if (!slot) return;
  const hasKey = draft.society === OUTSIDE ? draft.customer : draft.flat;
  const last = hasKey ? lastOrderFor(houseKey(draft), draft.id) : null;
  slot.innerHTML =
    last && last.items?.length
      ? `<div class="row small" style="margin-bottom:8px"><span class="muted">Last order ${esc(shortDate(last.date))}: ${esc(itemsText(last))} (${inr(last.amount)})</span>
         <button type="button" class="btn-sm" data-act="repeat-last" data-id="${last.id}">Repeat</button></div>`
      : '';
}

function renderItemRows() {
  const menu = S.menu.filter((m) => m.active !== false).sort((a, b) => a.name.localeCompare(b.name));
  const rows = [];
  const inDraft = new Set();
  // Items already in the order first (includes custom / inactive items), then the rest of the menu.
  draft.items.forEach((it, idx) => {
    inDraft.add(it.menuId);
    rows.push(itemRow(it.name, it.price, it.qty, `data-idx="${idx}"`));
  });
  for (const m of menu) if (!inDraft.has(m.id)) rows.push(itemRow(m.name, m.price, 0, `data-menu="${m.id}"`));
  $('#item-rows').innerHTML = rows.length
    ? rows.join('')
    : `<div class="empty small">No menu items yet. Add one below, or enter the amount manually.</div>`;
}

function itemRow(name, price, qty, attr) {
  return `<div class="item-row ${qty > 0 ? 'selected' : ''}" ${attr}>
    <div class="iname">${esc(name)}</div>
    <div class="price-cell"><input type="number" min="0" step="any" value="${num(price)}" data-item-price aria-label="Price of ${esc(name)}"></div>
    <div class="qty"><button type="button" data-act="qty" data-n="-1" aria-label="Less">−</button><span>${qty}</span><button type="button" data-act="qty" data-n="1" aria-label="More">+</button></div>
    <div class="line">${qty > 0 ? inr(num(price) * qty) : ''}</div></div>`;
}

function renderTotal() {
  const auto = itemsTotal(draft.items);
  if (!draft.customAmount) draft.amount = auto;
  $('#total-display').textContent = inr(draft.amount);
  const form = $('#order-form');
  if (!draft.customAmount) form.elements.amount.value = auto || '';
}

function changeQty(row, delta) {
  if (row.dataset.idx !== undefined) {
    const it = draft.items[num(row.dataset.idx)];
    it.qty = Math.max(0, num(it.qty) + delta);
    if (it.qty === 0) draft.items.splice(num(row.dataset.idx), 1);
  } else if (delta > 0) {
    const m = S.menu.find((x) => x.id === row.dataset.menu);
    const price = num($('[data-item-price]', row).value);
    draft.items.push({ menuId: m.id, name: m.name, price, qty: 1 });
  }
  renderItemRows();
  renderTotal();
}

async function saveDraft() {
  syncLocation();
  const form = $('#order-form');
  draft.date = form.elements.date.value;
  draft.notes = form.elements.notes.value.trim();
  draft.customAmount = form.elements.customAmount.checked;
  if (draft.customAmount) draft.amount = num(form.elements.amount.value);
  else draft.amount = itemsTotal(draft.items);
  draft.paymentMode = form.elements.paymentMode.value;
  draft.paidOn = form.elements.paidOn.value || today();

  if (!draft.date) return toast('Pick a date', true);
  if (draft.society === OUTSIDE ? !draft.customer : !draft.flat) return toast(draft.society === OUTSIDE ? 'Enter the customer name' : 'Enter the flat number', true);
  if (!draft.items.length && !(draft.amount > 0)) return toast('Add at least one item or enter an amount', true);

  const doc = { ...draft };
  if (!doc.paid) {
    delete doc.paidOn;
    delete doc.paymentMode;
  }
  if (doc.society !== OUTSIDE) delete doc.address;
  if (!doc.id) {
    delete doc.id;
    doc.createdAt = new Date().toISOString();
  }
  doc.updatedAt = new Date().toISOString();
  await guarded(() => Store.save('orders', doc), `Saved · ${fullHouseLabel(doc)} · ${inr(doc.amount)}`);
  ui.date = doc.date;
  closeModal();
  render();
}

// ---------- payment prompt ----------
function openPayPrompt(orderIds, title) {
  const orders = S.orders.filter((o) => orderIds.includes(o.id));
  const total = orders.reduce((s, o) => s + num(o.amount), 0);
  openModal(
    `<div class="modal-head"><h2>${esc(title)}</h2><button class="btn-ghost" data-act="close-modal" aria-label="Close">✕</button></div>
    <form id="pay-form"><div class="modal-body">
      <div class="total-box"><div><div class="small muted">${orders.length} order${orders.length > 1 ? 's' : ''}</div><div class="total">${inr(total)}</div></div></div>
      <div class="form-grid">
        <label class="field">Mode<select name="mode" autofocus>${PAY_MODES.map((m) => `<option>${m}</option>`).join('')}</select></label>
        <label class="field">Received on<input type="date" name="on" value="${today()}" required></label>
      </div>
      <input type="hidden" name="ids" value="${esc(orderIds.join(','))}">
    </div>
    <div class="modal-foot"><span></span><div class="row"><button type="button" data-act="close-modal">Cancel</button><button class="btn-primary" type="submit">Mark received</button></div></div></form>`,
    true
  );
}

async function markPaid(ids, mode, on) {
  for (const id of ids) {
    const o = S.orders.find((x) => x.id === id);
    if (o) await Store.save('orders', { ...o, paid: true, paymentMode: mode, paidOn: on, updatedAt: new Date().toISOString() });
  }
}

// ---------- exports ----------
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 100);
}
function toCsv() {
  const cell = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['Date', 'Location', 'Block', 'Flat', 'Customer', 'Phone', 'Address', 'Items', 'Amount', 'Payment', 'Mode', 'Received on', 'Notes'];
  const rows = [...S.orders].sort((a, b) => a.date.localeCompare(b.date)).map((o) => [
    o.date,
    societyName(o.society),
    o.block,
    o.flat,
    o.customer,
    o.phone,
    o.address,
    itemsText(o),
    num(o.amount),
    o.paid ? 'Received' : 'Pending',
    o.paid ? o.paymentMode : '',
    o.paid ? o.paidOn : '',
    o.notes,
  ]);
  return [head, ...rows].map((r) => r.map(cell).join(',')).join('\n');
}

// ---------- events ----------
const actions = {
  'close-modal': closeModal,
  'new-order': () => openOrderModal(null, { date: ui.date }),
  'edit-order': (el) => {
    const o = S.orders.find((x) => x.id === el.dataset.id);
    if (o) openOrderModal(o);
  },
  'toggle-paid': async (el) => {
    const o = S.orders.find((x) => x.id === el.dataset.id);
    if (!o) return;
    if (o.paid) {
      const { paidOn, paymentMode, ...rest } = o;
      await guarded(() => Store.save('orders', { ...rest, paid: false, updatedAt: new Date().toISOString() }), 'Marked as pending');
      render();
    } else openPayPrompt([o.id], `Payment from ${fullHouseLabel(o)}`);
  },
  'pay-house': (el, e) => {
    e.preventDefault();
    const ids = S.orders.filter((o) => !o.paid && houseKey(o) === el.dataset.key).map((o) => o.id);
    const o = S.orders.find((x) => x.id === ids[0]);
    if (ids.length) openPayPrompt(ids, `Payment from ${fullHouseLabel(o)}`);
  },
  day: (el) => {
    ui.date = addDays(ui.date, num(el.dataset.n));
    render();
  },
  'day-today': () => {
    ui.date = today();
    render();
  },
  'qa-society': (el) => {
    ui.qa.society = el.dataset.id;
    rememberQa();
    render();
  },
  'qa-block': (el) => {
    ui.qa.block = el.dataset.id;
    rememberQa();
    render();
  },
  'qa-floor': (el) => {
    ui.qa.floor = num(el.dataset.id);
    rememberQa();
    render();
  },
  'qa-house': (el) => {
    const soc = societyById(ui.qa.society);
    const preset = { date: ui.date, society: soc.id, block: el.dataset.block, flat: el.dataset.flat };
    const last = lastOrderFor(houseKey(preset));
    if (last) Object.assign(preset, { customer: last.customer || '', phone: last.phone || '' });
    openOrderModal(null, preset);
  },
  'qa-outside-repeat': (el) => {
    const o = S.orders.find((x) => x.id === el.dataset.id);
    openOrderModal(null, { date: ui.date, society: OUTSIDE, customer: o.customer, phone: o.phone || '', address: o.address || '' });
  },
  'pay-tab': (el) => {
    ui.payTab = el.dataset.id;
    render();
  },
  range: (el) => {
    ui.range = el.dataset.id;
    render();
  },
  qty: (el) => changeQty(el.closest('.item-row'), num(el.dataset.n)),
  'set-paid': (el) => {
    draft.paid = el.dataset.id === '1';
    $$('.seg button', $('#order-form')).forEach((b) => b.classList.toggle('active', b === el));
    $('#paid-fields').hidden = !draft.paid;
  },
  'repeat-last': (el) => {
    const last = S.orders.find((x) => x.id === el.dataset.id);
    // Use current menu prices where the dish still exists.
    draft.items = last.items.map((it) => {
      const m = it.menuId && S.menu.find((x) => x.id === it.menuId);
      return { ...it, price: m ? num(m.price) : num(it.price) };
    });
    renderItemRows();
    renderTotal();
  },
  'add-custom-item': async () => {
    const name = $('#ci-name').value.trim();
    const price = num($('#ci-price').value);
    if (!name) return toast('Enter the item name', true);
    let menuId = null;
    const existing = S.menu.find((m) => m.name.toLowerCase() === name.toLowerCase());
    if (existing) menuId = existing.id;
    else if ($('#ci-save').checked) {
      const m = await guarded(() => Store.save('menu', { name, price, active: true }), `Added “${name}” to menu`);
      menuId = m.id;
    }
    draft.items.push({ menuId, name: existing ? existing.name : name, price, qty: 1 });
    $('#ci-name').value = '';
    $('#ci-price').value = '';
    renderItemRows();
    renderTotal();
  },
  'delete-order': async () => {
    if (!confirm('Delete this order? This cannot be undone.')) return;
    await guarded(() => Store.remove('orders', draft.id), 'Order deleted');
    closeModal();
    render();
  },
  'del-menu': async (el) => {
    const m = S.menu.find((x) => x.id === el.dataset.id);
    if (!confirm(`Delete “${m.name}” from the menu? Past orders keep their record.`)) return;
    await guarded(() => Store.remove('menu', m.id), 'Deleted');
    render();
  },
  'add-society': async () => {
    const name = prompt('Society name');
    if (!name?.trim()) return;
    await guarded(() => Store.save('societies', { id: uid(), name: name.trim(), blocks: [], floors: 0, unitsPerFloor: 0 }), 'Society added');
    render();
  },
  'del-society': async (el) => {
    const s = societyById(el.dataset.id);
    if (!confirm(`Delete ${s.name}?`)) return;
    await guarded(() => Store.remove('societies', s.id), 'Deleted');
    render();
  },
  theme: (el) => {
    setTheme(el.dataset.id);
    render();
  },
  'sign-out': async () => {
    try {
      await fetch('api/logout', { method: 'POST' });
    } catch {}
    location.href = 'login';
  },
  'export-json': () => download(`kanhas-kitchen-backup-${today()}.json`, JSON.stringify(S, null, 2), 'application/json'),
  'export-csv': () => download(`kanhas-kitchen-orders-${today()}.csv`, toCsv(), 'text/csv'),
};

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || !actions[el.dataset.act]) return;
  if (el.tagName === 'A' || (el.tagName === 'BUTTON' && el.type !== 'submit')) e.preventDefault();
  try {
    await actions[el.dataset.act](el, e);
  } catch (err) {
    console.error(err);
  }
});

document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  try {
    if (f.id === 'order-form') await saveDraft();
    else if (f.id === 'pay-form') {
      const ids = f.elements.ids.value.split(',');
      await guarded(() => markPaid(ids, f.elements.mode.value, f.elements.on.value), 'Payment recorded');
      closeModal();
      render();
    } else if (f.id === 'menu-form') {
      const name = f.elements.name.value.trim();
      if (S.menu.some((m) => m.name.toLowerCase() === name.toLowerCase())) return toast('That dish is already on the menu', true);
      await guarded(() => Store.save('menu', { name, price: num(f.elements.price.value), active: true }), `Added “${name}”`);
      render();
      $('#menu-form [name=name]').focus();
    } else if (f.id === 'qa-free-form') {
      const flat = f.elements.flat.value.trim();
      const block = f.elements.block.value.trim().toUpperCase();
      const preset = { date: ui.date, society: ui.qa.society, block, flat };
      const last = lastOrderFor(houseKey(preset));
      if (last) Object.assign(preset, { customer: last.customer || '', phone: last.phone || '' });
      openOrderModal(null, preset);
    } else if (f.id === 'qa-outside-form') {
      openOrderModal(null, {
        date: ui.date,
        society: OUTSIDE,
        customer: f.elements.customer.value.trim(),
        phone: f.elements.phone.value.trim(),
        address: f.elements.address.value.trim(),
      });
    }
  } catch (err) {
    console.error(err);
  }
});

document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.id === 'day-input' && t.value) {
    ui.date = t.value;
    render();
  } else if (t.id === 'qa-date' && t.value) {
    ui.date = t.value;
    render();
  } else if (t.id === 'order-society') {
    ui.orderSociety = t.value;
    render();
  } else if (t.id === 'pay-month' && t.value) {
    ui.payMonth = t.value;
    render();
  } else if (t.id === 'range-from' || t.id === 'range-to') {
    ui[t.id === 'range-from' ? 'from' : 'to'] = t.value;
    render();
  } else if (t.id === 'import-file' && t.files[0]) {
    try {
      const data = JSON.parse(await t.files[0].text());
      if (!confirm(`Replace ALL current data with this backup (${data.orders?.length ?? 0} orders)?`)) return;
      await guarded(() => Store.importAll(data), 'Backup restored');
      render();
    } catch (err) {
      toast('Could not restore: ' + err.message, true);
    }
  } else if (t.dataset.menuField) {
    const m = S.menu.find((x) => x.id === t.dataset.id);
    const field = t.dataset.menuField;
    const value = field === 'active' ? t.checked : field === 'price' ? num(t.value) : t.value.trim();
    if (field === 'name' && !value) return render();
    await guarded(() => Store.save('menu', { ...m, [field]: value }), 'Saved');
  } else if (t.dataset.socField) {
    const s = societyById(t.dataset.id);
    const field = t.dataset.socField;
    let value = t.value.trim();
    if (field === 'blocks') value = value.split(',').map((b) => b.trim().toUpperCase()).filter(Boolean);
    else if (field !== 'name') value = Math.max(0, Math.floor(num(value)));
    if (field === 'name' && !value) return render();
    await guarded(() => Store.save('societies', { ...s, [field]: value }), 'Saved');
  } else if ($('#order-form')?.contains(t) && draft) {
    const form = $('#order-form');
    if (t.name === 'society') {
      draft.society = t.value;
      draft.block = '';
      draft.flat = '';
      renderLocFields();
    } else if (['block', 'floor', 'unit', 'flat', 'customer', 'phone', 'address'].includes(t.name)) {
      syncLocation();
    } else if (t.name === 'customAmount') {
      draft.customAmount = t.checked;
      form.elements.amount.hidden = !t.checked;
      if (t.checked) {
        form.elements.amount.value = num(draft.amount) || '';
        form.elements.amount.focus();
      }
      renderTotal();
    }
  }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'pay-search') {
    ui.paySearch = t.value;
    const pos = t.selectionStart;
    render();
    const n = $('#pay-search');
    n.focus();
    n.setSelectionRange(pos, pos);
    return;
  }
  if (!draft || !$('#order-form')?.contains(t)) return;
  if (t.matches('[data-item-price]')) {
    const row = t.closest('.item-row');
    if (row.dataset.idx !== undefined) {
      draft.items[num(row.dataset.idx)].price = num(t.value);
      $('.line', row).textContent = inr(num(t.value) * draft.items[num(row.dataset.idx)].qty);
      renderTotal();
    }
  } else if (t.name === 'amount' && draft.customAmount) {
    draft.amount = num(t.value);
    $('#total-display').textContent = inr(draft.amount);
  }
});

// ---------- boot ----------
(async function boot() {
  await Store.init();
  render();
})();
