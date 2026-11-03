/* Contact form + "book a call" scheduler. Demo mode: nothing is sent.
   In production the form posts to the site's form endpoint and the call
   booking writes to Amy's calendar. */
(function () {
  'use strict';
  var UI = window.DCUI, Cal = window.DCCalendar;

  var form = UI.$('[data-contact-form]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true, first = null;
      [['name', function (v) { return v.trim(); }], ['email', function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }], ['message', function (v) { return v.trim(); }]].forEach(function (r) {
        var el = form.elements[r[0]];
        var bad = !r[1](el.value);
        el.classList.toggle('is-invalid', bad);
        el.closest('.field').classList.toggle('has-error', bad);
        if (bad) { ok = false; first = first || el; }
      });
      if (!ok) { first.focus(); return; }
      UI.$('[data-contact]').classList.add('is-sent');
    });
  }

  var calEl = UI.$('[data-call-cal]');
  if (!calEl) return;
  var slotsEl = UI.$('[data-call-slots]');
  var out = UI.$('[data-call-out]');
  var btn = UI.$('[data-call-book]');
  var pick = { date: null, time: null };

  function update() {
    if (pick.date && pick.time) {
      out.textContent = Cal.format(pick.date) + ', ' + pick.time;
      UI.$('[data-call-fields]').style.display = '';
      btn.classList.remove('is-disabled');
    } else if (pick.date) {
      out.textContent = Cal.format(pick.date) + ': pick a time';
      btn.classList.add('is-disabled');
    }
  }

  Cal.create(calEl, {
    mode: 'slot', months: 3,
    onSelect: function (d) { pick.date = d; pick.time = null; Cal.renderSlots(slotsEl, d, null); update(); }
  });
  Cal.renderSlots(slotsEl, null);
  slotsEl.addEventListener('click', function (e) {
    var s = e.target.closest('[data-slot]');
    if (!s) return;
    pick.time = s.getAttribute('data-slot');
    Cal.renderSlots(slotsEl, pick.date, pick.time);
    update();
  });
  btn.addEventListener('click', function () {
    if (!pick.date || !pick.time) return;
    out.innerHTML = UI.icon('check') + ' Booked: ' + UI.esc(Cal.format(pick.date)) + ', ' + UI.esc(pick.time);
    UI.$('[data-call-fields]').style.display = 'none';
    btn.style.display = 'none';
    UI.toast('Call booked. Amy will ring you then!');
  });
})();
