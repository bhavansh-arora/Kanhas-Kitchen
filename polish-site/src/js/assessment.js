/* AI Leadership Readiness Check — nine statements, one per pillar.
   Produces a score, a radar chart, the strongest and weakest pillars, and a recommended next step.
   The result travels into the booking flow (?focus=&score=) so Melissa sees it before the call. */
(function () {
  "use strict";
  var P = window.POLISH || {};
  var pillars = P.pillars || [];

  /* ---------- radar drawing (shared with the home teaser) ---------- */
  function radarSVG(values, opts) {
    opts = opts || {};
    var size = 440, c = size / 2, r = opts.r || 150, n = pillars.length;
    function pt(i, v) { var a = (Math.PI * 2 * i) / n - Math.PI / 2; return [c + Math.cos(a) * r * v, c + Math.sin(a) * r * v]; }
    var rings = [0.25, 0.5, 0.75, 1].map(function (k) {
      return '<polygon class="grid-line" points="' + pillars.map(function (_, i) { return pt(i, k).join(","); }).join(" ") + '"/>';
    }).join("");
    var axes = pillars.map(function (_, i) { var p = pt(i, 1); return '<line class="axis" x1="' + c + '" y1="' + c + '" x2="' + p[0] + '" y2="' + p[1] + '"/>'; }).join("");
    var labels = opts.labels === false ? "" : pillars.map(function (p, i) {
      var q = pt(i, 1.2), anchor = Math.abs(q[0] - c) < 10 ? "middle" : q[0] > c ? "start" : "end";
      return '<text x="' + q[0].toFixed(1) + '" y="' + (q[1] + 4).toFixed(1) + '" text-anchor="' + anchor + '">' + p.short.toUpperCase() + "</text>";
    }).join("");
    var shape = values.map(function (v, i) { return pt(i, v).join(","); }).join(" ");
    var dots = values.map(function (v, i) { var p = pt(i, v); return '<circle class="dot" r="4" cx="' + p[0] + '" cy="' + p[1] + '"/>'; }).join("");
    return '<svg class="radar" viewBox="-40 0 ' + (size + 80) + " " + size + '" role="img" aria-label="' + (opts.aria || "Readiness by pillar") + '">' + rings + axes + '<polygon class="shape" points="' + shape + '"/>' + dots + labels + "</svg>";
  }
  P.radarSVG = radarSVG;

  // animated teaser on home page
  var teaser = document.querySelector("[data-radar-teaser]");
  if (teaser && pillars.length) {
    var sets = [[0.8, 0.55, 0.7, 0.62, 0.4, 0.5, 0.35, 0.6, 0.85], [0.6, 0.78, 0.5, 0.82, 0.66, 0.42, 0.58, 0.45, 0.7], [0.45, 0.62, 0.84, 0.55, 0.72, 0.68, 0.5, 0.75, 0.6]];
    var k = 0;
    teaser.innerHTML = radarSVG(sets[0], { aria: "Example readiness profile" });
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInterval(function () {
        k = (k + 1) % sets.length;
        var svg = teaser.querySelector("svg"), n = pillars.length, c = 220, r = 150;
        var pts = sets[k].map(function (v, i) { var a = (Math.PI * 2 * i) / n - Math.PI / 2; return [c + Math.cos(a) * r * v, c + Math.sin(a) * r * v]; });
        svg.querySelector(".shape").setAttribute("points", pts.map(function (p) { return p.join(","); }).join(" "));
        Array.prototype.forEach.call(svg.querySelectorAll(".dot"), function (d, i) { d.setAttribute("cx", pts[i][0]); d.setAttribute("cy", pts[i][1]); });
      }, 2600);
    }
  }

  /* ---------- quiz ---------- */
  var quiz = document.querySelector("[data-quiz]");
  if (!quiz) return;
  var scale = [["1", "Not yet"], ["2", "Emerging"], ["3", "Developing"], ["4", "Established"], ["5", "Leading"]];
  var answers = new Array(pillars.length).fill(0);
  var cur = 0;

  var qHTML = pillars.map(function (p, i) {
    return '<fieldset class="q" data-q="' + i + '" style="border:0;padding:0;margin:0"><legend class="sr-only">Statement ' + (i + 1) + " of " + pillars.length + "</legend>" +
      '<div class="q__pillar">Pillar ' + String(i + 1).padStart(2, "0") + " · " + p.title + '</div><p class="q__text" tabindex="-1">' + p.question + "</p>" +
      '<div class="scale">' + scale.map(function (s) {
        return '<label class="choice"><input type="radio" name="q' + i + '" value="' + s[0] + '"><span class="choice__box"><b>' + s[0] + "</b><small>" + s[1] + "</small></span></label>";
      }).join("") + "</div></fieldset>";
  }).join("");

  quiz.innerHTML =
    '<div class="quiz__top"><span data-count-label>Statement 1 of ' + pillars.length + '</span><span>How true is this for you today?</span></div>' +
    '<div class="quiz__bar"><span></span></div>' + qHTML +
    '<div class="quiz__nav"><button type="button" class="back-btn" data-qback><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>Back</button>' +
    '<button type="button" class="btn btn--rose" data-qnext disabled>Next<svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div>';

  var qs = Array.prototype.slice.call(quiz.querySelectorAll(".q"));
  var next = quiz.querySelector("[data-qnext]"), back = quiz.querySelector("[data-qback]");
  var bar = quiz.querySelector(".quiz__bar span"), countLabel = quiz.querySelector("[data-count-label]");
  var result = document.querySelector("[data-result]");
  var intro = document.querySelector("[data-quiz-intro]");

  function show(i, focus) {
    cur = i;
    qs.forEach(function (q, k) { q.classList.toggle("is-active", k === i); });
    countLabel.textContent = "Statement " + (i + 1) + " of " + pillars.length;
    bar.style.width = ((i) / pillars.length * 100) + "%";
    back.style.visibility = i === 0 ? "hidden" : "visible";
    next.disabled = !answers[i];
    next.firstChild.textContent = i === pillars.length - 1 ? "See my results" : "Next";
    if (focus) qs[i].querySelector(".q__text").focus({ preventScroll: true });
  }

  quiz.addEventListener("change", function (e) {
    var m = e.target.name.match(/^q(\d+)$/);
    if (!m) return;
    answers[+m[1]] = +e.target.value;
    next.disabled = false;
    bar.style.width = ((cur + 1) / pillars.length * 100) + "%";
    // gentle auto-advance keeps momentum
    clearTimeout(quiz._t);
    quiz._t = setTimeout(function () { if (cur < pillars.length - 1 && answers[cur]) show(cur + 1, true); }, 420);
  });
  next.addEventListener("click", function () {
    if (!answers[cur]) return;
    if (cur < pillars.length - 1) show(cur + 1, true); else finish();
  });
  back.addEventListener("click", function () { if (cur > 0) show(cur - 1, true); });

  function finish() {
    var total = answers.reduce(function (a, b) { return a + b; }, 0);
    var pct = Math.round(((total - pillars.length) / (pillars.length * 4)) * 100);
    var vals = answers.map(function (a) { return 0.15 + ((a - 1) / 4) * 0.85; });
    var order = answers.map(function (a, i) { return [a, i]; });
    var strongest = order.slice().sort(function (a, b) { return b[0] - a[0] || a[1] - b[1]; })[0][1];
    var gaps = order.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }).slice(0, 3).map(function (x) { return x[1]; });

    var band, rec, recHref, recLabel, focus;
    if (pct < 45) {
      band = ["Laying the foundations", "You're early in the journey — which is exactly where clear, calm leadership makes the biggest difference. The priority is building shared understanding and confidence before the pace picks up."];
      rec = "Start with <strong>Leading Through AI-Driven Change</strong>, a half-day workshop that reduces fear and resistance and leaves you with a personal action plan. Eligible for 50% RBP co-funding.";
      recHref = "programmes.html#leading-through-ai"; recLabel = "Explore the workshop"; focus = "ai-change";
    } else if (pct < 72) {
      band = ["Building momentum", "There's real strength here, and a few pillars holding the rest back. Focused work on those gaps — with you and your leadership team — is where the next step-change will come from."];
      rec = "<strong>Executive coaching</strong> focused on your three lowest pillars, alongside <strong>Building an AI-Ready Team</strong> for your wider leadership group.";
      recHref = "coaching.html"; recLabel = "See executive coaching"; focus = "ai-change,team";
    } else {
      band = ["Leading the way", "You're ahead of most organisations. The opportunity now is to make it sustainable — protecting the human work, and helping others in your organisation lead the way you do."];
      rec = "<strong>Sustained executive coaching</strong> to sharpen strategy and presence, or bring Melissa in as a <strong>keynote speaker</strong> to align your wider organisation.";
      recHref = "speaking.html"; recLabel = "Explore keynotes"; focus = "strategy,presence";
    }

    try { localStorage.setItem("polish-readiness", JSON.stringify({ pct: pct, answers: answers, at: Date.now() })); } catch (e) {}

    quiz.style.display = "none";
    if (intro) intro.style.display = "none";
    result.innerHTML =
      '<div class="result__grid">' +
        '<div class="panel" style="display:flex;flex-direction:column;gap:24px">' +
          '<span class="eyebrow">Your readiness</span>' +
          '<div class="score"><b data-score>0</b><span>/ 100</span></div>' +
          '<div><h2 class="h3">' + band[0] + '</h2><p class="muted" style="margin-top:12px">' + band[1] + "</p></div>" +
          '<ul class="bars">' + pillars.map(function (p, i) { return "<li><span>" + p.title + "</span><span>" + answers[i] + "/5</span><i style=\"--w:0%\" data-w=\"" + (answers[i] / 5 * 100) + '%"></i></li>'; }).join("") + "</ul>" +
        "</div>" +
        '<div class="panel" style="display:flex;flex-direction:column;gap:28px">' +
          '<div class="feature__visual" data-result-radar></div>' +
          '<div class="cards-2" style="gap:12px"><div class="card" style="padding:20px"><span class="card__num">STRONGEST</span><p style="color:var(--text);font-weight:600;margin-top:8px">' + pillars[strongest].title + '</p></div><div class="card" style="padding:20px"><span class="card__num">BIGGEST OPPORTUNITY</span><p style="color:var(--rose);font-weight:600;margin-top:8px">' + pillars[gaps[0]].title + "</p></div></div>" +
          '<div><p class="prog__label">Recommended next step</p><p class="muted">' + rec + "</p></div>" +
          '<div class="btn-row"><a class="btn btn--rose" data-magnetic href="coaching.html?focus=' + focus + "&score=" + pct + '#book">Talk it through with Melissa<svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a><a class="link-arrow" href="' + recHref + '">' + recLabel + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></div>' +
          '<button type="button" class="back-btn" data-restart style="align-self:flex-start"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>Retake the check</button>' +
        "</div>" +
      "</div>";
    result.classList.add("is-active");
    var radarWrap = result.querySelector("[data-result-radar]");
    radarWrap.innerHTML = radarSVG(vals.map(function () { return 0.08; }), { aria: "Your readiness by pillar" });
    var top = result.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top: top, behavior: "smooth" });
    requestAnimationFrame(function () {
      setTimeout(function () {
        radarWrap.innerHTML = radarSVG(vals, { aria: "Your readiness by pillar: " + pct + " out of 100" });
        Array.prototype.forEach.call(result.querySelectorAll("[data-w]"), function (b) { b.style.setProperty("--w", b.getAttribute("data-w")); });
        var el = result.querySelector("[data-score]"), t0 = performance.now();
        (function tick(t) { var k = Math.min(1, (t - t0) / 1400), e = 1 - Math.pow(1 - k, 4); el.textContent = Math.round(pct * e); if (k < 1) requestAnimationFrame(tick); })(t0);
      }, 120);
    });
    result.querySelector("[data-restart]").addEventListener("click", function () {
      answers.fill(0);
      Array.prototype.forEach.call(quiz.querySelectorAll("input"), function (i) { i.checked = false; });
      result.classList.remove("is-active"); result.innerHTML = "";
      quiz.style.display = ""; if (intro) intro.style.display = "";
      show(0, true);
    });
  }

  show(0, false);
})();
