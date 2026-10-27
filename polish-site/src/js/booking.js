/* Discovery-call booking flow.
   Four short steps that qualify the enquiry (focus, role, organisation size) before a time is picked,
   so Melissa sees who she is speaking to before the call.

   Going live: set window.POLISH_CONFIG.bookingEndpoint to a form endpoint (Formspree, Make, Zapier,
   a Cal.com / Google Calendar webhook) and the request is POSTed as JSON. Until then the confirmation
   screen offers a pre-filled email to Melissa so no enquiry is lost. */
(function () {
  "use strict";
  var root = document.querySelector("[data-booking]");
  if (!root) return;

  var TZ = "Pacific/Auckland";
  var CONFIG = window.POLISH_CONFIG || {};
  var EMAIL = CONFIG.email || "hello@polish.nz";
  var SLOTS = [[8, 0], [9, 30], [11, 0], [13, 0], [14, 30], [16, 0]];
  var DAYS_AHEAD = 42;
  var focusAreas = (window.POLISH && window.POLISH.focusAreas) || [];
  var params = new URLSearchParams(location.search);

  var state = { step: 0, focus: [], role: "", size: "", region: "Auckland", date: null, slot: null, format: "Video call" };
  if (params.get("focus")) state.focus = params.get("focus").split(",").filter(Boolean);
  var score = params.get("score");

  var icon = {
    arrow: '<svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    globe: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/></svg>'
  };

  /* ---------- time zone helpers ---------- */
  function partsIn(date, tz) {
    var f = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    var o = {};
    f.formatToParts(date).forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute };
  }
  function zonedToUtc(y, m, d, h, mi, tz) {
    var guess = Date.UTC(y, m - 1, d, h, mi);
    for (var k = 0; k < 2; k++) {
      var p = partsIn(new Date(guess), tz);
      var asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi);
      guess -= asUtc - Date.UTC(y, m - 1, d, h, mi);
    }
    return new Date(guess);
  }
  var userTz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || TZ;
  function fmtTime(date, tz) {
    return new Intl.DateTimeFormat("en-NZ", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz }).format(date).replace(/\s/g, " ").toLowerCase();
  }
  function fmtDay(key, opts) {
    var a = key.split("-").map(Number);
    return new Intl.DateTimeFormat("en-NZ", Object.assign({ timeZone: "UTC" }, opts)).format(new Date(Date.UTC(a[0], a[1] - 1, a[2])));
  }
  function key(y, m, d) { return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0"); }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  var nowNZ = partsIn(new Date(), TZ);
  var todayKey = key(nowNZ.y, nowNZ.m, nowNZ.d);
  function availableSlots(k) {
    // Indicative availability: weekdays only, from the next working day, a few gaps per day.
    var a = k.split("-").map(Number);
    var dow = new Date(Date.UTC(a[0], a[1] - 1, a[2])).getUTCDay();
    if (dow === 0 || dow === 6) return [];
    var diff = (Date.UTC(a[0], a[1] - 1, a[2]) - Date.UTC(nowNZ.y, nowNZ.m - 1, nowNZ.d)) / 864e5;
    if (diff < 1 || diff > DAYS_AHEAD) return [];
    var h = hash(k);
    if (h % 7 === 0) return []; // fully booked day
    return SLOTS.filter(function (s, i) { return ((h >> (i * 3)) & 7) > 2; });
  }

  /* ---------- markup ---------- */
  var steps = ["Focus", "About you", "Time", "Details"];
  var host = root.getAttribute("data-host-img") || "assets/img/melissa.jpg";
  root.innerHTML =
    '<div class="booking">' +
      '<aside class="booking__aside">' +
        '<div class="booking__host"><img src="' + host + '" alt="" width="56" height="56" loading="lazy"><div><strong>Melissa Frerk</strong><span>Founder &amp; executive coach</span></div></div>' +
        '<div><h3 class="booking__title">Discovery conversation</h3><p class="muted" style="margin-top:10px">A relaxed, confidential conversation about where you are, what you want to change, and whether coaching with Polish is the right fit.</p></div>' +
        '<ul class="booking__facts">' +
          '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>30 minutes</li>' +
          '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/></svg>Video call, phone or in person in Auckland</li>' +
          '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/></svg>Complimentary &amp; confidential</li>' +
        '</ul>' +
        '<dl class="booking__summary" aria-live="polite">' +
          '<div><dt>Focus</dt><dd data-sum="focus">—</dd></div>' +
          '<div><dt>Role</dt><dd data-sum="role">—</dd></div>' +
          '<div><dt>When</dt><dd data-sum="when">—</dd></div>' +
        '</dl>' +
      '</aside>' +
      '<div class="booking__main">' +
        '<div class="progress" aria-hidden="true">' + steps.map(function (s) { return '<div class="progress__step"><div class="progress__bar"></div><div class="progress__label">' + s + "</div></div>"; }).join("") + "</div>" +

        /* step 1 */
        '<section class="bstep" data-step="0" aria-labelledby="bs0"><h3 class="bstep__title" id="bs0" tabindex="-1">What would you like to explore?</h3><p class="bstep__sub">Choose as many as you like — it helps Melissa prepare.</p>' +
          '<div class="choice-grid" role="group" aria-label="Focus areas">' + focusAreas.map(function (f) {
            return '<label class="choice"><input type="checkbox" name="focus" value="' + f.v + '"' + (state.focus.indexOf(f.v) > -1 ? " checked" : "") + '><span class="choice__box"><span class="choice__mark"></span>' + f.label + "</span></label>";
          }).join("") + "</div>" +
          (score ? '<p class="tag tag--rose" style="margin-top:20px">Readiness check result attached · ' + Math.round(+score) + "%</p>" : "") +
          '<div class="bstep__nav"><span class="bstep__error" role="alert"></span><button type="button" class="btn btn--rose" data-next>Continue' + icon.arrow + "</button></div></section>" +

        /* step 2 */
        '<section class="bstep" data-step="1" aria-labelledby="bs1"><h3 class="bstep__title" id="bs1" tabindex="-1">A little about you</h3><p class="bstep__sub">So the conversation starts in the right place.</p>' +
          '<p class="field-label" style="margin-bottom:12px">Your role</p><div class="choice-grid" role="radiogroup" aria-label="Your role">' +
            ["CEO or founder", "Executive or GM", "Senior leader", "People & culture leader", "Board member", "Something else"].map(function (r) {
              return '<label class="choice"><input type="radio" name="role" value="' + r + '"><span class="choice__box"><span class="choice__mark"></span>' + r + "</span></label>";
            }).join("") + "</div>" +
          '<p class="field-label" style="margin:28px 0 12px">Organisation size</p><div class="choice-grid choice-grid--3" role="radiogroup" aria-label="Organisation size">' +
            [["1–20", "people"], ["21–100", "people"], ["101–500", "people"], ["500+", "people"], ["Just me", "independent"], ["Not sure", ""]].map(function (r) {
              return '<label class="choice"><input type="radio" name="size" value="' + r[0] + '"><span class="choice__box"><span class="choice__mark"></span><span>' + r[0] + (r[1] ? "<small>" + r[1] + "</small>" : "") + "</span></span></label>";
            }).join("") + "</div>" +
          '<div class="field" style="margin-top:28px;max-width:360px"><label for="b-region">Where are you based?</label><select class="select" id="b-region" name="region"><option>Auckland</option><option>Elsewhere in New Zealand</option><option>Australia</option><option>Somewhere else</option></select></div>' +
          '<div class="bstep__nav"><button type="button" class="back-btn" data-back>' + icon.arrow.replace('class="btn__icon"', "") + 'Back</button><span class="bstep__error" role="alert"></span><button type="button" class="btn btn--rose" data-next>Continue' + icon.arrow + "</button></div></section>" +

        /* step 3 */
        '<section class="bstep" data-step="2" aria-labelledby="bs2"><h3 class="bstep__title" id="bs2" tabindex="-1">Choose a time</h3><p class="bstep__sub">Times are shown in Auckland time' + (userTz !== TZ ? ", with yours alongside" : "") + ".</p>" +
          '<div class="cal"><div><div class="cal__head"><span class="cal__month" aria-live="polite"></span><div class="cal__arrows"><button type="button" data-cal="-1" aria-label="Previous month">' + icon.left + '</button><button type="button" data-cal="1" aria-label="Next month">' + icon.right + '</button></div></div><div class="cal__grid" role="grid"></div></div>' +
          '<div><div class="slots__head" aria-live="polite">Select a day<span>Days with a rose dot have openings</span></div><div class="slots"></div></div></div>' +
          '<p class="tz-note">' + icon.globe + "<span>Your time zone: " + userTz.replace(/_/g, " ") + "</span></p>" +
          '<div class="bstep__nav"><button type="button" class="back-btn" data-back>' + icon.arrow.replace('class="btn__icon"', "") + 'Back</button><span class="bstep__error" role="alert"></span><button type="button" class="btn btn--rose" data-next>Continue' + icon.arrow + "</button></div></section>" +

        /* step 4 */
        '<section class="bstep" data-step="3" aria-labelledby="bs3"><h3 class="bstep__title" id="bs3" tabindex="-1">Your details</h3><p class="bstep__sub">Melissa will confirm by email, usually within one business day.</p>' +
          '<form class="form-grid" novalidate>' +
            '<div class="field"><label for="b-name">Full name <span class="req">*</span></label><input class="input" id="b-name" name="name" autocomplete="name" required><span class="field__error">Please add your name.</span></div>' +
            '<div class="field"><label for="b-email">Work email <span class="req">*</span></label><input class="input" id="b-email" name="email" type="email" autocomplete="email" required><span class="field__error">Please add a valid email.</span></div>' +
            '<div class="field"><label for="b-org">Organisation</label><input class="input" id="b-org" name="org" autocomplete="organization"></div>' +
            '<div class="field"><label for="b-phone">Phone</label><input class="input" id="b-phone" name="phone" type="tel" autocomplete="tel" placeholder="+64"></div>' +
            '<div class="field full"><span class="field-label">How would you like to meet?</span><div class="choice-grid choice-grid--3" role="radiogroup" aria-label="Meeting format">' +
              ["Video call", "Phone", "In person (Auckland)"].map(function (f, i) { return '<label class="choice"><input type="radio" name="format" value="' + f + '"' + (i === 0 ? " checked" : "") + '><span class="choice__box"><span class="choice__mark"></span>' + f + "</span></label>"; }).join("") +
            "</div></div>" +
            '<div class="field full"><label for="b-note">Anything you\'d like Melissa to know?</label><textarea class="textarea" id="b-note" name="note" placeholder="The change you\'re leading, what prompted you to reach out, what a great outcome looks like…"></textarea></div>' +
          "</form>" +
          '<div class="bstep__nav"><button type="button" class="back-btn" data-back>' + icon.arrow.replace('class="btn__icon"', "") + 'Back</button><span class="bstep__error" role="alert"></span><button type="button" class="btn btn--rose" data-submit>Request this time' + icon.arrow + "</button></div></section>" +

        /* confirmation */
        '<section class="bstep confirm" data-step="4" aria-live="polite"><div class="confirm__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>' +
          '<h3 class="bstep__title" tabindex="-1">Your time is requested</h3><p class="bstep__sub" style="margin-bottom:0">Thank you<span data-c-name></span>. Melissa will confirm by email shortly.</p>' +
          '<div class="confirm__card"></div><div class="btn-row"><a class="btn btn--white btn--sm" data-ics download="polish-discovery-call.ics" href="#">Add to calendar</a><a class="btn btn--sm" data-gcal target="_blank" rel="noopener" href="#">Google Calendar</a><a class="btn btn--sm" data-mail href="#">Email a copy to Melissa</a></div></section>' +
      "</div>" +
    "</div>";

  var sections = Array.prototype.slice.call(root.querySelectorAll(".bstep"));
  var progSteps = Array.prototype.slice.call(root.querySelectorAll(".progress__step"));
  var grid = root.querySelector(".cal__grid"), monthLabel = root.querySelector(".cal__month");
  var slotsEl = root.querySelector(".slots"), slotsHead = root.querySelector(".slots__head");
  var view = { y: nowNZ.y, m: nowNZ.m };

  function go(n, focus) {
    state.step = n;
    sections.forEach(function (s, i) { s.classList.toggle("is-active", i === n); });
    progSteps.forEach(function (p, i) { p.classList.toggle("is-active", i === n); p.classList.toggle("is-done", i < n); });
    root.querySelector(".progress").style.visibility = n > 3 ? "hidden" : "";
    if (focus !== false) {
      var t = sections[n].querySelector("[tabindex='-1']");
      if (t) t.focus({ preventScroll: true });
      var top = root.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.5) window.scrollTo({ top: window.scrollY + top - 110, behavior: "smooth" });
    }
    if (n === 2) renderCal();
  }

  function setError(n, msg) { sections[n].querySelector(".bstep__error").textContent = msg || ""; }
  function label(v) { var f = focusAreas.filter(function (x) { return x.v === v; })[0]; return f ? f.label : v; }
  function whenText() {
    if (!state.date || !state.slot) return "—";
    return fmtDay(state.date, { weekday: "short", day: "numeric", month: "short" }) + ", " + fmtTime(slotDate(), TZ);
  }
  function slotDate() { var a = state.date.split("-").map(Number); return zonedToUtc(a[0], a[1], a[2], state.slot[0], state.slot[1], TZ); }
  function summary() {
    root.querySelector('[data-sum="focus"]').textContent = state.focus.length ? (state.focus.length > 1 ? label(state.focus[0]).split(" ").slice(0, 3).join(" ") + " +" + (state.focus.length - 1) : label(state.focus[0])) : "—";
    root.querySelector('[data-sum="role"]').textContent = state.role || "—";
    root.querySelector('[data-sum="when"]').textContent = whenText();
  }

  /* inputs */
  root.addEventListener("change", function (e) {
    var t = e.target;
    if (t.name === "focus") state.focus = Array.prototype.slice.call(root.querySelectorAll('input[name="focus"]:checked')).map(function (i) { return i.value; });
    if (t.name === "role") state.role = t.value;
    if (t.name === "size") state.size = t.value;
    if (t.name === "region") state.region = t.value;
    if (t.name === "format") state.format = t.value;
    setError(state.step, "");
    summary();
  });

  root.addEventListener("click", function (e) {
    var t = e.target.closest("button, a");
    if (!t) return;
    if (t.hasAttribute("data-next")) {
      if (state.step === 0 && !state.focus.length) return setError(0, "Choose at least one area.");
      if (state.step === 1 && (!state.role || !state.size)) return setError(1, "Choose your role and organisation size.");
      if (state.step === 2 && !state.slot) return setError(2, "Choose a day and time.");
      go(state.step + 1);
    }
    if (t.hasAttribute("data-back")) go(state.step - 1);
    if (t.hasAttribute("data-cal")) {
      var dir = +t.getAttribute("data-cal");
      view.m += dir; if (view.m > 12) { view.m = 1; view.y++; } if (view.m < 1) { view.m = 12; view.y--; }
      renderCal();
    }
    if (t.hasAttribute("data-day")) {
      state.date = t.getAttribute("data-day"); state.slot = null;
      renderCal(); renderSlots(); summary(); setError(2, "");
    }
    if (t.hasAttribute("data-slot")) {
      var s = t.getAttribute("data-slot").split(":").map(Number);
      state.slot = s;
      Array.prototype.forEach.call(slotsEl.children, function (c) { c.classList.toggle("is-selected", c === t); c.setAttribute("aria-pressed", c === t ? "true" : "false"); });
      summary(); setError(2, "");
    }
    if (t.hasAttribute("data-submit")) submit();
  });

  function renderCal() {
    var first = new Date(Date.UTC(view.y, view.m - 1, 1));
    var daysIn = new Date(Date.UTC(view.y, view.m, 0)).getUTCDate();
    var offset = (first.getUTCDay() + 6) % 7; // Monday first
    monthLabel.textContent = new Intl.DateTimeFormat("en-NZ", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
    var html = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(function (d) { return '<span class="cal__dow" aria-hidden="true">' + d + "</span>"; }).join("");
    for (var i = 0; i < offset; i++) html += "<span></span>";
    for (var d = 1; d <= daysIn; d++) {
      var k = key(view.y, view.m, d), open = availableSlots(k).length > 0;
      var cls = "cal__day" + (open ? " is-available" : "") + (k === state.date ? " is-selected" : "") + (k === todayKey ? " is-today" : "");
      html += open
        ? '<button type="button" class="' + cls + '" data-day="' + k + '" aria-label="' + fmtDay(k, { weekday: "long", day: "numeric", month: "long" }) + ', available"' + (k === state.date ? ' aria-pressed="true"' : "") + ">" + d + "</button>"
        : '<span class="' + cls + '" aria-hidden="true">' + d + "</span>";
    }
    grid.innerHTML = html;
    var minM = nowNZ.y * 12 + nowNZ.m, curM = view.y * 12 + view.m;
    var maxDate = new Date(Date.UTC(nowNZ.y, nowNZ.m - 1, nowNZ.d + DAYS_AHEAD));
    root.querySelector('[data-cal="-1"]').disabled = curM <= minM;
    root.querySelector('[data-cal="1"]').disabled = curM >= maxDate.getUTCFullYear() * 12 + maxDate.getUTCMonth() + 1;
    if (!state.date) {
      // jump to first available day for a faster path
      for (var x = 1; x <= DAYS_AHEAD; x++) {
        var dt = new Date(Date.UTC(nowNZ.y, nowNZ.m - 1, nowNZ.d + x));
        var kk = key(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
        if (availableSlots(kk).length) { if (+kk.slice(5, 7) === view.m) { state.date = kk; renderCal(); renderSlots(); summary(); } break; }
      }
    }
  }

  function renderSlots() {
    if (!state.date) return;
    var list = availableSlots(state.date);
    slotsHead.innerHTML = fmtDay(state.date, { weekday: "long", day: "numeric", month: "long" }) + "<span>" + list.length + " times available</span>";
    var a = state.date.split("-").map(Number);
    slotsEl.innerHTML = list.length ? list.map(function (s) {
      var dt = zonedToUtc(a[0], a[1], a[2], s[0], s[1], TZ);
      var local = userTz !== TZ ? "<small>" + fmtTime(dt, userTz) + " yours</small>" : "<small>NZT</small>";
      var sel = state.slot && state.slot[0] === s[0] && state.slot[1] === s[1];
      return '<button type="button" class="slot' + (sel ? " is-selected" : "") + '" data-slot="' + s[0] + ":" + s[1] + '" aria-pressed="' + sel + '">' + fmtTime(dt, TZ) + local + "</button>";
    }).join("") : '<p class="slots__empty">No openings this day — try another.</p>';
  }

  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  function submit() {
    var form = root.querySelector("form");
    var name = form.name.value.trim(), email = form.email.value.trim();
    var ok = true;
    [["name", !!name], ["email", validEmail(email)]].forEach(function (f) {
      form[f[0]].closest(".field").classList.toggle("is-invalid", !f[1]);
      if (!f[1]) ok = false;
    });
    if (!ok) { setError(3, "Please check the highlighted fields."); return; }
    var data = {
      type: "Discovery call",
      focus: state.focus.map(label), role: state.role, size: state.size, region: state.region,
      when_nz: fmtDay(state.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " at " + fmtTime(slotDate(), TZ) + " NZT",
      start_utc: slotDate().toISOString(), format: form.querySelector('input[name="format"]:checked').value,
      name: name, email: email, organisation: form.org.value.trim(), phone: form.phone.value.trim(), note: form.note.value.trim(),
      readiness_score: score || ""
    };
    var btn = root.querySelector("[data-submit]");
    btn.disabled = true;
    var done = function () { btn.disabled = false; confirmScreen(data); };
    if (CONFIG.bookingEndpoint) {
      fetch(CONFIG.bookingEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) })
        .then(done, done);
    } else setTimeout(done, 650);
  }

  function pad(n) { return String(n).padStart(2, "0"); }
  function icsDate(d) { return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "T" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + "00Z"; }

  function confirmScreen(data) {
    var start = slotDate(), end = new Date(start.getTime() + 30 * 60000);
    root.querySelector("[data-c-name]").textContent = ", " + data.name.split(" ")[0];
    var rows = [["When", data.when_nz], ["Your time", userTz !== TZ ? fmtTime(start, userTz) + " (" + userTz.split("/").pop().replace(/_/g, " ") + ")" : "Same as NZT"], ["Format", data.format], ["Focus", data.focus.join(", ")]];
    root.querySelector(".confirm__card").innerHTML = rows.map(function (r) { return "<div><span>" + r[0] + "</span><span>" + r[1].replace(/</g, "&lt;") + "</span></div>"; }).join("");
    var title = "Discovery conversation — Polish";
    var details = "30-minute discovery conversation with Melissa Frerk (Polish). Format: " + data.format + ".";
    var ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Polish//Discovery//EN", "BEGIN:VEVENT", "UID:" + Date.now() + "@polish.nz", "DTSTAMP:" + icsDate(new Date()),
      "DTSTART:" + icsDate(start), "DTEND:" + icsDate(end), "SUMMARY:" + title, "DESCRIPTION:" + details + " Pending confirmation from Melissa.", "ORGANIZER;CN=Melissa Frerk:mailto:" + EMAIL, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    root.querySelector("[data-ics]").href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
    root.querySelector("[data-gcal]").href = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(title) + "&dates=" + icsDate(start) + "/" + icsDate(end) + "&details=" + encodeURIComponent(details);
    var body = "Hi Melissa,\n\nI'd like to book a discovery conversation.\n\n" +
      "When: " + data.when_nz + "\nFormat: " + data.format + "\nFocus: " + data.focus.join(", ") + "\nRole: " + data.role + "\nOrganisation size: " + data.size + "\nBased in: " + data.region +
      (data.readiness_score ? "\nReadiness check: " + Math.round(+data.readiness_score) + "%" : "") +
      "\n\nName: " + data.name + "\nEmail: " + data.email + (data.organisation ? "\nOrganisation: " + data.organisation : "") + (data.phone ? "\nPhone: " + data.phone : "") + (data.note ? "\n\n" + data.note : "");
    root.querySelector("[data-mail]").href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent("Discovery call request — " + data.name) + "&body=" + encodeURIComponent(body);
    if (CONFIG.bookingEndpoint) root.querySelector("[data-mail]").style.display = "none";
    go(4);
  }

  summary();
  go(0, false);
})();
