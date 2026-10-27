/* Voicebot website widget. Add to any page:
 *   <script src="https://YOUR-SERVER/widget.js" data-key="BOT_KEY" async></script>
 * Optional: data-open="1" opens the chat on load.
 * JS API: window.Voicebot.open(), .close(), .ask("question"), .talk()
 */
(function () {
  'use strict';
  if (window.__voicebotLoaded) return;
  window.__voicebotLoaded = true;

  var script = document.currentScript || document.querySelector('script[src*="widget.js"][data-key]');
  if (!script) return;
  var KEY = script.getAttribute('data-key');
  var BASE = new URL(script.src, location.href).origin;
  var STORE = 'voicebot:' + KEY;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var synth = window.speechSynthesis;

  function load(k, fallback) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
  function uid() { return (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()); }

  var visitorId = load('voicebot:visitor', null) || uid();
  save('voicebot:visitor', visitorId);
  var state = load(STORE, { conversationId: null, messages: [], voiceOn: null, greeted: false });

  fetch(BASE + '/api/public/bot/' + encodeURIComponent(KEY))
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (cfg) { if (cfg) init(cfg); })
    .catch(function () { /* assistant unavailable */ });

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function richText(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/\n/g, '<br>');
  }
  function speakable(s) {
    return s.replace(/https?:\/\/\S+/g, ' ')
      .replace(/[*_#`>|~]+/g, ' ')
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
      .replace(/\s+/g, ' ').trim();
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var c = [n >> 16, (n >> 8) & 255, n & 255].map(function (x) { return Math.max(0, Math.min(255, Math.round(x + amt))); });
    return '#' + c.map(function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }
  function pageText() {
    var root = document.querySelector('main') || document.body;
    var t = (root && root.innerText) || '';
    return t.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').slice(0, 5000);
  }

  var ICON = {
    chat: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    mic: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/></svg>',
    send: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>',
    speaker: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
    muted: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m23 9-6 6M17 9l6 6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    reset: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
  };

  function init(cfg) {
    var color = cfg.color || '#4f46e5';
    var left = cfg.position === 'left';
    if (state.voiceOn === null) state.voiceOn = cfg.voiceReplies !== false;

    var host = document.createElement('div');
    host.setAttribute('data-voicebot', '');
    host.style.cssText = 'position:fixed;z-index:2147483000;bottom:0;' + (left ? 'left:0;' : 'right:0;');
    document.body.appendChild(host);
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

    root.innerHTML =
      '<style>' +
      ':host{all:initial}*{box-sizing:border-box}' +
      '.vb{--c:' + color + ';--c2:' + shade(color, -30) + ';font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1f2330;text-align:left;letter-spacing:normal;text-transform:none;font-style:normal;font-weight:400}' +
      '.vb button{font-family:inherit;margin:0;text-transform:none;letter-spacing:normal;line-height:normal}' +
      '.launch{position:fixed;bottom:20px;' + (left ? 'left' : 'right') + ':20px;width:60px;height:60px;border-radius:50%;border:0;cursor:pointer;color:#fff;background:linear-gradient(135deg,var(--c),var(--c2));box-shadow:0 8px 24px rgba(0,0,0,.25);display:grid;place-items:center;transition:transform .2s}' +
      '.launch:hover{transform:scale(1.06)}.launch:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid #93c5fd;outline-offset:2px}' +
      '.bubble{position:fixed;bottom:92px;' + (left ? 'left' : 'right') + ':20px;max-width:260px;background:#fff;border-radius:14px;padding:12px 34px 12px 14px;box-shadow:0 8px 28px rgba(0,0,0,.18);cursor:pointer;animation:pop .3s ease}' +
      '.bubble .x{position:absolute;top:6px;right:6px;border:0;background:none;color:#888;cursor:pointer;padding:2px;width:22px;height:22px;display:grid;place-items:center}' +
      '.panel{position:fixed;bottom:92px;' + (left ? 'left' : 'right') + ':20px;width:380px;height:min(620px,calc(100vh - 120px));background:#fff;border-radius:18px;box-shadow:0 16px 48px rgba(0,0,0,.22);display:flex;flex-direction:column;overflow:hidden;animation:pop .22s ease}' +
      '@keyframes pop{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}' +
      '.head{background:linear-gradient(135deg,var(--c),var(--c2));color:#fff;padding:14px 12px 14px 16px;display:flex;align-items:center;gap:10px}' +
      '.avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.22);display:grid;place-items:center;font-weight:700;flex:none}' +
      '.title{flex:1;min-width:0}.title b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.title span{font-size:12px;opacity:.85}' +
      '.hbtn{border:0;background:rgba(255,255,255,.16);color:#fff;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;cursor:pointer;flex:none}.hbtn:hover{background:rgba(255,255,255,.28)}' +
      '.msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#f7f8fb}' +
      '.m{max-width:85%;padding:10px 13px;border-radius:16px;white-space:normal;word-wrap:break-word;overflow-wrap:anywhere}' +
      '.m.a{background:#fff;border:1px solid #e7e9f0;border-bottom-left-radius:4px;align-self:flex-start}' +
      '.m.u{background:var(--c);color:#fff;border-bottom-right-radius:4px;align-self:flex-end}' +
      '.m a{color:inherit;text-decoration:underline}.m.err{background:#fff1f1;border-color:#f5c2c2;color:#9b1c1c}' +
      '.dots span{display:inline-block;width:7px;height:7px;margin:0 2px;border-radius:50%;background:#9aa0ae;animation:b 1.2s infinite}.dots span:nth-child(2){animation-delay:.15s}.dots span:nth-child(3){animation-delay:.3s}' +
      '@keyframes b{0%,80%,100%{opacity:.3;transform:none}40%{opacity:1;transform:translateY(-3px)}}' +
      '.chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 10px;background:#f7f8fb}.chip{border:1px solid #d9dce6;background:#fff;border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer;color:#1f2330}.chip:hover{border-color:var(--c);color:var(--c)}' +
      '.bar{display:flex;gap:8px;padding:10px;border-top:1px solid #eceef3;background:#fff;align-items:center}' +
      '.bar input{flex:1;min-width:0;border:1px solid #d9dce6;border-radius:12px;padding:11px 12px;font:inherit;color:#1f2330;background:#fff}' +
      '.ibtn{width:42px;height:42px;border-radius:12px;border:0;cursor:pointer;display:grid;place-items:center;flex:none;background:#eef0f6;color:#3b4050}' +
      '.ibtn.send{background:var(--c);color:#fff}.ibtn:disabled{opacity:.5;cursor:default}' +
      '.ibtn.live{background:#ef4444;color:#fff;animation:pulse 1.2s infinite}@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(239,68,68,.5)}100%{box-shadow:0 0 0 12px rgba(239,68,68,0)}}' +
      '.foot{font-size:11px;color:#9aa0ae;text-align:center;padding:0 0 8px;background:#fff}' +
      '.talk{position:absolute;inset:0;background:linear-gradient(160deg,var(--c2),#0f172a);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:28px;text-align:center;z-index:2}' +
      '.orb{width:150px;height:150px;border-radius:50%;border:0;cursor:pointer;background:radial-gradient(circle at 35% 30%,#fff8,transparent 60%),var(--c);box-shadow:0 0 0 0 rgba(255,255,255,.35);display:grid;place-items:center;color:#fff;transition:transform .3s}' +
      '.orb.listening{animation:ring 1.4s infinite}.orb.speaking{animation:speak .9s infinite alternate}.orb.thinking{animation:think 1.6s infinite linear;opacity:.85}' +
      '@keyframes ring{0%{box-shadow:0 0 0 0 rgba(255,255,255,.35)}100%{box-shadow:0 0 0 36px rgba(255,255,255,0)}}@keyframes speak{from{transform:scale(.94)}to{transform:scale(1.07)}}@keyframes think{0%{transform:rotate(0) scale(.96)}50%{transform:rotate(180deg) scale(1)}100%{transform:rotate(360deg) scale(.96)}}' +
      '.tstatus{font-size:18px;font-weight:600}.tline{min-height:66px;max-width:100%;font-size:15px;opacity:.9}' +
      '.tend{border:0;border-radius:999px;background:#ef4444;color:#fff;padding:12px 26px;font:inherit;font-weight:600;cursor:pointer}' +
      '@media (max-width:480px){.panel{left:0;right:0;bottom:0;width:100%;height:100%;max-height:none;border-radius:0}.panel:not([hidden])~.launch{display:none}}' +
      '@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}' +
      '[hidden]{display:none!important}' +
      '</style>' +
      '<div class="vb">' +
      '<div class="bubble" hidden><span class="btext"></span><button class="x" aria-label="Dismiss">' + ICON.close + '</button></div>' +
      '<section class="panel" hidden role="dialog" aria-label="Chat with ' + esc(cfg.botName) + '">' +
      '<div class="head"><div class="avatar">' + esc((cfg.botName || 'A').charAt(0).toUpperCase()) + '</div>' +
      '<div class="title"><b>' + esc(cfg.botName) + '</b><span>' + esc(cfg.name) + '</span></div>' +
      (SR ? '<button class="hbtn tbtn" title="Talk by voice" aria-label="Start a voice conversation">' + ICON.phone + '</button>' : '') +
      (synth ? '<button class="hbtn vbtn" aria-label="Voice replies"></button>' : '') +
      '<button class="hbtn rbtn" title="Start a new chat" aria-label="Start a new chat">' + ICON.reset + '</button>' +
      '<button class="hbtn cbtn" aria-label="Close chat">' + ICON.close + '</button></div>' +
      '<div class="msgs" aria-live="polite"></div><div class="chips"></div>' +
      '<form class="bar"><input type="text" placeholder="Type or tap the mic…" aria-label="Your message" maxlength="2000" autocomplete="off">' +
      (SR ? '<button type="button" class="ibtn mic" aria-label="Speak">' + ICON.mic + '</button>' : '') +
      '<button type="submit" class="ibtn send" aria-label="Send">' + ICON.send + '</button></form>' +
      '<div class="foot">AI assistant · answers may not always be perfect</div>' +
      '<div class="talk" hidden><div class="tstatus">Connecting…</div><button class="orb" aria-label="Tap to talk or interrupt">' + ICON.mic.replace(/20/g, '46') + '</button>' +
      '<div class="tline"></div><button class="tend">End voice chat</button></div>' +
      '</section>' +
      '<button class="launch" aria-label="Chat with ' + esc(cfg.botName) + '">' + ICON.chat + '</button>' +
      '</div>';

    var $ = function (s) { return root.querySelector(s); };
    var panel = $('.panel'), msgs = $('.msgs'), chips = $('.chips'), form = $('.bar'), input = $('.bar input');
    var micBtn = $('.mic'), sendBtn = $('.send'), vbtn = $('.vbtn'), launch = $('.launch'), bubble = $('.bubble');
    var talk = $('.talk'), orb = $('.orb'), tstatus = $('.tstatus'), tline = $('.tline');
    var busy = false, recog = null, talkMode = false, lastPageSent = null;

    // ---------- rendering ----------
    function bubbleEl(role, html, extra) {
      var d = document.createElement('div');
      d.className = 'm ' + (role === 'user' ? 'u' : 'a') + (extra ? ' ' + extra : '');
      d.innerHTML = html;
      msgs.appendChild(d);
      msgs.scrollTop = msgs.scrollHeight;
      return d;
    }
    function render() {
      msgs.innerHTML = '';
      if (cfg.greeting) bubbleEl('assistant', richText(cfg.greeting));
      state.messages.forEach(function (m) { bubbleEl(m.role, richText(m.text)); });
      chips.innerHTML = '';
      if (!state.messages.length) (cfg.suggestions || []).forEach(function (q) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'chip'; b.textContent = q;
        b.onclick = function () { send(q, 'text'); };
        chips.appendChild(b);
      });
    }
    function setVoiceIcon() {
      if (!vbtn) return;
      vbtn.innerHTML = state.voiceOn ? ICON.speaker : ICON.muted;
      vbtn.title = state.voiceOn ? 'Voice replies on' : 'Voice replies off';
      vbtn.setAttribute('aria-pressed', String(!!state.voiceOn));
    }

    // ---------- speaking ----------
    var voice = null;
    function pickVoice() {
      if (!synth) return;
      var list = synth.getVoices();
      var lang = (cfg.language || 'en-IN').toLowerCase();
      voice = list.filter(function (v) { return cfg.voiceName && v.name === cfg.voiceName; })[0] ||
        list.filter(function (v) { return v.lang.toLowerCase().replace('_', '-') === lang; })[0] ||
        list.filter(function (v) { return v.lang.toLowerCase().indexOf(lang.split('-')[0]) === 0; })[0] || null;
    }
    if (synth) { pickVoice(); if (synth.addEventListener) synth.addEventListener('voiceschanged', pickVoice); }

    var speech = { queue: 0, buffer: '', streaming: false, onIdle: null };
    function speakChunk(text) {
      var t = speakable(text);
      if (!t || !synth) return;
      var u = new SpeechSynthesisUtterance(t);
      if (voice) u.voice = voice;
      u.lang = (voice && voice.lang) || cfg.language || 'en-IN';
      u.rate = cfg.voiceRate || 1;
      speech.queue++;
      u.onend = u.onerror = function () { speech.queue--; checkIdle(); };
      synth.speak(u);
      if (talkMode) setTalk('speaking');
    }
    function checkIdle() {
      if (speech.queue <= 0 && !speech.streaming && speech.onIdle) { var f = speech.onIdle; speech.onIdle = null; f(); }
    }
    function feedSpeech(delta, final) {
      speech.buffer += delta;
      var re = /^([\s\S]*?[.!?।…](?=\s)|[\s\S]*?\n)/;
      var m;
      while ((m = speech.buffer.match(re)) && m[1].trim().length > 1) {
        speakChunk(m[1]);
        speech.buffer = speech.buffer.slice(m[1].length);
      }
      if (final) { speakChunk(speech.buffer); speech.buffer = ''; }
    }
    function stopSpeaking() {
      speech.buffer = ''; speech.queue = 0; speech.onIdle = null;
      if (synth) synth.cancel();
    }
    function unlockSpeech() {
      // iOS only allows speech that starts from a tap; speaking an empty utterance unlocks it.
      if (synth && !unlockSpeech.done) { try { synth.speak(new SpeechSynthesisUtterance('')); } catch (e) { /* ignore */ } unlockSpeech.done = true; }
    }

    // ---------- listening ----------
    function listen(onFinal) {
      if (!SR) return;
      stopListening();
      var r = new SR();
      recog = r;
      r.lang = cfg.language || 'en-IN';
      r.interimResults = true;
      r.continuous = false;
      r.maxAlternatives = 1;
      var finalText = '';
      r.onresult = function (e) {
        var interim = '';
        for (var i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
          else interim += e.results[i][0].transcript;
        }
        var shown = (finalText + ' ' + interim).trim();
        if (talkMode) tline.textContent = shown; else input.value = shown;
      };
      r.onerror = function (e) {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          if (talkMode) { tstatus.textContent = 'Microphone blocked'; tline.textContent = 'Allow microphone access in your browser to talk.'; }
          else bubbleEl('assistant', 'Please allow microphone access in your browser to talk to me.', 'err');
          finalText = ''; r.blocked = true;
        }
      };
      r.onend = function () {
        if (recog === r) recog = null;
        if (micBtn) micBtn.classList.remove('live');
        if (r.cancelled || r.blocked) return;
        onFinal(finalText.trim());
      };
      try { r.start(); } catch (e) { return; }
      if (micBtn && !talkMode) micBtn.classList.add('live');
    }
    function stopListening(cancel) {
      if (recog) { recog.cancelled = !!cancel; try { cancel ? recog.abort() : recog.stop(); } catch (e) { /* ignore */ } }
    }

    // ---------- voice conversation mode ----------
    function setTalk(mode) {
      orb.className = 'orb ' + mode;
      tstatus.textContent = { listening: 'Listening…', thinking: 'Thinking…', speaking: 'Speaking… tap to interrupt', idle: 'Tap the circle to talk' }[mode];
    }
    function talkListen() {
      if (!talkMode) return;
      setTalk('listening');
      tline.textContent = '';
      listen(function (text) {
        if (!talkMode) return;
        if (text) send(text, 'voice');
        else setTalk('idle');
      });
    }
    function startTalk() {
      unlockSpeech();
      stopSpeaking();
      talkMode = true;
      talk.hidden = false;
      talkListen();
    }
    function endTalk() {
      talkMode = false;
      stopListening(true);
      stopSpeaking();
      talk.hidden = true;
    }
    orb.onclick = function () {
      unlockSpeech();
      if (orb.classList.contains('speaking')) { stopSpeaking(); talkListen(); }
      else if (orb.classList.contains('listening')) stopListening();
      else if (!busy) talkListen();
    };
    $('.tend').onclick = endTalk;

    // ---------- sending ----------
    function send(text, via) {
      text = String(text || '').trim();
      if (!text || busy) return;
      busy = true;
      sendBtn.disabled = true;
      input.value = '';
      chips.innerHTML = '';
      stopSpeaking();
      state.messages.push({ role: 'user', text: text });
      bubbleEl('user', richText(text));
      var el = bubbleEl('assistant', '<span class="dots"><span></span><span></span><span></span></span>');
      if (talkMode) { setTalk('thinking'); tline.textContent = text; }

      var speak = synth && (via === 'voice' ? true : state.voiceOn);
      var reply = '';
      var page = { url: location.href, title: document.title };
      if (lastPageSent !== location.href) { page.text = pageText(); lastPageSent = location.href; }
      speech.streaming = true;

      fetch(BASE + '/api/public/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ key: KEY, conversationId: state.conversationId, visitorId: visitorId, message: text, via: via, page: page }),
      }).then(function (res) {
        if (!res.ok || !res.body) return res.json().then(function (j) { throw new Error(j.error || 'Something went wrong.'); });
        var reader = res.body.getReader();
        var dec = new TextDecoder();
        var buf = '';
        function handle(ev) {
          if (ev.type === 'start') { state.conversationId = ev.conversationId; }
          else if (ev.type === 'delta') {
            reply += ev.text;
            el.innerHTML = richText(reply);
            msgs.scrollTop = msgs.scrollHeight;
            if (speak) feedSpeech(ev.text, false);
            if (talkMode) tline.textContent = reply;
          } else if (ev.type === 'reset') { reply = ''; stopSpeaking(); }
          else if (ev.type === 'error') throw new Error(ev.error);
        }
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) return;
            buf += dec.decode(r.value, { stream: true });
            var parts = buf.split('\n\n');
            buf = parts.pop();
            parts.forEach(function (p) { if (p.indexOf('data: ') === 0) handle(JSON.parse(p.slice(6))); });
            return pump();
          });
        }
        return pump();
      }).then(function () {
        if (!reply) throw new Error('No reply. Please try again.');
        state.messages.push({ role: 'assistant', text: reply });
        if (speak) feedSpeech('', true);
      }).catch(function (err) {
        el.className = 'm a err';
        el.textContent = err.message || 'Something went wrong.';
        if (talkMode) { tline.textContent = el.textContent; }
      }).then(function () {
        state.messages = state.messages.slice(-40);
        save(STORE, state);
        busy = false;
        sendBtn.disabled = false;
        speech.streaming = false;
        if (talkMode) { speech.onIdle = function () { setTimeout(talkListen, 250); }; checkIdle(); }
        else if (!('ontouchstart' in window)) input.focus();
      });
    }

    // ---------- wiring ----------
    function open() {
      panel.hidden = false;
      bubble.hidden = true;
      launch.innerHTML = ICON.close;
      launch.setAttribute('aria-label', 'Close chat');
      render();
      if (!('ontouchstart' in window)) setTimeout(function () { input.focus(); }, 50);
    }
    function close() {
      endTalk();
      stopListening(true);
      panel.hidden = true;
      launch.innerHTML = ICON.chat;
      launch.setAttribute('aria-label', 'Chat with ' + cfg.botName);
    }
    launch.onclick = function () { panel.hidden ? open() : close(); };
    $('.cbtn').onclick = close;
    $('.rbtn').onclick = function () {
      stopSpeaking();
      state.conversationId = null; state.messages = []; lastPageSent = null;
      save(STORE, state);
      render();
    };
    if (vbtn) vbtn.onclick = function () { state.voiceOn = !state.voiceOn; if (!state.voiceOn) stopSpeaking(); else unlockSpeech(); save(STORE, state); setVoiceIcon(); };
    var tbtn = $('.tbtn');
    if (tbtn) tbtn.onclick = startTalk;
    form.onsubmit = function (e) { e.preventDefault(); stopListening(true); send(input.value, 'text'); };
    if (micBtn) micBtn.onclick = function () {
      unlockSpeech();
      if (recog) { stopListening(); return; }
      stopSpeaking();
      listen(function (text) { if (text) send(text, 'voice'); });
    };
    bubble.onclick = function (e) { if (e.target.closest && e.target.closest('.x')) { bubble.hidden = true; return; } open(); };
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(); });
    setVoiceIcon();

    if (script.getAttribute('data-open') === '1') open();
    else if (!state.greeted && cfg.greeting) {
      setTimeout(function () {
        if (!panel.hidden) return;
        $('.btext').textContent = cfg.greeting;
        bubble.hidden = false;
        state.greeted = true;
        save(STORE, state);
      }, 4000);
    }

    window.Voicebot = {
      open: open,
      close: close,
      ask: function (q) { open(); send(q, 'text'); },
      talk: function () { open(); if (SR) startTalk(); },
    };
  }
})();
