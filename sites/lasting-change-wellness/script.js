// Lasting Change Wellness — small enhancements. The page works without this file.

// Header border once the page scrolls
const header = document.querySelector('.site-header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Mobile menu
const toggle = document.querySelector('.nav-toggle');
const list = document.getElementById('nav-list');
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  list.classList.toggle('open', !open);
});
list.addEventListener('click', (e) => {
  if (e.target.closest('a')) {
    toggle.setAttribute('aria-expanded', 'false');
    list.classList.remove('open');
  }
});

// S.H.I.N.E. tabs (arrow keys move between steps)
const tabs = [...document.querySelectorAll('[data-shine] [role="tab"]')];
const select = (tab, focus) => {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  });
  if (focus) tab.focus();
};
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => select(tab));
  tab.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step) {
      e.preventDefault();
      select(tabs[(i + step + tabs.length) % tabs.length], true);
    } else if (e.key === 'Home') {
      e.preventDefault(); select(tabs[0], true);
    } else if (e.key === 'End') {
      e.preventDefault(); select(tabs[tabs.length - 1], true);
    }
  });
});

// RISE readiness check
const rise = document.querySelector('[data-rise]');
if (rise) {
  const boxes = [...rise.querySelectorAll('input[type="checkbox"]')];
  const bar = rise.querySelector('.rise-meter span');
  const result = rise.querySelector('.rise-result');
  const messages = [
    'Tick the ones that fit.',
    'A first spark. A free call can help you see what is possible.',
    'You are warming up. Let’s talk about what is holding you back.',
    'Almost there. You are closer to ready than you think.',
    'You are ready to shine. Let’s find a time to talk.',
  ];
  const update = () => {
    const n = boxes.filter((b) => b.checked).length;
    bar.style.width = `${(n / boxes.length) * 100}%`;
    result.textContent = messages[n];
    rise.classList.toggle('is-ready', n === boxes.length);
  };
  boxes.forEach((b) => b.addEventListener('change', update));
  rise.addEventListener('submit', (e) => e.preventDefault());
}

// Sticky "book" bar on phones: show after the hero, hide near the booking section
const sticky = document.querySelector('[data-sticky]');
const hero = document.querySelector('.hero');
const book = document.getElementById('book');
if (sticky && 'IntersectionObserver' in window) {
  let pastHero = false;
  let atBook = false;
  const render = () => sticky.classList.toggle('show', pastHero && !atBook);
  new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; render(); }).observe(hero);
  new IntersectionObserver(([e]) => { atBook = e.isIntersecting; render(); }).observe(book);
}
