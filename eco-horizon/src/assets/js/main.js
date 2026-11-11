/* Eco Horizon — site interactions. No framework, no build step. */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const eur = (n) => '€' + Math.round(n).toLocaleString('en-IE');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
  };
  window.EH = { $, $$, eur, clamp, store, reduced };

  /* ---------- Year ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Smooth scroll (Lenis, desktop only) ---------- */
  let lenis = null;
  const startLenis = () => {
    if (reduced || !window.Lenis || !finePointer) return;
    lenis = new window.Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  };
  if (document.readyState === 'complete') startLenis(); else window.addEventListener('load', startLenis);

  const scrollToEl = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: -90 });
    else {
      const y = (typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY - 90);
      window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    }
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id === '#top' || a.hasAttribute('data-to-top')) { e.preventDefault(); scrollToEl(0); return; }
    const t = id.length > 1 && document.getElementById(id.slice(1));
    if (t) { e.preventDefault(); scrollToEl(t); }
  });

  /* ---------- Header: compact on scroll, hide on the way down ---------- */
  const header = $('.site-header');
  const mobileBar = $('.mobile-bar');
  let lastY = window.scrollY;
  const onScrollHeader = () => {
    const y = window.scrollY;
    if (header) {
      header.classList.toggle('is-scrolled', y > 24);
      const megaOpen = $('.mega.is-open');
      header.classList.toggle('is-hidden', y > 640 && y > lastY + 2 && !megaOpen && !document.body.classList.contains('menu-open'));
      if (y < lastY - 2) header.classList.remove('is-hidden');
    }
    if (mobileBar) mobileBar.classList.toggle('is-visible', y > 420);
    lastY = y;
  };
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  /* ---------- Mega menu ---------- */
  $$('.nav__link[aria-controls]').forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    const li = btn.parentElement;
    let t;
    const open = () => { clearTimeout(t); panel.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); };
    const close = () => { t = setTimeout(() => { panel.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }, 140); };
    btn.addEventListener('click', () => (panel.classList.contains('is-open') ? (clearTimeout(t), panel.classList.remove('is-open'), btn.setAttribute('aria-expanded', 'false')) : open()));
    if (finePointer) { li.addEventListener('mouseenter', open); li.addEventListener('mouseleave', close); }
    li.addEventListener('focusout', (e) => { if (!li.contains(e.relatedTarget)) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { panel.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); } });
  });

  /* ---------- Mobile menu ---------- */
  const menuBtn = $('.menu-btn');
  if (menuBtn) {
    const setMenu = (open) => {
      document.body.classList.toggle('menu-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      $('.menu-btn__text', menuBtn).textContent = open ? 'Close' : 'Menu';
      if (lenis) (open ? lenis.stop() : lenis.start());
    };
    menuBtn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
    $$('.mobile-menu a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---------- Split headings into words for the reveal ---------- */
  const splitWords = (root) => {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'wd';
            const inner = document.createElement('span');
            inner.textContent = p;
            inner.style.setProperty('--i', i++);
            w.appendChild(inner);
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(root);
  };
  $$('[data-split]').forEach(splitWords);

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$('[data-reveal], [data-split]');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }
  // Safety net: never leave content hidden.
  setTimeout(() => {
    revealEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in');
    });
  }, 2500);

  /* ---------- Hero intro ---------- */
  const heroes = $$('.hero, .page-hero');
  const playHero = () => heroes.forEach((h) => h.classList.add('is-ready'));
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))]).then(() => requestAnimationFrame(playHero));
  } else setTimeout(playHero, 200);

  /* ---------- Scroll-driven effects (statement words + parallax) ---------- */
  const statements = $$('[data-scrub]').map((el) => {
    const words = [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span');
            s.className = 'w'; s.textContent = p; words.push(s); frag.appendChild(s);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) walk(child);
      });
    };
    walk(el);
    return { el, words };
  });
  const parallax = $$('[data-parallax]').map((el) => ({ el, speed: parseFloat(el.dataset.parallax) || 0.12 }));

  let ticking = false;
  const onScrollFx = () => {
    ticking = false;
    const vh = window.innerHeight;
    statements.forEach(({ el, words }) => {
      const r = el.getBoundingClientRect();
      const p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.25), 0, 1);
      const lit = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('is-lit', i < lit || reduced));
    });
    if (!reduced) {
      parallax.forEach(({ el, speed }) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const max = r.height * speed * 0.5;
        const offset = clamp((r.top + r.height / 2 - vh / 2) * speed * -1, -max, max);
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0) scale(${1 + speed})`;
      });
    }
  };
  const requestFx = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScrollFx); } };
  window.addEventListener('scroll', requestFx, { passive: true });
  window.addEventListener('resize', requestFx);
  onScrollFx();

  /* ---------- Count-up numbers ---------- */
  const counters = $$('[data-count]');
  const runCount = (el) => {
    const end = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const fmt = (v) => v.toLocaleString('en-IE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (reduced) { el.textContent = fmt(end); return; }
    const dur = 1600; const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(end * e);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { runCount(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.4 });
    counters.forEach((c) => cio.observe(c));
  } else counters.forEach(runCount);

  /* ---------- Expanding sector panels ---------- */
  const sectors = $$('.sector');
  sectors.forEach((s) => {
    const activate = () => sectors.forEach((o) => o.classList.toggle('is-active', o === s));
    s.addEventListener('mouseenter', () => finePointer && activate());
    s.addEventListener('focusin', activate);
  });

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reduced) {
    $$('[data-magnetic]').forEach((b) => {
      b.addEventListener('mousemove', (e) => {
        const r = b.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.18;
        const y = (e.clientY - r.top - r.height / 2) * 0.3;
        b.style.transform = `translate(${x}px, ${y}px)`;
      });
      b.addEventListener('mouseleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------- Hero quote starter ---------- */
  $$('[data-starter]').forEach((st) => {
    const go = $('[data-starter-go]', st);
    const label = $('[data-starter-label]', st);
    $$('[data-type]', st).forEach((opt) => {
      opt.addEventListener('click', () => {
        $$('[data-type]', st).forEach((o) => { o.classList.toggle('is-active', o === opt); o.setAttribute('aria-pressed', String(o === opt)); });
        go.href = `quote.html?type=${opt.dataset.type}`;
        if (label) label.textContent = opt.dataset.label;
      });
    });
  });

  /* ---------- Tabs ---------- */
  $$('[role="tablist"]').forEach((list) => {
    const tabs = $$('[role="tab"]', list);
    const select = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        n.focus(); select(n);
      });
    });
    const fromHash = tabs.find((t) => location.hash && t.dataset.hash === location.hash.slice(1));
    if (fromHash) {
      select(fromHash);
      setTimeout(() => scrollToEl(list), 300);
    }
  });

  /* ---------- Live sun over Mountrath ---------- */
  const sunPosition = (date, lat, lon) => {
    const rad = Math.PI / 180;
    const d = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 864e5;
    const g = ((357.529 + 0.98560028 * d) % 360) * rad;
    const q = (280.459 + 0.98564736 * d) % 360;
    const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
    const e = (23.439 - 0.00000036 * d) * rad;
    const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
    const dec = Math.asin(Math.sin(e) * Math.sin(L));
    const gmst = ((18.697374558 + 24.06570982441908 * d) % 24 + 24) % 24;
    const H = (gmst * 15 + lon) * rad - ra;
    const el = Math.asin(Math.sin(lat * rad) * Math.sin(dec) + Math.cos(lat * rad) * Math.cos(dec) * Math.cos(H));
    return el / rad;
  };
  const LAT = 53.0003, LON = -7.4733;
  const fmtTime = (d) => d.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Dublin' });
  const nextSunrise = (from) => {
    const t = new Date(from.getTime());
    let prev = sunPosition(t, LAT, LON);
    for (let i = 0; i < 24 * 12; i++) {
      t.setTime(t.getTime() + 5 * 60000);
      const cur = sunPosition(t, LAT, LON);
      if (prev < -0.833 && cur >= -0.833) return new Date(t.getTime());
      prev = cur;
    }
    return null;
  };
  const updateSun = () => {
    const now = new Date();
    const elev = sunPosition(now, LAT, LON);
    const kw = elev > 0 ? 6 * 0.78 * Math.pow(Math.sin(elev * Math.PI / 180), 1.1) : 0;
    $$('[data-sun-live]').forEach((el) => {
      const head = $('[data-sun-head]', el);
      const body = $('[data-sun-body]', el);
      if (elev > 0) {
        head.textContent = `Live · Mountrath · sun at ${elev.toFixed(0)}°`;
        body.textContent = `A 6 kWp roof ≈ ${kw.toFixed(1)} kW now`;
      } else {
        const sr = nextSunrise(now);
        head.textContent = 'Live · Mountrath · after dark';
        body.textContent = sr ? `Batteries on duty · sunrise ${fmtTime(sr)}` : 'Batteries on duty';
      }
    });
  };
  if ($('[data-sun-live]')) { updateSun(); setInterval(updateSun, 60000); }

  /* ---------- Savings & grant calculator ---------- */
  const microgen = (k) => {
    // SEAI Non-Domestic Microgen (enhanced): banded and cumulative, max €325,200 at 1 MWp.
    if (k < 1) return 0;
    if (k < 2) return 1800;
    if (k < 3) return 3600;
    if (k < 4) return 4200;
    if (k <= 6) return 4800;
    return 4800 + 600 * (Math.min(k, 20) - 6) + 400 * Math.max(0, Math.min(k, 200) - 20) + 300 * Math.max(0, Math.min(k, 1000) - 200);
  };
  const homeGrant = (k, battery) => Math.min(k, 2) * 700 + clamp(k - 2, 0, 2) * 200 + (battery ? 600 : 0);
  // Indicative installed cost per kWp, used only to apply the 45% / 60% grant caps.
  const costPerKwp = (k) => clamp(1550 - 230 * Math.log10(Math.max(k, 1)), 850, 1550);
  window.EH.grants = { microgen, homeGrant, costPerKwp };

  const MODES = {
    home: { min: 2, max: 12, step: 0.5, def: 4, curve: 1, imp: 0.36, exp: 0.195, self: 0.45, selfBatt: 0.75,
      presets: [[3, 'Small home · 3 kWp'], [4, '3-bed semi · 4 kWp'], [6, '4-bed detached · 6 kWp'], [8, 'Home + EV · 8 kWp']] },
    business: { min: 7, max: 1000, step: 1, def: 50, curve: 2.4, imp: 0.27, exp: 0.15, self: 0.8,
      presets: [[20, 'Small office · 20'], [50, 'Retail · 50'], [150, 'Factory · 150'], [500, 'Large site · 500']] },
    farm: { min: 5, max: 200, step: 1, def: 22, curve: 1.8, imp: 0.3, exp: 0.17, self: 0.7,
      presets: [[11, 'Small farm · 11'], [22, 'Dairy · 22'], [40, 'Large dairy · 40'], [62, 'TAMS max · 62']] },
  };
  const YIELD = 900; // kWh per kWp per year, typical for the Irish midlands
  const CO2 = 0.25;  // kg CO2 per kWh, Irish grid average

  const calcEstimate = (mode, k, battery) => {
    const m = MODES[mode];
    const gen = k * YIELD;
    const selfRate = mode === 'home' && battery ? m.selfBatt : m.self;
    const self = gen * selfRate, exported = gen - self;
    const year1Self = self * m.imp, year1Exp = exported * m.exp;
    let life = 0;
    for (let y = 0; y < 25; y++) {
      const g = Math.pow(0.995, y);
      life += self * g * m.imp * Math.pow(1.03, y) + exported * g * m.exp;
    }
    let grant = 0, scheme = '';
    const cost = k * costPerKwp(k);
    if (mode === 'home') { grant = homeGrant(k, battery); scheme = 'SEAI Solar PV grant' + (battery ? ' + battery' : ''); }
    if (mode === 'business') { grant = Math.min(microgen(k), cost * 0.45); scheme = 'SEAI Non-Domestic Microgen'; }
    if (mode === 'farm') {
      const seai = Math.min(microgen(k), cost * 0.45);
      const tams = k <= 62 ? Math.min(cost, 90000) * 0.6 : 0;
      if (tams >= seai) { grant = tams; scheme = 'TAMS 3 Solar Capital Investment (60%)'; }
      else { grant = seai; scheme = 'SEAI Non-Domestic Microgen'; }
    }
    return { gen, year1Self, year1Exp, life: life + grant, grant, scheme, co2: gen * CO2 / 1000 };
  };
  window.EH.calcEstimate = calcEstimate;

  $$('[data-calc]').forEach((root) => {
    let mode = root.dataset.mode || { business: 'business', farms: 'farm' }[document.body.dataset.page] || 'home';
    const range = $('[data-size]', root);
    const sizeOut = $('[data-size-out]', root);
    const presets = $('[data-presets]', root);
    const battWrap = $('[data-battery-wrap]', root);
    const batt = $('[data-battery]', root);
    const cta = $('[data-calc-cta]', root);
    const out = (k) => $(`[data-out="${k}"]`, root);
    const toSize = (t) => { const m = MODES[mode]; const v = m.min + (m.max - m.min) * Math.pow(t / 1000, m.curve); return Math.round(v / m.step) * m.step; };
    const toT = (s) => { const m = MODES[mode]; return 1000 * Math.pow((s - m.min) / (m.max - m.min), 1 / m.curve); };
    let size = MODES[mode].def;

    const render = () => {
      const m = MODES[mode];
      sizeOut.textContent = `${size % 1 ? size.toFixed(1) : size} kWp`;
      range.style.setProperty('--p', `${(range.value / 10).toFixed(1)}%`);
      $$('button', presets).forEach((b) => b.setAttribute('aria-pressed', String(parseFloat(b.dataset.v) === size)));
      const r = calcEstimate(mode, size, batt && batt.checked);
      const year1 = r.grant + r.year1Self + r.year1Exp;
      out('year1').textContent = eur(year1);
      out('life').textContent = eur(r.life);
      out('grant').textContent = eur(r.grant);
      out('scheme').textContent = r.scheme;
      out('self').textContent = eur(r.year1Self);
      out('export').textContent = eur(r.year1Exp);
      out('co2').textContent = `${r.co2.toFixed(r.co2 < 10 ? 1 : 0)} t`;
      out('gen').textContent = `${Math.round(r.gen).toLocaleString('en-IE')} kWh`;
      const bar = $('[data-out="bar"]', root);
      if (bar) {
        const [a, b, c] = bar.children;
        a.style.width = `${(r.grant / year1) * 100}%`;
        b.style.width = `${(r.year1Self / year1) * 100}%`;
        c.style.width = `${(r.year1Exp / year1) * 100}%`;
      }
      if (cta) cta.href = `quote.html?type=${mode}&size=${size}${batt && batt.checked && mode === 'home' ? '&battery=1' : ''}`;
      if (battWrap) battWrap.hidden = mode !== 'home';
      const scale = $('[data-scale]', root);
      if (scale) scale.innerHTML = `<span>${m.min} kWp</span><span>${m.max.toLocaleString('en-IE')} kWp</span>`;
    };
    const buildPresets = () => {
      presets.innerHTML = MODES[mode].presets.map(([v, l]) => `<button type="button" data-v="${v}">${l}</button>`).join('');
    };
    const setMode = (m) => {
      mode = m;
      $$('[data-mode-btn]', root).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modeBtn === m)));
      size = MODES[m].def; buildPresets(); range.value = toT(size); render();
    };
    range.addEventListener('input', () => { size = toSize(+range.value); render(); });
    presets.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; size = parseFloat(b.dataset.v); range.value = toT(size); render(); });
    $$('[data-mode-btn]', root).forEach((b) => b.addEventListener('click', () => setMode(b.dataset.modeBtn)));
    if (batt) batt.addEventListener('change', render);
    setMode(mode);
  });

  /* ---------- Business grant tier bars ---------- */
  $$('[data-tier-calc]').forEach((root) => {
    const range = $('input', root);
    const out = (k) => $(`[data-out="${k}"]`, root);
    const toSize = (t) => Math.round(7 + 993 * Math.pow(t / 1000, 2.4));
    const render = () => {
      const k = toSize(+range.value);
      range.style.setProperty('--p', `${(range.value / 10).toFixed(1)}%`);
      const g = microgen(k), cost = k * costPerKwp(k), capped = Math.min(g, cost * 0.45);
      out('size').textContent = `${k.toLocaleString('en-IE')} kWp`;
      out('band').textContent = eur(g);
      out('cap').textContent = eur(cost * 0.45);
      out('grant').textContent = eur(capped);
      out('rule').textContent = g <= cost * 0.45 ? 'Band amount applies' : '45% cost cap applies';
    };
    range.addEventListener('input', render);
    render();
  });

  /* ---------- Grant eligibility checker ---------- */
  $$('[data-checker]').forEach((root) => {
    const answers = {};
    const status = $('[data-status]', root), big = $('[data-big]', root), text = $('[data-text]', root);
    const render = () => {
      const q = $$('[data-q]', root);
      const answered = q.filter((el) => answers[el.dataset.q] !== undefined).length;
      const fail = q.find((el) => answers[el.dataset.q] !== undefined && answers[el.dataset.q] !== (el.dataset.want === 'yes'));
      if (fail) {
        status.className = 'checker__status no'; status.textContent = 'Worth a chat';
        big.textContent = 'Not this scheme';
        text.textContent = fail.dataset.why || 'This scheme may not fit, but another route might. Ask us — we check every option.';
      } else if (answered === q.length) {
        status.className = 'checker__status ok'; status.textContent = 'Looks eligible';
        big.textContent = root.dataset.prize;
        text.textContent = root.dataset.okText;
      } else {
        status.className = 'checker__status'; status.textContent = `${answered} of ${q.length} answered`;
        big.textContent = root.dataset.prize;
        text.textContent = 'Answer the questions to check eligibility in seconds. Nothing is sent anywhere.';
      }
    };
    $$('[data-q]', root).forEach((qEl) => {
      $$('button', qEl).forEach((b) => b.addEventListener('click', () => {
        answers[qEl.dataset.q] = b.dataset.a === 'yes';
        $$('button', qEl).forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        render();
      }));
    });
    render();
  });
})();
