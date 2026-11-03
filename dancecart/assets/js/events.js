/* Event date checker: choose an event type and a date, then request it.
   The request is added to the enrolment cart and the date travels with it. */
(function () {
  'use strict';
  var UI = window.DCUI, Cal = window.DCCalendar;
  var calEl = UI.$('[data-ev-cal]');
  if (!calEl) return;

  var type = { id: 'fete', label: 'Fete' };
  var picked = null, pickedState = null;
  var out = UI.$('[data-ev-out]'), note = UI.$('[data-ev-note]'), btn = UI.$('[data-ev-request]');

  Cal.create(calEl, {
    mode: 'event',
    onSelect: function (d, st) {
      picked = d; pickedState = st;
      out.textContent = Cal.format(d);
      note.textContent = st === 'limited' ? 'Limited availability: a few slots left on this day. Request it soon.' : 'Good news: we’re free on this day.';
      btn.classList.remove('is-disabled');
    }
  });

  UI.$$('[data-ev-type]').forEach(function (b) {
    b.addEventListener('click', function () {
      UI.$$('[data-ev-type]').forEach(function (x) { x.classList.remove('is-active'); });
      b.classList.add('is-active');
      type = { id: b.getAttribute('data-ev-type'), label: b.getAttribute('data-ev-label') };
    });
  });

  btn.addEventListener('click', function () {
    if (!picked) return;
    var reqs = UI.store.get('dc-event-dates', {});
    reqs[type.id] = { label: type.label, date: picked.toISOString() };
    UI.store.set('dc-event-dates', reqs);
    if (!UI.Cart.has(type.id)) UI.Cart.add(type.id);
    UI.toast(type.label + ' on ' + Cal.format(picked, false) + ' added to your enrolment.', 'View cart');
  });
})();
