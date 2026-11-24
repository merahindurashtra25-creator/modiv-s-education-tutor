/*
 * Modiv's Education - website chat assistant widget.
 * Load with:
 *   <script src="chat-widget.js" data-endpoint="https://modivs-chat.happinessaggarwal.workers.dev" defer></script>
 * Talks to the `modivs-chat` Cloudflare Worker (POST { messages: [{role, content}] } -> { reply }).
 * Self-contained: no dependencies, all CSS is scoped under .mvchat-*.
 */
(function () {
  'use strict';
  if (window.__mvChatLoaded) return;
  window.__mvChatLoaded = true;

  var script = document.currentScript || document.querySelector('script[data-endpoint][src*="chat-widget"]');
  var ENDPOINT = (script && script.getAttribute('data-endpoint')) || '';
  if (!ENDPOINT) return;

  var MAX_CHARS = 500;
  var MAX_SEND = 6;
  var STORE_KEY = 'mvchat_v1';
  var GREETING = "Hi! I'm the Modiv's Education assistant. I can help you find a tutor, book a demo class, become a tutor, or reach our team. What do you need?";
  var CHIPS = ['Find a tutor', 'Book a demo class', 'Become a tutor', 'Contact support'];
  var FALLBACK = 'Sorry, something went wrong. Please call +91 98969 30443 or email support@modivs.com.';

  var messages = [];   // {role:'user'|'assistant', content:string}
  var busy = false;
  var open = false;

  try {
    var saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || '[]');
    if (Array.isArray(saved)) {
      messages = saved.filter(function (m) {
        return m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string';
      }).slice(-40);
    }
  } catch (e) {}

  function persist() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-40))); } catch (e) {}
  }

  var css = '' +
    '.mvchat-btn{position:fixed;right:18px;bottom:18px;z-index:2147483000;width:58px;height:58px;border:0;border-radius:50%;' +
    'background:#1A2035;color:#EBB92E;cursor:pointer;box-shadow:0 6px 20px rgba(26,32,53,.35);display:flex;align-items:center;justify-content:center;transition:transform .15s}' +
    '.mvchat-btn:hover{transform:scale(1.06)}.mvchat-btn:focus-visible{outline:3px solid #EBB92E;outline-offset:3px}' +
    '.mvchat-btn svg{width:28px;height:28px}' +
    '.mvchat-panel{position:fixed;right:18px;bottom:88px;z-index:2147483000;width:360px;max-width:calc(100vw - 24px);height:520px;max-height:calc(100vh - 110px);' +
    'background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(26,32,53,.3);display:none;flex-direction:column;overflow:hidden;' +
    'font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif;font-size:14px;color:#1A2035;border:1px solid #eadfc9}' +
    '.mvchat-panel.mvchat-open{display:flex}' +
    '.mvchat-head{background:#1A2035;color:#fff;padding:12px 14px;display:flex;align-items:center;justify-content:space-between}' +
    '.mvchat-head b{font-size:15px}.mvchat-head small{display:block;color:#EBB92E;font-size:11px;margin-top:2px}' +
    '.mvchat-x{background:none;border:0;color:#fff;font-size:24px;line-height:1;cursor:pointer;padding:2px 6px}' +
    '.mvchat-log{flex:1;overflow-y:auto;padding:12px;background:#FEF7EA;display:flex;flex-direction:column;gap:8px}' +
    '.mvchat-msg{max-width:86%;padding:9px 12px;border-radius:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:anywhere}' +
    '.mvchat-bot{align-self:flex-start;background:#fff;border:1px solid #eadfc9;border-bottom-left-radius:4px}' +
    '.mvchat-me{align-self:flex-end;background:#1A2035;color:#fff;border-bottom-right-radius:4px}' +
    '.mvchat-msg a{color:#1a56c4;text-decoration:underline}.mvchat-me a{color:#EBB92E}' +
    '.mvchat-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}' +
    '.mvchat-chip{background:#fff;border:1px solid #EBB92E;color:#1A2035;border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer}' +
    '.mvchat-chip:hover{background:#EBB92E}' +
    '.mvchat-typing{align-self:flex-start;background:#fff;border:1px solid #eadfc9;border-radius:14px;padding:10px 14px;display:flex;gap:4px}' +
    '.mvchat-typing i{width:6px;height:6px;border-radius:50%;background:#555b78;animation:mvchat-b 1s infinite}' +
    '.mvchat-typing i:nth-child(2){animation-delay:.15s}.mvchat-typing i:nth-child(3){animation-delay:.3s}' +
    '@keyframes mvchat-b{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}' +
    '.mvchat-form{display:flex;gap:8px;padding:10px;border-top:1px solid #eadfc9;background:#fff}' +
    '.mvchat-input{flex:1;border:1px solid #d9cfb8;border-radius:10px;padding:9px 11px;font:inherit;font-size:14px;color:#1A2035;resize:none;max-height:90px}' +
    '.mvchat-input:focus{outline:2px solid #EBB92E;border-color:#EBB92E}' +
    '.mvchat-send{background:#EBB92E;color:#1A2035;border:0;border-radius:10px;padding:0 14px;font:inherit;font-weight:700;cursor:pointer}' +
    '.mvchat-send:disabled{opacity:.5;cursor:default}' +
    '.mvchat-note{font-size:11px;color:#555b78;text-align:center;padding:0 10px 8px;background:#fff}' +
    '@media(max-width:480px){.mvchat-panel{right:8px;left:8px;bottom:84px;width:auto;max-width:none;height:calc(100vh - 100px)}.mvchat-btn{right:12px;bottom:12px}}' +
    '@media(prefers-reduced-motion:reduce){.mvchat-btn,.mvchat-typing i{transition:none;animation:none}}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var btn = el('button', 'mvchat-btn');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Open chat assistant');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>';

  var panel = el('div', 'mvchat-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', "Modiv's Education chat assistant");

  var head = el('div', 'mvchat-head');
  var title = el('div');
  title.appendChild(el('b', '', "Modiv's Assistant"));
  title.appendChild(el('small', '', 'Tutors, demo classes & support'));
  var closeBtn = el('button', 'mvchat-x', '\u00d7');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Close chat');
  head.appendChild(title);
  head.appendChild(closeBtn);

  var log = el('div', 'mvchat-log');
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');

  var form = el('form', 'mvchat-form');
  var input = el('textarea', 'mvchat-input');
  input.rows = 1;
  input.maxLength = MAX_CHARS;
  input.placeholder = 'Type your question...';
  input.setAttribute('aria-label', 'Your message');
  var send = el('button', 'mvchat-send', 'Send');
  send.type = 'submit';
  form.appendChild(input);
  form.appendChild(send);

  var note = el('div', 'mvchat-note', 'Automated assistant. For payments or account issues, contact support.');

  panel.appendChild(head);
  panel.appendChild(log);
  panel.appendChild(form);
  panel.appendChild(note);
  document.body.appendChild(panel);
  document.body.appendChild(btn);

  // Turn URLs, emails and phone numbers into links, using DOM nodes only (no innerHTML on reply text).
  var LINK_RE = /(https?:\/\/[^\s<>"')]+[^\s<>"').,;:!?])|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})|(\+91[\s-]?\d{5}[\s-]?\d{5})/g;
  function fill(node, text) {
    var last = 0, m;
    LINK_RE.lastIndex = 0;
    while ((m = LINK_RE.exec(text)) !== null) {
      if (m.index > last) node.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = document.createElement('a');
      a.textContent = m[0];
      if (m[1]) { a.href = m[1]; a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      else if (m[2]) { a.href = 'mailto:' + m[2]; }
      else { a.href = 'tel:' + m[3].replace(/[\s-]/g, ''); }
      node.appendChild(a);
      last = m.index + m[0].length;
    }
    if (last < text.length) node.appendChild(document.createTextNode(text.slice(last)));
  }

  function scroll() { log.scrollTop = log.scrollHeight; }

  function addMsg(role, text) {
    var d = el('div', 'mvchat-msg ' + (role === 'user' ? 'mvchat-me' : 'mvchat-bot'));
    if (role === 'user') d.textContent = text; else fill(d, text);
    log.appendChild(d);
    scroll();
    return d;
  }

  function showChips() {
    var wrap = el('div', 'mvchat-chips');
    wrap.id = 'mvchat-chips';
    CHIPS.forEach(function (c) {
      var b = el('button', 'mvchat-chip', c);
      b.type = 'button';
      b.addEventListener('click', function () { submit(c); });
      wrap.appendChild(b);
    });
    log.appendChild(wrap);
    scroll();
  }

  function removeChips() {
    var c = document.getElementById('mvchat-chips');
    if (c && c.parentNode) c.parentNode.removeChild(c);
  }

  function render() {
    log.innerHTML = '';
    addMsg('assistant', GREETING);
    messages.forEach(function (m) { addMsg(m.role, m.content); });
    if (!messages.length) showChips();
  }

  function setBusy(v) {
    busy = v;
    send.disabled = v;
    input.disabled = v;
  }

  function submit(text) {
    text = (text || '').trim().slice(0, MAX_CHARS);
    if (!text || busy) return;
    removeChips();
    messages.push({ role: 'user', content: text });
    addMsg('user', text);
    persist();
    input.value = '';
    input.style.height = 'auto';
    setBusy(true);

    var typing = el('div', 'mvchat-typing');
    typing.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(typing);
    scroll();

    var payload = messages.slice(-MAX_SEND).map(function (m) { return { role: m.role, content: m.content }; });
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 30000) : null;

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: payload }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; });
    }).then(function (data) {
      return (data && typeof data.reply === 'string' && data.reply.trim()) ? data.reply.trim() : FALLBACK;
    }).catch(function () {
      return FALLBACK;
    }).then(function (reply) {
      if (timer) clearTimeout(timer);
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      messages.push({ role: 'assistant', content: reply });
      addMsg('assistant', reply);
      persist();
      setBusy(false);
      if (open) input.focus();
    });
  }

  function setOpen(v) {
    open = v;
    panel.classList.toggle('mvchat-open', v);
    btn.setAttribute('aria-expanded', v ? 'true' : 'false');
    btn.setAttribute('aria-label', v ? 'Close chat assistant' : 'Open chat assistant');
    if (v) { scroll(); setTimeout(function () { input.focus(); }, 50); }
  }

  btn.addEventListener('click', function () { setOpen(!open); });
  closeBtn.addEventListener('click', function () { setOpen(false); btn.focus(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) { setOpen(false); btn.focus(); } });
  form.addEventListener('submit', function (e) { e.preventDefault(); submit(input.value); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input.value); }
  });
  input.addEventListener('input', function () {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 90) + 'px';
  });

  render();
})();
