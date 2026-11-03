/* Admin preview: sample enrolments merged with any made in this browser.
   In production this is a password-protected page reading the enrolment database. */
(function () {
  'use strict';
  var DC = window.DC, UI = window.DCUI;
  if (!UI.$('[data-rows]')) return;

  var now = new Date();
  function daysAgo(n) { var d = new Date(now); d.setDate(d.getDate() - n); return d.toISOString(); }
  function daysAhead(n) { var d = new Date(now); d.setDate(d.getDate() + n); return d.toISOString(); }

  // Fictional sample schools for the demo
  var sample = [
    { ref: 'DC-418220', created: daysAgo(1), school: 'Harbourview State School', state: 'QLD', items: ['of-all'], total: 1499, method: 'invoice', status: 'invoice', induction: { date: daysAhead(4), time: '3:30 pm' } },
    { ref: 'DC-418104', created: daysAgo(2), school: 'St Brigid’s Primary', state: 'NSW', items: ['of-y34', 'of-y56'], total: 1598, method: 'card', status: 'paid', induction: { date: daysAhead(6), time: '8:15 am' } },
    { ref: 'DC-417990', created: daysAgo(3), school: 'Red Gum Creek P–6', state: 'WA', items: ['of-prep'], total: 799, method: 'card', status: 'paid', small: true, induction: { date: daysAhead(9), time: '1:00 pm' } },
    { ref: 'DC-417812', created: daysAgo(5), school: 'Northlakes Primary', state: 'QLD', items: ['graduation'], total: 0, quotes: 1, method: 'quote', status: 'quote' },
    { ref: 'DC-417640', created: daysAgo(7), school: 'Our Lady of the Bay', state: 'VIC', items: ['of-y12', 'fete'], total: 799, quotes: 1, method: 'po', status: 'po', induction: { date: daysAhead(12), time: '4:15 pm' } },
    { ref: 'DC-417455', created: daysAgo(10), school: 'Wattle Hill State School', state: 'QLD', items: ['in-school'], total: 0, quotes: 1, method: 'quote', status: 'quote' },
    { ref: 'DC-417230', created: daysAgo(13), school: 'Saltwater Bay Primary', state: 'SA', items: ['of-all'], total: 1499, method: 'card', status: 'paid' },
    { ref: 'DC-416980', created: daysAgo(18), school: 'Kookaburra Flat School', state: 'NT', items: ['of-y56'], total: 799, method: 'invoice', status: 'invoice', small: true }
  ];

  var STATUS = { paid: ['Paid', 'status--paid'], invoice: ['Invoice sent', 'status--invoice'], po: ['PO received', 'status--po'], quote: ['Quote to send', 'status--quote'] };
  var filter = 'all';

  function all() { return UI.store.get('dc-enrolments', []).concat(sample); }
  function short(id) { var p = DC.byId(id); return p ? (p.family === 'online' ? 'Online · ' + p.variant : p.name) : id; }
  function fmtDate(iso) { return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }); }

  function kpis(list) {
    var rev = 0, outstanding = 0, quotes = 0;
    list.forEach(function (r) { if (r.status === 'paid') rev += r.total; else if (r.status !== 'quote') outstanding += r.total; quotes += r.quotes || 0; });
    var mine = UI.store.get('dc-enrolments', []).length;
    var tiles = [
      ['Paid this term', DC.money(rev + 18960), '↑ 24% on last term', true],
      ['Enrolments', String(list.length + 37), mine ? '+' + mine + ' from you just now' : '↑ 9 this month'],
      ['Awaiting payment', DC.money(outstanding), 'Invoices & purchase orders'],
      ['Quotes to send', String(quotes), 'In-school & events']
    ];
    UI.$('[data-kpis]').innerHTML = tiles.map(function (t) {
      return '<div class="kpi' + (t[3] ? ' kpi--ink' : '') + '"><p class="kpi__label">' + t[0] + '</p><p class="kpi__num">' + t[1] + '</p><p class="kpi__delta">' + t[2] + '</p></div>';
    }).join('');
  }

  function rows(list) {
    var mineRefs = UI.store.get('dc-enrolments', []).map(function (r) { return r.ref; });
    var shown = list.filter(function (r) { return filter === 'all' || r.status === filter; });
    UI.$('[data-rows]').innerHTML = shown.length ? shown.map(function (r) {
      var s = STATUS[r.status] || STATUS.paid;
      return '<tr class="' + (mineRefs.indexOf(r.ref) > -1 ? 'is-new' : '') + '"><td><small>' + UI.esc(r.ref) + '</small></td>' +
        '<td><strong>' + UI.esc(r.school) + '</strong><small>' + UI.esc(r.state || '') + (r.small ? ' · small school' : '') + '</small></td>' +
        '<td>' + r.items.map(short).map(UI.esc).join('<br>') + '</td>' +
        '<td><span class="status ' + s[1] + '">' + s[0] + '</span></td>' +
        '<td><strong>' + (r.total ? DC.money(r.total) : 'Quote') + '</strong></td>' +
        '<td><small>' + fmtDate(r.created) + '</small></td></tr>';
    }).join('') : '<tr><td colspan="6" class="muted">No enrolments with this status.</td></tr>';

    var opts = [['all', 'All'], ['paid', 'Paid'], ['invoice', 'Invoice'], ['po', 'PO'], ['quote', 'Quote']];
    UI.$('[data-status-filter]').innerHTML = opts.map(function (o) {
      return '<button class="filter' + (filter === o[0] ? ' is-active' : '') + '" type="button" data-sf="' + o[0] + '" aria-pressed="' + (filter === o[0]) + '">' + o[1] + '</button>';
    }).join('');
  }

  function upcoming(list) {
    var items = list.filter(function (r) { return r.induction; }).sort(function (a, b) { return new Date(a.induction.date) - new Date(b.induction.date); }).slice(0, 5);
    UI.$('[data-upcoming]').innerHTML = items.length ? items.map(function (r) {
      var d = new Date(r.induction.date);
      return '<li><span class="upcoming__date"><span><strong>' + d.getDate() + '</strong><small>' + d.toLocaleDateString('en-AU', { month: 'short' }) + '</small></span></span>' +
        '<span class="upcoming__text"><strong>' + UI.esc(r.school) + '</strong><span>' + UI.esc(r.induction.time) + ' AEST · ' + UI.esc(r.items.map(short).join(', ')) + '</span></span></li>';
    }).join('') : '<li class="muted small">No inductions booked.</li>';
  }

  function bands(list) {
    var ids = ['of-prep', 'of-y12', 'of-y34', 'of-y56'];
    var base = [9, 12, 14, 11];
    var counts = ids.map(function (id, i) {
      return base[i] + list.filter(function (r) { return r.items.indexOf(id) > -1 || r.items.indexOf('of-all') > -1; }).length;
    });
    var max = Math.max.apply(null, counts);
    UI.$('[data-bands]').innerHTML = ids.map(function (id, i) {
      return '<div class="bars__row"><span>' + UI.esc(DC.byId(id).variant.replace(' to ', '–')) + '</span><span class="bars__track"><span class="bars__fill" style="width:' + (counts[i] / max * 100) + '%"></span></span><strong>' + counts[i] + '</strong></div>';
    }).join('');
  }

  function chart(list) {
    var el = UI.$('[data-chart]');
    var months = [], vals = [];
    var seed = [4200, 3100, 9800, 7400, 5200, 6900, 8100, 4600, 3900, 10400, 12200, 0];
    for (var i = 11; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toLocaleDateString('en-AU', { month: 'short' }));
    }
    vals = seed.slice();
    vals[11] = 6100 + list.filter(function (r) { return r.status === 'paid' && new Date(r.created).getMonth() === now.getMonth(); }).reduce(function (s, r) { return s + r.total; }, 0);
    var W = 720, H = 220, padL = 44, padB = 28, padT = 12;
    var max = Math.ceil(Math.max.apply(null, vals) / 5000) * 5000;
    var bw = (W - padL) / vals.length;
    var grid = [0, 0.5, 1].map(function (f) {
      var y = padT + (H - padT - padB) * (1 - f);
      return '<line x1="' + padL + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="rgba(15,10,18,.08)"/><text x="' + (padL - 8) + '" y="' + (y + 4) + '" text-anchor="end" font-size="11" fill="rgba(15,10,18,.55)">' + (max * f / 1000) + 'k</text>';
    }).join('');
    var bars = vals.map(function (v, i) {
      var h = (H - padT - padB) * v / max;
      var x = padL + i * bw + bw * 0.22, w = bw * 0.56, y = H - padB - h;
      var r = Math.min(4, w / 2, h);
      var path = 'M' + x + ',' + (H - padB) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (H - padB) + 'Z';
      return '<g class="chart__bar" data-tip="' + months[i] + ': ' + DC.money(v) + '"><rect x="' + (padL + i * bw) + '" y="' + padT + '" width="' + bw + '" height="' + (H - padT - padB) + '" fill="transparent"/>' +
        '<path d="' + path + '" fill="' + (i === 11 ? '#ea097f' : '#ef5fa2') + '"/>' +
        '<text x="' + (padL + i * bw + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="rgba(15,10,18,.55)">' + months[i] + '</text></g>';
    }).join('');
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="spark" role="img" aria-label="Monthly revenue, last 12 months. Highest ' + DC.money(Math.max.apply(null, vals)) + '.">' + grid + bars + '</svg><div class="chart__tip" aria-hidden="true"></div>' +
      '<table class="sr-only"><caption>Revenue by month</caption><tbody>' + vals.map(function (v, i) { return '<tr><th>' + months[i] + '</th><td>' + DC.money(v) + '</td></tr>'; }).join('') + '</tbody></table>';
    var tip = UI.$('.chart__tip', el);
    el.addEventListener('mousemove', function (e) {
      var g = e.target.closest('.chart__bar');
      if (!g) { tip.style.opacity = 0; return; }
      var r = el.getBoundingClientRect();
      tip.textContent = g.getAttribute('data-tip');
      tip.style.opacity = 1;
      tip.style.transform = 'translate(' + (e.clientX - r.left) + 'px,' + (e.clientY - r.top - 12) + 'px) translate(-50%,-100%)';
    });
    el.addEventListener('mouseleave', function () { tip.style.opacity = 0; });
  }

  function render() {
    var list = all();
    kpis(list); rows(list); upcoming(list); bands(list); chart(list);
  }

  document.addEventListener('click', function (e) {
    var sf = e.target.closest('[data-sf]');
    if (sf) { filter = sf.getAttribute('data-sf'); rows(all()); return; }
    if (e.target.closest('[data-reset-demo]')) { UI.store.set('dc-enrolments', []); render(); UI.toast('Demo data reset.'); return; }
    if (e.target.closest('[data-export]')) {
      var lines = [['Ref', 'School', 'State', 'Programs', 'Payment', 'Total (AUD)', 'Date']].concat(all().map(function (r) {
        return [r.ref, r.school, r.state, r.items.map(short).join('; '), (STATUS[r.status] || STATUS.paid)[0], r.total, new Date(r.created).toLocaleDateString('en-AU')];
      }));
      var csv = lines.map(function (l) { return l.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
      var a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      a.download = 'dance-cart-enrolments.csv';
      document.body.appendChild(a); a.click(); a.remove();
    }
  });

  UI.$('[data-today]').textContent = now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
  render();
})();
