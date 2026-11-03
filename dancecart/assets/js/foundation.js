/* Online Foundation pricing picker: choose a band, see what's included,
   add it to the enrolment cart or buy straight away by card. */
(function () {
  'use strict';
  var DC = window.DC, UI = window.DCUI;
  var opts = UI.$('[data-price-opts]');
  if (!opts) return;

  var list = DC.programs.filter(function (p) { return p.family === 'online'; });
  var selected = list[0].id;

  opts.innerHTML = list.map(function (p) {
    var save = p.id === DC.bundleId ? '<small>Best value &middot; every band</small>' : '<small>per band</small>';
    return '<button class="pr-opt" type="button" role="radio" data-pick="' + p.id + '">' +
      '<span class="pr-opt__radio" aria-hidden="true"></span>' +
      '<span><span class="pr-opt__name">' + UI.esc(p.variant) + '</span><br><span class="pr-opt__sub">' + UI.esc(p.blurb) + '</span></span>' +
      '<span class="pr-opt__price">' + DC.money(p.price) + save + '</span></button>';
  }).join('');

  function update() {
    var p = DC.byId(selected);
    UI.$$('[data-pick]').forEach(function (b) {
      var on = b.getAttribute('data-pick') === selected;
      b.classList.toggle('is-selected', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    UI.$('[data-price-amt]').innerHTML = '<sup>$</sup>' + p.price.toLocaleString('en-AU');
    UI.$('[data-price-sel]').textContent = 'Online Foundation · ' + p.variant;
    UI.$('[data-price-inc]').innerHTML = p.includes.map(function (x) { return '<li>' + UI.icon('check') + UI.esc(x) + '</li>'; }).join('');
    var add = UI.$('[data-price-add]');
    add.setAttribute('data-add', p.id);
    add.removeAttribute('data-label');
    var txt = add.querySelector('.btn__text');
    txt.textContent = 'Add to enrolment'; txt.setAttribute('data-text', 'Add to enrolment');
    UI.$('[data-price-buy]').href = p.checkout;
    UI.renderCart();
  }

  opts.addEventListener('click', function (e) {
    var b = e.target.closest('[data-pick]');
    if (!b) return;
    selected = b.getAttribute('data-pick');
    update();
  });
  update();
})();
