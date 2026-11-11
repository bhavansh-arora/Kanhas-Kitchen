/* Smart quote funnel — branching steps, live estimate, autosave.
   To go live, set data-endpoint on the form to a URL that accepts a JSON POST
   (CRM webhook, Zapier/Make hook, or a small serverless function). */
(() => {
  'use strict';
  const form = document.querySelector('[data-funnel]');
  if (!form) return;
  const EH = window.EH || {};
  const $ = (s, el = form) => el.querySelector(s);
  const $$ = (s, el = form) => Array.from(el.querySelectorAll(s));
  const store = EH.store || { get: () => null, set: () => {} };
  const eur = EH.eur || ((n) => '€' + Math.round(n).toLocaleString('en-IE'));
  const KEY = 'eh-quote-draft';

  const steps = $$('[data-step]').filter((s) => s.dataset.step !== 'done');
  const done = $('[data-step="done"]');
  const nextBtn = $('[data-next]');
  const backBtn = $('[data-back]');
  const navBar = $('[data-nav-bar]');
  let index = 0;

  const val = (name) => {
    const els = $$(`[name="${name}"]`);
    if (!els.length) return '';
    if (els[0].type === 'radio') return (els.find((e) => e.checked) || {}).value || '';
    if (els[0].type === 'checkbox' && els.length > 1) return els.filter((e) => e.checked).map((e) => e.value);
    if (els[0].type === 'checkbox') return els[0].checked;
    return els[0].value.trim();
  };
  const type = () => val('type');

  /* ---------- Branching ---------- */
  const applyBranch = () => {
    const t = type() || 'home';
    $$('[data-for]').forEach((el) => { el.hidden = el.dataset.for !== t; });
    $$('[data-biz-only]').forEach((el) => { el.hidden = t === 'home'; });
  };

  /* ---------- Validation ---------- */
  const setErr = (el, on) => { if (el) el.style.display = on ? 'block' : ''; };
  const validate = (i) => {
    const step = steps[i];
    const t = type();
    let ok = true;
    const stepErr = $('[data-err]', step);
    if (i === 0) ok = !!t;
    if (i === 1) {
      const need = { home: ['home_type', 'bill'], business: ['biz_type', 'spend'], farm: ['enterprise', 'mount'] }[t] || [];
      ok = need.every((n) => val(n));
    }
    if (i === 2) ok = val('interests').length > 0;
    if (i === 3) {
      const field = $('#f-eircode').closest('.field');
      const good = val('eircode').length >= 3;
      field.classList.toggle('is-invalid', !good);
      ok = good && !!val('timeframe');
      setErr(stepErr, good && !val('timeframe'));
      if (!good) $('#f-eircode').focus();
      return ok;
    }
    if (i === 4) {
      const checks = [
        ['#f-name', val('name').length >= 2],
        ['#f-phone', val('phone').replace(/\D/g, '').length >= 7],
        ['#f-email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val('email'))],
      ];
      checks.forEach(([sel, good]) => $(sel).closest('.field').classList.toggle('is-invalid', !good));
      const consent = val('consent');
      setErr($('[name="consent"]').parentElement.querySelector('.field__err'), !consent);
      ok = checks.every((c) => c[1]) && consent;
      const firstBad = checks.find((c) => !c[1]);
      if (firstBad) $(firstBad[0]).focus();
      return ok;
    }
    setErr(stepErr, !ok);
    return ok;
  };

  /* ---------- Summary + estimate ---------- */
  const SIZES = {
    home: { 'Under €100': 3, '€100–€200': 4, '€200–€300': 6, '€300+': 8 },
    business: { 'Under €10k': 15, '€10k–€50k': 50, '€50k–€150k': 150, '€150k+': 400 },
    farm: { Dairy: 22, 'Beef / sheep': 11, Tillage: 15, 'Pig / poultry / other': 30 },
  };
  const params = new URLSearchParams(location.search);
  const presetSize = parseFloat(params.get('size')) || 0;

  const updateSummary = () => {
    const t = type();
    const list = $('[data-sum-list]', document);
    const title = $('[data-sum-title]', document);
    const rows = [];
    const label = { home: 'Home', business: 'Business', farm: 'Farm' }[t];
    if (label) rows.push(['Property', label]);
    if (t === 'home') { if (val('home_type')) rows.push(['House', val('home_type')]); if (val('bill')) rows.push(['Monthly bill', val('bill')]); }
    if (t === 'business') { if (val('biz_type')) rows.push(['Premises', val('biz_type')]); if (val('spend')) rows.push(['Annual spend', val('spend')]); }
    if (t === 'farm') { if (val('enterprise')) rows.push(['Enterprise', val('enterprise')]); if (val('mount')) rows.push(['Mounting', val('mount')]); }
    const ints = val('interests');
    if (ints.length) rows.push(['Interested in', ints.join(', ')]);
    if (val('eircode')) rows.push(['Location', val('eircode').toUpperCase()]);
    if (val('timeframe')) rows.push(['Timeline', val('timeframe')]);
    list.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v.replace(/</g, '&lt;')}</dd></div>`).join('');
    title.textContent = t ? `${label} solar quote` : "Let's start with your property";

    const est = $('[data-sum-est]', document);
    if (!t || !EH.calcEstimate) { est.hidden = true; return; }
    const detail = { home: val('bill'), business: val('spend'), farm: val('enterprise') }[t];
    const size = presetSize || (SIZES[t] || {})[detail] || { home: 4, business: 50, farm: 22 }[t];
    const battery = t === 'home' && (ints.includes('Battery storage') || params.get('battery') === '1');
    const r = EH.calcEstimate(t, size, battery);
    est.hidden = false;
    $('[data-est-grant]', document).textContent = `${eur(r.grant)} grant`;
    $('[data-est-text]', document).textContent = `Based on a ~${size} kWp system${battery ? ' with battery' : ''}: about ${eur(r.year1Self + r.year1Exp)} a year in savings and export income (${r.scheme}). We'll confirm it after a site assessment.`;
  };

  /* ---------- Autosave ---------- */
  const save = () => {
    const data = {};
    $$('input, select, textarea').forEach((el) => {
      if (!el.name || el.type === 'file' || el.type === 'hidden') return;
      if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; }
      else if (el.type === 'checkbox' && el.name === 'interests') { data.interests = data.interests || []; if (el.checked) data.interests.push(el.value); }
      else if (el.type === 'checkbox') data[el.name] = el.checked;
      else data[el.name] = el.value;
    });
    data._step = index;
    store.set(KEY, JSON.stringify(data));
  };
  const restore = () => {
    let data = null;
    try { data = JSON.parse(store.get(KEY) || 'null'); } catch (e) { data = null; }
    if (!data) return 0;
    Object.entries(data).forEach(([k, v]) => {
      if (k === '_step') return;
      $$(`[name="${k}"]`).forEach((el) => {
        if (el.type === 'radio') el.checked = el.value === v;
        else if (el.type === 'checkbox' && Array.isArray(v)) el.checked = v.includes(el.value);
        else if (el.type === 'checkbox') el.checked = !!v;
        else el.value = v;
      });
    });
    return Math.min(data._step || 0, steps.length - 1);
  };

  /* ---------- Navigation ---------- */
  const show = (i, focus = true) => {
    index = i;
    applyBranch();
    steps.forEach((s, n) => s.classList.toggle('is-active', n === i));
    $('[data-step-label]').textContent = `Step ${i + 1} of ${steps.length}`;
    $('[data-step-name]').textContent = steps[i].dataset.name;
    $('[data-progress]').style.width = `${((i + 1) / steps.length) * 100}%`;
    backBtn.classList.toggle('is-placeholder', i === 0);
    backBtn.disabled = i === 0;
    nextBtn.firstChild.textContent = i === steps.length - 1 ? 'Send my quote request ' : 'Continue ';
    updateSummary();
    save();
    if (focus) {
      const top = form.getBoundingClientRect().top + window.scrollY - 110;
      if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
      const first = steps[i].querySelector(':scope > legend, [data-for]:not([hidden]) h2');
      if (first) { first.setAttribute('tabindex', '-1'); first.focus({ preventScroll: true }); }
    }
  };

  const submit = async () => {
    const payload = {};
    new FormData(form).forEach((v, k) => {
      if (v instanceof File) return;
      payload[k] = payload[k] ? [].concat(payload[k], v) : v;
    });
    const files = $('[data-files]').files;
    payload.files = Array.from(files || []).map((f) => f.name);
    nextBtn.disabled = true;
    nextBtn.firstChild.textContent = 'Sending… ';
    try {
      if (form.dataset.endpoint) {
        const res = await fetch(form.dataset.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Request failed');
      } else {
        await new Promise((r) => setTimeout(r, 900)); // preview mode: no endpoint configured yet
      }
      store.set(KEY, '');
      steps.forEach((s) => s.classList.remove('is-active'));
      navBar.hidden = true;
      $('[data-done-name]').textContent = `${val('name').split(' ')[0] || 'there'}.`;
      done.classList.add('is-active');
      $('[data-progress]').style.width = '100%';
      $('[data-step-label]').textContent = 'Sent';
      $('[data-step-name]').textContent = 'All done';
      done.focus();
    } catch (e) {
      nextBtn.disabled = false;
      nextBtn.firstChild.textContent = 'Try again ';
      alert('Sorry, something went wrong sending your request. Please call us on (057) 875 6595.');
    }
  };

  nextBtn.addEventListener('click', () => {
    if (!validate(index)) return;
    if (index < steps.length - 1) show(index + 1);
    else submit();
  });
  backBtn.addEventListener('click', () => show(Math.max(0, index - 1)));

  form.addEventListener('change', (e) => {
    if (e.target.name === 'type') {
      applyBranch(); updateSummary(); save();
      setTimeout(() => show(1), 260); // single choice: move straight on
      return;
    }
    if (e.target.matches('[data-files]')) {
      const n = e.target.files.length;
      $('[data-files-label]').textContent = n ? `${n} file${n > 1 ? 's' : ''} attached` : 'Roof, meter box or a recent bill. Speeds up your quote.';
    }
    $$('.field.is-invalid', steps[index]).forEach((f) => { if (f.contains(e.target)) f.classList.remove('is-invalid'); });
    const err = $('[data-err]', steps[index]); if (err) err.style.display = '';
    updateSummary(); save();
  });
  form.addEventListener('input', () => { updateSummary(); save(); });
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); nextBtn.click(); }
  });

  /* ---------- Attribution ---------- */
  const utm = ['utm_source', 'utm_medium', 'utm_campaign'].map((k) => params.get(k) && `${k}=${params.get(k)}`).filter(Boolean).join('&');
  $('[name="utm"]').value = utm;
  $('[name="source"]').value = document.referrer || 'direct';
  $('[name="landing_page"]').value = location.pathname + location.search;

  /* ---------- Start ---------- */
  let start = restore();
  const fromUrl = params.get('type');
  if (fromUrl && ['home', 'business', 'farm'].includes(fromUrl)) {
    $$('[name="type"]').forEach((r) => { r.checked = r.value === fromUrl; });
    if (params.get('battery') === '1') { const b = $('[name="interests"][value="Battery storage"]'); if (b) b.checked = true; }
    const p = $('[name="interests"][value="Solar panels"]'); if (p) p.checked = true;
    start = Math.max(start, 1);
  }
  show(start, false);
})();
