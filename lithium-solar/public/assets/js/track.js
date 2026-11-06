/* Project tracker. Reads projects saved on this device by the quote funnel, plus a sample project.
   To go live, point LITHIUM_CONFIG.trackEndpoint at a URL that returns { ref, title, stage, notes, dates } for ?code=&zip=. */
(function () {
  'use strict';
  var form = document.querySelector('[data-track-form]');
  if (!form) return;
  var CFG = window.LITHIUM_CONFIG || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s) { return document.querySelector(s); };

  var STAGES = [
    { name: 'Consultation', done: 'Needs reviewed, site assessed, proposal delivered.', now: 'Your site assessment is being scheduled.' },
    { name: 'Engineering & design', done: 'System designed and specs approved.', now: 'Engineers are finalizing your system design.' },
    { name: 'Permitting', done: 'Permits approved by your city.', now: 'Plans submitted and under city review.' },
    { name: 'Installation', done: 'System installed and quality-checked.', now: 'Install crew booked. Typically 1–3 days on site.' },
    { name: 'Inspection', done: 'Passed inspection and utility review.', now: 'Final inspection and utility coordination underway.' },
    { name: 'Permission to operate', done: 'Live and producing power.', now: 'Waiting on final utility approval to switch on.' }
  ];

  var fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d; }
  function daysAhead(n) { var d = new Date(); d.setDate(d.getDate() + n); return d; }

  var SAMPLE = {
    ref: 'LI-SAMPLE', zip: '92399', title: '8.2 kW home system + battery', stage: 3,
    dates: [daysAgo(26), daysAgo(15), daysAgo(6)],
    next: 'Typical city review: 2–4 weeks',
    note: 'Plans were submitted to the city ' + fmt.format(daysAgo(6)) + '. No action needed from you. We’ll text you the moment the permit is approved and lock in your install date.',
    status: 'On track'
  };

  function lookup(code, zip) {
    code = (code || '').trim().toUpperCase();
    zip = (zip || '').trim();
    if (code === 'LI-SAMPLE' || code === 'SAMPLE') return SAMPLE;
    try {
      var projects = JSON.parse(localStorage.getItem('li-projects') || '{}');
      var p = projects[code];
      if (p && (!zip || p.zip === zip)) {
        var created = new Date(p.createdAt);
        return {
          ref: p.ref, zip: p.zip, stage: 1,
          title: (p.estimate ? p.estimate.kw + ' kW ' : '') + (p.type === 'business' ? 'business system' : 'home system'),
          dates: [created],
          note: 'Request received ' + fmt.format(created) + '. ' + (p.slot && p.slot !== 'Call me first' ? 'You asked for a site visit on ' + p.slot + '. ' : '') + 'Your consultant will confirm the time with you. Bring a recent electric bill to the visit.',
          next: 'Site assessment',
          status: 'Request received'
        };
      }
    } catch (e) {}
    return null;
  }

  function render(p) {
    $('[data-track-empty]').style.display = 'none';
    var box = $('[data-proj]');
    box.classList.add('is-visible');
    $('[data-p-ref]').textContent = p.ref + (p.ref === 'LI-SAMPLE' ? ' · Sample project' : '');
    $('[data-p-title]').textContent = p.title;
    $('[data-p-status]').textContent = p.status;
    $('[data-p-stage]').textContent = 'Stage ' + p.stage + ' of 6 · ' + STAGES[p.stage - 1].name;
    $('[data-p-updated]').textContent = 'Updated ' + fmt.format(new Date());
    $('[data-p-note-text]').textContent = p.note;
    var bars = document.querySelectorAll('[data-p-meter] i');
    bars.forEach(function (b, i) { b.className = i < p.stage - 1 ? 'is-done' : i === p.stage - 1 ? 'is-now' : ''; });
    var list = $('[data-p-stages]');
    list.innerHTML = STAGES.map(function (s, i) {
      var n = i + 1;
      var cls = n < p.stage ? 'is-done' : n === p.stage ? 'is-now' : 'is-todo';
      var when = n < p.stage && p.dates[i] ? 'Done ' + fmt.format(p.dates[i]) : n === p.stage ? (p.next || 'In progress') : n === p.stage + 1 ? 'Up next' : '';
      var icon = n < p.stage ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>' : '';
      return '<li class="proj__stage ' + cls + '"><span class="ico">' + icon + '</span><div><h4>' + s.name + '</h4><p>' + (n < p.stage ? s.done : n === p.stage ? s.now : '') + '</p></div><span class="label">' + when + '</span></li>';
    }).join('');
    if (window.gsap && !reduce) {
      gsap.from(box.querySelectorAll('.proj__head, .proj__meter i, .proj__stage, .proj__note'), { opacity: 0, y: 24, duration: 0.8, stagger: 0.05, ease: 'expo.out' });
    }
    if (window.innerWidth < 1024) box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var code = form.elements.code.value, zip = form.elements.zip.value;
    var errEl = $('[data-track-error]');
    errEl.textContent = '';
    if (!code.trim()) { errEl.textContent = 'Enter the tracking code from your confirmation.'; return; }
    var p = lookup(code, zip);
    if (!p && CFG.trackEndpoint) {
      fetch(CFG.trackEndpoint + '?code=' + encodeURIComponent(code) + '&zip=' + encodeURIComponent(zip))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) { if (d) render(d); else errEl.textContent = 'We couldn’t find that project. Check the code and ZIP, or call us.'; })
        .catch(function () { errEl.textContent = 'We couldn’t reach the tracker. Please call us.'; });
      return;
    }
    if (p) render(p); else errEl.textContent = 'We couldn’t find that project. Check the code and ZIP, or call us.';
  });
  form.elements.zip.addEventListener('input', function (e) { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5); });
  document.querySelector('[data-demo]').addEventListener('click', function () {
    form.elements.code.value = 'LI-SAMPLE'; form.elements.zip.value = '92399';
    render(SAMPLE);
  });

  var qs = new URLSearchParams(location.search);
  if (qs.get('code')) {
    form.elements.code.value = qs.get('code');
    form.elements.zip.value = qs.get('zip') || '';
    var p = lookup(qs.get('code'), qs.get('zip'));
    if (p) render(p);
  }
})();
