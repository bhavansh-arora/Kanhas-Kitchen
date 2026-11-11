/* Preview notes — Code Bunny annotations for the concept review.
   Delete this file, its <script> tag and the data-note attributes for production. */
(() => {
  'use strict';
  const targets = Array.from(document.querySelectorAll('[data-note]'));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  };
  const params = new URLSearchParams(location.search);
  if (params.get('notes') === '1') store.set('eh-notes', 'on');
  if (params.get('notes') === '0') store.set('eh-notes', 'off');

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'pv-toggle';
  toggle.innerHTML = `<span class="pv-toggle__dot">CB</span><span>Preview notes</span><span class="pv-toggle__state"></span>`;
  document.body.appendChild(toggle);

  const pop = document.createElement('div');
  pop.className = 'pv-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-live', 'polite');
  document.body.appendChild(pop);

  const pins = targets.map((el, i) => {
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'pv-pin';
    pin.textContent = i + 1;
    pin.setAttribute('aria-label', `Preview note ${i + 1}: ${el.dataset.noteTitle || ''}`);
    const pos = (el.dataset.notePos || 'tr').split('');
    pin.style[pos[0] === 't' ? 'top' : 'bottom'] = '14px';
    pin.style[pos[1] === 'r' ? 'right' : 'left'] = '14px';
    el.appendChild(pin);
    pin.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); open(pin, el, i); });
    return pin;
  });

  let current = null;
  const place = (anchor) => {
    const r = anchor.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight;
    if (window.innerWidth < 640) {
      pop.style.left = '16px'; pop.style.top = `${window.innerHeight - h - 96}px`;
      return;
    }
    let left = r.left + r.width / 2 - w / 2;
    left = Math.max(16, Math.min(window.innerWidth - w - 16, left));
    let top = r.bottom + 12;
    if (top + h > window.innerHeight - 16) top = r.top - h - 12;
    pop.style.left = `${left}px`; pop.style.top = `${Math.max(16, top)}px`;
  };
  const open = (pin, el, i) => {
    current = pin;
    pop.innerHTML = `<button type="button" aria-label="Close">×</button><small>Note ${i + 1} of ${targets.length} · Code Bunny</small><b>${el.dataset.noteTitle || ''}</b><p>${el.dataset.note}</p>${i < targets.length - 1 ? '<a href="#" data-next>Next note →</a>' : '<a href="preview-pack.html">Read the full preview pack →</a>'}`;
    pop.classList.add('is-open');
    place(pin);
    pop.querySelector('button').onclick = close;
    const next = pop.querySelector('[data-next]');
    if (next) next.onclick = (e) => {
      e.preventDefault();
      const n = pins[i + 1];
      n.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => open(n, targets[i + 1], i + 1), 600);
    };
  };
  const close = () => { pop.classList.remove('is-open'); current = null; };
  document.addEventListener('click', (e) => { if (current && !pop.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  window.addEventListener('scroll', () => { if (current) place(current); }, { passive: true });

  const setOn = (on) => {
    document.documentElement.classList.toggle('notes-on', on);
    toggle.querySelector('.pv-toggle__state').textContent = targets.length ? (on ? `On · ${targets.length}` : 'Off') : 'Pack';
    toggle.setAttribute('aria-pressed', String(on));
    store.set('eh-notes', on ? 'on' : 'off');
    if (!on) close();
  };
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!targets.length) { location.href = 'preview-pack.html'; return; }
    const on = !document.documentElement.classList.contains('notes-on');
    setOn(on);
    if (on && pins[0]) {
      const visiblePin = pins.find((p) => { const r = p.getBoundingClientRect(); return r.top > 0 && r.bottom < window.innerHeight; });
      if (visiblePin) { const i = pins.indexOf(visiblePin); open(visiblePin, targets[i], i); }
    }
  });
  setOn(store.get('eh-notes') === 'on');

  // One-time hint so the notes don't go unnoticed.
  if (!store.get('eh-notes-hint') && targets.length) {
    setTimeout(() => {
      if (document.documentElement.classList.contains('notes-on') || current) return;
      current = toggle;
      pop.innerHTML = `<button type="button" aria-label="Close">×</button><small>Concept preview · Code Bunny</small><b>Ciarán, this is a working concept.</b><p>Turn on preview notes to see what we changed and why it should bring in more quote requests.</p>`;
      pop.classList.add('is-open');
      const r = toggle.getBoundingClientRect();
      pop.style.left = '16px';
      pop.style.top = `${Math.max(16, r.top - pop.offsetHeight - 12)}px`;
      pop.querySelector('button').onclick = close;
      store.set('eh-notes-hint', '1');
    }, 3500);
  }
})();
