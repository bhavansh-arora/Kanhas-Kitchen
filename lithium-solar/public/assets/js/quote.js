/* Quote funnel: 7 short steps, live estimate, autosave + resume, slot request, confirmation. */
(function () {
  'use strict';
  var form = document.querySelector('[data-funnel]');
  if (!form || !window.LithiumCalc) return;

  var C = window.LithiumCalc;
  var CFG = window.LITHIUM_CONFIG || {};
  var L = window.Lithium || {};
  var animate = L.animateNumber || function (el, v, f) { el.textContent = f(v); };
  var fill = L.setRangeFill || function () {};
  var KEY = 'li-quote';
  var TOTAL = 7;
  var steps = Array.prototype.slice.call(form.querySelectorAll('.fstep'));
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var RANGES = { home: { min: 50, max: 1000, step: 10, def: 250 }, business: { min: 200, max: 15000, step: 50, def: 2500 } };

  var state = load();
  var current = 1;
  var savedTimer;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function save(silent) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    if (silent) return;
    var s = $('[data-saved]');
    if (s) { s.style.opacity = 1; clearTimeout(savedTimer); savedTimer = setTimeout(function () { s.style.opacity = 0; }, 1600); }
  }

  /* ---------- Read / write form ---------- */
  function readForm() {
    var fd = new FormData(form);
    state.type = fd.get('type') || state.type;
    state.bill = +$('#f-bill').value;
    state.goals = fd.getAll('goals');
    ['own', 'shade', 'timeline', 'street', 'city', 'zip', 'window', 'name', 'phone', 'email', 'method'].forEach(function (k) {
      var v = fd.get(k);
      if (v != null) state[k] = String(v).trim();
    });
    state.callFirst = !!fd.get('callFirst');
    state.consent = !!fd.get('consent');
  }
  function writeForm() {
    if (state.type) { var t = form.querySelector('input[name="type"][value="' + state.type + '"]'); if (t) t.checked = true; }
    applyRange();
    (state.goals || []).forEach(function (g) { var i = form.querySelector('input[name="goals"][value="' + g + '"]'); if (i) i.checked = true; });
    ['own', 'shade', 'timeline', 'window', 'method'].forEach(function (k) {
      if (!state[k]) return;
      var i = form.querySelector('input[name="' + k + '"][value="' + state[k] + '"]');
      if (i) i.checked = true;
    });
    ['street', 'city', 'zip', 'name', 'phone', 'email'].forEach(function (k) { if (state[k]) form.elements[k].value = state[k]; });
    if (state.callFirst) form.elements.callFirst.checked = true;
    if (state.consent) form.elements.consent.checked = true;
  }
  function applyRange() {
    var r = RANGES[state.type === 'business' ? 'business' : 'home'];
    var range = $('#f-bill');
    range.min = r.min; range.max = r.max; range.step = r.step;
    if (!state.bill || state.bill < r.min || state.bill > r.max) state.bill = r.def;
    range.value = state.bill;
    $('[data-f-min]').textContent = C.money(r.min);
    $('[data-f-max]').textContent = C.money(r.max) + '+';
  }

  /* ---------- Days for the site visit ---------- */
  function buildDays() {
    var wrap = $('[data-days]');
    var d = new Date();
    var out = [];
    while (out.length < 10) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() === 0) continue; // Sundays off
      out.push(new Date(d));
    }
    var wd = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
    var mo = new Intl.DateTimeFormat('en-US', { month: 'short' });
    wrap.innerHTML = '';
    out.forEach(function (day) {
      var iso = day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'day';
      b.setAttribute('data-date', iso);
      b.setAttribute('aria-pressed', String(state.date === iso));
      b.setAttribute('aria-label', day.toDateString());
      b.innerHTML = '<span class="label">' + wd.format(day) + '</span><b>' + day.getDate() + '</b><span class="label">' + mo.format(day) + '</span>';
      b.addEventListener('click', function () {
        state.date = iso;
        $$('.day', wrap).forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        clearErr('slot');
        refresh();
      });
      wrap.appendChild(b);
    });
    if (state.date && !wrap.querySelector('[data-date="' + state.date + '"]')) state.date = null;
  }
  function slotText() {
    if (state.callFirst && !(state.date && state.window)) return 'Call me first';
    if (!state.date) return '';
    var p = state.date.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    var f = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(d);
    return f + (state.window ? ', ' + state.window : '');
  }

  /* ---------- Live estimate + summary ---------- */
  function refresh() {
    readForm();
    var r = C.estimate(state.bill);
    var range = $('#f-bill');
    fill(range);
    $('[data-f-bill]').textContent = C.money(state.bill);
    animate($('[data-f-out="year1"]'), r.year1, function (v) { return C.money(v); });
    animate($('[data-f-out="kw"]'), r.systemKw, function (v) { return v.toFixed(1) + ' kW'; });
    animate($('[data-f-out="payback"]'), r.payback || 0, function (v) { return v.toFixed(1) + ' yrs'; });
    var hasBill = current >= 2 || state.bill;
    animate($('[data-s="net"]'), hasBill ? r.net : 0, function (v) { return C.money(v); });
    $('[data-s="bill"]').textContent = state.bill ? C.money(state.bill) + '/mo' : '—';
    $('[data-s="kw"]').textContent = r.systemKw.toFixed(1) + ' kW';
    $('[data-s="panels"]').textContent = r.panels + ' × ' + C.defaults.panelWatts + 'W';
    $('[data-s="goals"]').textContent = state.goals && state.goals.length ? state.goals.join(', ') : '—';
    $('[data-s="zip"]').textContent = state.zip ? [state.city, state.zip].filter(Boolean).join(' ') : '—';
    $('[data-s="slot"]').textContent = slotText() || '—';
    $('[data-type-chip]').textContent = state.type === 'business' ? 'Business' : state.type === 'home' ? 'Home' : '—';
    state.estimate = { net: Math.round(r.net), kw: +r.systemKw.toFixed(1), panels: r.panels, year1: Math.round(r.year1), payback: r.payback ? +r.payback.toFixed(1) : null };
    save(true);
  }

  /* ---------- Validation ---------- */
  function err(key, msg) { var e = form.querySelector('[data-err="' + key + '"]'); if (e) e.textContent = msg; var inp = form.elements[key]; if (inp && inp.classList) inp.classList.add('is-invalid'); }
  function clearErr(key) { var e = form.querySelector('[data-err="' + key + '"]'); if (e) e.textContent = ''; var inp = form.elements[key]; if (inp && inp.classList) inp.classList.remove('is-invalid'); }
  function validate(n) {
    readForm();
    $$('[data-err]', steps[n - 1]).forEach(function (e) { e.textContent = ''; });
    $$('.is-invalid', steps[n - 1]).forEach(function (e) { e.classList.remove('is-invalid'); });
    var ok = true;
    if (n === 1 && !state.type) { err('type', 'Choose home or business to continue.'); ok = false; }
    if (n === 3 && !(state.goals && state.goals.length)) { err('goals', 'Pick at least one. You can choose several.'); ok = false; }
    if (n === 4 && (!state.own || !state.shade || !state.timeline)) { err('details', 'Please answer all three. Any answer is fine.'); ok = false; }
    if (n === 5) {
      if (!state.street || state.street.length < 4) { err('street', 'Add the street address for your site visit.'); ok = false; }
      if (!/^\d{5}$/.test(state.zip || '')) { err('zip', 'Enter a 5-digit ZIP code.'); ok = false; }
    }
    if (n === 6 && !state.callFirst && !(state.date && state.window)) { err('slot', 'Pick a day and a time window, or tick “call me first”.'); ok = false; }
    if (n === 7) {
      if (!state.name || state.name.length < 2) { err('name', 'Please add your name.'); ok = false; }
      var digits = (state.phone || '').replace(/\D/g, '');
      if (digits.length < 10) { err('phone', 'Add a 10-digit phone number.'); ok = false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(state.email || '')) { err('email', 'Add a valid email address.'); ok = false; }
      if (!state.consent) { err('consent', 'Please tick the box so we can contact you.'); ok = false; }
    }
    if (!ok) {
      var first = steps[n - 1].querySelector('.is-invalid') || steps[n - 1].querySelector('input');
      if (first && first.focus) first.focus({ preventScroll: true });
    }
    return ok;
  }

  function zipNote() {
    var note = $('[data-zip-note]');
    var z = (form.elements.zip.value || '').trim();
    if (!/^\d{5}$/.test(z)) { note.classList.remove('is-visible'); return; }
    var n = +z.slice(0, 3);
    var inSoCal = n >= 900 && n <= 935;
    note.classList.add('is-visible');
    note.classList.toggle('is-warn', !inSoCal);
    $('span', note).textContent = inSoCal ? 'You’re in our Southern California service area.' : 'We’re based in Southern California. We’ll confirm we can serve your area.';
  }

  /* ---------- Navigation ---------- */
  function go(n, opts) {
    n = Math.max(1, Math.min(TOTAL, n));
    var prev = steps[current - 1];
    var next = steps[n - 1];
    current = n;
    state.step = n;
    save(true);
    var swap = function () {
      steps.forEach(function (s) { s.classList.toggle('is-active', s === next); });
      $('[data-step-count]').textContent = 'Step ' + String(n).padStart(2, '0') + ' / ' + String(TOTAL).padStart(2, '0');
      $('[data-step-name]').textContent = next.getAttribute('data-name');
      $('[data-bar]').style.width = ((n - 1) / TOTAL * 100 + 100 / TOTAL / 2) + '%';
      $('[data-back]').hidden = n === 1;
      $('[data-next-label]').textContent = n === TOTAL ? 'Book free assessment' : 'Continue';
      if (window.gsap && !reduce && prev !== next) {
        gsap.fromTo(next.children, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.05, ease: 'expo.out', clearProps: 'transform' });
      }
      if (!(opts && opts.noScroll)) {
        var top = document.querySelector('.funnel').getBoundingClientRect().top + window.scrollY;
        if (window.scrollY > top + 40) (L.scrollTo || window.scrollTo.bind(window))(0);
      }
      var focusEl = next.querySelector('h1, h2');
      if (focusEl && !(opts && opts.noFocus)) { focusEl.setAttribute('tabindex', '-1'); focusEl.focus({ preventScroll: true }); }
      refresh();
    };
    if (window.gsap && !reduce && prev !== next) gsap.to(prev.children, { opacity: 0, y: -16, duration: 0.25, stagger: 0.02, ease: 'power2.in', onComplete: function () { gsap.set(prev.children, { clearProps: 'all' }); swap(); } });
    else swap();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate(current)) return;
    save();
    if (current < TOTAL) go(current + 1);
    else submit();
  });
  $('[data-back]').addEventListener('click', function () { go(current - 1); });
  form.addEventListener('input', function (e) {
    if (e.target.name === 'zip') { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5); zipNote(); }
    if (e.target.name && e.target.classList.contains('is-invalid')) clearErr(e.target.name);
    refresh();
  });
  form.addEventListener('change', function (e) {
    if (e.target.name === 'type') { readForm(); state.bill = null; applyRange(); refresh(); }
    if (e.target.hasAttribute('data-auto') && e.target.checked) { save(); setTimeout(function () { go(current + 1); }, 320); }
    var stepErr = { goals: 'goals', own: 'details', shade: 'details', timeline: 'details', window: 'slot', callFirst: 'slot', consent: 'consent', type: 'type' }[e.target.name];
    if (stepErr) clearErr(stepErr);
    save();
  });

  /* ---------- Submit ---------- */
  function makeRef() {
    var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var s = 'LI-';
    for (var i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  }
  function summaryText(p) {
    return [
      'New solar quote request: ' + p.ref,
      '',
      'Name: ' + p.name,
      'Phone: ' + p.phone,
      'Email: ' + p.email,
      'Prefers: ' + p.method,
      '',
      'Property: ' + (p.type === 'business' ? 'Business' : 'Home') + ' (' + (p.own || '') + ')',
      'Address: ' + [p.street, p.city, p.zip].filter(Boolean).join(', '),
      'Monthly bill: ' + C.money(p.bill),
      'Goals: ' + (p.goals || []).join(', '),
      'Roof sun: ' + (p.shade || ''),
      'Timeline: ' + (p.timeline || ''),
      'Site visit: ' + (p.slot || ''),
      '',
      'Estimate: ' + p.estimate.kw + ' kW, ' + p.estimate.panels + ' panels, ~' + C.money(p.estimate.year1) + ' year-one savings, ~' + C.money(p.estimate.net) + ' 25-year net.'
    ].join('\n');
  }
  function mailto(p) {
    return 'mailto:' + (CFG.leadEmail || 'rowan@socalenergy.info') + '?subject=' + encodeURIComponent('Solar quote request ' + p.ref + ' — ' + p.name) + '&body=' + encodeURIComponent(summaryText(p));
  }

  function submit() {
    readForm();
    var btn = $('[data-next]');
    btn.disabled = true;
    $('[data-next-label]').textContent = 'Sending…';
    var payload = {
      ref: makeRef(),
      createdAt: new Date().toISOString(),
      type: state.type, bill: state.bill, goals: state.goals, own: state.own, shade: state.shade, timeline: state.timeline,
      street: state.street, city: state.city, zip: state.zip,
      date: state.date || null, window: state.window || null, callFirst: state.callFirst, slot: slotText(),
      name: state.name, phone: state.phone, email: state.email, method: state.method,
      estimate: state.estimate, source: location.href
    };
    var done = function (sent) { finish(payload, sent); };
    if (CFG.formEndpoint) {
      fetch(CFG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) })
        .then(function (res) { done(res.ok); })
        .catch(function () { done(false); });
    } else {
      done(null);
    }
  }

  function finish(p, sent) {
    // Keep the project so the tracker can find it on this device.
    try {
      var projects = JSON.parse(localStorage.getItem('li-projects') || '{}');
      projects[p.ref] = { ref: p.ref, zip: p.zip, name: p.name, createdAt: p.createdAt, slot: p.slot, type: p.type, estimate: p.estimate, stage: 1 };
      localStorage.setItem('li-projects', JSON.stringify(projects));
      localStorage.removeItem(KEY);
    } catch (e) {}

    $('[data-done-ref]').textContent = p.ref;
    $('[data-done-slot]').textContent = p.slot || 'We’ll call to schedule';
    $('[data-done-net]').textContent = C.money(p.estimate.net);
    $('[data-track-link]').href = 'track.html?code=' + encodeURIComponent(p.ref) + '&zip=' + encodeURIComponent(p.zip);
    var first = (p.name || '').split(' ')[0];
    var fb = $('[data-fallback]');
    $('[data-mailto]').href = mailto(p);
    if (sent === true) {
      $('[data-done-lead]').textContent = 'Thanks' + (first ? ', ' + first : '') + '. Your consultant will confirm your site assessment by ' + (p.method || 'text').toLowerCase() + ' shortly. Save your tracking code to check progress any time.';
    } else if (sent === null) {
      $('[data-done-kicker]').textContent = 'Request ready';
      $('[data-done-title]').innerHTML = 'One last <em>tap.</em>';
      $('[data-done-lead]').textContent = 'Thanks' + (first ? ', ' + first : '') + '. Your email app has opened with your request filled in. Press send and Lithium will confirm your site assessment by ' + (p.method || 'text').toLowerCase() + '.';
      fb.hidden = false;
      window.location.href = mailto(p);
    } else {
      $('[data-done-kicker]').textContent = 'Connection problem';
      $('[data-done-title]').innerHTML = 'Almost <em>there.</em>';
      $('[data-done-lead]').textContent = 'We couldn’t reach our server just now, so nothing has been lost: send your request by email with one tap below, or call us.';
      fb.hidden = false;
    }

    $('[data-ics]').onclick = function () { downloadIcs(p); };

    form.style.display = 'none';
    $('.funnel__progress').style.display = 'none';
    $('[data-resume]').classList.remove('is-visible');
    var d = $('[data-done]');
    d.classList.add('is-active');
    $('[data-s="slot"]').textContent = p.slot || '—';
    if (window.gsap && !reduce) gsap.from(d.children, { opacity: 0, y: 30, duration: 0.9, stagger: 0.06, ease: 'expo.out' });
    (L.scrollTo || window.scrollTo.bind(window))(0);
    d.focus({ preventScroll: true });
  }

  function downloadIcs(p) {
    var start = '0900', end = '1000';
    var map = { '8–10 AM': ['0800', '1000'], '10 AM–12 PM': ['1000', '1200'], '12–2 PM': ['1200', '1400'], '2–4 PM': ['1400', '1600'] };
    if (map[p.window]) { start = map[p.window][0]; end = map[p.window][1]; }
    var day = (p.date || new Date(Date.now() + 86400000).toISOString().slice(0, 10)).replace(/-/g, '');
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    var ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lithium LLC//Quote//EN', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:' + p.ref + '@lisolarenergy.com',
      'DTSTAMP:' + stamp,
      'DTSTART;TZID=America/Los_Angeles:' + day + 'T' + start + '00',
      'DTEND;TZID=America/Los_Angeles:' + day + 'T' + end + '00',
      'SUMMARY:Lithium free solar site assessment (requested)',
      'LOCATION:' + [p.street, p.city, p.zip].filter(Boolean).join(', ').replace(/,/g, '\\,'),
      'DESCRIPTION:Tracking code ' + p.ref + '. Lithium will confirm the exact time. Questions: (951) 662-6748.',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'lithium-site-assessment.ics';
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- Resume ---------- */
  function initResume() {
    var banner = $('[data-resume]');
    var resumeAt = state.step;
    if (resumeAt && resumeAt > 1 && state.type) {
      banner.classList.add('is-visible');
      $('[data-resume-step]').textContent = 'You were on step ' + resumeAt + ' of ' + TOTAL + '.';
      $('[data-resume-go]').addEventListener('click', function () { banner.classList.remove('is-visible'); go(resumeAt); });
    }
    $('[data-restart]').addEventListener('click', function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      state = {};
      form.reset();
      banner.classList.remove('is-visible');
      applyRange();
      buildDays();
      go(1);
    });
  }

  // Prefill from the URL (e.g. links from the home or savings page).
  var qs = new URLSearchParams(location.search);
  if (qs.get('type') === 'home' || qs.get('type') === 'business') state.type = qs.get('type');
  if (qs.get('bill')) state.bill = +qs.get('bill');

  buildDays();
  writeForm();
  zipNote();
  initResume();
  go(1, { noScroll: true, noFocus: true });
})();
