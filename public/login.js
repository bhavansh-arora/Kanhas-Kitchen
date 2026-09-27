/* Sign-in page for Kanha's Kitchen. */
'use strict';

const form = document.getElementById('login-form');
const errorBox = document.getElementById('login-error');
const submit = document.getElementById('login-submit');
const password = document.getElementById('password');
const toggle = document.getElementById('toggle-password');

// Only follow same-site paths after signing in.
function nextUrl() {
  const next = new URLSearchParams(location.search).get('next') || '';
  const url = next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login') ? next : './';
  // The server redirect keeps the #page in the address bar, so carry it over.
  return url.includes('#') ? url : url + location.hash;
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = !msg;
}

toggle.addEventListener('click', () => {
  const show = password.type === 'password';
  password.type = show ? 'text' : 'password';
  toggle.textContent = show ? 'Hide' : 'Show';
  toggle.setAttribute('aria-pressed', String(show));
  toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  password.focus();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = form.email.value.trim();
  if (!email || !password.value) {
    showError('Enter your email and password.');
    (email ? password : form.email).focus();
    return;
  }
  showError('');
  submit.disabled = true;
  submit.textContent = 'Signing in…';
  try {
    const res = await fetch('api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: password.value, remember: form.remember.checked }),
    });
    if (res.ok) {
      location.replace(nextUrl());
      return;
    }
    let msg = 'Could not sign in. Please try again.';
    try {
      msg = (await res.json()).error || msg;
    } catch {}
    showError(msg);
    password.select();
  } catch {
    showError('Could not reach the server. Check your connection and try again.');
  }
  submit.disabled = false;
  submit.textContent = 'Sign in';
});
