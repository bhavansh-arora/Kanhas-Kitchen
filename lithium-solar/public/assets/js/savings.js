/* Savings calculator page: live KPIs, 25-year chart with hover, and a table view. */
(function () {
  'use strict';
  var root = document.querySelector('[data-calc]');
  if (!root || !window.LithiumCalc) return;

  var C = window.LithiumCalc;
  var L = window.Lithium || {};
  var animate = L.animateNumber || function (el, v, f) { el.textContent = f(v); };
  var fill = L.setRangeFill || function () {};
  var COLORS = { utility: '#d9772a', solar: '#3f8ae6' };
  var NS = 'http://www.w3.org/2000/svg';

  var el = {
    bill: root.querySelector('#c-bill'),
    billOut: root.querySelector('[data-c-bill]'),
    offset: root.querySelector('#c-offset'),
    offsetOut: root.querySelector('[data-c-offset]'),
    rate: root.querySelector('#c-rate'),
    sun: root.querySelector('#c-sun'),
    cpw: root.querySelector('#c-cpw'),
    esc: root.querySelector('#c-esc'),
    min: root.querySelector('[data-min-label]'),
    max: root.querySelector('[data-max-label]'),
    chart: root.querySelector('[data-chart]'),
    tip: root.querySelector('[data-tip]'),
    table: root.querySelector('[data-table]'),
    go: root.querySelector('[data-calc-go]')
  };
  var RANGES = { home: { min: 50, max: 1000, step: 10, def: 250 }, business: { min: 200, max: 15000, step: 50, def: 2500 } };
  var state = { type: 'home' };
  var last = null;

  // Prefill from the URL or an earlier visit.
  try {
    var saved = JSON.parse(localStorage.getItem('li-quote') || '{}');
    if (saved.type === 'business') state.type = 'business';
    if (saved.bill) state.bill = +saved.bill;
  } catch (e) {}
  var qs = new URLSearchParams(location.search);
  if (qs.get('bill')) state.bill = +qs.get('bill');
  if (qs.get('type') === 'business') state.type = 'business';

  function setType(t, keepBill) {
    state.type = t;
    var r = RANGES[t];
    el.bill.min = r.min; el.bill.max = r.max; el.bill.step = r.step;
    if (!keepBill || !state.bill || state.bill < r.min || state.bill > r.max) state.bill = r.def;
    el.bill.value = state.bill;
    el.min.textContent = C.money(r.min);
    el.max.textContent = C.money(r.max) + (t === 'home' ? '+' : '+');
    root.querySelectorAll('[data-type]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-type') === t)); });
    update();
  }

  function num(input, scale) { var v = parseFloat(input.value); return isNaN(v) ? undefined : v * (scale || 1); }

  function update() {
    state.bill = +el.bill.value;
    fill(el.bill); fill(el.offset);
    el.billOut.textContent = C.money(state.bill);
    el.offsetOut.textContent = el.offset.value + '%';
    var r = C.estimate(state.bill, {
      offset: +el.offset.value / 100,
      rate: num(el.rate),
      sunHours: num(el.sun),
      costPerWatt: num(el.cpw),
      escalation: num(el.esc, 0.01)
    });
    last = r;
    var k = function (key) { return root.querySelector('[data-k="' + key + '"]'); };
    animate(k('net'), r.net, function (v) { return C.money(v); });
    animate(k('kw'), r.systemKw, function (v) { return v.toFixed(1) + ' kW'; });
    animate(k('panels'), r.panels, function (v) { return String(Math.round(v)); });
    animate(k('cost'), r.cost, function (v) { return C.money(v, true); });
    animate(k('year1'), r.year1, function (v) { return C.money(v); });
    animate(k('payback'), r.payback || 0, function (v) { return r.payback ? v.toFixed(1) + ' yrs' : '25+ yrs'; });
    animate(k('co2'), r.co2Tons, function (v) { return Math.round(v) + ' t'; });
    drawChart(r);
    drawTable(r);
    persist();
  }

  function persist() {
    try {
      var s = JSON.parse(localStorage.getItem('li-quote') || '{}');
      s.bill = state.bill; s.type = state.type;
      localStorage.setItem('li-quote', JSON.stringify(s));
    } catch (e) {}
  }

  /* ---------- Chart ---------- */
  function niceMax(v) {
    var p = Math.pow(10, Math.floor(Math.log10(v)));
    var n = v / p;
    var step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return step * p;
  }
  function mk(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var a in attrs) n.setAttribute(a, attrs[a]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function drawChart(r) {
    var box = el.chart;
    var old = box.querySelector('svg');
    if (old) old.remove();
    var W = Math.max(280, box.clientWidth);
    var small = W < 560;
    var H = Math.round(Math.max(240, Math.min(380, W * 0.52)));
    var m = { t: 18, r: small ? 12 : 128, b: 30, l: small ? 44 : 56 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var s = r.series;
    var maxV = niceMax(Math.max(s[s.length - 1].utility, s[s.length - 1].solar, s[0].solar) * 1.04);
    var x = function (yr) { return m.l + (yr / 25) * iw; };
    var y = function (v) { return m.t + ih - (v / maxV) * ih; };

    var svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'Cumulative energy cost over 25 years. Utility only reaches ' + C.money(s[25].utility) + '; with solar ' + C.money(s[25].solar) + '.' });

    // Grid and y labels
    for (var i = 0; i <= 4; i++) {
      var v = (maxV / 4) * i;
      mk('line', { x1: m.l, x2: m.l + iw, y1: y(v), y2: y(v), class: 'grid-line' }, svg);
      mk('text', { x: m.l - 10, y: y(v) + 4, 'text-anchor': 'end', class: 'axis-text' }, svg).textContent = C.money(v, true);
    }
    [0, 5, 10, 15, 20, 25].forEach(function (yr) {
      var lab = small ? String(yr) : (yr === 0 ? 'Today' : 'Yr ' + yr);
      if (small && yr === 25) lab = '25 yrs';
      mk('text', { x: x(yr), y: H - 8, 'text-anchor': yr === 0 ? 'start' : yr === 25 ? 'end' : 'middle', class: 'axis-text' }, svg).textContent = lab;
    });

    // Break-even marker
    var be = null;
    for (var k = 1; k < s.length; k++) {
      if (s[k].solar <= s[k].utility && s[k - 1].solar > s[k - 1].utility) {
        var d0 = s[k - 1].solar - s[k - 1].utility, d1 = s[k].solar - s[k].utility;
        be = k - 1 + d0 / (d0 - d1);
        break;
      }
    }
    if (be !== null) {
      var bv = s[Math.floor(be)].utility + (s[Math.ceil(be)].utility - s[Math.floor(be)].utility) * (be - Math.floor(be));
      mk('line', { x1: x(be), x2: x(be), y1: m.t, y2: m.t + ih, class: 'xhair', style: 'stroke:rgba(242,178,54,.5)' }, svg);
      var t = mk('text', { x: x(be) + 8, y: m.t + 12, class: 'axis-text', style: 'fill:#f2b236' }, svg);
      t.textContent = 'Break-even ≈ yr ' + be.toFixed(1);
      mk('circle', { cx: x(be), cy: y(bv), r: 5, fill: '#f2b236', class: 'dot' }, svg);
    }

    // Lines
    function path(key) { return s.map(function (p, j) { return (j ? 'L' : 'M') + x(p.year).toFixed(1) + ',' + y(p[key]).toFixed(1); }).join(''); }
    var lu = mk('path', { d: path('utility'), class: 'series', stroke: COLORS.utility }, svg);
    var ls = mk('path', { d: path('solar'), class: 'series', stroke: COLORS.solar }, svg);
    [lu, ls].forEach(function (p) {
      var len = p.getTotalLength ? p.getTotalLength() : 0;
      if (!len || window.matchMedia('(prefers-reduced-motion: reduce)').matches || drawChart.drawn) return;
      p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
      p.getBoundingClientRect();
      p.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(.22,1,.36,1)';
      requestAnimationFrame(function () { p.style.strokeDashoffset = 0; });
    });
    drawChart.drawn = true;

    // Direct labels at the line ends (desktop)
    if (!small) {
      var yu = y(s[25].utility), ys = y(s[25].solar);
      if (Math.abs(yu - ys) < 34) { var mid = (yu + ys) / 2; yu = mid - 17; ys = mid + 17; }
      [[yu, 'Utility only', s[25].utility, COLORS.utility], [ys, 'With solar', s[25].solar, COLORS.solar]].forEach(function (d) {
        mk('rect', { x: m.l + iw + 10, y: d[0] - 8, width: 10, height: 3, rx: 1.5, fill: d[3] }, svg);
        var tx = mk('text', { x: m.l + iw + 26, y: d[0] - 3, class: 'direct' }, svg); tx.textContent = d[1];
        var tv = mk('text', { x: m.l + iw + 26, y: d[0] + 13, class: 'axis-text' }, svg); tv.textContent = C.money(d[2], true);
      });
    }

    // Hover layer
    var hx = mk('line', { y1: m.t, y2: m.t + ih, class: 'xhair', visibility: 'hidden' }, svg);
    var du = mk('circle', { r: 5, fill: COLORS.utility, class: 'dot', visibility: 'hidden' }, svg);
    var ds = mk('circle', { r: 5, fill: COLORS.solar, class: 'dot', visibility: 'hidden' }, svg);
    var hit = mk('rect', { x: m.l, y: 0, width: iw, height: H, fill: 'transparent', style: 'cursor:crosshair' }, svg);
    function move(e) {
      var rect = svg.getBoundingClientRect();
      var px = (e.clientX - rect.left) * (W / rect.width);
      var yr = Math.max(0, Math.min(25, Math.round(((px - m.l) / iw) * 25)));
      var p = s[yr];
      hx.setAttribute('x1', x(yr)); hx.setAttribute('x2', x(yr));
      du.setAttribute('cx', x(yr)); du.setAttribute('cy', y(p.utility));
      ds.setAttribute('cx', x(yr)); ds.setAttribute('cy', y(p.solar));
      [hx, du, ds].forEach(function (n) { n.setAttribute('visibility', 'visible'); });
      el.tip.innerHTML = '<span class="label">' + (yr === 0 ? 'Today' : 'Year ' + yr) + '</span>' +
        '<div><span><i style="background:' + COLORS.utility + '"></i>Utility only</span><b>' + C.money(p.utility) + '</b></div>' +
        '<div><span><i style="background:' + COLORS.solar + '"></i>With solar</span><b>' + C.money(p.solar) + '</b></div>' +
        '<div style="border-top:1px solid rgba(234,240,247,.15);padding-top:6px"><span>You keep</span><b>' + C.money(p.utility - p.solar) + '</b></div>';
      var tx = (x(yr) / W) * rect.width;
      var left = tx + 16 + 200 > rect.width ? tx - 216 : tx + 16;
      el.tip.style.transform = 'translate(' + Math.max(0, left) + 'px,' + 8 + 'px)';
      el.tip.classList.add('is-on');
    }
    function leave() { [hx, du, ds].forEach(function (n) { n.setAttribute('visibility', 'hidden'); }); el.tip.classList.remove('is-on'); }
    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', leave);
    box.appendChild(svg);
  }

  function drawTable(r) {
    var rows = r.series.filter(function (p) { return p.year % 1 === 0; }).map(function (p) {
      return '<tr><td>' + (p.year === 0 ? 'Today' : 'Year ' + p.year) + '</td><td>' + C.money(p.utility) + '</td><td>' + C.money(p.solar) + '</td><td>' + C.money(p.utility - p.solar) + '</td></tr>';
    }).join('');
    el.table.innerHTML = '<table class="chart-table"><caption class="sr-only">Cumulative energy cost by year</caption><thead><tr><th scope="col">Year</th><th scope="col">Utility only</th><th scope="col">With solar</th><th scope="col">You keep</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  // Events
  root.querySelectorAll('[data-type]').forEach(function (b) { b.addEventListener('click', function () { setType(b.getAttribute('data-type')); }); });
  root.querySelectorAll('[data-view]').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-view');
      root.querySelectorAll('[data-view]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      el.chart.hidden = v !== 'chart';
      el.table.hidden = v !== 'table';
      root.querySelector('.legend').style.display = v === 'chart' ? '' : 'none';
    });
  });
  [el.bill, el.offset].forEach(function (i) { i.addEventListener('input', update); });
  [el.rate, el.sun, el.cpw, el.esc].forEach(function (i) { i.addEventListener('input', update); });
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (last) drawChart(last); }, 150); });

  setType(state.type, true);
})();
