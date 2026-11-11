/* Energy flow simulator — a modelled day on a 6 kWp home system. */
(() => {
  'use strict';
  const root = document.querySelector('[data-flow]');
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => Array.from(root.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const KWP = 6, BATT = 10, BATT_KW = 5, EV_KW = 7;
  const RISE = 6.6, SET = 20.2; // typical mid-April in the Irish midlands
  const STEP = 1 / 12;          // 5-minute simulation steps

  const solarAt = (t) => {
    if (t <= RISE || t >= SET) return 0;
    const x = Math.sin(Math.PI * (t - RISE) / (SET - RISE));
    const cloud = 0.92 + 0.08 * Math.sin(t * 5.1) * Math.sin(t * 2.3);
    return KWP * 0.78 * Math.pow(x, 1.35) * cloud;
  };
  const bump = (t, c, w, h) => h * Math.exp(-Math.pow((t - c) / w, 2));
  const loadAt = (t) => 0.32 + bump(t, 7.8, 0.9, 1.3) + bump(t, 13, 0.8, 0.5) + bump(t, 18.6, 1.4, 2.3) + bump(t, 21.5, 1, 0.7);
  const evAt = (t, surplus) => (t >= 11 && t <= 15.5 && surplus > 1.4 ? Math.min(EV_KW, surplus) : 0);

  // Integrate the day from 05:00 up to time t.
  const simulate = (tEnd) => {
    let soc = 0.22 * BATT, served = 0, demand = 0;
    let state = { solar: 0, load: 0, ev: 0, batt: 0, grid: 0, soc: soc / BATT };
    for (let t = 5; t <= tEnd + 1e-6; t += STEP) {
      const solar = solarAt(t), load = loadAt(t);
      const ev = evAt(t, solar - load);
      let net = solar - load - ev, batt = 0, grid = 0;
      if (net > 0) {
        const room = (BATT - soc) / STEP;
        batt = Math.min(net, BATT_KW, room); soc += batt * STEP; grid = net - batt; // + export
      } else {
        const avail = Math.max(0, soc - 0.05 * BATT) / STEP;
        const d = Math.min(-net, BATT_KW, avail); soc -= d * STEP; batt = -d; grid = net + d; // - import
      }
      const use = load + ev;
      demand += use * STEP;
      served += (use + Math.min(0, grid)) * STEP;
      state = { solar, load, ev, batt, grid, soc: soc / BATT };
    }
    state.selfPct = demand > 0 ? served / demand : 1;
    return state;
  };

  const svgSun = $('[data-sun]'), svgMoon = $('[data-moon]');
  const range = $('[data-flow-range]');
  const clock = $('[data-flow-clock]');
  const caption = $('[data-flow-caption]');
  const playBtn = $('[data-flow-play]');
  const wires = Object.fromEntries($$('[data-wire]').map((p) => [p.dataset.wire, { el: p, offset: 0, speed: 0 }]));
  const v = (k) => root.querySelector(`[data-v="${k}"]`);
  const r = (k) => root.querySelector(`[data-r="${k}"]`);
  const kw = (n) => `${Math.abs(n).toFixed(1)} kW`;

  const mix = (a, b, p) => a.map((x, i) => Math.round(x + (b[i] - x) * p));
  const hex = (c) => `rgb(${c.join(',')})`;
  const NIGHT = [8, 14, 28], DAWN = [70, 38, 18], DAY = [18, 48, 70];
  const skyFor = (t) => {
    if (t < RISE - 0.6 || t > SET + 0.6) return NIGHT;
    if (t < RISE + 0.8) return mix(NIGHT, DAWN, Math.min(1, (t - RISE + 0.6) / 0.9));
    if (t < RISE + 2.2) return mix(DAWN, DAY, (t - RISE - 0.8) / 1.4);
    if (t > SET - 0.8) return mix(DAWN, NIGHT, Math.min(1, (t - SET + 0.8) / 1.4));
    if (t > SET - 2.4) return mix(DAY, DAWN, (t - SET + 2.4) / 1.6);
    return DAY;
  };
  const quad = (p, a, c, b) => (1 - p) * (1 - p) * a + 2 * (1 - p) * p * c + p * p * b;

  const pad = (n) => String(n).padStart(2, '0');
  const render = (t) => {
    const s = simulate(t);
    const h = Math.floor(t), m = Math.floor((t - h) * 60);
    clock.textContent = `${pad(h)}:${pad(m)}`;
    range.style.setProperty('--p', `${((t - 5) / 18.5 * 100).toFixed(1)}%`);

    // Sun / moon on the arc
    const p = (t - RISE) / (SET - RISE);
    if (p >= 0 && p <= 1) {
      svgSun.setAttribute('transform', `translate(${quad(p, 30, 320, 610).toFixed(1)} ${quad(p, 196, -74, 196).toFixed(1)})`);
      svgSun.style.opacity = 1; svgMoon.style.opacity = 0;
    } else {
      svgSun.style.opacity = 0; svgMoon.style.opacity = 1;
      svgMoon.setAttribute('transform', 'translate(560 70)');
    }
    const sky = skyFor(t);
    root.style.setProperty('--sky-a', hex(sky));

    v('solar').textContent = kw(s.solar);
    v('home').textContent = kw(s.load);
    v('batt').textContent = `${Math.round(s.soc * 100)}%${s.batt > 0.05 ? ' ↑' : s.batt < -0.05 ? ' ↓' : ''}`;
    v('ev').textContent = kw(s.ev);
    v('grid').textContent = kw(s.grid);
    v('gridk').textContent = s.grid > 0.05 ? 'Exporting' : s.grid < -0.05 ? 'Importing' : 'Grid';
    root.querySelector('[data-soc-bar]').setAttribute('width', (24 * s.soc).toFixed(1));

    r('solar').textContent = kw(s.solar);
    r('batt').textContent = `${Math.round(s.soc * 100)}%`;
    r('grid').textContent = s.grid > 0.05 ? `+${kw(s.grid)}` : s.grid < -0.05 ? `−${kw(s.grid)}` : '0.0 kW';
    r('self').textContent = `${Math.round(s.selfPct * 100)}%`;

    const set = (k, power) => {
      const w = wires[k];
      w.speed = power;
      w.el.style.opacity = Math.abs(power) > 0.05 ? Math.min(1, 0.35 + Math.abs(power) / 3) : 0;
      w.el.classList.toggle('grid-in', k === 'grid' && power < 0);
    };
    set('solar', s.solar);
    set('home', s.load);
    set('batt', s.batt);
    set('ev', s.ev);
    set('grid', s.grid);

    let msg;
    if (s.solar < 0.05 && s.batt < -0.05) msg = `<strong>The sun's down, the battery isn't.</strong> Stored sunshine is running the house, so you're not buying peak-rate power.`;
    else if (s.solar < 0.05 && s.grid < -0.05) msg = `<strong>Overnight top-up.</strong> The battery is near empty, so the house takes a little from the grid, ideally on a cheap night rate.`;
    else if (s.ev > 0.05) msg = `<strong>Solar-first EV charging.</strong> Surplus sunshine is going straight into the car instead of being exported for pennies.`;
    else if (s.grid > 0.05) msg = `<strong>Battery full, still generating.</strong> The extra is exported and earns Clean Export Guarantee payments.`;
    else if (s.batt > 0.05) msg = `<strong>Banking the sun.</strong> The house is covered and the surplus is charging the battery for this evening.`;
    else if (s.solar > 0.05) msg = `<strong>Morning light.</strong> The panels are waking up and covering the kettle, the toaster and the morning rush.`;
    else msg = `<strong>Quiet hours.</strong> Minimal demand while the house sleeps.`;
    caption.innerHTML = msg;
  };

  // Moving dashes along each wire
  const animateWires = () => {
    Object.values(wires).forEach((w) => {
      if (Math.abs(w.speed) < 0.05) return;
      w.offset -= Math.sign(w.speed) * (0.4 + Math.min(Math.abs(w.speed), 6) * 0.35);
      w.el.style.strokeDashoffset = w.offset.toFixed(1);
    });
    requestAnimationFrame(animateWires);
  };
  if (!reduced) requestAnimationFrame(animateWires);

  let t = 7.2, playing = !reduced, visible = false, last = 0;
  const setPlaying = (on) => {
    playing = on;
    playBtn.innerHTML = `<svg><use href="#i-${on ? 'pause' : 'play'}"/></svg>`;
    playBtn.setAttribute('aria-label', on ? 'Pause the day' : 'Play the day');
  };
  const loop = (now) => {
    if (playing && visible) {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      t += dt * 0.55; // about 34 seconds per day
      if (t > 23.5) t = 5;
      range.value = t;
      render(t);
    }
    last = now;
    requestAnimationFrame(loop);
  };
  range.addEventListener('input', () => { setPlaying(false); t = +range.value; render(t); });
  playBtn.addEventListener('click', () => setPlaying(!playing));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { threshold: 0.2 }).observe(root);
  } else visible = true;

  setPlaying(playing);
  range.value = t;
  render(t);
  requestAnimationFrame(loop);
})();
