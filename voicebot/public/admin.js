let businesses = [];

const STATUS = { active: ['ok', 'Active'], paused: ['warn', 'Paused'], suspended: ['bad', 'Suspended'] };

async function load() {
  const [me, list] = await Promise.all([api('/api/me'), api('/api/admin/businesses')]);
  $('#who').textContent = `Signed in as ${me.email}`;
  businesses = list;
  const sum = (k) => list.reduce((a, b) => a + (b[k] || 0), 0);
  $('#tiles').innerHTML = [
    ['Businesses', list.length],
    ['Active', list.filter((b) => b.status === 'active').length],
    ['Messages this month', sum('messagesThisMonth')],
    ['Conversations', sum('conversations')],
    ['Leads captured', sum('leads')],
  ].map(([l, n]) => `<div class="tile"><div class="l">${l}</div><div class="n">${num(n)}</div></div>`).join('');
  renderRows();
}

function renderRows() {
  const q = $('#search').value.trim().toLowerCase();
  const list = businesses.filter((b) => !q || `${b.name} ${b.website} ${b.ownerEmail}`.toLowerCase().includes(q));
  if (!list.length) {
    $('#rows').innerHTML = `<tr><td colspan="7" class="empty">${businesses.length ? 'No matches.' : 'No businesses yet. Click “Onboard a business” to add your first customer.'}</td></tr>`;
    return;
  }
  $('#rows').innerHTML = list.map((b) => {
    const [cls, label] = STATUS[b.status] || ['', b.status];
    const pct = b.monthlyLimit ? Math.round((b.messagesThisMonth / b.monthlyLimit) * 100) : 0;
    return `<tr data-id="${esc(b.id)}">
      <td><b>${esc(b.name)}</b><div class="muted small">${b.website ? `<a href="${esc(b.website)}" target="_blank" rel="noopener">${esc(b.website.replace(/^https?:\/\//, ''))}</a>` : 'No website'}</div></td>
      <td class="small">${esc(b.ownerEmail || '—')}</td>
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
  const text = `Your ${name} assistant dashboard\nSign in: ${location.origin}/login\nEmail: ${email}\nPassword: ${password}`;
  return modal(`<h2>Login details for ${esc(name)}</h2>
    <p class="muted">Share these with the business owner. The password is shown only once.</p>
    <pre class="code" style="margin-top:12px">${esc(text)}</pre>${extra}
    <div class="actions"><button class="cp">Copy login details</button><button class="primary" data-close>Done</button></div>`,
  (el) => { $('.cp', el).onclick = () => copy(text, 'Login details copied'); });
}

$('#add').onclick = () => modal(`<h2>Onboard a business</h2>
  <form class="stack" id="f">
    <div class="grid2">
      <label class="field">Business name<input name="name" required maxlength="120"></label>
      <label class="field">Website<input name="website" placeholder="example.com"></label>
      <label class="field">Owner's name<input name="ownerName"></label>
      <label class="field">Owner's email (their login)<input name="ownerEmail" type="email" required></label>
      <label class="field">Password<span class="hint">Leave blank to generate one</span><input name="ownerPassword" type="text" minlength="8" autocomplete="new-password"></label>
      <label class="field">Monthly message limit<span class="hint">Visitor messages per month</span><input name="monthlyLimit" type="number" min="0" value="2000"></label>
    </div>
    <label class="field">Assistant name<span class="hint">Optional, e.g. “Riya from Sunrise Dental”</span><input name="botName" maxlength="60"></label>
    <label class="field">Notes<span class="hint">Only you see these (plan, contact, billing)</span><textarea name="notes" rows="2"></textarea></label>
    <label class="check"><input type="checkbox" name="readWebsite" checked> Read their website now to build the assistant's knowledge</label>
    <p class="err" hidden></p>
    <div class="actions"><button type="button" data-close>Cancel</button><button class="primary" type="submit">Create business</button></div>
  </form>`, (el, close) => {
  $('#f', el).onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const body = Object.fromEntries(new FormData(f));
    body.readWebsite = f.readWebsite.checked;
    const btn = $('button[type=submit]', f);
    btn.disabled = true;
    try {
      const r = await api('/api/admin/businesses', { method: 'POST', body });
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

function editBusiness(b) {
  modal(`<h2>Edit ${esc(b.name)}</h2>
  <form class="stack" id="f">
    <div class="grid2">
      <label class="field">Business name<input name="name" value="${esc(b.name)}" required></label>
      <label class="field">Website<input name="website" value="${esc(b.website)}"></label>
      <label class="field">Owner's email (login)<input name="ownerEmail" type="email" value="${esc(b.ownerEmail || '')}" required></label>
      <label class="field">Monthly message limit<input name="monthlyLimit" type="number" min="0" value="${b.monthlyLimit}"></label>
    </div>
    <label class="field">Status<span class="hint">Paused hides the assistant on their website. Suspended also blocks their login.</span>
      <select name="status">${Object.entries(STATUS).map(([k, [, l]]) => `<option value="${k}" ${k === b.status ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="field">Notes<textarea name="notes" rows="3">${esc(b.notes)}</textarea></label>
    <p class="err" hidden></p>
    <div class="actions"><button type="button" data-close>Cancel</button><button class="primary" type="submit">Save</button></div>
  </form>`, (el, close) => {
    $('#f', el).onsubmit = async (e) => {
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
