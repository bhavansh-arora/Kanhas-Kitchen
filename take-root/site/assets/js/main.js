/* Take Root Life Coaching — interactions */
(() => {
  const d = document;
  const root = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => Array.from(c.querySelectorAll(s));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = () => !reduce && window.gsap && window.ScrollTrigger;
  root.classList.add("is-ready");

  /* ---------- Page entrance ---------- */
  let loaded = false;
  const markLoaded = () => { if (loaded) return; loaded = true; requestAnimationFrame(() => root.classList.add("is-loaded")); };
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(markLoaded);
  setTimeout(markLoaded, 700);

  /* ---------- Navigation ---------- */
  const nav = $("#nav");
  const burger = $(".burger");
  const menu = $("#menu");
  const setMenu = (open) => {
    root.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.setAttribute("aria-hidden", String(!open));
    if (open) nav.classList.remove("is-hidden");
  };
  burger && burger.addEventListener("click", () => setMenu(!root.classList.contains("menu-open")));
  d.addEventListener("keydown", (e) => { if (e.key === "Escape" && root.classList.contains("menu-open")) { setMenu(false); burger.focus(); } });
  $$("#menu a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

  let lastY = scrollY;
  const sticky = $("#sticky-book");
  const footer = $(".footer");
  let footerVisible = false;
  if (footer && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { footerVisible = e.isIntersecting; }, { threshold: 0 }).observe(footer);
  }

  /* ---------- Scroll-linked lighting (signs list + steps) ---------- */
  const litItems = [...$$(".signs-list li"), ...$$(".step")];
  const labels = $$(".root-label");

  let ticking = false;
  const onScroll = () => {
    const y = scrollY;
    if (!root.classList.contains("menu-open")) nav.classList.toggle("is-hidden", y > lastY && y > 240);
    lastY = y;
    if (sticky && !d.body.classList.contains("no-sticky")) {
      const on = y > innerHeight * 0.75 && !footerVisible;
      sticky.classList.toggle("is-on", on);
      sticky.setAttribute("aria-hidden", String(!on));
      const a = $("a", sticky); a && a.setAttribute("tabindex", on ? "0" : "-1");
    }
    const vh = innerHeight;
    litItems.forEach((el) => {
      const r = el.getBoundingClientRect();
      el.classList.toggle("is-lit", r.top < vh * (el.classList.contains("step") ? 0.6 : 0.68));
    });
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  $$("[data-top]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); }));

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  } else revealEls.forEach((el) => el.classList.add("is-in"));

  /* ---------- Statement: split into words ---------- */
  const splitWords = (node) => {
    Array.from(node.childNodes).forEach((n) => {
      if (n.nodeType === 3) {
        const frag = d.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((tok) => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) frag.appendChild(d.createTextNode(tok));
          else { const s = d.createElement("span"); s.className = "w"; s.textContent = tok; frag.appendChild(s); }
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) {
        if (n.classList.contains("pill-img")) n.classList.add("w");
        else splitWords(n);
      }
    });
  };
  $$(".statement[data-words]").forEach((el) => splitWords(el));

  /* ---------- Testimonials track ---------- */
  const track = $("#t-track");
  if (track) {
    const bar = $("#t-bar");
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const ratio = track.clientWidth / track.scrollWidth;
      const pos = max > 0 ? track.scrollLeft / max : 0;
      if (bar) bar.style.width = `${Math.min(100, (ratio + (1 - ratio) * pos) * 100)}%`;
    };
    track.addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
    $$("[data-t]").forEach((b) => b.addEventListener("click", () => {
      const card = $(".t-card", track);
      const step = card ? card.getBoundingClientRect().width + 20 : 400;
      track.scrollBy({ left: step * Number(b.dataset.t), behavior: reduce ? "auto" : "smooth" });
    }));
    let down = false, startX = 0, startL = 0, moved = false;
    track.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; down = true; moved = false; startX = e.clientX; startL = track.scrollLeft; });
    addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; track.classList.add("is-drag"); }
      track.scrollLeft = startL - dx;
    });
    addEventListener("pointerup", () => { if (!down) return; down = false; track.classList.remove("is-drag"); });
    track.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  }

  /* ---------- Accordion ---------- */
  $$(".faq-item").forEach((item) => {
    const summary = $("summary", item);
    const body = $(".faq-body", item);
    summary.addEventListener("click", (e) => {
      if (reduce || !body.animate) return;
      e.preventDefault();
      if (item.open) {
        const h = body.offsetHeight;
        const a = body.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 450, easing: "cubic-bezier(.22,1,.36,1)" });
        item.classList.add("closing");
        a.onfinish = () => { item.open = false; item.classList.remove("closing"); };
      } else {
        item.open = true;
        const h = body.offsetHeight;
        body.animate([{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }], { duration: 550, easing: "cubic-bezier(.22,1,.36,1)" });
      }
    });
  });

  /* ---------- Booking tabs ---------- */
  const seg = $(".seg");
  if (seg) {
    const tabs = $$("[role=tab]", seg);
    const thumb = $(".seg-thumb", seg);
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        $("#" + t.getAttribute("aria-controls")).hidden = !on;
      });
      thumb.style.width = tab.offsetWidth + "px";
      thumb.style.transform = `translateX(${tab.offsetLeft - 5}px)`;
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => { select(t); history.replaceState(null, "", "#" + t.dataset.hash); });
      t.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); select(tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length], true); }
      });
    });
    const initial = tabs.find((t) => "#" + t.dataset.hash === location.hash) || tabs[0];
    requestAnimationFrame(() => select(initial));
    addEventListener("resize", () => select(tabs.find((t) => t.getAttribute("aria-selected") === "true")));
    if (location.hash === "#returning") setTimeout(() => $("#book")?.scrollIntoView({ behavior: "smooth" }), 400);
  }

  /* ---------- Contact form ---------- */
  const form = $("[data-form]");
  if (form) {
    const wrap = form.closest("[data-form-wrap]");
    const params = new URLSearchParams(location.search);
    const topic = params.get("topic");
    if (topic) { const r = form.querySelector(`input[name="topic"][value="${CSS.escape(topic)}"]`); if (r) r.checked = true; }
    let footing = null;
    try { footing = JSON.parse(localStorage.getItem("tr-footing") || "null"); } catch (_) {}
    const note = $(".attach-note", form);
    if (footing && note) {
      note.classList.add("is-on");
      $("[data-footing-summary]", note).textContent = footing.summary;
    }
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const attach = data.get("attach_footing") && footing;
      if (attach) data.set("footing_check", footing.summary);
      const endpoint = form.dataset.endpoint;
      const btnEl = $("button[type=submit]", form);
      btnEl.disabled = true;
      try {
        if (endpoint) {
          const res = await fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
          if (!res.ok) throw new Error("Request failed");
        } else {
          const lines = [
            `Name: ${data.get("name")}`, `Email: ${data.get("email")}`,
            data.get("phone") ? `Phone: ${data.get("phone")}` : "",
            data.get("topic") ? `What's on my mind: ${data.get("topic")}` : "",
            data.get("contact_pref") ? `Best way to reach me: ${data.get("contact_pref")}` : "",
            "", String(data.get("message") || ""),
            attach ? `\nMy Footing Check: ${footing.summary}` : "",
          ].filter((l, i) => l !== "" || i === 5);
          const subject = encodeURIComponent(`New enquiry from ${data.get("name")} — Take Root website`);
          location.href = `mailto:${form.dataset.email}?subject=${subject}&body=${encodeURIComponent(lines.join("\n"))}`;
        }
        wrap.classList.add("is-sent");
        wrap.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      } catch (err) {
        btnEl.disabled = false;
        alert("Sorry — something went wrong sending your message. Please email " + form.dataset.email + " directly.");
      }
    });
  }

  /* ---------- Article reading progress ---------- */
  const progress = $(".progress");
  const article = $(".article");
  if (progress && article) {
    const p = () => {
      const r = article.getBoundingClientRect();
      const total = r.height - innerHeight * 0.6;
      const v = Math.min(1, Math.max(0, -r.top / Math.max(total, 1)));
      progress.style.transform = `scaleX(${v})`;
    };
    addEventListener("scroll", p, { passive: true });
    p();
  }

  /* ---------- GSAP-powered motion ---------- */
  const initMotion = () => {
    const words = $$(".statement[data-words]");
    const tips = $$("#roots .tip");
    if (!hasGsap()) {
      words.forEach((el) => el.removeAttribute("data-words"));
      labels.forEach((l) => l.classList.add("is-on"));
      return;
    }
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);

    // Statement words light up as you read
    words.forEach((el) => {
      gsap.to($$(".w", el), {
        opacity: 1, ease: "none", stagger: 0.12,
        scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 52%", scrub: 0.6 },
      });
    });

    // Hero parallax
    const heroMedia = $(".hero-media");
    if (heroMedia) {
      gsap.to(heroMedia, { yPercent: 9, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    }

    // Root system draws itself
    const stage = $("#roots");
    if (stage) {
      const draws = $$(".draw", stage);
      draws.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
      gsap.set(tips, { scale: 0, transformOrigin: "50% 50%" });
      const rootsPaths = $$(".root", stage);
      const hairsPaths = $$(".hair", stage);
      const tl = gsap.timeline({ defaults: { ease: "none" } });
      const marks = [];
      rootsPaths.forEach((p, i) => {
        tl.to(p, { strokeDashoffset: 0, duration: 1 }, i * 0.55);
        tl.to(tips[i], { scale: 1, duration: 0.25, ease: "back.out(2)" }, i * 0.55 + 0.9);
        marks.push(i * 0.55 + 0.95);
      });
      hairsPaths.forEach((p, i) => tl.to(p, { strokeDashoffset: 0, duration: 0.6 }, 0.6 + i * 0.25));
      const total = tl.duration();
      const desktop = matchMedia("(min-width: 1025px)").matches;
      ScrollTrigger.create({
        trigger: desktop ? ".roots-grid" : stage,
        start: desktop ? "top 65%" : "top 85%",
        end: desktop ? "bottom 85%" : "bottom 45%",
        scrub: 0.8,
        animation: tl,
        onUpdate: (self) => {
          const t = self.progress * total;
          labels.forEach((l, i) => l.classList.toggle("is-on", t >= marks[i]));
        },
      });
    }

    // Stacking process cards: earlier cards recede
    const cards = $$(".stack-card");
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) return;
      gsap.to(card, {
        scale: 0.93, opacity: 0.55, ease: "none",
        scrollTrigger: { trigger: next, start: "top 90%", end: "top 20%", scrub: true },
      });
    });

    // Gentle parallax inside image cards
    $$("[data-parallax]").forEach((el) => {
      gsap.fromTo(el, { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
    });

    // Recalculate once images/fonts settle
    addEventListener("load", () => ScrollTrigger.refresh());
  };
  if (d.readyState === "complete" || d.readyState === "interactive") initMotion();
  else d.addEventListener("DOMContentLoaded", initMotion);
})();
