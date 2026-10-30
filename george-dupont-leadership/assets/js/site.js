/* George Dupont Leadership — interface behaviour (works without GSAP). */
(function () {
  "use strict";
  var CFG = window.GDL || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var store = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
  };

  /* ---------- year + booking labels ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  function bookingLabel() {
    if (CFG.bookingLabel) return CFG.bookingLabel;
    var d = new Date();
    var q = Math.floor(d.getMonth() / 3) + 2; // the quarter after this one
    var y = d.getFullYear();
    if (q > 4) { q = 1; y += 1; }
    return "Now booking Q" + q + " " + y;
  }
  var label = bookingLabel();
  $$("[data-booking]").forEach(function (el) { el.textContent = label; });

  var per = CFG.seatsPerQuarter || 3;
  var taken = Math.min(CFG.seatsTaken || 0, per);
  $$("[data-seats]").forEach(function (el) {
    el.innerHTML = "";
    for (var i = 0; i < per; i++) {
      var dot = document.createElement("i");
      if (i < taken) dot.className = "is-taken";
      el.appendChild(dot);
    }
    var text = taken > 0 ? (per - taken) + " of " + per + " seats open" : per + " seats per quarter";
    el.setAttribute("aria-label", text);
    el.setAttribute("title", text);
  });

  /* ---------- header ---------- */
  var hdr = $("[data-hdr]");
  var lastY = window.scrollY;
  function onScroll() {
    var y = window.scrollY;
    if (hdr) {
      hdr.classList.toggle("is-scrolled", y > 24);
      var goingDown = y > lastY && y > 320;
      if (!document.body.classList.contains("menu-open")) hdr.classList.toggle("is-hidden", goingDown);
    }
    lastY = y;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- menu ---------- */
  var menuBtn = $("[data-menu-btn]");
  var menu = $("[data-menu]");
  function setMenu(open) {
    document.body.classList.toggle("menu-open", open);
    if (menuBtn) {
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.firstElementChild.textContent = open ? "Close" : "Menu";
    }
    if (menu) menu.toggleAttribute("inert", !open);
    if (window.__lenis) open ? window.__lenis.stop() : window.__lenis.start();
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (open && menu) { var first = $("a", menu); if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 300); }
  }
  if (menu) menu.setAttribute("inert", "");
  if (menuBtn) menuBtn.addEventListener("click", function () { setMenu(!document.body.classList.contains("menu-open")); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.body.classList.contains("menu-open")) { setMenu(false); menuBtn && menuBtn.focus(); }
  });
  $$("a", menu || document.createElement("div")).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });

  /* ---------- accordions (domains + FAQ) ---------- */
  $$("[data-accordion]").forEach(function (group) {
    var single = group.getAttribute("data-accordion") === "single";
    var items = $$(".domain, .faq__item", group);
    items.forEach(function (item) {
      var btn = $("button", item);
      btn.addEventListener("click", function () {
        var open = !item.classList.contains(item.classList.contains("domain") ? "is-active" : "is-open");
        if (single) items.forEach(function (o) {
          o.classList.remove("is-active", "is-open");
          $("button", o).setAttribute("aria-expanded", "false");
        });
        item.classList.toggle(item.classList.contains("domain") ? "is-active" : "is-open", open);
        btn.setAttribute("aria-expanded", String(open));
        if (item.dataset.domain) {
          document.dispatchEvent(new CustomEvent("dna:domain", { detail: open ? item.dataset.domain : null }));
        }
      });
      if (item.dataset.domain) {
        item.addEventListener("mouseenter", function () { document.dispatchEvent(new CustomEvent("dna:domain", { detail: item.dataset.domain })); });
        item.addEventListener("mouseleave", function () {
          var act = $(".domain.is-active", group);
          document.dispatchEvent(new CustomEvent("dna:domain", { detail: act ? act.dataset.domain : null }));
        });
      }
    });
  });

  /* ---------- tabs ---------- */
  $$("[data-tabs]").forEach(function (wrap) {
    var tabs = $$('[role="tab"]', wrap);
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (!panel) return;
        panel.hidden = !on;
        if (on) {
          panel.classList.remove("is-entering");
          void panel.offsetWidth;
          panel.classList.add("is-entering");
        }
      });
      if (focus) tab.focus();
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var n = null;
        if (e.key === "ArrowRight") n = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") n = tabs[0];
        if (e.key === "End") n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
  });

  /* ---------- testimonials ---------- */
  $$("[data-quotes]").forEach(function (wrap) {
    var qs = $$(".q", wrap);
    if (!qs.length) return;
    var cur = 0, DUR = 8000, paused = false, elapsed = 0, last = performance.now(), inView = true;
    var bar = $("[data-q-bar]", wrap), curEl = $("[data-q-cur]", wrap), totEl = $("[data-q-total]", wrap);
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    if (totEl) totEl.textContent = pad(qs.length);
    function show(i) {
      cur = (i + qs.length) % qs.length;
      qs.forEach(function (q, k) { q.classList.toggle("is-active", k === cur); q.setAttribute("aria-hidden", String(k !== cur)); });
      if (curEl) curEl.textContent = pad(cur + 1);
      elapsed = 0;
      if (bar) bar.style.transform = "scaleX(0)";
    }
    function tick(now) {
      var dt = now - last; last = now;
      if (!paused && inView && !reduced) {
        elapsed += dt;
        if (bar) bar.style.transform = "scaleX(" + Math.min(elapsed / DUR, 1) + ")";
        if (elapsed >= DUR) show(cur + 1);
      }
      requestAnimationFrame(tick);
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { inView = en[0].isIntersecting; }).observe(wrap);
    }
    var prev = $("[data-q-prev]", wrap), next = $("[data-q-next]", wrap);
    if (prev) prev.addEventListener("click", function () { show(cur - 1); });
    if (next) next.addEventListener("click", function () { show(cur + 1); });
    wrap.addEventListener("mouseenter", function () { paused = true; });
    wrap.addEventListener("mouseleave", function () { paused = false; });
    wrap.addEventListener("focusin", function () { paused = true; });
    wrap.addEventListener("focusout", function () { paused = false; });
    // swipe
    var sx = null;
    wrap.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    wrap.addEventListener("touchend", function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
      sx = null;
    });
    show(0);
    requestAnimationFrame(tick);
  });

  /* ---------- forms ---------- */
  var emailOk = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); };
  function mailto(subject, body) {
    window.location.href = "mailto:" + (CFG.email || "") + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }
  function post(url, data) {
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) })
      .then(function (r) { if (!r.ok) throw new Error("Request failed"); return r; });
  }

  $$("[data-news]").forEach(function (form) {
    var msg = form.parentNode.querySelector("[data-news-msg]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = $("input[type=email]", form);
      var v = (input.value || "").trim();
      if (!emailOk(v)) { if (msg) msg.textContent = "Please enter a valid email address."; input.focus(); return; }
      if (CFG.newsletterEndpoint) {
        post(CFG.newsletterEndpoint, { email: v, list: "The Champion's Briefing", page: location.pathname })
          .then(function () { if (msg) msg.textContent = "You’re on the list. Watch your inbox for the first briefing."; form.reset(); })
          .catch(function () { if (msg) msg.textContent = "Something went wrong. Please email " + CFG.email + "."; });
      } else {
        if (msg) msg.textContent = "Thanks. Your email app will open to confirm your spot.";
        mailto("Add me to The Champion's Briefing", "Please add " + v + " to The Champion's Briefing and podcast launch list.");
        form.reset();
      }
    });
  });

  var contact = $("[data-contact]");
  if (contact) {
    var params = new URLSearchParams(location.search);
    var interest = params.get("interest");
    if (interest) {
      var opt = $('input[name="interest"][value="' + interest + '"]', contact);
      if (opt) opt.checked = true;
    }
    var talk = params.get("talk");
    if (talk) { var m = $("textarea[name=message]", contact); if (m && !m.value) m.value = "We’d like to explore booking “" + talk + "” for an upcoming event. Date, location and audience size: "; }
    var sc = store.get("gdl-scorecard");
    var note = $("[data-prefill]");
    if (sc) {
      try {
        var r = JSON.parse(sc);
        var hidden = $("input[name=scorecard]", contact);
        if (hidden) hidden.value = "Dynasty Scorecard: " + r.total + "/100 (" + r.tier + "). Identity " + r.identity + ", Influence " + r.influence + ", Impact " + r.impact + ".";
        if (note) { note.innerHTML = "Your Dynasty Scorecard (<b>" + r.total + "/100, " + r.tier + "</b>) will be attached so George can prepare for your call."; note.classList.add("is-on"); }
      } catch (err) {}
    }

    contact.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      $$("[data-required]", contact).forEach(function (f) {
        var input = $("input, select, textarea", f);
        var radios = $$("input[type=radio]", f);
        var valid = radios.length ? radios.some(function (r) { return r.checked; }) : input.type === "email" ? emailOk(input.value.trim()) : input.value.trim().length > 0;
        f.classList.toggle("is-invalid", !valid);
        if (!valid && ok) { ok = false; (radios[0] || input).focus(); }
      });
      if (!ok) return;
      var fd = new FormData(contact);
      var data = {};
      fd.forEach(function (v, k) { data[k] = v; });
      var btn = $("button[type=submit]", contact);
      var done = function () {
        contact.hidden = true;
        var s = $("[data-contact-success]");
        if (s) { s.classList.add("is-on"); s.setAttribute("tabindex", "-1"); s.focus(); }
      };
      if (CFG.formEndpoint) {
        btn.disabled = true;
        post(CFG.formEndpoint, data).then(done).catch(function () {
          btn.disabled = false;
          alert("Sorry, the message didn’t send. Please email " + CFG.email + " directly.");
        });
      } else {
        var lines = [
          "Name: " + data.first + " " + data.last,
          "Email: " + data.email,
          data.role ? "Role: " + data.role : "",
          data.company ? "Organization: " + data.company : "",
          "Interested in: " + (data.interest || ""),
          data.timeline ? "Timeline: " + data.timeline : "",
          data.scorecard ? data.scorecard : "",
          "",
          data.message,
        ].filter(function (l, i) { return l !== "" || i === 7; });
        mailto("Discovery call request: " + data.first + " " + data.last + (data.company ? " (" + data.company + ")" : ""), lines.join("\n"));
        done();
      }
    });
    $$("input, select, textarea", contact).forEach(function (el) {
      el.addEventListener("input", function () { var f = el.closest(".field"); if (f) f.classList.remove("is-invalid"); });
      el.addEventListener("change", function () { var f = el.closest(".field"); if (f) f.classList.remove("is-invalid"); });
    });
  }

  /* ---------- cost-of-drift calculator ---------- */
  var calc = $("[data-calc]");
  if (calc) {
    var fmt = function (n) {
      if (n >= 1e6) return "$" + (n / 1e6).toFixed(n >= 1e7 ? 1 : 2) + "M";
      if (n >= 1e3) return "$" + Math.round(n / 1e3) + "K";
      return "$" + Math.round(n);
    };
    var ins = $$("input[type=range]", calc);
    var run = function () {
      var v = {};
      ins.forEach(function (i) {
        v[i.name] = +i.value;
        var p = ((i.value - i.min) / (i.max - i.min)) * 100;
        i.style.setProperty("--p", p + "%");
        var o = $('output[for="' + i.id + '"]', calc);
        if (o) o.textContent = i.name === "salary" ? "$" + Math.round(i.value / 1000) + "K" : i.name === "disengaged" ? i.value + "%" : Number(i.value).toLocaleString();
      });
      var people = Math.round(v.people * v.disengaged / 100);
      var per = v.salary * 0.18;
      var cost = people * per;
      $("[data-calc-total]", calc).textContent = fmt(cost);
      $("[data-calc-people]", calc).textContent = people.toLocaleString();
      $("[data-calc-per]", calc).textContent = fmt(per);
      $("[data-calc-month]", calc).textContent = fmt(cost / 12);
      $("[data-calc-win]", calc).textContent = fmt(cost * 0.25);
    };
    ins.forEach(function (i) { i.addEventListener("input", run); });
    run();
  }

  /* ---------- Dynasty Scorecard ---------- */
  var scWrap = $("[data-scorecard]");
  if (scWrap) {
    var QUESTIONS = [
      ["identity", "Mindset", "Our leaders treat setbacks as information, not identity.", "Do they learn and reset, or protect their ego?"],
      ["identity", "Personal rhythm", "Leaders protect a consistent rhythm of preparation, recovery and reflection.", "Even in the busiest stretch of the season or quarter."],
      ["identity", "Identity alignment", "How our leaders behave matches the values we say we hold.", "If a new hire watched for a week, would they see the values on the wall?"],
      ["identity", "Consistency under pressure", "When the stakes rise, our leaders get calmer and clearer, not louder.", "Think about your last real crisis."],
      ["influence", "Team trust", "People can disagree with a leader here without worrying about the consequences.", "Honest dissent is the early-warning system of a culture."],
      ["influence", "Conflict resolution", "We deal with conflict directly and quickly. It rarely festers or goes underground.", "Good tension builds trust. Avoided tension erodes it."],
      ["influence", "Cultural clarity", "Ask ten people what our standards are, and you’d hear the same answer.", "From the boardroom (or front office) to the front line."],
      ["influence", "Communication frameworks", "Critical information moves fast and lands the same way at every level.", "No telephone game between leadership and the people doing the work."],
      ["impact", "Execution systems", "We run a weekly operating rhythm that turns priorities into finished work.", "Not heroic effort. A repeatable cadence."],
      ["impact", "Strategic leadership", "Our leaders consistently choose what not to do, so the vital few get done.", "Focus is a leadership decision."],
      ["impact", "Performance tracking", "We track a few leading indicators of performance, not just results after the fact.", "You can see a slump coming before the scoreboard shows it."],
      ["impact", "Scale", "Our culture would hold if two key leaders left tomorrow.", "A dynasty outlasts any one star."],
    ];
    var SCALE = ["Rarely", "Sometimes", "Often", "Usually", "Always"];
    var DOMAINS = { identity: "Champion Identity", influence: "Champion Influence", impact: "Champion Impact" };
    var COLORS = { identity: "var(--d-identity)", influence: "var(--d-influence)", impact: "var(--d-impact)" };
    var FOCUS = {
      identity: "Your biggest lever is <b>self-leadership</b>. Pressure exposes leaders who haven’t built a personal operating rhythm. Start with how your leaders lead themselves, because everything downstream inherits it.",
      influence: "Your biggest lever is <b>trust and clarity</b>. Talent is there, but standards don’t travel and conflict is costing you speed. Install shared conflict rules and one leadership language.",
      impact: "Your biggest lever is <b>execution</b>. The culture is willing, but there is no rhythm turning intent into repeatable results. Install the weekly cadence, rituals and tracking of a championship operation.",
    };
    var TIERS = [
      [85, "Dynasty", "Your culture wins repeatedly. Protect it and scale it."],
      [65, "Contender", "Strong foundations with gaps that show under pressure."],
      [40, "Playoff Bubble", "Talent is carrying the culture. That rarely lasts."],
      [0, "Rebuild Year", "The system needs installing before the next big push."],
    ];
    var answers = new Array(QUESTIONS.length).fill(null);
    var idx = 0;
    var stepsEl = $("[data-sc-steps]", scWrap), bar = $("[data-sc-bar]", scWrap), count = $("[data-sc-count]", scWrap);
    var back = $("[data-sc-back]", scWrap), result = $("[data-sc-result]", scWrap), progress = $("[data-sc-progress]", scWrap);

    QUESTIONS.forEach(function (q, i) {
      var el = document.createElement("fieldset");
      el.className = "sc__q";
      el.hidden = i !== 0;
      el.style.border = "0"; el.style.margin = "0"; el.style.padding = "0"; el.style.minWidth = "0";
      el.style.setProperty("--c", COLORS[q[0]]);
      var opts = SCALE.map(function (s, k) {
        return '<label><input type="radio" name="q' + i + '" value="' + (k + 1) + '"><span><b>' + (k + 1) + "</b><small>" + s + "</small></span></label>";
      }).join("");
      el.innerHTML =
        '<legend class="sr-only">Question ' + (i + 1) + " of " + QUESTIONS.length + "</legend>" +
        '<span class="sc__domain">' + DOMAINS[q[0]] + " · " + q[1] + "</span>" +
        '<p class="sc__text">' + q[2] + "</p>" +
        '<p class="sc__hint">' + q[3] + "</p>" +
        '<div class="scale">' + opts + "</div>" +
        '<div class="scale__legend"><span>1 · Rarely true</span><span>5 · Always true</span></div>';
      stepsEl.appendChild(el);
      $$("input", el).forEach(function (inp) {
        inp.addEventListener("change", function () {
          answers[i] = +inp.value;
          setTimeout(function () { if (idx === i) go(i + 1); }, reduced ? 0 : 380);
        });
      });
    });
    var qEls = $$(".sc__q", stepsEl);

    function go(n) {
      if (n >= QUESTIONS.length) return finish();
      idx = Math.max(0, n);
      qEls.forEach(function (q, k) { q.hidden = k !== idx; q.classList.toggle("is-in", k === idx); });
      bar.style.width = (idx / QUESTIONS.length) * 100 + "%";
      count.textContent = String(idx + 1).padStart(2, "0") + " / " + QUESTIONS.length;
      back.disabled = idx === 0;
      var first = $("input:checked", qEls[idx]) || $("input", qEls[idx]);
      if (first && document.activeElement && scWrap.contains(document.activeElement)) first.focus({ preventScroll: true });
    }
    back.addEventListener("click", function () { go(idx - 1); });
    document.addEventListener("keydown", function (e) {
      if (!result.hidden || !scWrap.getBoundingClientRect || e.target.tagName === "INPUT" && e.target.type !== "radio") return;
      var r = scWrap.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      var k = parseInt(e.key, 10);
      if (k >= 1 && k <= 5) {
        var inp = $('input[value="' + k + '"]', qEls[idx]);
        if (inp) { inp.checked = true; inp.dispatchEvent(new Event("change")); }
      }
    });

    function score(key) {
      var sum = 0, n = 0;
      QUESTIONS.forEach(function (q, i) { if (q[0] === key) { sum += answers[i]; n++; } });
      return Math.round(((sum - n) / (n * 4)) * 100);
    }
    function finish() {
      var s = { identity: score("identity"), influence: score("influence"), impact: score("impact") };
      var total = Math.round((s.identity + s.influence + s.impact) / 3);
      var tier = TIERS.find(function (t) { return total >= t[0]; });
      var weakest = Object.keys(s).sort(function (a, b) { return s[a] - s[b]; })[0];
      stepsEl.hidden = true; progress.hidden = true;
      $(".sc__nav", scWrap).hidden = true;
      result.hidden = false;
      result.classList.add("is-in");
      $("[data-sc-total]", result).textContent = "0";
      $("[data-sc-tier]", result).textContent = tier[1];
      $("[data-sc-tierdesc]", result).textContent = tier[2];
      $("[data-sc-focus-name]", result).textContent = DOMAINS[weakest];
      $("[data-sc-focus]", result).innerHTML = FOCUS[weakest];
      ["identity", "influence", "impact"].forEach(function (k) {
        $('[data-sc-val="' + k + '"]', result).textContent = s[k];
        var b = $('[data-sc-fill="' + k + '"]', result);
        b.style.width = "0";
        setTimeout(function () { b.style.width = s[k] + "%"; }, 120);
      });
      $$("[data-tier]").forEach(function (li) { li.classList.toggle("is-you", li.getAttribute("data-tier") === tier[1]); });
      var out = $("[data-sc-total]", result), t0 = performance.now();
      (function count(now) {
        var p = Math.min((now - t0) / 1200, 1);
        out.textContent = Math.round(total * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(count);
      })(t0);
      store.set("gdl-scorecard", JSON.stringify({ total: total, tier: tier[1], identity: s.identity, influence: s.influence, impact: s.impact }));
      var top = scWrap.getBoundingClientRect().top + window.scrollY - 100;
      if (window.__lenis) window.__lenis.scrollTo(top); else window.scrollTo({ top: top, behavior: reduced ? "auto" : "smooth" });
      result.focus({ preventScroll: true });
    }
    $("[data-sc-restart]", scWrap).addEventListener("click", function () {
      answers.fill(null);
      $$("input", stepsEl).forEach(function (i) { i.checked = false; });
      stepsEl.hidden = false; progress.hidden = false; $(".sc__nav", scWrap).hidden = false; result.hidden = true;
      $$("[data-tier]").forEach(function (li) { li.classList.remove("is-you"); });
      go(0);
    });
    go(0);
  }
})();
