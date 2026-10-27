let biz = null;
let pollTimer = null;
const page = $('#page');
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const TYPE_ICON = { website: '🌐', file: '📄', text: '✏️', assistant: '💬' };
const TYPE_LABEL = { website: 'Website page', file: 'File', text: 'Note', assistant: 'From assistant' };
const LEAD_STATUS = { new: 'New', contacted: 'Contacted', won: 'Won', lost: 'Lost' };
const LANGUAGES = [
  ['en-IN', 'English (India)'], ['en-US', 'English (US)'], ['en-GB', 'English (UK)'], ['hi-IN', 'Hindi'], ['mr-IN', 'Marathi'],
  ['gu-IN', 'Gujarati'], ['pa-IN', 'Punjabi'], ['bn-IN', 'Bengali'], ['ta-IN', 'Tamil'], ['te-IN', 'Telugu'], ['kn-IN', 'Kannada'],
  ['ml-IN', 'Malayalam'], ['ar-AE', 'Arabic'], ['es-ES', 'Spanish'], ['fr-FR', 'French'], ['de-DE', 'German'],
];

async function refreshBiz() {
  biz = await api('/api/biz');
  $('#bizName').textContent = biz.name;
  document.title = `${biz.name} — Voxly Studio`;
  if (biz.viewer === 'admin') { $('#adminBanner').hidden = false; $('#adminBiz').textContent = biz.name; }
  const nl = biz.stats.newLeads;
  $('#leadBadge').hidden = !nl;
  $('#leadBadge').textContent = nl;
  return biz;
}

const PAGES = { overview, assistant, knowledge, conversations, leads, settings, install, account };
async function go() {
  clearTimeout(pollTimer);
  const name = PAGES[location.hash.slice(1)] ? location.hash.slice(1) : 'overview';
  $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.page === name));
  try {
    await PAGES[name]();
  } catch (err) {
    page.innerHTML = `<div class="card"><p class="err">${esc(err.message)}</p></div>`;
  }
}
$('#nav').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-page]');
  if (b) location.hash = b.dataset.page;
});
window.addEventListener('hashchange', go);

function head(title, sub, right = '') {
  return `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div><div class="spacer"></div>${right}</div>`;
}

// ---------------- overview ----------------
async function overview() {
  await refreshBiz();
  const s = biz.stats;
  const convs = await api('/api/biz/conversations');
  const days = [];
  for (let i = 29; i >= 0; i--) days.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
  const byDay = Object.fromEntries(s.daily.map((d) => [d.day, d.n]));
  const max = Math.max(1, ...days.map((d) => byDay[d] || 0));
  const steps = [
    [s.sources > 0, 'Add knowledge about your business', 'knowledge'],
    [biz.settings.greeting && biz.settings.botName !== 'Assistant', 'Name your assistant and write its greeting', 'settings'],
    [s.conversations > 0, 'Try your assistant and add the script to your website', 'install'],
  ];
  page.innerHTML = head(`Welcome${biz.viewer === 'admin' ? '' : ' back'}`, `Here's how the assistant on ${esc(biz.website ? biz.website.replace(/^https?:\/\//, '') : 'your website')} is doing.`,
    '<a class="btn primary" href="#assistant">Train your assistant</a>') +
    (biz.status !== 'active' ? `<div class="banner">Your assistant is ${esc(biz.status)}, so it isn't showing on your website. Please contact support.</div>` : '') +
    `<div class="tiles">
      <div class="tile"><div class="l">Conversations (30 days)</div><div class="n">${num(s.conversations30)}</div></div>
      <div class="tile"><div class="l">Used voice (30 days)</div><div class="n">${num(s.voiceConversations30)}</div></div>
      <div class="tile"><div class="l">New leads</div><div class="n">${num(s.newLeads)}</div></div>
      <div class="tile"><div class="l">Knowledge sources</div><div class="n">${num(s.sources)}</div></div>
      <div class="tile"><div class="l">Messages this month · ${esc(biz.plan.name)} plan</div><div class="n">${num(s.usage.messages)}<span class="muted small"> / ${num(biz.monthlyLimit)}</span></div></div>
    </div>
    <div class="grid2" style="margin-top:14px">
      <div class="card"><h2>Conversations per day</h2><p class="muted small">Last 30 days</p>
        <div class="chart" role="img" aria-label="Conversations per day for the last 30 days">${days.map((d) => `<div title="${d}: ${byDay[d] || 0}" style="height:${((byDay[d] || 0) / max) * 100}%"></div>`).join('')}</div></div>
      <div class="card"><h2>Getting set up</h2><div class="checklist" style="margin-top:12px">
        ${steps.map(([done, label, to]) => `<div class="${done ? 'done' : ''}"><span class="dot">${done ? '✓' : ''}</span><a href="#${to}">${label}</a></div>`).join('')}
      </div></div>
    </div>
    <div class="card" style="margin-top:14px"><div class="row"><h2>Latest conversations</h2><div class="spacer"></div><a href="#conversations">See all</a></div>
      <div class="list" style="margin-top:6px">${convs.slice(0, 6).map(convItem).join('') || '<p class="empty">No conversations yet.</p>'}</div></div>`;
  bindConvList();
}

// ---------------- training assistant ----------------
let pending = [];
async function assistant() {
  await refreshBiz();
  page.innerHTML = head('Coach', 'Coach is your setup assistant. Chat to teach your website assistant about your business, share menus, price lists, brochures or photos, and ask anything about them.',
    '<button id="clear" class="sm">Clear chat</button>') +
    `<div class="card chat" id="chat">
      <div class="chat-log" id="log"></div>
      <div class="chat-bar">
        <div class="attach-list" id="attached"></div>
        <form class="row" id="form">
          <button type="button" id="attach" title="Attach files or images" aria-label="Attach files">📎</button>
          <input type="file" id="fileIn" multiple hidden accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.docx,.pptx,.txt,.md,.csv,.json,.html,.htm">
          <textarea id="msg" rows="1" placeholder="Message your assistant… (you can paste images too)" aria-label="Message"></textarea>
          ${SR ? '<button type="button" id="mic" title="Dictate" aria-label="Dictate">🎤</button>' : ''}
          <button class="primary" id="sendBtn">Send</button>
        </form>
      </div>
    </div>`;
  pending = [];
  const log = $('#log');
  const history = await api('/api/biz/assistant');
  log.innerHTML = '';
  if (!history.length) {
    log.innerHTML = `<div class="empty"><h2>Hi! I'm Coach. I'll help set up your website assistant.</h2>
      <p style="margin-top:6px">I can interview you about ${esc(biz.name)}, read your files and photos, and answer questions about them.</p>
      <div class="starters">
        <button class="starter">Interview me about my business</button>
        <button class="starter">What's missing from the knowledge?</button>
        <button class="starter">What are customers asking about?</button>
        <button class="starter">Summarise what you know about us</button>
      </div></div>`;
    $$('.starter', log).forEach((b) => (b.onclick = () => sendAssistant(b.textContent)));
  }
  history.forEach(addBubble);
  log.scrollTop = log.scrollHeight;

  const msg = $('#msg');
  msg.addEventListener('input', () => { msg.style.height = 'auto'; msg.style.height = Math.min(200, msg.scrollHeight) + 'px'; });
  msg.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#form').requestSubmit(); } });
  msg.addEventListener('paste', (e) => {
    const files = [...(e.clipboardData?.files || [])];
    if (files.length) { e.preventDefault(); addPending(files); }
  });
  $('#form').onsubmit = (e) => { e.preventDefault(); sendAssistant(msg.value); };
  $('#attach').onclick = () => $('#fileIn').click();
  $('#fileIn').onchange = (e) => { addPending([...e.target.files]); e.target.value = ''; };
  $('#clear').onclick = async () => {
    if (!(await confirmBox('Clear this chat? Knowledge your assistant saved stays.', 'Clear chat'))) return;
    await api('/api/biz/assistant', { method: 'DELETE' });
    assistant();
  };
  const chat = $('#chat');
  chat.addEventListener('dragover', (e) => { e.preventDefault(); chat.classList.add('over'); });
  chat.addEventListener('dragleave', () => chat.classList.remove('over'));
  chat.addEventListener('drop', (e) => { e.preventDefault(); chat.classList.remove('over'); addPending([...e.dataTransfer.files]); });
  if (SR) $('#mic').onclick = () => dictate($('#mic'), msg, biz.settings.language);
}

function addPending(files) {
  for (const f of files) {
    if (f.size > 20 * 1024 * 1024) { toast(`${f.name} is larger than 20 MB`, true); continue; }
    pending.push(f);
  }
  renderPending();
}
function renderPending() {
  $('#attached').innerHTML = pending.map((f, i) => `<span class="pill accent">${esc(f.name)}<button type="button" data-i="${i}" aria-label="Remove ${esc(f.name)}">✕</button></span>`).join('');
  $$('#attached button').forEach((b) => (b.onclick = () => { pending.splice(Number(b.dataset.i), 1); renderPending(); }));
}

function addBubble(m) {
  const log = $('#log');
  $('.empty', log)?.remove();
  const d = document.createElement('div');
  d.className = `bub ${m.role}`;
  if (m.role === 'user') {
    d.innerHTML = (m.files?.length ? `<div class="files">${m.files.map((f) => `<span>📎 ${esc(f.name)}</span>`).join('')}</div>` : '') + md(m.text || '');
  } else {
    d.innerHTML = md(m.text || '') + (m.actions?.length ? `<div class="actions-list">${m.actions.map((a) => `<span class="pill ok">✓ ${esc(a)}</span>`).join('')}</div>` : '');
  }
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
  return d;
}

async function sendAssistant(text) {
  text = text.trim();
  if (!text && !pending.length) return;
  const btn = $('#sendBtn');
  if (btn.disabled) return;
  btn.disabled = true;
  const files = pending;
  const total = files.reduce((a, f) => a + f.size, 0);
  if (total > 21 * 1024 * 1024) { toast('Please attach less than 21 MB at a time.', true); btn.disabled = false; return; }
  pending = [];
  renderPending();
  $('#msg').value = '';
  $('#msg').style.height = 'auto';
  addBubble({ role: 'user', text, files: files.map((f) => ({ name: f.name })) });
  const wait = addBubble({ role: 'assistant', text: files.length ? 'Reading your files…' : 'Thinking…' });
  wait.classList.add('muted');
  try {
    const payload = await Promise.all(files.map(async (f) => ({ name: f.name, type: f.type, data: await fileToBase64(f) })));
    const r = await api('/api/biz/assistant', { method: 'POST', body: { text, files: payload } });
    wait.remove();
    addBubble({ role: 'assistant', ...r.assistant });
  } catch (err) {
    wait.remove();
    toast(err.message, true);
    if (!$('#msg').value) $('#msg').value = text;
  }
  btn.disabled = false;
  $('#msg').focus();
}

function dictate(btn, field, lang) {
  if (dictate.r) { dictate.r.stop(); return; }
  const r = new SR();
  dictate.r = r;
  r.lang = lang || 'en-IN';
  r.interimResults = true;
  const start = field.value ? field.value.replace(/\s*$/, ' ') : '';
  r.onresult = (e) => { field.value = start + [...e.results].map((x) => x[0].transcript).join(''); };
  r.onerror = (e) => { if (e.error === 'not-allowed') toast('Allow microphone access to dictate.', true); };
  r.onend = () => { dictate.r = null; btn.classList.remove('primary'); field.focus(); };
  btn.classList.add('primary');
  r.start();
}

// ---------------- knowledge ----------------
let kFilter = 'all';
async function knowledge() {
  await refreshBiz();
  page.innerHTML = head('Knowledge', 'Everything your assistant knows. It answers visitors only from this.') +
    `<div class="grid2">
      <div class="card stack">
        <div><h2>🌐 Read your website</h2><p class="muted small">Reads your pages so the assistant knows what's on them. Run it again after you change your site.</p></div>
        <form class="stack" id="webForm">
          <input name="url" placeholder="https://yourwebsite.com" value="${esc(biz.website)}" aria-label="Website address">
          <div class="row"><label class="small muted">Up to <select name="maxPages" style="width:auto">${[10, 30, 60, 100].filter((n) => n <= biz.plan.pages).map((n) => `<option ${n === 30 ? 'selected' : ''}>${n}</option>`).join('')}</select> pages</label><div class="spacer"></div><button class="primary">Read website</button></div>
        </form>
        <p class="small" id="crawlStatus"></p>
      </div>
      <div class="card stack">
        <div><h2>📄 Upload files</h2><p class="muted small">PDFs, photos of menus or price lists, Word, PowerPoint, text and CSV files.</p></div>
        <label class="dropzone" id="drop"><input type="file" id="kFiles" multiple hidden accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.docx,.pptx,.txt,.md,.csv,.json,.html,.htm">Drop files here or <u>choose files</u></label>
        <button id="addNote">✏️ Write a note or FAQ</button>
      </div>
    </div>
    <div class="card" style="margin-top:14px">
      <div class="tabs" id="tabs">${['all', 'website', 'file', 'text', 'assistant'].map((t) => `<button class="sm ${t === kFilter ? 'active' : ''}" data-t="${t}">${{ all: 'All', website: 'Website pages', file: 'Files', text: 'Notes', assistant: 'Saved by assistant' }[t]}</button>`).join('')}</div>
      <div class="list" id="sources"><p class="muted">Loading…</p></div>
    </div>`;

  $('#webForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/api/biz/sources/website', { method: 'POST', body: { url: e.target.url.value, maxPages: Number(e.target.maxPages.value) } });
      toast('Reading your website…');
      loadSources();
    } catch (err) { toast(err.message, true); }
  };
  const drop = $('#drop');
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); uploadFiles([...e.dataTransfer.files]); });
  $('#kFiles').onchange = (e) => { uploadFiles([...e.target.files]); e.target.value = ''; };
  $('#addNote').onclick = () => editSource(null);
  $('#tabs').onclick = (e) => {
    const b = e.target.closest('button[data-t]');
    if (!b) return;
    kFilter = b.dataset.t;
    $$('#tabs button').forEach((x) => x.classList.toggle('active', x === b));
    loadSources();
  };
  await loadSources();
}

async function uploadFiles(files) {
  const ok = files.filter((f) => f.size <= 20 * 1024 * 1024);
  if (ok.length < files.length) toast('Files larger than 20 MB were skipped.', true);
  for (const f of ok) {
    try {
      toast(`Uploading ${f.name}…`);
      await api('/api/biz/sources/files', { method: 'POST', body: { files: [{ name: f.name, type: f.type, data: await fileToBase64(f) }] } });
    } catch (err) { toast(err.message, true); }
  }
  loadSources();
}

async function loadSources() {
  clearTimeout(pollTimer);
  const { sources, crawl } = await api('/api/biz/sources');
  if (location.hash !== '#knowledge') return;
  const cs = $('#crawlStatus');
  if (crawl?.running) cs.innerHTML = `<span class="pill warn">Reading…</span> ${num(crawl.pages)} pages so far`;
  else if (crawl?.error) cs.innerHTML = `<span class="pill bad">Couldn't read the website</span> ${esc(crawl.error)}`;
  else if (crawl) cs.innerHTML = `<span class="pill ok">Done</span> Read ${num(crawl.pages)} pages`;
  else cs.textContent = '';
  const list = sources.filter((s) => kFilter === 'all' || s.type === kFilter);
  $('#sources').innerHTML = list.map((s) => `
    <div class="item click" data-id="${esc(s.id)}">
      <div class="ic">${TYPE_ICON[s.type] || '•'}</div>
      <div class="body">
        <div class="t">${esc(s.title || s.file_name || 'Untitled')}</div>
        <div class="s">${s.status === 'processing' ? 'Reading this file…' : s.status === 'error' ? esc(s.error) : esc(s.url || s.preview)}</div>
      </div>
      <div class="row" style="flex-wrap:nowrap">
        ${s.status === 'processing' ? '<span class="pill warn">Reading</span>' : s.status === 'error' ? '<span class="pill bad">Failed</span>' : `<span class="muted small">${num(s.chars)} chars</span>`}
        <span class="pill">${TYPE_LABEL[s.type]}</span>
      </div>
    </div>`).join('') || `<p class="empty">Nothing here yet. Read your website, upload a file, or chat with your assistant to add knowledge.</p>`;
  $$('#sources .item').forEach((el) => (el.onclick = () => editSource(el.dataset.id)));
  if (crawl?.running || sources.some((s) => s.status === 'processing')) pollTimer = setTimeout(loadSources, 3000);
}

async function editSource(id) {
  const s = id ? await api(`/api/biz/sources/${id}`) : { type: 'text', title: '', content: '' };
  modal(`<h2>${id ? esc(TYPE_LABEL[s.type]) : 'New note'}</h2>
    <form class="stack" id="f">
      <label class="field">Title<input name="title" value="${esc(s.title)}" placeholder="e.g. Opening hours, Delivery, Refund policy"></label>
      ${s.url ? `<p class="small"><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a></p>` : ''}
      ${s.file_name ? `<p class="small"><a href="/api/biz/sources/${esc(s.id)}/file${BIZ ? `?b=${encodeURIComponent(BIZ)}` : ''}" target="_blank" rel="noopener">Open ${esc(s.file_name)}</a></p>` : ''}
      ${s.status === 'error' ? `<p class="err">${esc(s.error)}</p>` : ''}
      <label class="field">Content<span class="hint">${s.type === 'file' ? 'What the assistant read from this file. Fix anything it got wrong.' : 'Write it the way you would explain it to a customer.'}</span>
        <textarea name="content" rows="14" ${s.status === 'processing' ? 'disabled' : ''}>${esc(s.content)}</textarea></label>
      <div class="actions">
        ${id ? '<button type="button" class="danger del" style="margin-right:auto">Delete</button>' : ''}
        ${s.status === 'error' && s.file_name ? '<button type="button" class="retry">Try again</button>' : ''}
        <button type="button" data-close>Cancel</button><button class="primary">Save</button>
      </div>
    </form>`, (el, close) => {
    $('#f', el).onsubmit = async (e) => {
      e.preventDefault();
      const body = { title: e.target.title.value, content: e.target.content.value };
      try {
        if (id) await api(`/api/biz/sources/${id}`, { method: 'PUT', body });
        else await api('/api/biz/sources/text', { method: 'POST', body });
        close(); toast('Saved'); loadSources();
      } catch (err) { toast(err.message, true); }
    };
    $('.del', el) && ($('.del', el).onclick = async () => {
      close();
      if (await confirmBox(`Delete “${s.title || s.file_name}” from the knowledge?`)) { await api(`/api/biz/sources/${id}`, { method: 'DELETE' }); toast('Deleted'); loadSources(); }
    });
    $('.retry', el) && ($('.retry', el).onclick = async () => { await api(`/api/biz/sources/${id}/retry`, { method: 'POST' }); close(); loadSources(); });
  });
}

// ---------------- conversations ----------------
function convItem(c) {
  return `<div class="item click conv" data-id="${esc(c.id)}">
    <div class="ic">${c.used_voice ? '🎙️' : '💬'}</div>
    <div class="body"><div class="t">${esc(c.first_message || '(no message)')}</div>
      <div class="s">${num(c.message_count)} messages · ${esc(c.page_url.replace(/^https?:\/\//, '') || 'unknown page')}</div></div>
    <div class="row" style="flex-wrap:nowrap">${c.lead_count ? '<span class="pill ok">Lead</span>' : ''}<span class="muted small">${ago(c.last_at)}</span></div>
  </div>`;
}
function bindConvList() { $$('.conv').forEach((el) => (el.onclick = () => openConversation(el.dataset.id))); }

async function conversations() {
  page.innerHTML = head('Conversations', 'Everything visitors asked your assistant, and what it said.') +
    `<div class="card"><input id="cs" placeholder="Search conversations…" style="margin-bottom:8px"><div class="list" id="clist"><p class="muted">Loading…</p></div>
    <div class="row" style="justify-content:center;margin-top:10px"><button id="more" hidden>Show more</button></div></div>`;
  let offset = 0;
  let timer;
  const load = async (append) => {
    const list = await api(`/api/biz/conversations?search=${encodeURIComponent($('#cs').value)}&offset=${offset}`);
    const html = list.map(convItem).join('');
    $('#clist').innerHTML = append ? $('#clist').innerHTML + html : html || '<p class="empty">No conversations yet. Once visitors chat with your assistant, they appear here.</p>';
    $('#more').hidden = list.length < 50;
    bindConvList();
  };
  $('#cs').oninput = () => { clearTimeout(timer); timer = setTimeout(() => { offset = 0; load(false); }, 300); };
  $('#more').onclick = () => { offset += 50; load(true); };
  await load(false);
}

async function openConversation(id) {
  const c = await api(`/api/biz/conversations/${id}`);
  modal(`<h2>Conversation</h2>
    <p class="muted small">${fmtDate(c.started_at)} · ${esc(c.page_url || 'unknown page')}${c.used_voice ? ' · used voice' : ''}</p>
    ${c.lead ? `<div class="banner" style="margin-top:12px;background:var(--ok-soft);color:var(--ok)">Lead: ${esc([c.lead.name, c.lead.phone, c.lead.email].filter(Boolean).join(' · '))}${c.lead.note ? ` — ${esc(c.lead.note)}` : ''}</div>` : ''}
    <div class="transcript" style="margin-top:12px">${c.messages.map((m) => `<div class="bub ${m.role === 'user' ? 'user' : 'assistant'}" style="${m.role === 'user' ? '' : ''}">${m.via === 'voice' ? '🎙️ ' : ''}${esc(m.content).replace(/\n/g, '<br>')}</div>`).join('')}</div>
    <div class="actions"><button class="danger del" style="margin-right:auto">Delete</button><button class="primary" data-close>Close</button></div>`, (el, close) => {
    $('.transcript', el).style.display = 'flex';
    $('.transcript', el).style.flexDirection = 'column';
    $('.del', el).onclick = async () => {
      close();
      if (await confirmBox('Delete this conversation?')) { await api(`/api/biz/conversations/${id}`, { method: 'DELETE' }); toast('Deleted'); go(); }
    };
  });
}

// ---------------- leads ----------------
async function leads() {
  const list = await api('/api/biz/leads');
  page.innerHTML = head('Leads', 'Visitors who shared their contact details with your assistant.',
    `<a class="btn" href="/api/biz/leads.csv${BIZ ? `?b=${encodeURIComponent(BIZ)}` : ''}">Download CSV</a>`) +
    `<div class="card table-wrap"><table><thead><tr><th>Date</th><th>Name</th><th>Contact</th><th>What they want</th><th>Status</th><th></th></tr></thead><tbody>
    ${list.map((l) => `<tr data-id="${esc(l.id)}" data-conv="${esc(l.conversation_id)}">
      <td class="small">${fmtDate(l.created_at)}</td><td><b>${esc(l.name || '—')}</b></td>
      <td class="small">${l.phone ? `<a href="tel:${esc(l.phone)}">${esc(l.phone)}</a><br>` : ''}${l.email ? `<a href="mailto:${esc(l.email)}">${esc(l.email)}</a>` : ''}</td>
      <td class="small">${esc(l.note)}</td>
      <td><select class="st" aria-label="Lead status" style="width:auto">${Object.entries(LEAD_STATUS).map(([k, v]) => `<option value="${k}" ${k === l.status ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
      <td><div class="row" style="flex-wrap:nowrap">${l.conversation_id ? '<button class="sm chat">Chat</button>' : ''}<button class="sm danger del" aria-label="Delete lead">Delete</button></div></td></tr>`).join('') ||
      '<tr><td colspan="6" class="empty">No leads yet. When a visitor shares their phone or email, it shows up here.</td></tr>'}
    </tbody></table></div>`;
  $$('tr[data-id]').forEach((tr) => {
    $('.st', tr).onchange = async (e) => { await api(`/api/biz/leads/${tr.dataset.id}`, { method: 'PUT', body: { status: e.target.value } }); toast('Updated'); refreshBiz(); };
    $('.del', tr).onclick = async () => { if (await confirmBox('Delete this lead?')) { await api(`/api/biz/leads/${tr.dataset.id}`, { method: 'DELETE' }); leads(); } };
    $('.chat', tr) && ($('.chat', tr).onclick = () => openConversation(tr.dataset.conv));
  });
}

// ---------------- settings ----------------
async function settings() {
  await refreshBiz();
  const s = biz.settings;
  const sugg = [...s.suggestions, '', '', '', ''].slice(0, 4);
  page.innerHTML = head('Bot settings', 'How your assistant looks, sounds and behaves on your website.') +
    `<form class="stack" id="f">
      <div class="card stack"><h2>Basics</h2>
        <div class="grid2">
          <label class="field">Business name<input name="bizName" value="${esc(biz.name)}" required></label>
          <label class="field">Website<input name="website" value="${esc(biz.website)}"></label>
          <label class="field">Assistant's name<input name="botName" value="${esc(s.botName)}" maxlength="60"></label>
          <label class="field">Language<span class="hint">For listening and speaking. It replies in the visitor's language.</span>
            <select name="language">${LANGUAGES.map(([v, l]) => `<option value="${v}" ${v === s.language ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        </div>
        <label class="field">Greeting<span class="hint">The first message visitors see</span><input name="greeting" value="${esc(s.greeting)}" maxlength="500"></label>
        <div class="field">Suggested questions<span class="hint">Shown as buttons before the visitor types</span>
          <div class="grid2">${sugg.map((q, i) => `<input name="sugg${i}" value="${esc(q)}" placeholder="e.g. What are your timings?" aria-label="Suggested question ${i + 1}">`).join('')}</div></div>
      </div>
      <div class="card stack"><h2>Look</h2>
        <div class="row"><label class="field">Colour<input type="color" name="color" value="${esc(s.color)}"></label>
          <label class="field">Position<select name="position" style="width:auto"><option value="right" ${s.position !== 'left' ? 'selected' : ''}>Bottom right</option><option value="left" ${s.position === 'left' ? 'selected' : ''}>Bottom left</option></select></label></div>
      </div>
      <div class="card stack"><h2>Voice</h2>
        <label class="check"><input type="checkbox" name="voiceReplies" ${s.voiceReplies ? 'checked' : ''}> Read replies aloud by default (visitors can turn this off)</label>
        <div class="grid2">
          <label class="field">Voice<span class="hint">Voices come from the visitor's device; this one is used when available.</span><select name="voiceName" id="voiceSel"></select></label>
          <label class="field">Speaking speed <span class="hint" id="rateVal">${s.voiceRate}×</span><input type="range" name="voiceRate" min="0.6" max="1.5" step="0.05" value="${s.voiceRate}"></label>
        </div>
        <div><button type="button" id="preview">▶ Preview voice</button></div>
      </div>
      <div class="card stack"><h2>Behaviour</h2>
        <label class="field">Instructions for your assistant<span class="hint">Tone, what to promote, what not to discuss. e.g. “Always mention free home delivery above ₹500. Speak politely in Hinglish.”</span>
          <textarea name="instructions" rows="5">${esc(s.instructions)}</textarea></label>
        <label class="check"><input type="checkbox" name="collectLeads" ${s.collectLeads ? 'checked' : ''}> Offer to take visitors' name and phone number when they want to order, book or be called back</label>
        <label class="field">Allowed websites<span class="hint">Only these domains can show your assistant (one per line). Leave empty to allow any.</span>
          <textarea name="allowedDomains" rows="2" placeholder="yourwebsite.com">${esc(s.allowedDomains.join('\n'))}</textarea></label>
      </div>
      <div class="row"><div class="spacer"></div><button class="primary">Save settings</button></div>
    </form>`;

  const sel = $('#voiceSel');
  const fillVoices = () => {
    const voices = (window.speechSynthesis?.getVoices() || []).slice().sort((a, b) => a.lang.localeCompare(b.lang));
    const lang = $('#f').language.value.split('-')[0];
    const current = sel.value || s.voiceName;
    sel.innerHTML = '<option value="">Automatic (best match for the language)</option>' +
      voices.filter((v) => v.lang.toLowerCase().startsWith(lang)).map((v) => `<option ${v.name === current ? 'selected' : ''}>${esc(v.name)}</option>`).join('') +
      (current && !voices.some((v) => v.name === current) ? `<option selected>${esc(current)}</option>` : '');
  };
  fillVoices();
  window.speechSynthesis?.addEventListener?.('voiceschanged', fillVoices);
  $('#f').language.onchange = fillVoices;
  $('#f').voiceRate.oninput = (e) => { $('#rateVal').textContent = `${e.target.value}×`; };
  $('#preview').onclick = () => {
    if (!window.speechSynthesis) return toast('This browser cannot speak.', true);
    const f = $('#f');
    const u = new SpeechSynthesisUtterance(f.greeting.value || 'Hello! How can I help you today?');
    const v = speechSynthesis.getVoices().find((x) => x.name === f.voiceName.value) ||
      speechSynthesis.getVoices().find((x) => x.lang.replace('_', '-') === f.language.value);
    if (v) u.voice = v;
    u.lang = f.language.value;
    u.rate = Number(f.voiceRate.value);
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  };
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const body = {
      name: f.bizName.value, website: f.website.value,
      settings: {
        botName: f.botName.value, greeting: f.greeting.value, language: f.language.value, color: f.color.value, position: f.position.value,
        voiceReplies: f.voiceReplies.checked, voiceName: f.voiceName.value, voiceRate: Number(f.voiceRate.value),
        instructions: f.instructions.value, collectLeads: f.collectLeads.checked,
        suggestions: [0, 1, 2, 3].map((i) => f[`sugg${i}`].value), allowedDomains: f.allowedDomains.value,
      },
    };
    try { await api('/api/biz/settings', { method: 'PUT', body }); toast('Settings saved'); refreshBiz(); } catch (err) { toast(err.message, true); }
  };
}

// ---------------- install ----------------
async function install() {
  await refreshBiz();
  page.innerHTML = head('Install & test', 'Add your assistant to your website with one line of code.') +
    `<div class="grid2">
      <div class="stack">
        <div class="card stack"><h2>Your website script</h2>
          <p class="muted small">Paste this just before <code>&lt;/body&gt;</code> on your website (on every page you want the assistant).</p>
          <pre class="code" id="code">${esc(biz.embed)}</pre>
          <div class="row"><button class="primary" id="copy">Copy script</button><a class="btn" href="${esc(biz.demoUrl)}" target="_blank" rel="noopener">Open demo page</a><div class="spacer"></div><button class="sm" id="rotate">New key</button></div>
        </div>
        <div class="card stack"><h2>Where to paste it</h2>
          <p><b>WordPress:</b> Appearance → Theme File Editor → footer.php before <code>&lt;/body&gt;</code>, or use a plugin such as “WPCode” → Footer.</p>
          <p><b>Shopify:</b> Online Store → Themes → Edit code → theme.liquid, before <code>&lt;/body&gt;</code>.</p>
          <p><b>Wix:</b> Settings → Custom code → Add code → “Body - end”, all pages.</p>
          <p><b>Squarespace:</b> Settings → Advanced → Code injection → Footer.</p>
          <p><b>Google Tag Manager:</b> New tag → Custom HTML → paste → trigger on All Pages.</p>
          <p class="muted small">Voice works in Chrome, Edge and Safari (on phones too). In Firefox visitors can type and hear replies.</p>
        </div>
      </div>
      <div class="card stack"><div class="row"><h2>Live preview</h2><div class="spacer"></div><button class="sm" id="reload">Reload</button></div>
        <p class="muted small">This is your assistant exactly as visitors see it. Conversations here also appear under Conversations.</p>
        <iframe class="preview" id="frame" src="${esc(biz.demoUrl)}" allow="microphone; autoplay" title="Assistant preview"></iframe>
      </div>
    </div>`;
  $('#copy').onclick = () => copy(biz.embed, 'Script copied');
  $('#reload').onclick = () => { $('#frame').src = biz.demoUrl; };
  $('#rotate').onclick = async () => {
    if (!(await confirmBox('Create a new key? The old script will stop working, so you must update your website with the new script.', 'Create new key'))) return;
    await api('/api/biz/rotate-key', { method: 'POST' });
    install();
  };
}

// ---------------- account ----------------
async function account() {
  const me = await api('/api/me');
  page.innerHTML = head('Account', '') +
    `<div class="card stack" style="max-width:520px"><p>Signed in as <b>${esc(me.email)}</b></p>
      ${me.role === 'admin' ? '<p class="muted small">You are an admin; change your password from the admin panel.</p>' : `
      <form class="stack" id="f"><h2>Change password</h2>
        <label class="field">Current password<input type="password" name="current" required autocomplete="current-password"></label>
        <label class="field">New password<input type="password" name="next" minlength="8" required autocomplete="new-password"></label>
        <div><button class="primary">Change password</button></div></form>`}
      <div><button onclick="signOut()">Sign out</button></div></div>`;
  $('#f') && ($('#f').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/api/me/password', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); e.target.reset(); toast('Password changed'); } catch (err) { toast(err.message, true); }
  });
}

// Keep the admin's ?b=<id> when navigating.
refreshBiz().then(go).catch((err) => { page.innerHTML = `<div class="card"><p class="err">${esc(err.message)}</p>${BIZ ? '' : ''}<p><a href="/admin">Go to admin</a></p></div>`; });
