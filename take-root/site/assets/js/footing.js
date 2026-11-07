/* The Footing Check — radar wheel + gentle recommendation. Runs entirely in the browser. */
(() => {
  const host = document.querySelector("[data-footing]");
  if (!host) return;
  const inputs = Array.from(host.querySelectorAll('input[type="range"]'));
  const svg = host.querySelector("[data-wheel]");
  const NS = "http://www.w3.org/2000/svg";
  const C = 200, R = 160, N = inputs.length;
  const KEY = "tr-footing";

  const insights = {
    career: "Your work may be asking more of you than it gives back. Together we’d get clear on what alignment actually means for you — and the smallest real step toward it.",
    health: "Your energy is a signal worth listening to. We’d look at the habits that drain you and build ones that genuinely fit your body and your life.",
    relationships: "Feeling unseen or unsupported weighs on everything else. We’d explore boundaries, connection, and what you need from the people around you.",
    purpose: "That “is this it?” feeling often lives here. We’d slow down and reconnect with what matters most — so your choices start to feel like yours.",
    daily: "Busy isn’t the same as full. We’d find your “just right” balance and step off autopilot, one small change at a time.",
    growth: "When there’s no room to grow, life starts to feel small. We’d make space for curiosity and the thing you’ve been talking yourself out of.",
  };

  const angle = (i) => (-90 + (360 / N) * i) * (Math.PI / 180);
  const pt = (i, v) => [C + Math.cos(angle(i)) * R * (v / 10), C + Math.sin(angle(i)) * R * (v / 10)];
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

  // Static grid
  [2, 4, 6, 8, 10].forEach((v) => {
    svg.appendChild(el("polygon", { class: "grid-ring", points: inputs.map((_, i) => pt(i, v).join(",")).join(" ") }));
  });
  inputs.forEach((inp, i) => {
    const [x, y] = pt(i, 10);
    svg.appendChild(el("line", { class: "axis", x1: C, y1: C, x2: x, y2: y }));
    const [lx, ly] = pt(i, 12.6);
    const anchor = Math.abs(lx - C) < 8 ? "middle" : lx > C ? "start" : "end";
    const t = el("text", { class: "lbl", x: lx, y: ly + 4, "text-anchor": anchor });
    t.textContent = inp.dataset.short || inp.dataset.label.split(" & ")[0];
    svg.appendChild(t);
  });
  const shape = el("polygon", { class: "shape" });
  svg.appendChild(shape);
  const dots = inputs.map(() => { const c = el("circle", { class: "pt", r: 6 }); svg.appendChild(c); return c; });

  const $ = (s) => host.querySelector(s);
  const out = { avg: $("[data-avg]"), title: $("[data-title]"), text: $("[data-text]"), rec: $("[data-rec]"), badge: $("[data-badge]") };
  let touched = false;

  // Restore previous answers
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && saved.scores) { inputs.forEach((inp) => { if (saved.scores[inp.name]) inp.value = saved.scores[inp.name]; }); touched = true; }
  } catch (_) {}

  let current = inputs.map((i) => +i.value);
  let raf = null;

  const draw = (vals) => {
    const pts = vals.map((v, i) => pt(i, v));
    shape.setAttribute("points", pts.map((p) => p.join(",")).join(" "));
    pts.forEach(([x, y], i) => { dots[i].setAttribute("cx", x); dots[i].setAttribute("cy", y); });
  };
  const animateTo = (target) => {
    cancelAnimationFrame(raf);
    const from = current.slice();
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 420);
      const e = 1 - Math.pow(1 - t, 3);
      current = from.map((f, i) => f + (target[i] - f) * e);
      draw(current);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };

  const update = (save) => {
    const vals = inputs.map((i) => +i.value);
    inputs.forEach((inp) => {
      host.querySelector("#o-" + inp.name).textContent = inp.value;
      inp.style.setProperty("--p", ((inp.value - 1) / 9) * 100 + "%");
    });
    animateTo(vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    out.avg.textContent = avg.toFixed(1);
    if (!touched) return;
    const min = Math.min(...vals), max = Math.max(...vals);
    const low = inputs[vals.indexOf(min)], high = inputs[vals.indexOf(max)];
    const lowL = low.dataset.label, highL = high.dataset.label;
    if (max - min <= 1) {
      out.title.innerHTML = avg >= 7 ? "Steady, well-rooted ground." : "Evenly stretched — and that’s worth noticing.";
      out.text.textContent = avg >= 7
        ? "Your wheel is round and strong. Coaching here is about protecting what’s working and choosing your next stretch on purpose."
        : "No single area stands out, but nothing feels fully nourished either. That quiet, everything-is-fine-but feeling is exactly what coaching gives space to explore.";
    } else {
      out.title.innerHTML = `Least rooted: <em>${lowL}</em>`;
      out.text.textContent = `${insights[low.name]} Your strongest root right now is ${highL.toLowerCase()} — something real to build from.`;
    }
    let rec;
    if (avg < 5 || max - min >= 5) rec = "<b>Suggested start:</b> a free First Step call, then the 3-session package — there’s a lot pulling at you, and continuity helps us untangle it.";
    else if (avg < 7.5) rec = `<b>Suggested start:</b> a free First Step call, then a focused single session on ${lowL.toLowerCase()}.`;
    else rec = "<b>Suggested start:</b> you’re well rooted. A single session — or a Recurring Client tune-up — can help you keep it that way.";
    out.rec.innerHTML = rec;
    out.rec.style.display = "block";
    out.badge.textContent = "Updated";
    if (save) {
      const scores = Object.fromEntries(inputs.map((i) => [i.name, +i.value]));
      const summary = `${inputs.map((i) => `${i.dataset.label} ${i.value}/10`).join(" · ")} — average ${avg.toFixed(1)}; least rooted: ${lowL}; strongest: ${highL}.`;
      try { localStorage.setItem(KEY, JSON.stringify({ scores, summary, at: new Date().toISOString() })); } catch (_) {}
    }
  };

  out.rec.style.display = "none";
  inputs.forEach((inp) => inp.addEventListener("input", () => { touched = true; update(true); }));
  host.querySelectorAll("[data-save]").forEach((a) => a.addEventListener("click", () => { touched = true; update(true); }));
  const reset = host.querySelector("[data-reset]");
  reset && reset.addEventListener("click", () => {
    try { localStorage.removeItem(KEY); } catch (_) {}
    inputs.forEach((i) => (i.value = 5));
    touched = false;
    out.title.textContent = "Move the sliders to see your snapshot.";
    out.text.textContent = "Your wheel updates as you go. The shape matters more than the numbers.";
    out.rec.style.display = "none";
    out.badge.textContent = "Live";
    update(false);
  });
  draw(current);
  update(false);
})();
