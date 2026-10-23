/* Lasting Change Wellness — interactions.
   Every feature is progressive: the site reads and works without this file. */
(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* Header: solid after scrolling, hides on fast scroll down */
  const header = $('[data-header]');
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    const goingDown = y > lastY + 4;
    const goingUp = y < lastY - 4;
    if (goingDown && y > 600 && !document.body.classList.contains('menu-open')) header.classList.add('is-hidden');
    if (goingUp || y < 200) header.classList.remove('is-hidden');
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Full-screen menu */
  const menuBtn = $('[data-menu-btn]');
  const menu = $('[data-menu]');
  const label = $('.menu-btn-label', menuBtn);
  const setMenu = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    label.textContent = open ? 'Close' : 'Menu';
    document.body.classList.toggle('menu-open', open);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
      header.classList.remove('is-hidden');
      setTimeout(() => $('a', menu)?.focus({ preventScroll: true }), 200);
    } else {
      menu.classList.remove('is-open');
      setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 400);
    }
  };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
  });
  window.matchMedia('(min-width: 1141px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* Reveal on scroll, with a small stagger for siblings */
  const reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const siblings = $$(':scope > [data-reveal]', el.parentElement);
        const i = Math.max(0, siblings.indexOf(el));
        el.style.setProperty('--d', `${Math.min(i, 5) * 0.08}s`);
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* Statement: words light up as you scroll through */
  $$('[data-words]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
    const spans = $$('.w', el);
    if (reduceMotion) { spans.forEach((s) => s.classList.add('on')); return; }
    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const n = Math.round(progress * spans.length);
      spans.forEach((s, i) => s.classList.toggle('on', i < n));
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* S.H.I.N.E. letters (home): open on hover or click */
  $$('[data-letters]').forEach((group) => {
    const items = $$('.letter', group);
    const open = (item) => items.forEach((it) => {
      const on = it === item;
      it.classList.toggle('is-open', on);
      it.setAttribute('aria-expanded', String(on));
    });
    const canHover = window.matchMedia('(hover: hover) and (min-width: 861px)').matches;
    items.forEach((item) => {
      item.addEventListener('click', () => open(item));
      item.addEventListener('focus', () => open(item));
      if (canHover) item.addEventListener('mouseenter', () => open(item));
    });
  });

  /* Carousel controls */
  $$('[data-carousel]').forEach((track) => {
    const wrap = track.closest('section');
    const prev = $('[data-prev]', wrap);
    const next = $('[data-next]', wrap);
    const step = () => (track.firstElementChild?.getBoundingClientRect().width || 300) + 20;
    const sync = () => {
      if (!prev) return;
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
    };
    prev?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reduceMotion ? 'auto' : 'smooth' }));
    next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: reduceMotion ? 'auto' : 'smooth' }));
    track.addEventListener('scroll', sync, { passive: true });
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next?.click(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev?.click(); }
    });
    window.addEventListener('resize', sync);
    sync();
  });

  /* Method page: sticky letter follows the step in view */
  const storySteps = $$('[data-step]');
  if (storySteps.length && 'IntersectionObserver' in window) {
    const letters = $$('[data-story-letter]');
    const bars = $$('[data-story-progress] li');
    const activate = (i) => {
      letters.forEach((l, j) => l.classList.toggle('is-active', j === i));
      bars.forEach((b, j) => b.classList.toggle('done', j <= i));
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) activate(storySteps.indexOf(e.target)); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    storySteps.forEach((s) => io.observe(s));
    activate(0);
  }

  /* RISE readiness check */
  $$('[data-rise]').forEach((form) => {
    const boxes = $$('input[type="checkbox"]', form);
    const bar = $('.rise-meter span', form);
    const out = $('.rise-result', form);
    const messages = [
      'Tick the ones that feel true.',
      'A first spark. A free call can show you what is possible.',
      'You are warming up. Let’s talk about what is holding you back.',
      'Almost there. You are closer to ready than you think.',
      'You are ready to shine. Let’s find a time to talk.',
    ];
    const update = () => {
      const n = boxes.filter((b) => b.checked).length;
      bar.style.width = `${(n / boxes.length) * 100}%`;
      out.textContent = messages[n];
      form.classList.toggle('is-ready', n === boxes.length);
    };
    boxes.forEach((b) => b.addEventListener('change', update));
    form.addEventListener('submit', (e) => e.preventDefault());
  });

  /* Contact: booking tabs swap the embedded scheduler */
  const tabs = $$('[data-book-tab]');
  if (tabs.length) {
    const frame = $('[data-book-frame]');
    const direct = $('[data-book-direct]');
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      if (frame.getAttribute('src') !== tab.dataset.embed) frame.setAttribute('src', tab.dataset.embed);
      frame.title = `Book: ${tab.dataset.name}`;
      direct.href = tab.dataset.href;
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (e) => {
        const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
      });
    });
    const fromHash = { '#collective': 1, '#speaking': 2 }[location.hash];
    if (fromHash) select(tabs[fromHash]);
    // Pre-select via ?type=collective|speaking (used by links on other pages)
    const type = new URLSearchParams(location.search).get('type');
    const byType = tabs.find((t) => t.dataset.type === type);
    if (byType) select(byType);
  }

  /* Contact form: posts to an endpoint if one is set, otherwise opens an email */
  $$('[data-contact-form]').forEach((form) => {
    const status = $('.form-status', form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.className = 'form-status';
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const data = Object.fromEntries(new FormData(form));
      if (data.company) return; // spam trap
      const endpoint = form.dataset.endpoint;
      if (endpoint) {
        const btn = $('button[type="submit"]', form);
        btn.disabled = true;
        status.textContent = 'Sending…';
        try {
          const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
          if (!res.ok) throw new Error(res.statusText);
          form.reset();
          status.textContent = 'Thank you. Lauren will be in touch within two business days.';
          status.classList.add('ok');
        } catch {
          status.textContent = 'Something went wrong. Please email lauren@lastingchangewellness.com instead.';
          status.classList.add('err');
        } finally { btn.disabled = false; }
        return;
      }
      const subject = `Website enquiry: ${data.topic}`;
      const body = `${data.message}\n\n${data.name}\n${data.email}`;
      window.location.href = `mailto:${form.dataset.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      status.textContent = 'Your email app should open with your message ready to send.';
      status.classList.add('ok');
    });
  });

  /* Mobile booking dock: show after the first screen, hide over CTAs and the footer */
  const dock = $('[data-dock]');
  if (dock && 'IntersectionObserver' in window && !document.body.classList.contains('no-dock')) {
    const blockers = new Set();
    let past = false;
    const render = () => dock.classList.toggle('is-visible', past && blockers.size === 0);
    const onScrollDock = () => { past = window.scrollY > window.innerHeight * 0.8; render(); };
    window.addEventListener('scroll', onScrollDock, { passive: true });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? blockers.add(e.target) : blockers.delete(e.target)));
      render();
    });
    $$('.cta-band, .site-footer').forEach((el) => io.observe(el));
    onScrollDock();
  }

  /* Hero image settles in once visible */
  $$('.hero-visual').forEach((el) => requestAnimationFrame(() => el.classList.add('is-in')));
})();
