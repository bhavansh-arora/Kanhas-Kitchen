(function () {
  'use strict';
  var cfg = window.LANDING || {};
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.remove('no-js');
  $('#year').textContent = new Date().getFullYear();

  // ---------- nav ----------
  var nav = $('#nav');
  var menuBtn = $('#menuBtn'), menu = $('#mobileMenu');
  menuBtn.addEventListener('click', function () {
    var open = menu.hidden;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); }); });

  var sticky = $('#stickyCta');
  var demoSection = $('#demo');
  function onScroll() {
    var y = window.scrollY;
    nav.classList.toggle('scrolled', y > 20);
    var demoTop = demoSection.getBoundingClientRect().top;
    sticky.classList.toggle('on', y > 700 && demoTop > window.innerHeight * 0.6);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Signed-in visitors get a link to their dashboard instead of "Log in".
  fetch('/api/session', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (me) {
    if (!me || !me.signedIn) return;
    var link = $('#loginLink');
    link.textContent = 'Dashboard';
    link.href = me.role === 'admin' ? '/admin' : '/app';
  }).catch(function () {});

  // ---------- reveal on scroll ----------
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('.reveal').forEach(function (el, i) { el.style.transitionDelay = (i % 3) * 70 + 'ms'; io.observe(el); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  // ---------- hero: a looping example conversation ----------
  var msgs = $('#mockMsgs'), speaking = $('#speaking'), toast = $('#leadToast');
  var script = [
    { who: 'u', voice: true, text: 'Do you deliver to Baner?', wait: 900 },
    { who: 'a', text: 'Yes! Delivery to Baner is free on orders above ₹300. Today\'s special is the paneer tikka thali at ₹220. Would you like to order?', wait: 2600 },
    { who: 'u', voice: true, text: 'Haan, 2 thali. Mera naam Priya, number 98xxx xx210.', wait: 1100 },
    { who: 'a', text: 'Done, Priya! 2 paneer thalis. The kitchen will call you in a few minutes to confirm. 🙏', wait: 1800, lead: true },
  ];
  function bubble(step) {
    var d = document.createElement('div');
    d.className = 'mm ' + step.who;
    if (step.voice) {
      var v = document.createElement('div');
      v.className = 'voice';
      v.textContent = '🎙 Spoken';
      d.appendChild(v);
    }
    d.appendChild(document.createTextNode(step.text));
    return d;
  }
  function trim() { while (msgs.children.length > 4) msgs.removeChild(msgs.firstChild); }
  function playHero() {
    if (reduced) { script.forEach(function (s) { msgs.appendChild(bubble(s)); }); trim(); toast.classList.add('on'); return; }
    var i = 0;
    msgs.innerHTML = '';
    toast.classList.remove('on');
    (function next() {
      if (i >= script.length) { setTimeout(playHero, 4200); return; }
      var step = script[i++];
      if (step.who === 'a') {
        var t = document.createElement('div');
        t.className = 'mm a typing';
        t.innerHTML = '<i></i><i></i><i></i>';
        msgs.appendChild(t); trim();
        setTimeout(function () {
          msgs.replaceChild(bubble(step), t);
          speaking.classList.add('on');
          if (step.lead) setTimeout(function () { toast.classList.add('on'); }, 700);
          setTimeout(function () { speaking.classList.remove('on'); next(); }, step.wait);
        }, 900);
      } else {
        msgs.appendChild(bubble(step)); trim();
        setTimeout(next, step.wait);
      }
    })();
  }
  playHero();

  // ---------- live demo button ----------
  var talk = $('#talkNow');
  if (cfg.demo) {
    document.body.classList.add('has-widget');
    talk.addEventListener('click', function () {
      var tries = 0;
      (function go() {
        if (window.Voxly) return window.Voxly.talk();
        if (tries++ < 40) setTimeout(go, 100);
        else location.hash = '#demo';
      })();
    });
  } else {
    $('#talkLabel').textContent = 'Start free trial';
    talk.addEventListener('click', function () { demoSection.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); });
    var second = $('.hero-ctas .btn-ghost');
    second.textContent = 'See how it works';
    second.setAttribute('href', '#how');
  }

  // ---------- use cases ----------
  var CASES = {
    food: {
      title: 'Restaurants, cafés and cloud kitchens',
      text: 'Answers menu, price and delivery questions while your kitchen stays busy, and takes orders and table bookings as leads.',
      points: ['Menu, prices and today\'s specials', 'Delivery areas, fees and timings', 'Table bookings and party orders', 'Veg, Jain and allergy questions'],
      chat: [['u', 'Is the biryani spicy? Do you have a Jain option?'], ['a', 'Our Hyderabadi biryani is medium spicy. Yes, we make a Jain veg biryani without onion and garlic for ₹249. Want to order?']],
    },
    clinic: {
      title: 'Clinics, dentists and diagnostics',
      text: 'Handles timings, doctor availability, fees and preparation questions, and collects appointment requests around the clock.',
      points: ['Doctor schedules and consultation fees', 'Test preparation (e.g. fasting)', 'Insurance and payment options', 'Appointment requests with callback'],
      chat: [['u', 'Do I need to fast for a lipid profile test?'], ['a', 'Yes, please fast for 10–12 hours; water is fine. Shall I book a morning slot for you? I just need your name and number.']],
    },
    realty: {
      title: 'Real estate and property developers',
      text: 'Qualifies buyers 24/7 with answers on configurations, prices, possession dates and amenities, then books site visits.',
      points: ['Configurations, sizes and price ranges', 'Possession dates and approvals', 'Amenities and location advantages', 'Site-visit requests with budget'],
      chat: [['u', '2BHK ka price kya hai aur possession kab hai?'], ['a', '2BHK homes start at ₹78 lakh and possession is December 2027. Would you like to book a site visit this weekend?']],
    },
    salon: {
      title: 'Salons, spas, gyms and studios',
      text: 'Shares services, prices and packages, recommends treatments and turns interest into booking requests.',
      points: ['Service menu and pricing', 'Packages, memberships and offers', 'Stylist and slot availability', 'Booking requests with preferred time'],
      chat: [['u', 'How much is a keratin treatment for long hair?'], ['a', 'Keratin for long hair is $85 and takes about 3 hours. We have slots on Saturday morning. Shall I note a booking?']],
    },
    edu: {
      title: 'Coaching centres, schools and courses',
      text: 'Explains courses, batches, fees and eligibility to students and parents, and collects counselling requests.',
      points: ['Courses, syllabus and batch timings', 'Fees, scholarships and instalments', 'Eligibility and admission steps', 'Demo-class and counselling requests'],
      chat: [['u', 'Is there a weekend batch for the data science course?'], ['a', 'Yes! The weekend batch runs Saturday and Sunday, 10 am to 1 pm, starting the 15th. Fees can be paid in 3 instalments. Want a free demo class?']],
    },
    shop: {
      title: 'Shops and online stores',
      text: 'Helps shoppers choose, answers sizing, shipping and return questions, and reads the product page they\'re on.',
      points: ['Product details, sizes and stock', 'Shipping times, COD and returns', '"How much is this one?" on product pages', 'Bulk and custom-order enquiries'],
      chat: [['u', 'Does this kurta come in XL? What\'s the return policy?'], ['a', 'Yes, this kurta is available in XL. You can return it within 7 days if unworn with tags. Free shipping on orders over $40.']],
    },
  };
  var casePanel = $('#case');
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function showCase(key) {
    var c = CASES[key];
    casePanel.innerHTML =
      '<div><h3>' + esc(c.title) + '</h3><p>' + esc(c.text) + '</p><ul>' + c.points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="case-chat">' + c.chat.map(function (m) { return '<div class="mm ' + m[0] + '">' + (m[0] === 'u' ? '<div class="voice">🎙 Spoken</div>' : '') + esc(m[1]) + '</div>'; }).join('') + '</div>';
    $$('.tabs button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === key)); });
  }
  $$('.tabs button').forEach(function (b) { b.addEventListener('click', function () { showCase(b.dataset.tab); }); });
  $('.tabs').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var tabs = $$('.tabs button');
    var i = tabs.indexOf(document.activeElement);
    var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    n.focus(); showCase(n.dataset.tab);
  });
  showCase('food');

  // ---------- pricing ----------
  $$('.billing button').forEach(function (b) {
    b.addEventListener('click', function () {
      var mode = b.dataset.bill;
      $$('.billing button').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
      $$('.amt, .billed').forEach(function (el) { el.textContent = el.getAttribute('data-' + mode); });
    });
  });
  var form = $('#demoForm');
  $$('[data-plan]').forEach(function (a) {
    a.addEventListener('click', function () { form.plan.value = a.dataset.plan; });
  });

  // ---------- WhatsApp ----------
  if (cfg.whatsapp) {
    var wa = $('#whatsapp');
    wa.href = 'https://wa.me/' + cfg.whatsapp + '?text=' + encodeURIComponent('Hi! I would like to try Voxly for my business.');
    wa.hidden = false;
  }

  // ---------- demo request form ----------
  var err = $('#formErr');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;
    var data = {};
    $$('input, select, textarea', form).forEach(function (el) { if (el.name) data[el.name] = el.value.trim(); });
    var problem = !data.name ? 'Please add your name.' : !data.business ? 'Please add your business name.' :
      !data.phone && !data.email ? 'Please add a phone number or email so we can reach you.' :
      data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ? 'That email address doesn\'t look right.' : '';
    if (problem) { err.textContent = problem; err.hidden = false; return; }
    var btn = $('button[type=submit]', form);
    btn.disabled = true;
    btn.textContent = 'Sending…';
    fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Something went wrong.'); }); })
      .then(function () { $('#formDone').hidden = false; })
      .catch(function (ex) {
        err.textContent = ex.message || 'Something went wrong. Please try again.';
        err.hidden = false;
        btn.disabled = false;
        btn.textContent = 'Get my free assistant';
      });
  });
})();
