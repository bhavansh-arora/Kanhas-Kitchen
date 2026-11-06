/* Contact form: validates, posts to LITHIUM_CONFIG.formEndpoint, or falls back to a pre-filled email. */
(function () {
  'use strict';
  var form = document.querySelector('[data-contact-form]');
  if (!form) return;
  var CFG = window.LITHIUM_CONFIG || {};
  var status = form.querySelector('[data-form-status]');

  var topic = new URLSearchParams(location.search).get('topic');
  if (topic === 'contractor') { var r = form.querySelector('input[value="Contractor"]'); if (r) r.checked = true; }

  function setErr(input, msg) {
    var e = input.closest('.field') && input.closest('.field').querySelector('.field__error');
    if (e) e.textContent = msg || '';
    input.classList.toggle('is-invalid', !!msg);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements, ok = true;
    status.textContent = ''; status.style.color = '#7ee2a8';
    if (!f.name.value.trim()) { setErr(f.name, 'Please add your name.'); ok = false; } else setErr(f.name);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim())) { setErr(f.email, 'Add a valid email address.'); ok = false; } else setErr(f.email);
    if (f.message.value.trim().length < 5) { setErr(f.message, 'Tell us a little about what you need.'); ok = false; } else setErr(f.message);
    if (!f.consent.checked) { status.style.color = '#ff8b7d'; status.textContent = 'Please tick the box so we can reply.'; ok = false; }
    if (!ok) return;
    var data = { topic: (form.querySelector('input[name="topic"]:checked') || {}).value, name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), message: f.message.value.trim(), source: location.href };
    var mail = 'mailto:' + (CFG.leadEmail || 'rowan@socalenergy.info') + '?subject=' + encodeURIComponent('Website message (' + data.topic + ') — ' + data.name) + '&body=' + encodeURIComponent(data.message + '\n\n' + data.name + '\n' + data.phone + '\n' + data.email);
    if (CFG.formEndpoint) {
      fetch(CFG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(Object.assign({ kind: 'contact' }, data)) })
        .then(function (res) {
          if (!res.ok) throw new Error();
          status.textContent = 'Thanks, ' + data.name.split(' ')[0] + '. Your message is in. We’ll be in touch shortly.';
          form.reset();
        })
        .catch(function () { status.style.color = '#ffd27a'; status.innerHTML = 'We couldn’t send that just now. <a href="' + mail + '" style="color:var(--sun)">Email it instead</a> or call (951) 662-6748.'; });
    } else {
      window.location.href = mail;
      status.textContent = 'Your email app has opened with your message. Press send and we’ll reply shortly.';
    }
  });
})();
