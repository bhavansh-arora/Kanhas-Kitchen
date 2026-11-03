/* Program catalogue: filter by year band and format, search, sort.
   Filters are mirrored in the URL (?band=y34&mode=online) so links can be shared. */
(function () {
  'use strict';
  var DC = window.DC, UI = window.DCUI;
  var grid = UI.$('[data-catalogue]');
  if (!grid) return;

  var params = new URLSearchParams(location.search);
  var state = {
    band: params.get('band') || 'all',
    mode: params.get('mode') || 'all',
    q: '',
    sort: 'featured'
  };

  function chips(groupEl, list, key) {
    groupEl.innerHTML = list.map(function (b) {
      return '<button class="filter' + (state[key] === b.id ? ' is-active' : '') + '" type="button" data-' + key + '="' + b.id + '" aria-pressed="' + (state[key] === b.id) + '">' + UI.esc(b.label) + '</button>';
    }).join('');
  }

  function matches(p) {
    if (state.band !== 'all' && p.band.indexOf(state.band) === -1) return false;
    if (state.mode !== 'all' && p.mode !== state.mode) return false;
    if (state.q) {
      var hay = (p.name + ' ' + p.variant + ' ' + p.blurb + ' ' + p.bandLabel + ' ' + p.modeLabel + ' ' + p.includes.join(' ')).toLowerCase();
      if (hay.indexOf(state.q) === -1) return false;
    }
    return true;
  }

  function sorted(list) {
    var val = function (p) { return p.price === null ? Infinity : p.price; };
    var out = list.slice();
    if (state.sort === 'price-asc') out.sort(function (a, b) { return val(a) - val(b); });
    if (state.sort === 'price-desc') out.sort(function (a, b) { return (b.price === null ? -1 : b.price) - (a.price === null ? -1 : a.price); });
    if (state.sort === 'name') out.sort(function (a, b) { return (a.name + a.variant).localeCompare(b.name + b.variant); });
    return out;
  }

  function render() {
    chips(UI.$('[data-filter="band"]'), DC.bands, 'band');
    chips(UI.$('[data-filter="mode"]'), DC.modes, 'mode');
    var list = sorted(DC.programs.filter(matches));
    UI.$('[data-count-out]').textContent = 'Showing ' + list.length + ' program' + (list.length === 1 ? '' : 's');
    grid.innerHTML = list.length
      ? list.map(function (p, i) { return UI.cardHTML(p, i); }).join('')
      : '<div class="cat-empty"><p class="h3">No programs match that mix.</p><p class="muted">Try another year level or format, or <a href="contact.html" style="color:var(--pink);font-weight:600">ask Amy</a> for something custom.</p><button class="add-btn" type="button" data-reset style="margin-top:20px">Clear filters</button></div>';

    var qs = new URLSearchParams();
    if (state.band !== 'all') qs.set('band', state.band);
    if (state.mode !== 'all') qs.set('mode', state.mode);
    var s = qs.toString();
    history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash);
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-band], [data-mode], [data-reset]');
    if (!t || !t.closest('.filters, .cat-grid')) return;
    if (t.hasAttribute('data-reset')) { state.band = 'all'; state.mode = 'all'; state.q = ''; UI.$('[data-search]').value = ''; }
    if (t.hasAttribute('data-band')) state.band = t.getAttribute('data-band');
    if (t.hasAttribute('data-mode')) state.mode = t.getAttribute('data-mode');
    render();
  });

  var searchTimer;
  UI.$('[data-search]').addEventListener('input', function (e) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { state.q = e.target.value.trim().toLowerCase(); render(); }, 140);
  });
  UI.$('[data-sort]').addEventListener('change', function (e) { state.sort = e.target.value; render(); });

  render();
})();
