let businesses = [];
let plans = {};
let inquiries = [];
const INQ_STATUS = { new: 'New', contacted: 'Contacted', won: 'Won', lost: 'Lost' };
const money = (n) => `$${Number(n || 0).toLocaleString()}`;
const planOptions = (sel) => Object.entries(plans).map(([k, p]) =>
  `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(p.name)}${p.monthly ? ` — $${p.monthly}/mo, ${num(p.messages)} messages` : p.messages ? ` — ${num(p.messages)} messages` : ''}</option>`).join('');

const STATUS = { active: ['ok', 'Active'], paused: ['warn', 'Paused'], suspended: ['bad', 'Suspended'] };

async function load() {
  const [me, list, pl, inq] = await Promise.all([api('/api/me'), api('/api/admin/businesses'), api('/api/admin/plans'), api('/api/admin/inquiries')]);
  $('#who').textContent = `Signed in as ${me.email}`;
  businesses = list;
  plans = pl;
  inquiries = inq;
  const mrr = list.filter((b) => b.status === 'active').reduce((a, b) => a + (plans[b.plan]?.monthly || 0), 0);
  const sum = (k) => list.reduce((a, b) => a + (b[k] || 0), 0);
  $('#tiles').innerHTML = [
    ['Businesses', list.length],
    ['Active', list.filter((b) => b.status === 'active').length],
    ['Messages this month', sum('messagesThisMonth')],
    ['Conversations', sum('conversations')],
    ['Leads captured', sum('leads')],
    ['Monthly revenue (list price)', money(mrr)],
  ].map(([l, n]) => `<div class="tile"><div class="l">${l}</div><div class="n">${typeof n === 'number' ? num(n) : n}</div></div>`).join('');
  renderRows();
  renderInquiries();
}

function renderRows() {
  const q = $('#search').value.trim().toLowerCase();
  const list = businesses.filter((b) => !q || `${b.name} ${b.website} ${b.ownerEmail}`.toLowerCase().includes(q));
  if (!list.length) {
    $('#rows').innerHTML = `<tr><td colspan="8" class="empty">${businesses.length ? 'No matches.' : 'No businesses yet. Click “Onboard a business” to add your first customer.'}</td></tr>`;
    return;
  }
  $('#rows').innerHTML = list.map((b) => {
    const [cls, label] = STATUS[b.status] || ['', b.status];
    const pct = b.monthlyLimit ? Math.round((b.messagesThisMonth / b.monthlyLimit) * 100) : 0;
    return `<tr data-id="${esc(b.id)}">
      <td><b>${esc(b.name)}</b><div class="muted small">${b.website ? `<a href="${esc(b.website)}" target="_blank" rel="noopener">${esc(b.website.replace(/^https?:\/\//, ''))}</a>` : 'No website'}</div></td>
      <td class="small">${esc(b.ownerEmail || '—')}</td>
      <td><span class="pill ${b.plan === 'trial' ? 'warn' : 'accent'}">${esc(plans[b.plan]?.name || b.plan)}</span></td>
      <td><span class="pill ${cls}">${label}</span></td>
      <td>${num(b.messagesThisMonth)} <span class="muted small">/ ${num(b.monthlyLimit)}</span>${pct >= 80 ? ` <span class="pill ${pct >= 100 ? 'bad' : 'warn'}">${pct}%</span>` : ''}</td>
      <td>${num(b.conversations)}</td>
      <td>${num(b.leads)}</td>
      <td><div class="row" style="justify-content:flex-end;flex-wrap:nowrap">
        <a class="btn sm primary" href="/app?b=${encodeURIComponent(b.id)}">Open panel</a>
        <button class="sm" data-act="embed">Script</button>
        <button class="sm" data-act="edit">Edit</button>
        <button class="sm" data-act="reset">Reset password</button>
        <button class="sm danger" data-act="delete">Delete</button>
      </div></td></tr>`;
  }).join('');
}

$('#rows').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const b = businesses.find((x) => x.id === btn.closest('tr').dataset.id);
  const act = btn.dataset.act;
  if (act === 'embed') return showEmbed(b);
  if (act === 'edit') return editBusiness(b);
  if (act === 'reset') {
    if (!(await confirmBox(`Create a new password for ${b.ownerEmail}? Their current password will stop working.`, 'Reset password'))) return;
    try {
      const r = await api(`/api/admin/businesses/${b.id}/reset-password`, { method: 'POST' });
      showLogin(b.name, r.email, r.password);
    } catch (err) { toast(err.message, true); }
  }
  if (act === 'delete') {
    if (!(await confirmBox(`Delete ${b.name}? This removes its assistant, knowledge, conversations, leads and owner login. This can't be undone.`))) return;
    try { await api(`/api/admin/businesses/${b.id}`, { method: 'DELETE' }); toast('Deleted'); load(); } catch (err) { toast(err.message, true); }
  }
});

function showEmbed(b) {
  modal(`<h2>Website script for ${esc(b.name)}</h2>
    <p class="muted">Paste this just before <code>&lt;/body&gt;</code> on every page of their website.</p>
    <pre class="code" style="margin-top:12px">${esc(b.embed)}</pre>
    <div class="actions"><a class="btn" href="/demo/${esc(b.botKey)}" target="_blank" rel="noopener">Open demo page</a><button class="cp">Copy script</button><button class="primary" data-close>Done</button></div>`,
  (el) => { $('.cp', el).onclick = () => copy(b.embed, 'Script copied'); });
}

function showLogin(name, email, password, extra = '') {
  const text = `Your Voxly Studio login for ${name}\nSign in: ${location.origin}/login\nEmail: ${email}\nPassword: ${password}`;
  return modal(`<h2>Login details for ${esc(name)}</h2>
    <p class="muted">Share these with the business owner. The password is shown only once.</p>
    <pre class="code" style="margin-top:12px">${esc(text)}</pre>${extra}
    <div class="actions"><button class="cp">Copy login details</button><button class="primary" data-close>Done</button></div>`,
  (el) => { $('.cp', el).onclick = () => copy(text, 'Login details copied'); });
}

$('#add').onclick = () => onboard();

function onboard(pre = {}) {
  return modal(`<h2>Onboard a business</h2>
  <form class="stack" id="f">
    <div class="grid2">
      <label class="field">Business name<input name="name" required maxlength="120" value="${esc(pre.business || '')}"></label>
      <label class="field">Website<input name="website" placeholder="example.com" value="${esc(pre.website || '')}"></label>
      <label class="field">Owner's name<input name="ownerName" value="${esc(pre.name || '')}"></label>
      <label class="field">Owner's email (their login)<input name="ownerEmail" type="email" required value="${esc(pre.email || '')}"></label>
      <label class="field">Password<span class="hint">Leave blank to generate one</span><input name="ownerPassword" type="text" minlength="8" autocomplete="new-password"></label>
      <label class="field">Plan<select name="plan">${planOptions(pre.plan && plans[pre.plan] ? pre.plan : 'trial')}</select></label>
    </div>
    <label class="field">Monthly message limit<span class="hint">Visitor messages per month. Filled in from the plan; change it for custom deals.</span><input name="monthlyLimit" type="number" min="0"></label>
    <label class="field">Assistant name<span class="hint">Optional, e.g. “Riya from Sunrise Dental”</span><input name="botName" maxlength="60"></label>
    <label class="field">Notes<span class="hint">Only you see these (contact, billing)</span><textarea name="notes" rows="2">${esc(pre.notes || '')}</textarea></label>
    <label class="check"><input type="checkbox" name="readWebsite" checked> Read their website now to build the assistant's knowledge</label>
    <p class="err" hidden></p>
    <div class="actions"><button type="button" data-close>Cancel</button><button class="primary" type="submit">Create business</button></div>
  </form>`, (el, close) => {
  const f0 = $('#f', el);
  const fillLimit = () => { const p = plans[f0.plan.value]; f0.monthlyLimit.value = p?.messages ?? f0.monthlyLimit.value ?? ''; };
  f0.plan.onchange = fillLimit;
  fillLimit();
  f0.onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const body = Object.fromEntries(new FormData(f));
    body.readWebsite = f.readWebsite.checked;
    const btn = $('button[type=submit]', f);
    btn.disabled = true;
    try {
      const r = await api('/api/admin/businesses', { method: 'POST', body });
      if (pre.inquiryId) await api(`/api/admin/inquiries/${pre.inquiryId}`, { method: 'PUT', body: { status: 'won' } }).catch(() => {});
      close();
      load();
      showLogin(body.name, r.ownerEmail, r.password,
        `<p style="margin-top:14px"><b>Website script</b></p><pre class="code">${esc(r.embed)}</pre>` +
        (r.readingWebsite ? '<p class="muted small" style="margin-top:8px">Their website is being read in the background. It shows up under Knowledge in their panel.</p>' : ''));
    } catch (err) {
      $('.err', f).textContent = err.message;
      $('.err', f).hidden = false;
      btn.disabled = false;
    }
  };
});
}

function editBusiness(b) {
  modal(`<h2>Edit ${esc(b.name)}</h2>
  <form class="stack" id="f">
    <div class="grid2">
      <label class="field">Business name<input name="name" value="${esc(b.name)}" required></label>
      <label class="field">Website<input name="website" value="${esc(b.website)}"></label>
      <label class="field">Owner's email (login)<input name="ownerEmail" type="email" value="${esc(b.ownerEmail || '')}" required></label>
      <label class="field">Plan<span class="hint">Changing plan also sets its message limit</span><select name="plan">${planOptions(b.plan)}</select></label>
      <label class="field">Monthly message limit<input name="monthlyLimit" type="number" min="0" value="${b.monthlyLimit}"></label>
    </div>
    <label class="field">Status<span class="hint">Paused hides the assistant on their website. Suspended also blocks their login.</span>
      <select name="status">${Object.entries(STATUS).map(([k, [, l]]) => `<option value="${k}" ${k === b.status ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="field">Notes<textarea name="notes" rows="3">${esc(b.notes)}</textarea></label>
    <p class="err" hidden></p>
    <div class="actions"><button type="button" data-close>Cancel</button><button class="primary" type="submit">Save</button></div>
  </form>`, (el, close) => {
    const f0 = $('#f', el);
    f0.plan.onchange = () => { const p = plans[f0.plan.value]; if (p?.messages) f0.monthlyLimit.value = p.messages; };
    f0.onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api(`/api/admin/businesses/${b.id}`, { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) });
        close();
        toast('Saved');
        load();
      } catch (err) { $('.err', el).textContent = err.message; $('.err', el).hidden = false; }
    };
  });
}

function renderInquiries() {
  const showAll = $('#inqAll').checked;
  const list = inquiries.filter((q) => showAll || q.status === 'new' || q.status === 'contacted');
  const fresh = inquiries.filter((q) => q.status === 'new').length;
  $('#inqCount').hidden = !fresh;
  $('#inqCount').textContent = `${fresh} new`;
  $('#inqRows').innerHTML = list.map((q) => `<tr data-id="${esc(q.id)}">
    <td class="small">${fmtDate(q.created_at)}</td>
    <td><b>${esc(q.business)}</b><div class="muted small">${esc(q.name)}${q.website ? ` · <a href="${esc(q.website)}" target="_blank" rel="noopener">${esc(q.website.replace(/^https?:\/\//, ''))}</a>` : ''}</div></td>
    <td class="small">${q.phone ? `<a href="tel:${esc(q.phone)}">${esc(q.phone)}</a><br>` : ''}${q.email ? `<a href="mailto:${esc(q.email)}">${esc(q.email)}</a>` : ''}</td>
    <td class="small">${esc([q.industry, plans[q.plan]?.name].filter(Boolean).join(' · ') || '—')}${q.message ? `<div class="muted">${esc(q.message)}</div>` : ''}</td>
    <td><select class="st" aria-label="Status" style="width:auto">${Object.entries(INQ_STATUS).map(([k, v]) => `<option value="${k}" ${k === q.status ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
    <td><div class="row" style="flex-wrap:nowrap"><button class="sm primary ob">Onboard</button><button class="sm danger del" aria-label="Delete request">Delete</button></div></td></tr>`).join('') ||
    `<tr><td colspan="6" class="empty">${inquiries.length ? 'All requests handled.' : 'No demo requests yet. They appear here when someone fills the form on your landing page.'}</td></tr>`;
  $$('#inqRows tr[data-id]').forEach((tr) => {
    const q = inquiries.find((x) => x.id === tr.dataset.id);
    $('.st', tr).onchange = async (e) => { await api(`/api/admin/inquiries/${q.id}`, { method: 'PUT', body: { status: e.target.value } }); q.status = e.target.value; renderInquiries(); };
    $('.del', tr).onclick = async () => { if (await confirmBox(`Delete the request from ${q.business}?`)) { await api(`/api/admin/inquiries/${q.id}`, { method: 'DELETE' }); load(); } };
    $('.ob', tr).onclick = () => onboard({ ...q, plan: 'trial', inquiryId: q.id,
      notes: [q.phone && `Phone: ${q.phone}`, q.plan && `Interested in: ${plans[q.plan]?.name}`, q.message].filter(Boolean).join('\n') });
  });
}
$('#inqAll').onchange = renderInquiries;

$('#password').onclick = () => changePassword();
$('#search').oninput = renderRows;

function changePassword() {
  modal(`<h2>Change your password</h2><form class="stack" id="f">
    <label class="field">Current password<input type="password" name="current" required autocomplete="current-password"></label>
    <label class="field">New password<input type="password" name="next" minlength="8" required autocomplete="new-password"></label>
    <p class="err" hidden></p>
    <div class="actions"><button type="button" data-close>Cancel</button><button class="primary">Change password</button></div></form>`, (el, close) => {
    $('#f', el).onsubmit = async (e) => {
      e.preventDefault();
      try { await api('/api/me/password', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); close(); toast('Password changed'); } catch (err) { $('.err', el).textContent = err.message; $('.err', el).hidden = false; }
    };
  });
}

load().catch((err) => toast(err.message, true));
