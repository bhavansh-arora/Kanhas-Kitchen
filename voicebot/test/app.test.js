const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { startApp, chat, text, toolUse, makeZip } = require('./helpers');

async function onboard(t, overrides = {}) {
  const app = await startApp(overrides);
  t.after(() => app.close());
  assert.equal((await app.login('admin@example.com', 'admin-pass-123')).status, 200);
  const r = await app.req('/api/admin/businesses', {
    method: 'POST',
    body: { name: 'Sunrise Bakery', website: '', ownerEmail: 'owner@sunrise.test', ownerPassword: 'owner-pass-1', monthlyLimit: 100 },
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const key = r.data.embed.match(/data-key="([^"]+)"/)[1];
  return { app, bizId: r.data.id, key };
}

test('sign-in, roles and admin-only routes', async (t) => {
  const { app } = await onboard(t);
  assert.equal((await app.req('/admin')).status, 200);
  // A business owner can't use admin routes, and lands on /app.
  const r = await app.login('owner@sunrise.test', 'owner-pass-1');
  assert.equal(r.data.redirect, '/app');
  assert.equal((await app.req('/api/admin/businesses')).status, 403);
  assert.equal((await app.req('/admin')).headers.get('location'), '/app');
  assert.equal((await app.req('/api/biz')).data.name, 'Sunrise Bakery');
  // Wrong password, then signed out.
  assert.equal((await app.login('owner@sunrise.test', 'nope')).status, 401);
  assert.equal((await app.req('/api/biz')).status, 401);
  assert.equal((await app.req('/app')).headers.get('location'), '/login?next=%2Fapp');
});

test('changing a password signs out other sessions', async (t) => {
  const { app } = await onboard(t);
  await app.login('owner@sunrise.test', 'owner-pass-1');
  const oldCookie = app.getCookie();
  assert.equal((await app.req('/api/me/password', { method: 'POST', body: { current: 'owner-pass-1', next: 'new-pass-999' } })).status, 200);
  assert.equal((await app.req('/api/biz')).status, 200); // this session got a fresh cookie
  app.setCookie(oldCookie);
  assert.equal((await app.req('/api/biz')).status, 401);
  assert.equal((await app.login('owner@sunrise.test', 'new-pass-999')).status, 200);
});

test('admin can open a business panel, edit, pause and reset the owner password', async (t) => {
  const { app, bizId } = await onboard(t);
  assert.equal((await app.req('/api/biz')).status, 400);
  assert.equal((await app.req(`/api/biz?b=${bizId}`)).data.name, 'Sunrise Bakery');
  assert.equal((await app.req('/api/biz', { headers: { 'X-Business-Id': bizId } })).data.viewer, 'admin');
  assert.equal((await app.req(`/api/admin/businesses/${bizId}`, { method: 'PUT', body: { status: 'paused', name: 'Sunrise Bakes' } })).status, 200);
  const list = (await app.req('/api/admin/businesses')).data;
  assert.equal(list[0].status, 'paused');
  assert.equal(list[0].name, 'Sunrise Bakes');
  const reset = await app.req(`/api/admin/businesses/${bizId}/reset-password`, { method: 'POST' });
  assert.equal(reset.data.email, 'owner@sunrise.test');
  assert.equal((await app.login('owner@sunrise.test', reset.data.password)).status, 200);
  // Only http(s) websites are stored (a javascript: link would be clickable in the admin panel).
  await app.req(`/api/biz/settings?b=${bizId}`, { method: 'PUT', body: { website: 'javascript:alert(1)', settings: {} } });
  assert.equal((await app.req(`/api/biz?b=${bizId}`)).data.website, '');
  await app.req(`/api/biz/settings?b=${bizId}`, { method: 'PUT', body: { website: 'sunrise.test', settings: {} } });
  assert.equal((await app.req(`/api/biz?b=${bizId}`)).data.website, 'https://sunrise.test');
  // Duplicate owner emails are refused.
  await app.login('admin@example.com', 'admin-pass-123');
  const dup = await app.req('/api/admin/businesses', { method: 'POST', body: { name: 'X', ownerEmail: 'owner@sunrise.test' } });
  assert.equal(dup.status, 409);
});

test('suspended businesses: owner is locked out and the widget is hidden', async (t) => {
  const { app, bizId, key } = await onboard(t);
  await app.req(`/api/admin/businesses/${bizId}`, { method: 'PUT', body: { status: 'suspended' } });
  assert.equal((await app.login('owner@sunrise.test', 'owner-pass-1')).status, 403);
  assert.equal((await fetch(`${app.base}/api/public/bot/${key}`)).status, 404);
});

test('visitor chat streams a reply, stores the conversation and sends knowledge to Claude', async (t) => {
  const { app, key, bizId } = await onboard(t, { script: [text('We open at 8 am every day. Would you like to order?')] });
  await app.req(`/api/biz/sources/text?b=${bizId}`, { method: 'POST', body: { title: 'Timings', content: 'Open 8 am to 9 pm, all days.' } });
  const cfg = await (await fetch(`${app.base}/api/public/bot/${key}`, { headers: { Origin: 'https://anysite.test' } })).json();
  assert.equal(cfg.botName, 'Sunrise Bakery Assistant');

  const r = await chat(app.base, { key, message: 'When do you open?', via: 'voice', visitorId: 'v1', page: { url: 'https://sunrise.test/menu', title: 'Menu', text: 'Cakes and breads' } }, { Origin: 'https://sunrise.test' });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('access-control-allow-origin'), 'https://sunrise.test');
  assert.equal(r.text, 'We open at 8 am every day. Would you like to order?');
  const done = r.events.find((e) => e.type === 'done');
  assert.ok(done);

  const call = app.client.calls[0];
  assert.equal(call.model, 'claude-opus-5-5');
  assert.equal(call.fallbacks, 'default');
  assert.deepEqual(call.betas, ['server-side-fallback-2026-07-01']);
  assert.deepEqual(call.output_config, { effort: 'low' });
  assert.equal(call.system[0].cache_control.type, 'ephemeral');
  assert.match(call.system[0].text, /Open 8 am to 9 pm/);
  const userTurn = call.messages.at(-1).content;
  assert.match(userTurn, /<page_context>[\s\S]*Cakes and breads/);
  assert.match(userTurn, /\(Spoken by the visitor\)\nWhen do you open\?/);

  // A follow-up in the same conversation sends the earlier turns as history.
  const convId = r.events[0].conversationId;
  await chat(app.base, { key, conversationId: convId, message: 'Thanks', page: { url: 'https://sunrise.test/menu' } });
  const second = app.client.calls[1];
  assert.deepEqual(second.messages.slice(0, 2).map((m) => m.role), ['user', 'assistant']);
  assert.equal(second.messages[1].content, 'We open at 8 am every day. Would you like to order?');

  const convs = (await app.req(`/api/biz/conversations?b=${bizId}`)).data;
  assert.equal(convs.length, 1);
  assert.equal(convs[0].used_voice, 1);
  const detail = (await app.req(`/api/biz/conversations/${convId}?b=${bizId}`)).data;
  assert.equal(detail.messages.length, 4);
  assert.equal((await app.req(`/api/biz?b=${bizId}`)).data.stats.usage.messages, 2);
});

test('the assistant saves leads when visitors share contact details', async (t) => {
  const { app, key, bizId } = await onboard(t, {
    script: [toolUse('save_contact_details', { name: 'Asha', phone: '98765 43210', email: '', note: 'Wants a birthday cake on Sunday' }), text('Thanks Asha, the team will call you soon.')],
  });
  const r = await chat(app.base, { key, message: "I'm Asha, 98765 43210, need a birthday cake Sunday" });
  assert.equal(r.text, 'Thanks Asha, the team will call you soon.');
  const second = app.client.calls[1];
  assert.equal(second.messages.at(-1).content[0].type, 'tool_result');
  assert.equal(second.messages.at(-1).content[0].is_error, undefined);
  const leads = (await app.req(`/api/biz/leads?b=${bizId}`)).data;
  assert.equal(leads.length, 1);
  assert.equal(leads[0].phone, '98765 43210');
  const csv = await app.req(`/api/biz/leads.csv?b=${bizId}`);
  assert.match(csv.data, /Asha/);
});

test('public chat: allowed domains, paused bots, limits and bad input', async (t) => {
  const { app, key, bizId } = await onboard(t, { script: [text('Hello!')] });
  await app.req(`/api/biz/settings?b=${bizId}`, { method: 'PUT', body: { settings: { allowedDomains: 'sunrise.test' } } });
  assert.equal((await chat(app.base, { key, message: 'hi' }, { Origin: 'https://evil.test' })).status, 403);
  assert.equal((await chat(app.base, { key, message: 'hi' }, { Origin: 'https://www.sunrise.test' })).status, 200);
  assert.equal((await chat(app.base, { key, message: '' })).status, 400);
  assert.equal((await chat(app.base, { key: 'nope', message: 'hi' })).status, 404);

  // Over the monthly limit: a polite message, no call to Claude.
  await app.req(`/api/admin/businesses/${bizId}`, { method: 'PUT', body: { monthlyLimit: 1 } });
  const calls = app.client.calls.length;
  const over = await chat(app.base, { key, message: 'hi again' }, { Origin: 'https://sunrise.test' });
  assert.match(over.text, /can't chat right now/);
  assert.equal(app.client.calls.length, calls);

  await app.req(`/api/admin/businesses/${bizId}`, { method: 'PUT', body: { status: 'paused' } });
  assert.equal((await chat(app.base, { key, message: 'hi' })).status, 404);
});

test('big knowledge bases are searched instead of sent in full', async (t) => {
  const { app, key, bizId } = await onboard(t, { app: { fullKnowledgeChars: 200 }, script: [text('Delivery is free above 500.')] });
  await app.req(`/api/biz/sources/text?b=${bizId}`, { method: 'POST', body: { title: 'Delivery', content: 'Free home delivery on orders above Rs 500 within 5 km.' } });
  await app.req(`/api/biz/sources/text?b=${bizId}`, { method: 'POST', body: { title: 'Cakes', content: 'Chocolate truffle cake 1 kg costs Rs 900. ' + 'Fresh cream. '.repeat(30) } });
  await chat(app.base, { key, message: 'Do you deliver?' });
  const call = app.client.calls[0];
  assert.doesNotMatch(call.system[0].text, /<knowledge>\n/);
  const turn = call.messages.at(-1).content;
  assert.match(turn, /<knowledge>[\s\S]*Free home delivery/);
  assert.ok(turn.indexOf('Free home delivery') < (turn.indexOf('truffle') === -1 ? Infinity : turn.indexOf('truffle')));
});

test('uploaded files are read: text and .docx directly, PDFs and images by Claude', async (t) => {
  const { app, bizId } = await onboard(t, { script: [text('# Menu\nVeg thali Rs 150')] });
  const docx = makeZip({ 'word/document.xml': '<w:document><w:body><w:p><w:r><w:t>Refunds within 7 days.</w:t></w:r></w:p><w:p><w:r><w:t>No questions asked &amp; free.</w:t></w:r></w:p></w:body></w:document>' });
  const files = [
    { name: 'faq.txt', type: 'text/plain', data: Buffer.from('Q: Parking?\nA: Yes, free.').toString('base64') },
    { name: 'policy.docx', type: '', data: docx.toString('base64') },
    { name: 'menu.png', type: 'image/png', data: Buffer.from('fakepng').toString('base64') },
  ];
  const up = await app.req(`/api/biz/sources/files?b=${bizId}`, { method: 'POST', body: { files } });
  assert.equal(up.status, 201);
  await app.queue.idle();
  const { sources } = (await app.req(`/api/biz/sources?b=${bizId}`)).data;
  const by = Object.fromEntries(sources.map((s) => [s.file_name, s]));
  assert.equal(by['faq.txt'].status, 'ready');
  assert.equal(by['policy.docx'].status, 'ready');
  assert.match((await app.req(`/api/biz/sources/${by['policy.docx'].id}?b=${bizId}`)).data.content, /Refunds within 7 days\.\nNo questions asked & free\./);
  assert.equal(by['menu.png'].status, 'ready');
  assert.match(by['menu.png'].preview, /Veg thali/);
  const imgCall = app.client.calls[0];
  assert.equal(imgCall.messages[0].content[0].type, 'image');
  assert.equal(imgCall.messages[0].content[0].source.media_type, 'image/png');
  // The original file can be downloaded, and unsupported types are refused.
  assert.equal((await app.req(`/api/biz/sources/${by['faq.txt'].id}/file?b=${bizId}`)).data, 'Q: Parking?\nA: Yes, free.');
  const bad = await app.req(`/api/biz/sources/files?b=${bizId}`, { method: 'POST', body: { files: [{ name: 'x.exe', data: 'AAAA' }] } });
  assert.equal(bad.status, 400);
});

test('owner assistant reads attachments, saves knowledge and changes settings', async (t) => {
  const { app, bizId } = await onboard(t, {
    script: [
      (params) => {
        const last = params.messages.at(-1).content;
        assert.equal(last[0].type, 'document'); // the PDF itself goes to Claude
        return { content: [
          { type: 'tool_use', id: 't1', name: 'save_knowledge', input: { title: 'Opening hours', content: 'Open 8 am to 9 pm daily.' } },
          { type: 'tool_use', id: 't2', name: 'update_bot_settings', input: { greeting: 'Namaste! Hungry?' } },
        ] };
      },
      text('Saved your hours and updated the greeting. What areas do you deliver to?'),
    ],
    // The background read of the PDF runs in parallel; answer it separately.
    respond: (params) => (JSON.stringify(params.messages).includes('uploaded by a business owner') ? text('# Price list\nBread Rs 40') : null),
  });
  const r = await app.req(`/api/biz/assistant?b=${bizId}`, {
    method: 'POST',
    body: { text: 'We open 8 to 9 daily. Make the greeting "Namaste! Hungry?"', files: [{ name: 'prices.pdf', type: 'application/pdf', data: Buffer.from('%PDF-1.4 fake').toString('base64') }] },
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.match(r.data.assistant.text, /What areas do you deliver to/);
  assert.deepEqual(r.data.assistant.actions, ['Saved to knowledge: Opening hours', 'Updated assistant settings: greeting']);
  const biz = (await app.req(`/api/biz?b=${bizId}`)).data;
  assert.equal(biz.settings.greeting, 'Namaste! Hungry?');
  await app.queue.idle();
  const { sources } = (await app.req(`/api/biz/sources?b=${bizId}`)).data;
  assert.deepEqual(sources.map((s) => s.type).sort(), ['assistant', 'file']);

  // History is kept, and later turns refer to files by name instead of re-sending them.
  const hist = (await app.req(`/api/biz/assistant?b=${bizId}`)).data;
  assert.equal(hist.length, 2);
  app.client.script.push(text('Noted.'));
  await app.req(`/api/biz/assistant?b=${bizId}`, { method: 'POST', body: { text: 'Within 5 km' } });
  const last = app.client.calls.at(-1);
  assert.match(last.messages[0].content, /\[Attached and added to knowledge: prices\.pdf\]/);
  assert.match(last.system[1].text, /Open 8 am to 9 pm daily/);
});

test('reading a website follows links on the same site and skips repeated boilerplate', async (t) => {
  const site = http.createServer((req, res) => {
    const nav = '<header><p>Sunrise Bakery – fresh daily</p></header>';
    const pages = {
      '/': `<html><head><title>Home</title></head><body>${nav}<h1>Welcome</h1><p>We bake bread and cakes every morning.</p><a href="/about">About</a> <a href="/menu">Menu</a> <a href="https://other.test/x">Out</a></body></html>`,
      '/about': `<html><head><title>About</title></head><body>${nav}<h1>About us</h1><p>Family run since 1998 in Pune.</p></body></html>`,
      '/menu': `<html><head><title>Menu</title></head><body>${nav}<h1>Menu</h1><ul><li>Pav Rs 30</li><li>Truffle cake Rs 900</li></ul><a href="/contact">Contact</a></body></html>`,
      '/contact': `<html><head><title>Contact</title></head><body>${nav}<p>Call us on 98765 43210 &amp; visit 12 MG Road.</p></body></html>`,
    };
    if (pages[req.url]) { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(pages[req.url]); } else { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => site.listen(0, '127.0.0.1', r));
  t.after(() => site.close());
  const { app, bizId } = await onboard(t);
  const url = `http://127.0.0.1:${site.address().port}/`;
  const r = await app.req(`/api/biz/sources/website?b=${bizId}`, { method: 'POST', body: { url } });
  assert.equal(r.status, 202);
  await app.crawls.get(bizId).done;
  const { sources, crawl } = (await app.req(`/api/biz/sources?b=${bizId}`)).data;
  assert.equal(crawl.error, '');
  assert.deepEqual(sources.map((s) => s.title).sort(), ['About', 'Contact', 'Home', 'Menu']);
  const contact = (await app.req(`/api/biz/sources/${sources.find((s) => s.title === 'Contact').id}?b=${bizId}`)).data;
  assert.match(contact.content, /98765 43210 & visit 12 MG Road/);
  assert.doesNotMatch(contact.content, /fresh daily/); // repeated header kept on the first page only
  const menu = (await app.req(`/api/biz/sources/${sources.find((s) => s.title === 'Menu').id}?b=${bizId}`)).data;
  assert.match(menu.content, /- Truffle cake Rs 900/);
  // Reading again replaces the old pages instead of duplicating them.
  await app.req(`/api/biz/sources/website?b=${bizId}`, { method: 'POST', body: { url } });
  await app.crawls.get(bizId).done;
  assert.equal((await app.req(`/api/biz/sources?b=${bizId}`)).data.sources.length, 4);
});

test('website reading refuses private network addresses unless allowed', async (t) => {
  const { app, bizId } = await onboard(t, { app: { allowPrivateUrls: false } });
  const r = await app.req(`/api/biz/sources/website?b=${bizId}`, { method: 'POST', body: { url: 'http://127.0.0.1:9/' } });
  assert.equal(r.status, 400);
  assert.match(r.data.error, /not a public website/);
});

test('widget, demo page, health check and cross-site protection', async (t) => {
  const { app, key } = await onboard(t);
  const w = await fetch(`${app.base}/widget.js`);
  assert.equal(w.status, 200);
  assert.equal(w.headers.get('access-control-allow-origin'), '*');
  const demo = await fetch(`${app.base}/demo/${key}`);
  assert.match(await demo.text(), new RegExp(`data-key="${key}"`));
  assert.equal((await fetch(`${app.base}/healthz`)).status, 200);
  const pre = await fetch(`${app.base}/api/public/chat`, { method: 'OPTIONS', headers: { Origin: 'https://x.test' } });
  assert.equal(pre.status, 204);
  // Panel API calls from another site are refused.
  const x = await app.req('/api/me/password', { method: 'POST', body: {}, headers: { Origin: 'https://evil.test' } });
  assert.equal(x.status, 403);
});
