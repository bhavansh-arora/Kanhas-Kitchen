/* Availability calendar used for event dates, Zoom inductions and discovery calls.
   In this demo, availability is generated from the date so it stays the same
   between visits. In production it reads Amy's real calendar (e.g. Google Calendar). */
(function () {
  'use strict';
  var UI = window.DCUI;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function hash(n) { n = ((n >> 16) ^ n) * 0x45d9f3b; n = ((n >> 16) ^ n) * 0x45d9f3b; n = (n >> 16) ^ n; return Math.abs(n) % 100; }
  function key(d) { return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }

  var today = startOfDay(new Date());

  function dayState(d, mode) {
    if (d < today) return 'off';
    var dow = d.getDay(); // 0 Sun
    var h = hash(key(d) * (mode === 'event' ? 7 : 13));
    if (mode === 'event') {
      if (d < addDays(today, 21) || dow === 0) return 'off';
      if (h < 20) return 'booked';
      if (h < 42 || dow === 5 || dow === 6) return 'limited';
      return 'available';
    }
    // slot mode: weekdays, from 2 days out, 8 weeks ahead
    if (dow === 0 || dow === 6 || d < addDays(today, 2) || d > addDays(today, 56)) return 'off';
    if (h < 15) return 'booked';
    return h < 40 ? 'limited' : 'available';
  }

  function slotsFor(d) {
    var all = ['8:15 am', '9:00 am', '11:30 am', '1:00 pm', '3:30 pm', '4:15 pm'];
    var st = dayState(d, 'slot');
    return all.map(function (t, i) {
      var taken = hash(key(d) * 31 + i) < (st === 'limited' ? 65 : 25);
      return { time: t, taken: taken };
    });
  }

  function Calendar(el, opts) {
    this.el = el;
    this.mode = opts.mode || 'event';
    this.onSelect = opts.onSelect || function () {};
    this.view = new Date(today.getFullYear(), today.getMonth(), 1);
    if (this.mode === 'event') {
      var first = addDays(today, 21);
      // Open on the next month when most of this one is already out of reach
      this.view = new Date(first.getFullYear(), first.getMonth() + (first.getDate() > 15 ? 1 : 0), 1);
    }
    this.min = new Date(this.view);
    this.max = new Date(today.getFullYear(), today.getMonth() + (opts.months || 12), 1);
    this.selected = null;
    var self = this;
    el.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-cal-nav]');
      if (nav) { self.view.setMonth(self.view.getMonth() + Number(nav.getAttribute('data-cal-nav'))); self.render(); return; }
      var day = e.target.closest('[data-date]');
      if (day && !day.disabled) {
        var p = day.getAttribute('data-date').split('-');
        self.selected = new Date(+p[0], +p[1] - 1, +p[2]);
        self.render();
        self.onSelect(self.selected, dayState(self.selected, self.mode));
      }
    });
    this.render();
  }

  Calendar.prototype.render = function () {
    var v = this.view, mode = this.mode, sel = this.selected;
    var first = new Date(v.getFullYear(), v.getMonth(), 1);
    var offset = (first.getDay() + 6) % 7;
    var days = new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate();
    var cells = '';
    for (var i = 0; i < offset; i++) cells += '<span class="cal__day is-empty" aria-hidden="true"></span>';
    for (var d = 1; d <= days; d++) {
      var date = new Date(v.getFullYear(), v.getMonth(), d);
      var st = dayState(date, mode);
      var isSel = sel && key(sel) === key(date);
      var label = date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) + (st === 'off' ? ', unavailable' : st === 'booked' ? ', booked' : st === 'limited' ? ', limited availability' : ', available');
      cells += '<button type="button" class="cal__day is-' + st + (isSel ? ' is-selected' : '') + '" data-date="' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + d + '"' + (st === 'off' || st === 'booked' ? ' disabled' : '') + ' aria-label="' + label + '"' + (isSel ? ' aria-pressed="true"' : '') + '>' + d + '</button>';
    }
    var atMin = v <= this.min, atMax = new Date(v.getFullYear(), v.getMonth() + 1, 1) >= this.max;
    this.el.innerHTML =
      '<div class="cal__head"><p class="cal__month">' + MONTHS[v.getMonth()] + ' <span class="serif" style="color:var(--pink)">' + v.getFullYear() + '</span></p>' +
      '<div class="cal__nav"><button class="icon-btn" type="button" data-cal-nav="-1" aria-label="Previous month"' + (atMin ? ' disabled' : '') + '>' + UI.icon('arrow-l') + '</button>' +
      '<button class="icon-btn" type="button" data-cal-nav="1" aria-label="Next month"' + (atMax ? ' disabled' : '') + '>' + UI.icon('arrow') + '</button></div></div>' +
      '<div class="cal__grid">' + DOW.map(function (x) { return '<span class="cal__dow">' + x + '</span>'; }).join('') + cells + '</div>' +
      '<div class="cal__legend"><span><i></i>Available</span><span><i class="l"></i>Limited</span><span><i class="b"></i>Booked</span></div>';
  };

  window.DCCalendar = {
    create: function (el, opts) { return new Calendar(el, opts); },
    slotsFor: slotsFor,
    format: function (d, withDay) { return d.toLocaleDateString('en-AU', withDay === false ? { day: 'numeric', month: 'long', year: 'numeric' } : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); },
    renderSlots: function (el, date, selected) {
      if (!date) { el.innerHTML = '<p class="slots__empty">Pick a day to see times (AEST).</p>'; return; }
      el.innerHTML = slotsFor(date).map(function (s) {
        return '<button type="button" class="slot' + (selected === s.time ? ' is-selected' : '') + '" data-slot="' + s.time + '"' + (s.taken ? ' disabled aria-label="' + s.time + ' booked"' : '') + '>' + s.time + '</button>';
      }).join('');
    }
  };
})();
