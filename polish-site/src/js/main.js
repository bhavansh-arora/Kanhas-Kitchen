/* Polish — shared interactions. No dependencies. */
(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.remove("no-js");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- page load + transitions ---------- */
  requestAnimationFrame(function () { doc.classList.add("is-loaded"); });
  window.addEventListener("pageshow", function (e) { if (e.persisted) doc.classList.remove("is-leaving"); });

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || reduceMotion) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || a.target === "_blank" || a.hasAttribute("download") ||
        /^(mailto:|tel:|https?:)/.test(href) || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (href.split("#")[0] === "" ) return;
    e.preventDefault();
    doc.classList.add("is-leaving");
    setTimeout(function () { window.location.href = href; }, 380);
  });

  /* ---------- header ---------- */
  var header = $(".site-header");
  var lastY = window.scrollY;
  function onScrollHeader() {
    var y = window.scrollY;
    if (!header) return;
    header.classList.toggle("is-scrolled", y > 24);
    if (!doc.classList.contains("menu-open")) {
      header.classList.toggle("is-hidden", y > lastY && y > 480);
    }
    lastY = y;
  }

  /* ---------- mobile menu ---------- */
  var toggle = $(".menu-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = doc.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      header.classList.remove("is-hidden");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && doc.classList.contains("menu-open")) toggle.click();
    });
    $$(".mobile-menu a").forEach(function (a) {
      a.addEventListener("click", function () { if (a.getAttribute("href").charAt(0) === "#") toggle.click(); });
    });
  }

  /* ---------- split headings into masked lines (per word, wraps naturally) ---------- */
  $$("[data-split]").forEach(function (el) {
    var html = el.innerHTML.trim();
    // split on <br> into explicit lines; each line's words get their own mask for a soft stagger
    var lines = html.split(/<br\s*\/?>/i);
    var i = 0;
    el.innerHTML = lines.map(function (line) {
      var tmp = document.createElement("div");
      tmp.innerHTML = line.trim();
      var out = [];
      tmp.childNodes.forEach(function (node) {
        if (node.nodeType === 3) {
          node.textContent.split(/(\s+)/).forEach(function (w) {
            if (!w) return;
            if (/^\s+$/.test(w)) { out.push(" "); return; }
            out.push('<span class="split-line" style="display:inline-block"><span style="--d:' + (i++ * 0.045).toFixed(3) + 's">' + w + "</span></span>");
          });
        } else {
          var words = node.textContent.split(/(\s+)/);
          words.forEach(function (w) {
            if (!w) return;
            if (/^\s+$/.test(w)) { out.push(" "); return; }
            var clone = node.cloneNode(false);
            clone.textContent = w;
            out.push('<span class="split-line" style="display:inline-block"><span style="--d:' + (i++ * 0.045).toFixed(3) + 's">' + clone.outerHTML + "</span></span>");
          });
        }
      });
      return out.join("");
    }).join("<br>");
    el.setAttribute("data-reveal", "fade");
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
  });

  /* ---------- reveal on scroll ---------- */
  var revealEls = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }
  // stagger children
  $$("[data-stagger]").forEach(function (wrap) {
    var step = parseFloat(wrap.getAttribute("data-stagger")) || 0.08;
    $$("[data-reveal]", wrap).forEach(function (el, i) { el.style.setProperty("--d", (i * step).toFixed(2) + "s"); });
  });

  /* ---------- statement: words light up as you scroll ---------- */
  var scrubs = $$("[data-scrub]");
  scrubs.forEach(function (el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      var frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(function (w) {
        if (!w) return;
        if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
        var s = document.createElement("span"); s.className = "w"; s.textContent = w; frag.appendChild(s);
      });
      n.parentNode.replaceChild(frag, n);
    });
    el._words = $$(".w", el);
  });
  function updateScrubs() {
    var vh = window.innerHeight;
    scrubs.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var start = vh * 0.85, end = vh * 0.35;
      var p = (start - r.top) / (start - end + r.height * 0.6);
      p = Math.max(0, Math.min(1, p));
      var on = Math.round(p * el._words.length);
      el._words.forEach(function (w, i) { w.classList.toggle("is-on", i < on); });
    });
  }

  /* ---------- parallax ---------- */
  var parallax = $$("[data-parallax]");
  function updateParallax() {
    if (reduceMotion) return;
    var vh = window.innerHeight;
    parallax.forEach(function (el) {
      var r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var speed = parseFloat(el.getAttribute("data-parallax")) || 0.12;
      var center = r.top + r.height / 2 - vh / 2;
      el.style.transform = "translate3d(0," + (center * -speed).toFixed(1) + "px,0)";
    });
  }

  /* ---------- reading progress ---------- */
  var progress = $(".read-progress");
  var article = $(".prose");
  function updateProgress() {
    if (!progress || !article) return;
    var r = article.getBoundingClientRect();
    var p = (window.innerHeight * 0.4 - r.top) / r.height;
    progress.style.transform = "scaleX(" + Math.max(0, Math.min(1, p)).toFixed(3) + ")";
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      onScrollHeader(); updateScrubs(); updateParallax(); updateProgress();
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------- count up ---------- */
  var counters = $$("[data-count]");
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, to = parseFloat(el.getAttribute("data-count")), t0 = null, dur = 1600;
        cio.unobserve(el);
        if (reduceMotion) { el.textContent = to; return; }
        (function tick(t) {
          if (!t0) t0 = t;
          var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
          el.textContent = Math.round(to * e);
          if (k < 1) requestAnimationFrame(tick);
        })(performance.now());
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  /* ---------- pointer effects ---------- */
  if (finePointer && !reduceMotion) {
    $$(".card, .pillar-cell").forEach(function (c) {
      c.addEventListener("pointermove", function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty("--mx", (e.clientX - r.left) + "px");
        c.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
    $$("[data-magnetic]").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.22, y = (e.clientY - r.top - r.height / 2) * 0.3;
        b.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
    var hero = $(".hero");
    if (hero) {
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        hero.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
        hero.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
      });
    }
  }

  /* ---------- hero video ---------- */
  var video = $(".hero video");
  var vbtn = $(".video-toggle");
  if (video) {
    if (reduceMotion) { video.removeAttribute("autoplay"); video.pause(); }
    var src = window.innerWidth < 760 ? video.getAttribute("data-src-sm") : video.getAttribute("data-src");
    if (src) { video.src = src; if (!reduceMotion) { var pp = video.play(); if (pp && pp.catch) pp.catch(function () {}); } }
    if (vbtn) {
      var setLabel = function () {
        var paused = video.paused;
        vbtn.querySelector("span").textContent = paused ? "Play film" : "Pause film";
        vbtn.setAttribute("aria-pressed", paused ? "true" : "false");
      };
      vbtn.addEventListener("click", function () { if (video.paused) video.play(); else video.pause(); setLabel(); });
      video.addEventListener("play", setLabel); video.addEventListener("pause", setLabel);
      setLabel();
    }
  }

  /* ---------- Auckland clock ---------- */
  var clocks = $$("[data-nz-time]");
  function tickClock() {
    var t;
    try {
      t = new Intl.DateTimeFormat("en-NZ", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Pacific/Auckland" }).format(new Date());
    } catch (e) { t = ""; }
    clocks.forEach(function (c) { c.textContent = t.replace(/\s/g, " ").toLowerCase(); });
  }
  if (clocks.length) { tickClock(); setInterval(tickClock, 20000); }
  $$("[data-year]").forEach(function (y) { y.textContent = new Date().getFullYear(); });

  /* ---------- FAQ: one open at a time, smooth height ---------- */
  $$(".faq details").forEach(function (d) {
    var body = $(".faq__body", d);
    d.querySelector("summary").addEventListener("click", function (e) {
      if (reduceMotion || !body.animate) return;
      e.preventDefault();
      if (d.open) {
        var h = body.offsetHeight;
        body.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 450, easing: "cubic-bezier(.22,1,.36,1)" }).onfinish = function () { d.open = false; };
      } else {
        $$(".faq details[open]", d.parentElement).forEach(function (o) { if (o !== d) o.querySelector("summary").click(); });
        d.open = true;
        var h2 = body.offsetHeight;
        body.animate([{ height: "0px", opacity: 0 }, { height: h2 + "px", opacity: 1 }], { duration: 550, easing: "cubic-bezier(.22,1,.36,1)" });
      }
    });
  });

  /* ---------- pillar dial ---------- */
  var dialWrap = $("[data-pillars]");
  if (dialWrap && window.POLISH && window.POLISH.pillars) {
    var pillars = window.POLISH.pillars;
    var dial = $(".dial", dialWrap);
    var detail = $(".pillar-detail", dialWrap);
    var prog = $(".pillar-progress", dialWrap);
    var centerT = $(".dial__center .t", dialWrap), centerN = $(".dial__center .n", dialWrap);
    var sweep = $(".dial__sweep", dialWrap);
    var cycle = 5200, idx = 0, timer = null;
    dialWrap.style.setProperty("--cycle", cycle + "ms");
    pillars.forEach(function (p, i) {
      var b = document.createElement("button");
      b.className = "dial__node"; b.type = "button"; b.style.setProperty("--i", i);
      b.textContent = String(i + 1).padStart(2, "0");
      b.setAttribute("aria-label", "Pillar " + (i + 1) + ": " + p.title);
      b.addEventListener("click", function () { show(i, true); });
      b.addEventListener("mouseenter", function () { if (finePointer) show(i, true); });
      dial.appendChild(b);
      prog.appendChild(document.createElement("span"));
    });
    var nodes = $$(".dial__node", dial), bars = $$("span", prog);
    var setRadius = function () { dial.style.setProperty("--r", (dial.offsetWidth * 0.43).toFixed(1) + "px"); };
    setRadius(); window.addEventListener("resize", setRadius);
    function show(i, user) {
      idx = i;
      var p = pillars[i];
      nodes.forEach(function (n, k) { n.classList.toggle("is-active", k === i); });
      bars.forEach(function (b, k) {
        b.classList.toggle("is-done", k < i);
        b.classList.remove("is-active"); void b.offsetWidth;
        if (k === i) b.classList.add("is-active");
      });
      centerN.textContent = "PILLAR " + String(i + 1).padStart(2, "0");
      centerT.textContent = p.short;
      if (sweep) sweep.style.setProperty("--a", (i * 40 - 20) + "deg");
      detail.innerHTML = '<div class="fade"><div class="pillar-detail__n">' + String(i + 1).padStart(2, "0") + " / 09</div><h3>" + p.title + "</h3><p>" + p.body + "</p></div>";
      clearTimeout(timer);
      if (!reduceMotion && !(user && finePointer && dialWrap.matches(":hover"))) timer = setTimeout(function () { show((idx + 1) % pillars.length); }, cycle);
    }
    dialWrap.addEventListener("mouseleave", function () { dialWrap.classList.remove("is-paused"); clearTimeout(timer); timer = setTimeout(function () { show((idx + 1) % pillars.length); }, cycle); });
    dialWrap.addEventListener("mouseenter", function () { if (finePointer) { dialWrap.classList.add("is-paused"); clearTimeout(timer); } });
    // start when visible
    if ("IntersectionObserver" in window) {
      var dio = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { show(0); dio.disconnect(); } }, { threshold: 0.35 });
      dio.observe(dialWrap);
    } else show(0);
  }

  /* ---------- pillar grid (approach page) ---------- */
  var pgrid = $("[data-pillar-grid]");
  if (pgrid && window.POLISH) {
    pgrid.innerHTML = window.POLISH.pillars.map(function (p, i) {
      return '<article class="pillar-cell" data-reveal style="--d:' + ((i % 3) * 0.08) + 's"><span class="pillar-cell__n">PILLAR ' + String(i + 1).padStart(2, "0") +
        "</span><h3>" + p.title + "</h3><p>" + p.body + '</p><p class="pillar-cell__q">“' + p.question + '”</p></article>';
    }).join("");
    $$(".pillar-cell", pgrid).forEach(function (c) {
      if (io) io.observe(c); else c.classList.add("is-in");
      if (finePointer) c.addEventListener("pointermove", function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty("--mx", (e.clientX - r.left) + "px"); c.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ---------- insights filter ---------- */
  var filters = $$(".filter");
  if (filters.length) {
    filters.forEach(function (f) {
      f.addEventListener("click", function () {
        var cat = f.getAttribute("data-filter");
        filters.forEach(function (o) { o.classList.toggle("is-active", o === f); o.setAttribute("aria-pressed", o === f ? "true" : "false"); });
        $$("[data-cat]").forEach(function (p) {
          var show = cat === "all" || p.getAttribute("data-cat").split(" ").indexOf(cat) > -1;
          p.classList.toggle("is-hidden", !show);
          if (show) { p.classList.remove("is-in"); void p.offsetWidth; p.classList.add("is-in"); }
        });
      });
    });
  }

  /* ---------- copy link ---------- */
  $$("[data-copy-link]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(function () {
        b.setAttribute("aria-label", "Link copied");
        b.style.color = "var(--rose)";
        setTimeout(function () { b.style.color = ""; b.setAttribute("aria-label", "Copy link"); }, 1600);
      });
    });
  });
})();
