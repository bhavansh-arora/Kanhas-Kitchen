/* Insight Transformational Coaching — core behaviour.
   Works without GSAP: header, menu, page curtain, preloader, reveals, accordions,
   tabs, the wishing/action switch, testimonials, quiz, booking form, preview notes. */
(function () {
  "use strict";
  var html = document.documentElement;
  var cfg = window.SITE_CONFIG || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var store = (function () { try { var s = window.sessionStorage; s.setItem("_t", "1"); s.removeItem("_t"); return s; } catch (e) { return null; } })();
  var IT = window.IT = window.IT || {};

  if (!reduce) html.classList.add("has-motion");

  /* ---------- Intro (preloader → curtain → hero choreography) ---------- */
  var introCbs = [];
  IT.introDone = false;
  IT.whenIntro = function (fn) { if (IT.introDone) fn(); else introCbs.push(fn); };
  function intro() {
    if (IT.introDone) return;
    IT.introDone = true;
    html.classList.add("intro-done");
    introCbs.forEach(function (fn) { try { fn(); } catch (e) {} });
  }

  var pre = $(".preloader");
  if (html.classList.contains("is-loading") && pre) {
    var countEl = $("[data-count]", pre);
    var words = $$(".preloader__words span", pre);
    var t0 = performance.now(), MIN = 1700, MAX = 3600, shown = 0, fontsOk = false, imgOk = false;
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { fontsOk = true; });
    var heroImg = $(".hero__arch img");
    if (!heroImg || heroImg.complete) imgOk = true;
    else { heroImg.addEventListener("load", function () { imgOk = true; }); heroImg.addEventListener("error", function () { imgOk = true; }); }
    (function tick(now) {
      var el = now - t0, ready = (fontsOk && imgOk) || el > MAX;
      var target = Math.min(ready ? 100 : 86, (el / MIN) * 100);
      shown += (target - shown) * 0.1 + 0.2; if (shown > target) shown = target;
      var p = Math.round(shown);
      if (countEl) countEl.textContent = p;
      pre.style.setProperty("--p", (shown / 100).toFixed(3));
      words.forEach(function (w, i) { w.classList.toggle("is-lit", p >= (i + 1) * 30); });
      if (ready && p >= 100 && el > MIN) return leave();
      requestAnimationFrame(tick);
    })(t0);
    function leave() {
      if (store) store.setItem("it-seen", "1");
      var done = function () { html.classList.remove("is-loading"); if (IT.lenis) IT.lenis.start(); };
      if (pre.animate) {
        var a = pre.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], { duration: 1000, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" });
        setTimeout(intro, 380);
        a.onfinish = done;
      } else { done(); intro(); }
    }
  } else if (html.classList.contains("is-entering")) {
    var cur = $(".curtain");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (cur) cur.classList.add("is-leaving");
        setTimeout(intro, 250);
        setTimeout(function () { html.classList.remove("is-entering"); if (cur) cur.classList.remove("is-leaving"); }, 850);
      });
    });
  } else {
    requestAnimationFrame(function () { requestAnimationFrame(intro); });
  }

  /* ---------- Page curtain on internal navigation ---------- */
  var curtain = $(".curtain");
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || reduce || !curtain) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== "_self") return;
    if (a.hasAttribute("download")) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || /^(mailto|tel|javascript):/i.test(href)) return;
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return; // same page (hash links handled natively)
    e.preventDefault();
    closeMenu();
    if (store) store.setItem("it-enter", "1");
    curtain.classList.add("is-covering");
    setTimeout(function () { location.href = url.href; }, 620);
  });
  window.addEventListener("pageshow", function (e) {
    if (e.persisted && curtain) { curtain.classList.remove("is-covering"); html.classList.remove("is-entering"); }
  });

  /* ---------- Header ---------- */
  var hdr = $("[data-hdr]");
  var lastY = window.scrollY, ticking = false;
  function onScroll() {
    var y = window.scrollY;
    if (hdr) {
      hdr.classList.toggle("is-scrolled", y > 24);
      var goingDown = y > lastY + 4, goingUp = y < lastY - 4;
      if (goingDown && y > 240 && !html.classList.contains("menu-open")) hdr.classList.add("is-hidden");
      else if (goingUp || y < 120) hdr.classList.remove("is-hidden");
    }
    updateMbar(y);
    lastY = y;
    ticking = false;
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ---------- Mobile menu ---------- */
  var menuBtn = $("[data-menu-btn]"), menu = $("[data-menu]");
  function openMenu() {
    html.classList.add("menu-open"); if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
    if (IT.lenis) IT.lenis.stop(); document.body.style.overflow = "hidden";
    var first = menu && $("a", menu); if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 300);
  }
  function closeMenu() {
    if (!html.classList.contains("menu-open")) return;
    html.classList.remove("menu-open"); if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    if (IT.lenis) IT.lenis.start(); document.body.style.overflow = "";
  }
  if (menuBtn) menuBtn.addEventListener("click", function () { html.classList.contains("menu-open") ? closeMenu() : openMenu(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeMenu(); closeNote(); } });
  window.addEventListener("resize", function () { if (window.innerWidth > 1024) closeMenu(); });

  /* ---------- Mobile booking bar ---------- */
  var mbar = $("[data-mbar]"), footer = $("[data-footer]");
  function updateMbar(y) {
    if (!mbar) return;
    var show = y > window.innerHeight * 0.75;
    if (footer && footer.getBoundingClientRect().top < window.innerHeight - 40) show = false;
    mbar.classList.toggle("is-on", show);
  }

  /* ---------- Config-driven links ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  $$("[data-social]").forEach(function (el) {
    var url = cfg[el.getAttribute("data-social")];
    if (url) { el.hidden = false; var a = el.tagName === "A" ? el : $("a", el); if (a) a.href = url; }
  });
  $$("[data-book]").forEach(function (el) { if (cfg.bookingUrl) { el.hidden = false; el.href = cfg.bookingUrl; } });
  $$("[data-top]").forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); if (IT.lenis) IT.lenis.scrollTo(0); else window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });
  });

  /* ---------- Scroll reveals ---------- */
  var revealEls = $$("[data-reveal]");
  if (!reduce && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else revealEls.forEach(function (el) { el.classList.add("is-in"); });

  /* ---------- Accordions ---------- */
  $$("[data-acc]").forEach(function (acc) {
    $$(".acc__btn", acc).forEach(function (b) {
      b.addEventListener("click", function () {
        var item = b.closest(".acc__item"), open = !item.classList.contains("is-open");
        $$(".acc__item.is-open", acc).forEach(function (o) { if (o !== item) { o.classList.remove("is-open"); $(".acc__btn", o).setAttribute("aria-expanded", "false"); } });
        item.classList.toggle("is-open", open); b.setAttribute("aria-expanded", open ? "true" : "false");
        setTimeout(refreshST, 650);
      });
    });
  });
  function refreshST() { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); positionNotes(); }

  /* ---------- Tabs ---------- */
  $$("[data-tabs]").forEach(function (wrap) {
    var list = $("[role=tablist]", wrap), tabs = $$("[role=tab]", wrap), ink = $(".tabs__ink", wrap);
    function moveInk(t) { if (!ink) return; ink.style.width = t.offsetWidth + "px"; ink.style.transform = "translateX(" + t.offsetLeft + "px)"; }
    function select(t, focus) {
      tabs.forEach(function (x) {
        var on = x === t; x.setAttribute("aria-selected", on ? "true" : "false"); x.tabIndex = on ? 0 : -1;
        var p = document.getElementById(x.getAttribute("aria-controls")); if (p) p.hidden = !on;
      });
      wrap.classList.add("is-switching"); moveInk(t); if (focus) t.focus();
      setTimeout(refreshST, 50);
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var k = e.key, n = null;
        if (k === "ArrowRight") n = tabs[(i + 1) % tabs.length]; else if (k === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (k === "Home") n = tabs[0]; else if (k === "End") n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
    var cur = tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0] || tabs[0];
    moveInk(cur);
    window.addEventListener("resize", function () { moveInk(tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0]); });
    if (document.fonts) document.fonts.ready.then(function () { moveInk(cur); });
  });

  /* ---------- Wishing → Action switch ---------- */
  $$("[data-flip]").forEach(function (flip) {
    var sw = $("[data-switch]", flip), touched = false;
    function set(on) { flip.classList.toggle("is-on", on); sw.setAttribute("aria-checked", on ? "true" : "false"); }
    sw.addEventListener("click", function () { touched = true; set(sw.getAttribute("aria-checked") !== "true"); });
    if ("IntersectionObserver" in window && !reduce) {
      var fio = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { fio.disconnect(); setTimeout(function () { if (!touched) set(true); }, 1600); }
      }, { threshold: 0.6 });
      fio.observe(flip);
    }
  });

  /* ---------- Testimonials ---------- */
  $$("[data-voices]").forEach(function (sec) {
    var tabs = $$(".voice__tab", sec), idx = 0, timer = null, visible = false, DUR = 9000;
    function show(i, focus) {
      idx = i;
      tabs.forEach(function (t, j) {
        var on = j === i; t.setAttribute("aria-selected", on ? "true" : "false"); t.tabIndex = on ? 0 : -1;
        var p = document.getElementById(t.getAttribute("aria-controls")); if (p) p.setAttribute("aria-hidden", on ? "false" : "true");
        var prog = $(".voice__prog", t); if (prog) { prog.style.animation = "none"; void prog.offsetWidth; prog.style.animation = ""; }
      });
      if (focus) tabs[i].focus();
      schedule();
    }
    function schedule() {
      clearTimeout(timer);
      if (!visible || reduce || sec.classList.contains("is-paused") || $(".voice__more[open]", sec)) return;
      timer = setTimeout(function () { show((idx + 1) % tabs.length); }, DUR);
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { show(i); });
      t.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); show((i + 1) % tabs.length, true); }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); show((i - 1 + tabs.length) % tabs.length, true); }
      });
    });
    sec.style.setProperty("--dur", DUR / 1000 + "s");
    var pause = function () { sec.classList.add("is-paused"); clearTimeout(timer); };
    var resume = function () { sec.classList.remove("is-paused"); show(idx); };
    var box = $(".voice", sec);
    box.addEventListener("mouseenter", pause); box.addEventListener("mouseleave", resume);
    box.addEventListener("focusin", pause); box.addEventListener("focusout", function (e) { if (!box.contains(e.relatedTarget)) resume(); });
    $$(".voice__more", sec).forEach(function (d) { d.addEventListener("toggle", function () { if (d.open) pause(); setTimeout(refreshST, 60); }); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) show(idx); else clearTimeout(timer); }, { threshold: 0.35 }).observe(sec);
    }
  });

  /* ---------- Level data (shared by quiz + form) ---------- */
  var LEVELS = {
    "1": { n: "I", name: "Knowledge", img: "level-1", desc: "You&rsquo;re ready to begin. Level I is foundational: we clarify the changes you want to make and get you taking real action, fast.", items: ["Identify changes you want to make", "Start to take action", "Complete a small project"] },
    "2": { n: "II", name: "Awareness", img: "level-2", desc: "You know what you want. Level II is about putting in the work: going deep on your goals and breaking through the place you usually stall.", items: ["Everything in Level I", "In-depth identification of goals", "Next-level breakthrough"] },
    "3": { n: "III", name: "Joy", img: "level-3", desc: "You&rsquo;re ready for the big one. Level III is transformation: staying the course until a lifelong goal is complete.", items: ["Everything in Levels I &amp; II", "Transformation", "Complete a lifelong goal"] }
  };
  var CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  /* ---------- Quiz ---------- */
  var quiz = $("[data-quiz]");
  if (quiz) {
    var qs = $$(".quiz__q", quiz), qi = 0, total = qs.length;
    var bar = $("[data-quiz-bar]", quiz), stepLbl = $("[data-quiz-step]", quiz);
    var prev = $("[data-quiz-prev]", quiz), next = $("[data-quiz-next]", quiz), nav = $("[data-quiz-nav]", quiz);
    var result = $("[data-quiz-result]", quiz), lvs = $$(".quiz__lv", quiz);
    function val(name) { var c = $("input[name=" + name + "]:checked", quiz); return c ? c.value : null; }
    function scoreLevel() {
      var s = 0, n = 0;
      ["q1", "q2", "q3"].forEach(function (k) { var v = val(k); if (v) { s += +v; n++; } });
      return n ? String(Math.min(3, Math.max(1, Math.round(s / n)))) : null;
    }
    function render() {
      qs.forEach(function (q, i) { q.classList.toggle("is-active", i === qi); });
      if (stepLbl) stepLbl.textContent = "Question " + (qi + 1) + " of " + total;
      if (bar) bar.style.width = (qi / total) * 100 + "%";
      prev.disabled = qi === 0;
      next.disabled = !$("input:checked", qs[qi]);
      $("span", next).textContent = qi === total - 1 ? "See my level" : "Next";
      var lead = scoreLevel();
      lvs.forEach(function (l) { l.classList.toggle("is-lead", l.getAttribute("data-lv") === lead); });
    }
    quiz.addEventListener("change", function (e) {
      render();
      if (e.target.type === "radio" && qi < total - 1) setTimeout(function () { qi++; render(); scrollQuiz(); }, 380);
    });
    function scrollQuiz() {
      var r = quiz.getBoundingClientRect();
      if (r.top < 0 || r.top > window.innerHeight * 0.4) {
        var y = window.scrollY + r.top - 100;
        if (IT.lenis) IT.lenis.scrollTo(y); else window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
      }
    }
    prev.addEventListener("click", function () { if (qi > 0) { qi--; render(); } });
    next.addEventListener("click", function () {
      if (!$("input:checked", qs[qi])) return;
      if (qi < total - 1) { qi++; render(); return; }
      finish();
    });
    function finish() {
      var key = scoreLevel() || "1", L = LEVELS[key];
      qs.forEach(function (q) { q.classList.remove("is-active"); });
      nav.hidden = true; result.classList.add("is-active");
      if (bar) bar.style.width = "100%";
      if (stepLbl) stepLbl.textContent = "Your result";
      $("[data-r-title]", quiz).innerHTML = "Level " + L.n + " &mdash; <em class=\"it\">" + L.name + "</em>";
      $("[data-r-desc]", quiz).innerHTML = L.desc;
      var img = $("[data-r-img]", quiz); img.src = "assets/img/" + L.img + ".webp";
      $("[data-r-list]", quiz).innerHTML = L.items.map(function (t) { return "<li>" + CHECK + "<span>" + t + "</span></li>"; }).join("");
      var params = new URLSearchParams({ level: L.n, interest: val("q4") || "", format: val("q5") || "", from: "quiz" });
      $("[data-r-book]", quiz).href = "contact.html?" + params.toString();
      $("[data-r-pkg]", quiz).href = "coaching.html#level-" + key;
      lvs.forEach(function (l) { l.classList.toggle("is-lead", l.getAttribute("data-lv") === key); });
      if (store) store.setItem("it-quiz", params.toString());
      scrollQuiz();
      setTimeout(refreshST, 100);
    }
    $("[data-quiz-restart]", quiz).addEventListener("click", function () {
      $$("input", quiz).forEach(function (i) { i.checked = false; });
      qi = 0; result.classList.remove("is-active"); nav.hidden = false; render(); scrollQuiz();
    });
    quiz.addEventListener("submit", function (e) { e.preventDefault(); });
    render();
  }

  /* ---------- Booking form ---------- */
  var form = $("[data-form]");
  if (form) {
    var steps = $$("[data-fstep]", form), si = 0;
    var fprev = $("[data-fprev]", form), fnext = $("[data-fnext]", form), fnextLbl = $("[data-fnext-lbl]", form);
    var dots = $$("[data-dot]", form), fnav = $("[data-fnav]", form), done = $("[data-done]", form);

    // Prefill from the quiz (URL first, then this session's last quiz result)
    var qp = new URLSearchParams(location.search);
    if (!qp.get("level") && store && store.getItem("it-quiz")) qp = new URLSearchParams(store.getItem("it-quiz"));
    var prefilled = false;
    if (qp.get("level")) { var lr = $('input[name=level][value="' + qp.get("level").replace(/"/g, "") + '"]', form); if (lr) { lr.checked = true; prefilled = true; } }
    if (qp.get("format")) { var fr = $('input[name=format][value="' + qp.get("format").replace(/"/g, "") + '"]', form); if (fr) { fr.checked = true; prefilled = true; } }
    if (qp.get("interest")) { var ir = $$('input[name=interest]', form).filter(function (i) { return i.value === qp.get("interest"); })[0]; if (ir) { ir.checked = true; prefilled = true; } }
    var pn = $("[data-prefill-note]", form);
    if (pn && prefilled && qp.get("from") === "quiz") pn.classList.add("is-on");
    else if (pn && prefilled) { pn.classList.add("is-on"); $("span", pn).textContent = "We’ve noted the level you picked — feel free to change anything."; }

    function renderForm() {
      steps.forEach(function (s, i) { s.classList.toggle("is-active", i === si); });
      dots.forEach(function (d, i) { d.classList.toggle("is-current", i === si); d.classList.toggle("is-done", i < si); });
      fprev.disabled = si === 0;
      fnextLbl.textContent = si === steps.length - 1 ? "Send my request" : "Continue";
    }
    function validate(i) {
      if (i === 0) {
        var ok = !!$("input[name=interest]:checked", form);
        $('[data-err="0"]', form).classList.toggle("is-on", !ok);
        return ok;
      }
      if (i === 2) {
        var good = true;
        [["name", function (v) { return v.trim().length > 1; }], ["email", function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }]].forEach(function (r) {
          var inp = form.elements[r[0]], f = inp.closest(".field"), ok2 = r[1](inp.value);
          f.classList.toggle("is-invalid", !ok2); if (!ok2 && good) inp.focus(); if (!ok2) good = false;
        });
        return good;
      }
      return true;
    }
    function topOfForm() {
      var r = form.getBoundingClientRect();
      if (r.top < 60) { var y = window.scrollY + r.top - 100; if (IT.lenis) IT.lenis.scrollTo(y); else window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" }); }
    }
    form.addEventListener("change", function (e) { if (e.target.name === "interest") $('[data-err="0"]', form).classList.remove("is-on"); });
    form.addEventListener("input", function (e) { var f = e.target.closest && e.target.closest(".field"); if (f) f.classList.remove("is-invalid"); });
    fprev.addEventListener("click", function () { if (si > 0) { si--; renderForm(); topOfForm(); } });
    fnext.addEventListener("click", function () {
      if (!validate(si)) return;
      if (si < steps.length - 1) { si++; renderForm(); topOfForm(); setTimeout(refreshST, 60); return; }
      send();
    });
    form.addEventListener("submit", function (e) { e.preventDefault(); fnext.click(); });
    form.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "BUTTON") { e.preventDefault(); fnext.click(); }
    });

    function collect() {
      var el = form.elements;
      return {
        name: el.name.value.trim(), email: el.email.value.trim(), phone: el.phone.value.trim(), bestTime: el.time.value,
        interests: $$("input[name=interest]:checked", form).map(function (i) { return i.value; }),
        level: (($("input[name=level]:checked", form) || {}).value) || "Not sure yet",
        format: (($("input[name=format]:checked", form) || {}).value) || "Either",
        message: el.message.value.trim(), source: qp.get("from") === "quiz" ? "Find-your-level quiz" : "Website", page: location.href
      };
    }
    function finishForm(msg) {
      steps.forEach(function (s) { s.classList.remove("is-active"); });
      fnav.hidden = true; $(".form__steps", form).hidden = true; if (pn) pn.classList.remove("is-on");
      var fine2 = $(".form__fine", form); if (fine2) fine2.hidden = true;
      if (msg) $("[data-done-msg]", form).innerHTML = msg;
      done.classList.add("is-active");
      if (store) store.removeItem("it-quiz");
      topOfForm(); setTimeout(refreshST, 80);
    }
    function mailtoFallback(d) {
      var body = "Hi Alberta,\n\nI'd like to request a free get-to-know-you session.\n\n" +
        "Name: " + d.name + "\nEmail: " + d.email + (d.phone ? "\nPhone: " + d.phone : "") +
        "\nBest time: " + d.bestTime + "\nInterested in: " + d.interests.join("; ") +
        "\nLevel: " + d.level + "\nPrefers: " + d.format + (d.message ? "\n\nWhat I'd love to change:\n" + d.message : "") + "\n\nThank you!";
      return "mailto:" + (cfg.email || "hello@insighttransform.com") + "?subject=" + encodeURIComponent("Free session request — " + d.name) + "&body=" + encodeURIComponent(body);
    }
    function send() {
      if (form.elements.company && form.elements.company.value) { finishForm(); return; } // bot trap
      var d = collect(), err = $('[data-err="send"]', form);
      err.classList.remove("is-on");
      var bookLine = cfg.bookingUrl ? ' Want to lock it in now? <a href="' + cfg.bookingUrl + '" target="_blank" rel="noopener" style="color:var(--violet);text-decoration:underline">Pick a time on the calendar</a>.' : "";
      if (cfg.formEndpoint) {
        fnext.disabled = true; fnextLbl.textContent = "Sending…";
        fetch(cfg.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(d) })
          .then(function (r) { if (!r.ok) throw new Error(r.status); finishForm("Your request is on its way, " + escapeHtml(d.name.split(" ")[0]) + ". Alberta will be in touch personally to find a time for your free get-to-know-you session." + bookLine); })
          .catch(function () {
            fnext.disabled = false; renderForm();
            err.innerHTML = 'Something went wrong sending your request. Please <a href="' + mailtoFallback(d) + '" style="text-decoration:underline">send it by email instead</a>.';
            err.classList.add("is-on");
          });
      } else {
        window.location.href = mailtoFallback(d);
        finishForm("Your email app should open with everything filled in &mdash; just press send. If it didn&rsquo;t open, write to <a href=\"mailto:" + (cfg.email || "") + "\" style=\"color:var(--violet);text-decoration:underline\">" + (cfg.email || "") + "</a>." + bookLine);
      }
    }
    renderForm();
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------- Cursor + magnetic buttons (desktop only) ---------- */
  if (fine && !reduce) {
    var cursor = $(".cursor"), cx = -100, cy = -100, x = -100, y = -100;
    if (cursor) {
      var lbl = $("span", cursor);
      window.addEventListener("mousemove", function (e) { cx = e.clientX; cy = e.clientY; cursor.classList.add("is-on"); }, { passive: true });
      document.addEventListener("mouseleave", function () { cursor.classList.remove("is-on"); });
      (function loop() { x += (cx - x) * 0.2; y += (cy - y) * 0.2; cursor.style.transform = "translate3d(" + x + "px," + y + "px,0)"; requestAnimationFrame(loop); })();
      document.addEventListener("mouseover", function (e) {
        var t = e.target.closest && e.target.closest("[data-cursor], a, button, label, summary, input, select, textarea");
        cursor.classList.remove("is-link", "is-label");
        if (!t) return;
        if (t.hasAttribute("data-cursor")) { lbl.textContent = t.getAttribute("data-cursor"); cursor.classList.add("is-label"); }
        else if (!/INPUT|SELECT|TEXTAREA/.test(t.tagName)) cursor.classList.add("is-link");
      });
    }
    $$("[data-magnetic]").forEach(function (b) {
      b.addEventListener("mousemove", function (e) {
        var r = b.getBoundingClientRect(), mx = e.clientX - r.left - r.width / 2, my = e.clientY - r.top - r.height / 2;
        b.style.transform = "translate(" + mx * 0.14 + "px," + my * 0.24 + "px)";
      });
      b.addEventListener("mouseleave", function () { b.style.transform = ""; });
    });
    var tilt = $("[data-tilt]");
    if (tilt) {
      var arch = $(".hero__arch", tilt), burst = $(".sunburst", tilt);
      tilt.closest(".hero__card").addEventListener("mousemove", function (e) {
        var px = e.clientX / window.innerWidth - 0.5, py = e.clientY / window.innerHeight - 0.5;
        if (arch) arch.style.transform = "translate3d(" + px * -14 + "px," + py * -10 + "px,0)";
        if (burst) burst.style.translate = px * 22 + "px " + py * 16 + "px";
      });
    }
  }

  /* ---------- Preview notes: ?notes walks Alberta through what's new ---------- */
  var notesOn = false, pins = [], pop = null, openIdx = -1;
  try {
    var sp = new URLSearchParams(location.search);
    if (sp.has("notes")) { notesOn = sp.get("notes") !== "off"; if (store) store.setItem("it-notes", notesOn ? "1" : "0"); }
    else if (store && store.getItem("it-notes") === "1") notesOn = true;
  } catch (e) {}
  var noteEls = $$("[data-note]");
  function closeNote() { if (pop) { pop.remove(); pop = null; openIdx = -1; } }
  function openNote(i) {
    closeNote();
    var el = noteEls[i], parts = el.getAttribute("data-note").split("::"), pin = pins[i];
    pop = document.createElement("div"); pop.className = "note-pop"; pop.setAttribute("role", "dialog");
    pop.innerHTML = "<small>What&rsquo;s new &middot; " + (i + 1) + " of " + noteEls.length + "</small><b>" + parts[0] + "</b><p>" + (parts[1] || "") + "</p><button type=\"button\" aria-label=\"Close note\">&times;</button>";
    document.body.appendChild(pop);
    var pr = pin.getBoundingClientRect(), w = pop.offsetWidth;
    var left = Math.min(Math.max(16, pr.left + window.scrollX - w + 30), document.documentElement.clientWidth - w - 16);
    pop.style.left = left + "px"; pop.style.top = (pr.bottom + window.scrollY + 10) + "px";
    $("button", pop).addEventListener("click", closeNote);
    openIdx = i;
  }
  function positionNotes() {
    if (!notesOn) return;
    pins.forEach(function (p, i) {
      var r = noteEls[i].getBoundingClientRect();
      p.style.left = Math.min(r.right + window.scrollX - 18, document.documentElement.clientWidth - 40) + "px";
      p.style.top = (r.top + window.scrollY - 12) + "px";
      p.style.display = r.width ? "" : "none";
    });
  }
  IT.positionNotes = positionNotes;
  if (notesOn && noteEls.length) {
    noteEls.forEach(function (el, i) {
      var p = document.createElement("button");
      p.type = "button"; p.className = "note-pin"; p.textContent = i + 1; p.setAttribute("aria-label", "Preview note " + (i + 1));
      p.addEventListener("click", function (e) { e.stopPropagation(); openIdx === i ? closeNote() : openNote(i); });
      document.body.appendChild(p); pins.push(p);
    });
    var barEl = document.createElement("div"); barEl.className = "note-bar";
    barEl.innerHTML = "<i></i><span>" + noteEls.length + " preview note" + (noteEls.length > 1 ? "s" : "") + " on this page</span><button type=\"button\" data-n-next>Next &rarr;</button><button type=\"button\" data-n-off>Hide</button>";
    document.body.appendChild(barEl);
    var ni = -1;
    $("[data-n-next]", barEl).addEventListener("click", function () {
      ni = (ni + 1) % noteEls.length;
      var y = noteEls[ni].getBoundingClientRect().top + window.scrollY - 140;
      if (IT.lenis) IT.lenis.scrollTo(y, { duration: 1 }); else window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
      setTimeout(function () { positionNotes(); openNote(ni); }, 1050);
    });
    $("[data-n-off]", barEl).addEventListener("click", function () {
      if (store) store.setItem("it-notes", "0");
      pins.forEach(function (p) { p.remove(); }); barEl.remove(); closeNote(); notesOn = false;
    });
    document.addEventListener("click", function (e) { if (pop && !pop.contains(e.target)) closeNote(); });
    window.addEventListener("resize", function () { positionNotes(); closeNote(); });
    window.addEventListener("load", positionNotes);
    if ("ResizeObserver" in window) new ResizeObserver(positionNotes).observe(document.body);
    positionNotes();
    setInterval(positionNotes, 1500);
  }

  onScroll();
})();
