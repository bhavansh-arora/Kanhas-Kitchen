/* Enrolment flow: programs → school → schedule → payment → confirmation.
   Demo mode: nothing is charged or emailed. The finished enrolment is saved in the
   browser so it shows up in the admin preview (dashboard.html).
   In production, submit() posts to the enrolment endpoint (Stripe for cards,
   invoice/PO records for the rest) and sends confirmation emails. */
(function () {
  'use strict';
  var DC = window.DC, UI = window.DCUI, Cart = UI.Cart, Cal = window.DCCalendar;
  var root = UI.$('[data-enrol]');
  if (!root) return;

  var form = UI.$('[data-enrol-form]');
  var steps = UI.$$('.estep', root);
  var stepBtns = UI.$$('[data-goto]', root);
  var current = 0, maxReached = 0;
  var induction = { date: null, time: null };
  var draft = UI.store.get('dc-enrol-draft', {});

  /* ---------- Terms ---------- */
  var termsEl = UI.$('[data-terms]');
  var year = new Date().getMonth() >= 9 ? new Date().getFullYear() + 1 : new Date().getFullYear();
  var termOpts = ['As soon as possible', 'Term 1 ' + year, 'Term 2 ' + year, 'Term 3 ' + year, 'Term 4 ' + year];
  termsEl.innerHTML = termOpts.map(function (t, i) {
    return '<label class="choice"><input type="radio" name="term" value="' + t + '"' + (i === 0 ? ' checked' : '') + '><span>' + t + '</span></label>';
  }).join('');

  /* ---------- Restore draft (per-browser convenience) ---------- */
  Object.keys(draft).forEach(function (k) {
    var el = form.elements[k];
    if (!el || /card|exp|cvc|terms/.test(k)) return;
    if (el instanceof RadioNodeList) { UI.$$('input[name="' + k + '"]', form).forEach(function (r) { r.checked = r.value === draft[k]; }); }
    else if (el.type === 'checkbox') el.checked = !!draft[k];
    else el.value = draft[k];
  });
  form.addEventListener('input', saveDraft);
  form.addEventListener('change', saveDraft);
  function saveDraft() {
    var out = {};
    ['school', 'state', 'postcode', 'sector', 'name', 'role', 'email', 'phone', 'students', 'classes', 'small', 'term', 'notes', 'method', 'finance', 'po', 'poemail'].forEach(function (k) {
      var el = form.elements[k];
      if (!el) return;
      out[k] = el.type === 'checkbox' ? el.checked : el.value;
    });
    UI.store.set('dc-enrol-draft', out);
  }

  /* ---------- Step 1: lines + quick add ---------- */
  function eventDateFor(id) {
    var reqs = UI.store.get('dc-event-dates', {});
    return reqs[id] ? reqs[id].label + ' · ' + Cal.format(new Date(reqs[id].date), false) : null;
  }

  function renderLines() {
    var t = Cart.totals();
    var linesEl = UI.$('[data-enrol-lines]');
    if (!t.ids.length) {
      linesEl.innerHTML = '<div class="empty"><div class="empty__icon">' + UI.icon('cart') + '</div><strong>No programs yet</strong><p>Add one below or browse the full catalogue.</p></div>';
    } else {
      linesEl.innerHTML = '<div class="lines">' + t.ids.map(function (id) {
        var html = UI.lineHTML(DC.byId(id));
        var ev = eventDateFor(id);
        return ev ? html.replace('</div></div><div class="line__price">', ' · <strong style="color:var(--pink)">' + UI.esc(ev) + '</strong></div></div><div class="line__price">') : html;
      }).join('') + '</div>' + UI.upsellHTML(t);
    }
    UI.$('[data-quick-add]').innerHTML = DC.programs.filter(function (p) { return p.price !== 0; }).map(function (p) {
      var on = t.ids.indexOf(p.id) > -1;
      return '<button type="button" class="qa' + (on ? ' is-in' : '') + '" data-qa="' + p.id + '" aria-pressed="' + on + '"><span>' + UI.esc(p.name === 'Online Foundation' ? 'Online · ' + p.variant : p.name) + '<small>' + (p.price === null ? 'Quote' : DC.money(p.price)) + '</small></span>' + UI.icon(on ? 'check' : 'plus') + '</button>';
    }).join('');
    renderSummary();
    UI.$('[data-induction]').style.display = hasOnline() ? '' : 'none';
  }

  UI.$('[data-quick-add]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-qa]');
    if (!b) return;
    var id = b.getAttribute('data-qa');
    Cart.has(id) ? Cart.remove(id) : Cart.add(id);
  });

  function hasOnline() { return Cart.get().some(function (id) { return DC.byId(id).mode === 'online'; }); }

  /* ---------- Summary ---------- */
  function renderSummary() {
    var t = Cart.totals();
    var method = (form.elements.method && form.elements.method.value) || 'card';
    UI.$('[data-sum-lines]').innerHTML = t.ids.length ? t.ids.map(function (id) {
      var p = DC.byId(id);
      return '<div class="summary__line"><span>' + UI.esc(p.name + ' · ' + p.variant) + '</span><strong>' + (p.price === null ? 'Quote' : DC.money(p.price)) + '</strong></div>';
    }).join('') : '<div class="summary__line"><span>Nothing added yet</span><strong>&mdash;</strong></div>';
    UI.$('[data-sum-total]').textContent = DC.money(t.paid).replace('Free', '$0');
    UI.$('[data-sum-label]').textContent = t.paid === 0 ? 'Due today' : (method === 'card' ? 'Due today' : 'Invoice total');
    UI.$('[data-sum-note]').textContent = (t.quotes ? t.quotes + ' program' + (t.quotes > 1 ? 's' : '') + ' will be quoted separately. ' : '') + 'All prices in AUD.';
    var submitTxt = UI.$('[data-submit] .btn__text');
    var label = t.paid > 0 && method === 'card' ? 'Pay ' + DC.money(t.paid) + ' & enrol' : (t.paid > 0 ? 'Enrol & send invoice' : 'Send enrolment');
    submitTxt.textContent = label; submitTxt.setAttribute('data-text', label);
    var payBlock = UI.$('[data-pay-block]');
    payBlock.style.display = t.paid > 0 ? '' : 'none';
    UI.$('[data-pay-title]').textContent = t.paid > 0 ? 'How would you like to pay?' : 'Ready to send';
    UI.$('[data-pay-sub]').textContent = t.paid > 0 ? 'Schools pay in all sorts of ways. Choose what works for your finance office.' : 'Nothing to pay today. Amy will reply with your tailored quote and dates.';
  }

  /* ---------- Step 3: induction booking ---------- */
  var slotsEl = UI.$('[data-induction-slots]');
  Cal.create(UI.$('[data-induction-cal]'), {
    mode: 'slot',
    months: 3,
    onSelect: function (d) { induction.date = d; induction.time = null; Cal.renderSlots(slotsEl, d, null); }
  });
  Cal.renderSlots(slotsEl, null);
  slotsEl.addEventListener('click', function (e) {
    var s = e.target.closest('[data-slot]');
    if (!s) return;
    induction.time = s.getAttribute('data-slot');
    Cal.renderSlots(slotsEl, induction.date, induction.time);
    UI.toast('Induction: ' + Cal.format(induction.date, false) + ' at ' + induction.time);
  });

  /* ---------- Payment method panels + card formatting ---------- */
  form.addEventListener('change', function (e) {
    if (e.target.name === 'method') {
      UI.$$('[data-pay-panel]').forEach(function (p) { p.classList.toggle('is-active', p.getAttribute('data-pay-panel') === e.target.value); });
      renderSummary();
    }
  });
  var card = form.elements.card, exp = form.elements.exp;
  card.addEventListener('input', function () { card.value = card.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '); });
  exp.addEventListener('input', function () { var v = exp.value.replace(/\D/g, '').slice(0, 4); exp.value = v.length > 2 ? v.slice(0, 2) + ' / ' + v.slice(2) : v; });

  /* ---------- Validation ---------- */
  function setErr(el, bad) {
    var f = el.closest('.field');
    el.classList.toggle('is-invalid', bad);
    if (f) f.classList.toggle('has-error', bad);
    return !bad;
  }
  var emailOk = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); };

  function validate(i) {
    var ok = true, first = null;
    function check(el, bad) { if (!setErr(el, bad)) { ok = false; first = first || el; } }
    if (i === 0 && !Cart.get().length) { UI.toast('Add at least one program to continue.'); return false; }
    if (i === 1) {
      var f = form.elements;
      check(f.school, !f.school.value.trim());
      check(f.state, !f.state.value);
      check(f.postcode, f.postcode.value !== '' && !/^\d{4}$/.test(f.postcode.value));
      check(f.name, !f.name.value.trim());
      check(f.email, !emailOk(f.email.value));
    }
    if (i === 3) {
      var t = Cart.totals(), m = form.elements.method.value, g = form.elements;
      if (t.paid > 0 && m === 'card') {
        check(g.cardname, !g.cardname.value.trim());
        check(g.card, g.card.value.replace(/\s/g, '').length < 15);
        check(g.exp, !/^(0[1-9]|1[0-2]) \/ \d{2}$/.test(g.exp.value));
        check(g.cvc, !/^\d{3,4}$/.test(g.cvc.value));
      }
      if (t.paid > 0 && m === 'invoice') check(g.finance, !emailOk(g.finance.value));
      if (t.paid > 0 && m === 'po') { check(g.po, !g.po.value.trim()); check(g.poemail, !emailOk(g.poemail.value)); }
      var terms = UI.$('[data-terms-check]');
      UI.$('[data-terms-error]').style.display = terms.checked ? 'none' : 'block';
      if (!terms.checked) { ok = false; first = first || terms; }
    }
    if (first) first.focus();
    return ok;
  }
  form.addEventListener('input', function (e) { if (e.target.classList.contains('is-invalid')) setErr(e.target, false); });

  /* ---------- Navigation ---------- */
  function go(i, skipScroll) {
    current = i;
    maxReached = Math.max(maxReached, i);
    steps.forEach(function (s, n) { s.classList.toggle('is-active', n === i); });
    stepBtns.forEach(function (b, n) {
      b.classList.toggle('is-current', n === i);
      b.classList.toggle('is-done', n < i || (n <= maxReached && n !== i && i < 4));
      b.disabled = i === 4;
    });
    UI.$('[data-stepper]').style.display = i === 4 ? 'none' : '';
    if (!skipScroll) {
      var top = UI.$('[data-stepper]').getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: i === 4 ? top + 20 : top, behavior: 'smooth' });
    }
  }
  root.addEventListener('click', function (e) {
    if (e.target.closest('[data-next]')) { if (validate(current)) go(current + 1); return; }
    if (e.target.closest('[data-prev]')) { go(current - 1); return; }
    var g = e.target.closest('[data-goto]');
    if (g) {
      var to = +g.getAttribute('data-goto');
      if (to <= maxReached || (to === current + 1 && validate(current))) go(to);
    }
  });

  /* ---------- Submit ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    for (var i = 0; i < 4; i++) {
      if (!validate(i)) { if (i !== current) go(i); return; }
    }
    var t = Cart.totals(), f = form.elements;
    var method = t.paid > 0 ? f.method.value : 'quote';
    var ref = 'DC-' + String(Date.now()).slice(-6);
    var record = {
      ref: ref,
      created: new Date().toISOString(),
      school: f.school.value.trim(),
      state: f.state.value,
      sector: f.sector.value,
      contact: f.name.value.trim(),
      email: f.email.value.trim(),
      items: t.ids,
      total: t.paid,
      quotes: t.quotes,
      method: method,
      status: method === 'card' ? 'paid' : method,
      small: f.small.checked,
      term: f.term.value,
      induction: induction.date && induction.time ? { date: induction.date.toISOString(), time: induction.time } : null
    };
    var all = UI.store.get('dc-enrolments', []);
    all.unshift(record);
    UI.store.set('dc-enrolments', all);

    var btn = UI.$('[data-submit]');
    btn.classList.add('is-disabled');
    UI.$('.btn__text', btn).textContent = 'Processing…';
    setTimeout(function () { done(record); }, 1100);
  });

  function icsFor(rec) {
    var d = new Date(rec.induction.date);
    var m = rec.induction.time.match(/(\d+):(\d+)\s*(am|pm)/);
    var h = +m[1] % 12 + (m[3] === 'pm' ? 12 : 0);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var stamp = function (hh, mm) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(hh) + pad(mm) + '00'; };
    var endM = +m[2] + 30, endH = h + Math.floor(endM / 60);
    var body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dance Cart//Enrolment//EN', 'BEGIN:VEVENT',
      'UID:' + rec.ref + '@dancecart.com.au', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
      'DTSTART;TZID=Australia/Brisbane:' + stamp(h, +m[2]), 'DTEND;TZID=Australia/Brisbane:' + stamp(endH, endM % 60),
      'SUMMARY:Dance Cart Zoom induction', 'DESCRIPTION:Your 30 minute Dance Cart induction. Zoom link to follow by email. Ref ' + rec.ref,
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body);
  }

  function done(rec) {
    var first = rec.contact.split(' ')[0];
    var steps = [];
    if (rec.method === 'card') steps.push(['Lessons unlocked', 'Login details are on their way to ' + rec.email + '.']);
    if (rec.method === 'invoice') steps.push(['Invoice sent', 'A tax invoice goes to your finance office. Lessons unlock straight away.']);
    if (rec.method === 'po') steps.push(['Purchase order received', 'We’ll invoice against your PO. Lessons unlock straight away.']);
    if (rec.quotes) steps.push(['Tailored quote', 'Amy will reply with dates and a quote for your in-school or event program.']);
    if (rec.induction) steps.push(['Zoom induction booked', Cal.format(new Date(rec.induction.date)) + ' at ' + rec.induction.time + ' (AEST).']);
    else if (rec.items.some(function (id) { return DC.byId(id).mode === 'online'; })) steps.push(['Book your induction', 'Pick a time for your 30 minute Zoom induction from your welcome email.']);
    if (rec.small) steps.push(['Small-school support', 'Amy will be in touch about flexible pricing and grants.']);

    UI.$('[data-done]').innerHTML =
      '<div class="done__icon">' + UI.icon('check') + '</div>' +
      '<p class="label" style="justify-content:center;display:flex">You’re in</p>' +
      '<h2 class="h2" style="margin-top:16px">Let’s dance, <em>' + UI.esc(first) + '!</em></h2>' +
      '<p class="lead muted" style="margin:20px auto 0;max-width:46ch">' + UI.esc(rec.school) + ' is enrolled. A confirmation is on its way to ' + UI.esc(rec.email) + '.</p>' +
      '<span class="done__ref">Ref ' + rec.ref + '</span>' +
      '<ol class="done__next">' + steps.map(function (s, i) { return '<li><span>0' + (i + 1) + '</span><div><strong>' + UI.esc(s[0]) + '</strong><p>' + UI.esc(s[1]) + '</p></div></li>'; }).join('') + '</ol>' +
      '<div class="done__btns">' +
        (rec.induction ? '<a class="btn btn--dark" href="' + icsFor(rec) + '" download="dance-cart-induction.ics"><span class="btn__text" data-text="Add induction to calendar">Add induction to calendar</span><span class="btn__icon">' + UI.icon('calendar') + '</span></a>' : '') +
        '<a class="btn btn--ghost" href="dashboard.html"><span class="btn__text" data-text="See it in the admin preview">See it in the admin preview</span></a>' +
      '</div>';
    Cart.clear();
    try { localStorage.removeItem('dc-event-dates'); localStorage.removeItem('dc-enrol-draft'); } catch (e) {}
    UI.$('[data-enrol-aside]').style.display = 'none';
    UI.$('.enrol__main').style.gridColumn = '1 / -1';
    go(4);
    confetti();
  }

  /* ---------- Confetti ---------- */
  function confetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var c = document.createElement('canvas');
    c.className = 'confetti';
    document.body.appendChild(c);
    var ctx = c.getContext('2d'), W = c.width = innerWidth, H = c.height = innerHeight;
    var colors = ['#ea097f', '#f15a29', '#ffc83d', '#3ddc97', '#ff2e93', '#fff6ec'];
    var parts = [];
    for (var i = 0; i < 160; i++) parts.push({ x: W / 2 + (Math.random() - 0.5) * 200, y: H * 0.35, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 16 - 4, s: Math.random() * 8 + 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[i % colors.length], star: i % 5 === 0 });
    var t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, W, H);
      parts.forEach(function (p) {
        p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        if (p.star) { ctx.beginPath(); for (var k = 0; k < 10; k++) { var rad = k % 2 ? p.s * 0.45 : p.s; var a = k * Math.PI / 5; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } ctx.fill(); }
        else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      });
      if (t - t0 < 3600) requestAnimationFrame(frame); else c.remove();
    })(t0);
  }

  Cart.subscribe(renderLines);
  renderLines();
  go(0, true);
})();
