/*
 * Modiv's Education - guided website chat.
 * Load with:  <script src="chat-widget.js" defer></script>
 *
 * A scripted, chip-based conversation (no external service):
 *   1. Are you a tutor or a student?
 *   2. Name and mobile number (filled in automatically for logged-in users)
 *   3. What do you need help with? -> a few follow-up questions -> optional details
 * Every step is saved to Firestore collection `chat_leads` through /api/chat-leads
 * (falls back to the browser Firestore SDK when the server has no credentials).
 * Self-contained: no dependencies, all CSS is scoped under .mvchat-*.
 */
(function () {
  'use strict';
  if (window.__mvChatLoaded) return;
  window.__mvChatLoaded = true;

  var script = document.currentScript || document.querySelector('script[src*="chat-widget"]');
  var API = (script && script.getAttribute('data-api')) || '/api/chat-leads';
  var MAX_CHARS = 300;
  var STORE_KEY = 'mvchat_v2';
  var AGENTS = ['Priya', 'Anjali', 'Neha', 'Simran', 'Riya', 'Kavya', 'Pooja', 'Ishita', 'Meera', 'Sneha', 'Aarushi', 'Nisha'];
  var END_RE = /^\s*(bye|bye bye|goodbye|good bye|end chat|end|exit|quit|close chat|that'?s all|thats all|no thanks?|nothing else|ok bye|okay bye|thanks,? bye|alvida)\s*[.!]*\s*$/i;
  var WHO_RE = /\b(bot|robot|ai|a\.i\.?|artificial|human|real person|machine|chatgpt|automated)\b/i;
  var PHONE_SUPPORT = '+91 98969 30443';

  // ---------- conversation script ----------
  var CLASSES = ['Class 1-5', 'Class 6-8', 'Class 9-10', 'Class 11-12', 'College / Competitive'];
  var SUBJECTS = ['Maths', 'Science', 'English', 'Physics', 'Chemistry', 'Hindi', 'Other'];
  var CITIES = ['Chandigarh', 'Mohali', 'Panchkula', 'Ludhiana', 'Other'];
  var MODES = ['Home tuition', 'Online classes', 'Either is fine'];

  var Q = {
    cls: { key: 'Class', text: 'Which class or level is the student in?', chips: CLASSES, other: true },
    subject: { key: 'Subject', text: 'Which subject do you need?', chips: SUBJECTS, other: true },
    mode: { key: 'Mode', text: 'Would you prefer home tuition or online classes?', chips: MODES },
    city: { key: 'City', text: 'Which city are you in?', chips: CITIES, other: true },
    teach: { key: 'Subjects you teach', text: 'Which subject do you want to teach?', chips: SUBJECTS, other: true },
    exp: { key: 'Experience', text: 'How much teaching experience do you have?', chips: ['Fresher', '1-3 years', '3-5 years', '5+ years'] }
  };
  function topic(text, chips) { return { key: 'Topic', text: text, chips: chips }; }

  var ISSUES = {
    student: [
      { label: 'Find a tutor', qs: [Q.cls, Q.subject, Q.mode, Q.city],
        reply: 'Got it! You can browse verified tutors at modivs-find-tutor.html, or post your requirement at modivs-post-requirement.html and interested tutors will contact you. Our team will also call you to help match the right tutor.' },
      { label: 'Book a demo class', qs: [Q.cls, Q.subject, Q.city],
        reply: 'Great choice! Open a tutor profile at modivs-find-tutor.html and request a demo class. Our team will also call you to arrange it.' },
      { label: 'Post my requirement', qs: [Q.cls, Q.subject, Q.city],
        reply: 'You can post your full requirement at modivs-post-requirement.html. Once approved, tutors in your area can reach out to you.' },
      { label: 'Fees & payments', qs: [topic('What is your question about?', ['Tutor fees', 'Refund', 'Payment failed / deducted'])],
        reply: 'Thanks for the details. Refund rules are on modivs-refund-policy.html. For payment problems please keep your transaction ID handy; our team will call you to sort it out.' },
      { label: "Tutor hasn't contacted me", qs: [topic('Since when are you waiting?', ['Today', '2-3 days', 'A week or more'])],
        reply: "Sorry for the wait! We've noted this and our team will follow up with the tutors and call you soon." },
      { label: 'Login / account problem', qs: [topic('What is going wrong?', ['Forgot password', "Can't sign up", 'Profile not updating', 'Other'])],
        reply: 'You can try resetting your password from login.html. If it still does not work, our team will call you to fix it.' },
      { label: 'Something else', qs: [], reply: 'Thanks for telling us. Our team will go through this and get back to you.' }
    ],
    tutor: [
      { label: 'Become a tutor', qs: [Q.teach, Q.city, Q.exp],
        reply: 'Wonderful! You can register for free at modivs-become-tutor.html. Complete your profile and documents so we can verify you quickly.' },
      { label: 'Profile verification', qs: [topic('Where is your profile right now?', ['Just registered', 'Documents uploaded', 'Rejected / need help'])],
        reply: 'Thanks! Our verification team will check your profile and call you if anything more is needed.' },
      { label: 'Student leads & coins', qs: [topic('What do you need help with?', ['How unlocking works', 'Coins not added', 'Not getting leads'])],
        reply: 'Noted. Our team will check your account and call you. For coin top-up problems, keep your payment details ready.' },
      { label: 'Membership & payment', qs: [topic('What is your question about?', ['Which plan to choose', 'Payment deducted, plan not active', 'Refund'])],
        reply: 'Thanks for the details. Our team will review your payment and call you shortly. Refund rules are on modivs-refund-policy.html.' },
      { label: 'Login / account problem', qs: [topic('What is going wrong?', ['Forgot password', "Can't log in", 'Profile not updating', 'Other'])],
        reply: 'You can try resetting your password from login.html. If it still does not work, our team will call you to fix it.' },
      { label: 'Something else', qs: [], reply: 'Thanks for telling us. Our team will go through this and get back to you.' }
    ]
  };

  // ---------- state ----------
  var rec = null;       // the record that is saved to the database
  var cur = null;       // current step: {id, chips, other, awaitOther, qi, issueIdx, placeholder}
  var agent = '';
  var busy = false, open = false, ended = false, sid = 0;
  var saveTimer = null;

  function rid(n) {
    var a = 'abcdefghijklmnopqrstuvwxyz0123456789', s = '';
    try {
      var buf = new Uint8Array(n); (window.crypto || window.msCrypto).getRandomValues(buf);
      for (var i = 0; i < n; i++) s += a[buf[i] % a.length];
    } catch (e) { for (var j = 0; j < n; j++) s += a[Math.floor(Math.random() * a.length)]; }
    return s;
  }
  function nowIso() { return new Date().toISOString(); }
  function rd(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }

  function newRecord() {
    return { sessionId: rid(24), token: rid(40), role: '', name: '', phone: '', email: '', uid: '', loggedIn: false,
      agent: agent, page: (location.pathname || '/').slice(0, 200), status: 'new', issues: [], transcript: [], closedAt: '' };
  }

  function cleanPhone(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.length === 12 && d.indexOf('91') === 0) d = d.slice(2);
    if (d.length === 11 && d.charAt(0) === '0') d = d.slice(1);
    return /^[6-9]\d{9}$/.test(d) ? d : '';
  }

  // Details of a logged-in user (name, mobile, email) are filled in automatically.
  function knownUser() {
    var u = rd('modivs_auth_user');
    if (!u || !u.email || u.isAdmin || u.roleKey === 'admin') return null;
    var email = String(u.email).toLowerCase();
    var phone = cleanPhone(u.phone || u.mobile);
    var name = String(u.name || '').trim();
    var users = rd('modivs_users');
    if (Array.isArray(users)) {
      for (var i = 0; i < users.length; i++) {
        var x = users[i];
        if (x && String(x.email || '').toLowerCase() === email) {
          if (!phone) phone = cleanPhone(x.phone || x.mobile);
          if (!name) name = String(x.name || '').trim();
        }
      }
    }
    ['modivs_current_student', 'modivs_student_account', 'modivs_student_req', 'modivs_student_form', 'modivs_current_tutor', 'modivs_tutor_profile', 'modivs_tutor_account'].forEach(function (k) {
      var o = rd(k);
      if (o && !Array.isArray(o) && typeof o === 'object' && (!o.email || String(o.email).toLowerCase() === email)) {
        if (!phone) phone = cleanPhone(o.phone || o.mobile || o.contact);
        if (!name) name = String(o.name || o.student_name || '').trim();
      }
    });
    return { name: name, phone: phone, email: email, uid: String(u.uid || ''), roleKey: String(u.roleKey || '').toLowerCase() };
  }

  function persist() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ rec: rec, cur: cur, agent: agent })); } catch (e) {}
  }

  // ---------- saving to the database ----------
  function payload() {
    var o = {};
    Object.keys(rec).forEach(function (k) { o[k] = rec[k]; });
    return o;
  }
  function saveNow() {
    if (!rec || !rec.sessionId) return;
    var body = payload();
    var done = false;
    function viaFirestore() {
      try {
        var fb = window.EducationBFirebase;
        if (!fb || !fb.db) return;
        var d = {};
        Object.keys(body).forEach(function (k) { d[k] = body[k]; });
        d.source = 'website-chat';
        d.createdAt = d.createdAt || nowIso();
        d.updatedAt = nowIso();
        fb.db.collection('chat_leads').doc(rec.sessionId).set(d, { merge: true }).catch(function () {});
      } catch (e) {}
    }
    try {
      fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true
      }).then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (j) { if (!j || j.stored !== true) viaFirestore(); })
        .catch(viaFirestore);
    } catch (e) { viaFirestore(); }
  }
  function save() {
    persist();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 350);
  }

  // ---------- UI ----------
  var css = '' +
    '.mvchat-av{width:36px;height:36px;border-radius:50%;background:#EBB92E;color:#1A2035;font-weight:800;font-size:16px;display:flex;align-items:center;justify-content:center;flex:none;margin-right:10px;position:relative}' +
    '.mvchat-av:after{content:"";position:absolute;right:-1px;bottom:-1px;width:10px;height:10px;border-radius:50%;background:#2fbf71;border:2px solid #1A2035}' +
    '.mvchat-who{display:flex;align-items:center;min-width:0}' +
    '.mvchat-chip[disabled]{opacity:.5;cursor:default}' +
    '.mvchat-btn{position:fixed;right:18px;bottom:18px;z-index:2147483000;width:58px;height:58px;border:0;border-radius:50%;' +
    'background:#1A2035;color:#EBB92E;cursor:pointer;box-shadow:0 6px 20px rgba(26,32,53,.35);display:flex;align-items:center;justify-content:center;transition:transform .15s}' +
    '.mvchat-btn:hover{transform:scale(1.06)}.mvchat-btn:focus-visible{outline:3px solid #EBB92E;outline-offset:3px}' +
    '.mvchat-btn svg{width:28px;height:28px}' +
    '.mvchat-panel{position:fixed;right:18px;bottom:88px;z-index:2147483000;width:360px;max-width:calc(100vw - 24px);height:520px;max-height:calc(100vh - 110px);max-height:calc(100dvh - 110px);' +
    'background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(26,32,53,.3);display:none;flex-direction:column;overflow:hidden;' +
    'font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif;font-size:14px;color:#1A2035;border:1px solid #eadfc9}' +
    '.mvchat-panel.mvchat-open{display:flex}' +
    '.mvchat-head{background:#1A2035;color:#fff;padding:12px 14px;display:flex;align-items:center;justify-content:space-between}' +
    '.mvchat-head b{font-size:15px}.mvchat-head small{display:block;color:#EBB92E;font-size:11px;margin-top:2px}' +
    '.mvchat-x{background:none;border:0;color:#fff;font-size:24px;line-height:1;cursor:pointer;padding:2px 6px}' +
    '.mvchat-actions{display:flex;align-items:center;gap:6px}' +
    '.mvchat-end{background:transparent;border:1px solid rgba(255,255,255,.55);color:#fff;border-radius:999px;font:inherit;font-size:12px;font-weight:600;padding:4px 10px;cursor:pointer}' +
    '.mvchat-end:hover{background:#EBB92E;border-color:#EBB92E;color:#1A2035}' +
    '.mvchat-x:focus-visible,.mvchat-end:focus-visible{outline:2px solid #EBB92E;outline-offset:2px}' +
    '.mvchat-logwrap{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;background:#FEF7EA}' +
    '.mvchat-log{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:#d9cfb8 transparent;padding:12px;background:#FEF7EA;display:flex;flex-direction:column;gap:8px;scroll-behavior:smooth}' +
    '.mvchat-log:focus-visible{outline:2px solid #EBB92E;outline-offset:-2px}' +
    '.mvchat-log::-webkit-scrollbar{width:8px}.mvchat-log::-webkit-scrollbar-thumb{background:#d9cfb8;border-radius:8px}' +
    '.mvchat-jump{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);background:#1A2035;color:#fff;border:0;border-radius:999px;padding:6px 14px;font:inherit;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(26,32,53,.3);display:none;z-index:2}' +
    '.mvchat-jump.mvchat-show{display:block}.mvchat-jump:hover{background:#EBB92E;color:#1A2035}' +
    '.mvchat-confirm{display:none;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:10px 12px;background:#fff4d6;border-top:1px solid #eadfc9;font-size:13px}' +
    '.mvchat-confirm.mvchat-show{display:flex}' +
    '.mvchat-confirm button{font:inherit;font-size:13px;font-weight:700;border-radius:8px;padding:6px 12px;cursor:pointer;border:1px solid #1A2035;background:#fff;color:#1A2035}' +
    '.mvchat-confirm .mvchat-yes{background:#1A2035;color:#fff}' +
    '.mvchat-newchat{align-self:flex-start;background:#EBB92E;border:0;color:#1A2035;border-radius:999px;padding:8px 16px;font:inherit;font-weight:700;cursor:pointer}' +
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
    '@media(max-width:480px){.mvchat-panel{right:8px;left:8px;bottom:84px;width:auto;max-width:none;height:calc(100vh - 100px);height:calc(100dvh - 100px)}.mvchat-btn{right:12px;bottom:12px}}' +
    '@media(prefers-reduced-motion:reduce){.mvchat-btn,.mvchat-typing i{transition:none;animation:none}.mvchat-log{scroll-behavior:auto}}';
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
  btn.setAttribute('aria-label', 'Chat with us');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>';

  var panel = el('div', 'mvchat-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', "Chat with Modiv's Education");

  var head = el('div', 'mvchat-head');
  var who = el('div', 'mvchat-who');
  var av = el('div', 'mvchat-av', '');
  var title = el('div');
  var titleB = el('b', '', '');
  var titleS = el('small', '', "Modiv's Education \u00b7 Online");
  title.appendChild(titleB);
  title.appendChild(titleS);
  who.appendChild(av);
  who.appendChild(title);
  var closeBtn = el('button', 'mvchat-x', '\u00d7');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Close chat');
  var endBtn = el('button', 'mvchat-end', 'End chat');
  endBtn.type = 'button';
  endBtn.setAttribute('aria-label', 'End this chat and clear the conversation');
  var actions = el('div', 'mvchat-actions');
  actions.appendChild(endBtn);
  actions.appendChild(closeBtn);
  head.appendChild(who);
  head.appendChild(actions);

  var log = el('div', 'mvchat-log');
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');
  log.tabIndex = 0;
  log.setAttribute('aria-label', 'Chat messages. Use the arrow keys or Page Up and Page Down to scroll.');
  var logWrap = el('div', 'mvchat-logwrap');
  var jump = el('button', 'mvchat-jump', '\u2193 Latest messages');
  jump.type = 'button';
  logWrap.appendChild(log);
  logWrap.appendChild(jump);

  var confirmBar = el('div', 'mvchat-confirm');
  confirmBar.setAttribute('role', 'alertdialog');
  confirmBar.setAttribute('aria-label', 'End chat confirmation');
  confirmBar.appendChild(el('span', '', 'End this chat? The conversation will be cleared.'));
  var confirmBtns = el('div');
  confirmBtns.style.cssText = 'display:flex;gap:6px';
  var yesBtn = el('button', 'mvchat-yes', 'End chat');
  yesBtn.type = 'button';
  var noBtn = el('button', '', 'Keep chatting');
  noBtn.type = 'button';
  confirmBtns.appendChild(yesBtn);
  confirmBtns.appendChild(noBtn);
  confirmBar.appendChild(confirmBtns);

  var form = el('form', 'mvchat-form');
  var input = el('textarea', 'mvchat-input');
  input.rows = 1;
  input.maxLength = MAX_CHARS;
  input.placeholder = 'Type here...';
  input.setAttribute('aria-label', 'Your message');
  var send = el('button', 'mvchat-send', 'Send');
  send.type = 'submit';
  form.appendChild(input);
  form.appendChild(send);

  var note = el('div', 'mvchat-note', "Your details are shared only with the Modiv's Education team.");

  panel.appendChild(head);
  panel.appendChild(logWrap);
  panel.appendChild(confirmBar);
  panel.appendChild(form);
  panel.appendChild(note);
  document.body.appendChild(panel);
  document.body.appendChild(btn);

  // Turn URLs, emails, phone numbers and site pages into links, using DOM nodes only.
  var LINK_RE = /(https?:\/\/[^\s<>"')]+[^\s<>"').,;:!?])|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})|(\+91[\s-]?\d{5}[\s-]?\d{5})|(\b[a-z][a-z0-9-]*\.html\b)/g;
  function fill(node, text) {
    var last = 0, m;
    LINK_RE.lastIndex = 0;
    while ((m = LINK_RE.exec(text)) !== null) {
      if (m.index > last) node.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = document.createElement('a');
      a.textContent = m[0];
      if (m[1]) { a.href = m[1]; a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      else if (m[2]) { a.href = 'mailto:' + m[2]; }
      else if (m[3]) { a.href = 'tel:' + m[3].replace(/[\s-]/g, ''); }
      else { a.href = m[4]; a.target = '_blank'; a.rel = 'noopener'; }
      node.appendChild(a);
      last = m.index + m[0].length;
    }
    if (last < text.length) node.appendChild(document.createTextNode(text.slice(last)));
  }

  function nearBottom() { return log.scrollHeight - log.scrollTop - log.clientHeight < 80; }
  function updateJump() { jump.classList.toggle('mvchat-show', !nearBottom()); }
  function scroll(force) {
    if (force === false && !nearBottom()) { updateJump(); return; }
    log.scrollTop = log.scrollHeight;
    jump.classList.remove('mvchat-show');
  }
  log.addEventListener('scroll', updateJump);
  jump.addEventListener('click', function () { scroll(true); log.focus(); });

  function addMsg(role, text, noRecord) {
    var d = el('div', 'mvchat-msg ' + (role === 'user' ? 'mvchat-me' : 'mvchat-bot'));
    if (role === 'user') d.textContent = text; else fill(d, text);
    var stick = nearBottom() || role === 'user';
    log.appendChild(d);
    scroll(stick ? true : false);
    if (!noRecord && rec) {
      rec.transcript.push({ from: role === 'user' ? 'user' : 'bot', text: text.slice(0, 600), t: nowIso() });
      if (rec.transcript.length > 100) rec.transcript = rec.transcript.slice(-100);
    }
    return d;
  }

  function removeChips() {
    var c = document.getElementById('mvchat-chips');
    if (c && c.parentNode) c.parentNode.removeChild(c);
  }
  function showChips(list) {
    removeChips();
    if (!list || !list.length) return;
    var wrap = el('div', 'mvchat-chips');
    wrap.id = 'mvchat-chips';
    list.forEach(function (c) {
      var b = el('button', 'mvchat-chip', c);
      b.type = 'button';
      b.addEventListener('click', function () { submit(c); });
      wrap.appendChild(b);
    });
    log.appendChild(wrap);
    scroll(true);
  }

  function controls() {
    removeChips();
    if (!cur) return;
    input.placeholder = cur.placeholder || (cur.chips && cur.chips.length ? 'Tap an option or type here...' : 'Type here...');
    input.setAttribute('inputmode', cur.id === 'phone' ? 'numeric' : 'text');
    showChips(cur.awaitOther ? [] : cur.chips);
    setBusy(false);
  }

  function setBusy(v) {
    busy = v;
    send.disabled = v;
    input.disabled = v;
    if (!v && open && !ended) { try { input.focus(); } catch (e) {} }
  }

  // Bot says something after a short "typing" pause, then runs next().
  function say(text, next, instant) {
    var mySid = sid;
    var delay = instant ? 0 : Math.min(500 + text.length * 12, 1400);
    removeChips();
    setBusy(true);
    var typing = el('div', 'mvchat-typing');
    typing.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(typing);
    scroll(true);
    setTimeout(function () {
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      if (mySid !== sid) return;
      addMsg('assistant', text);
      save();
      if (next) next();
    }, delay);
  }

  // ---------- the script ----------
  function firstName() { return (rec.name || '').split(/\s+/)[0] || ''; }

  function askRole() {
    cur = { id: 'role', chips: ['I am a Student / Parent', 'I am a Tutor'] };
    say('Before we begin, are you a tutor or a student?', controls);
  }
  function askName() {
    cur = { id: 'name', chips: [], placeholder: 'Type your full name...' };
    say("Great! May I know your name, please?", controls);
  }
  function askPhone() {
    cur = { id: 'phone', chips: [], placeholder: 'Type your 10-digit mobile number...' };
    say('Thanks' + (firstName() ? ', ' + firstName() : '') + '! What is your mobile number? Our team will use it to call you back.', controls);
  }
  function askIssue(prefix) {
    var list = ISSUES[rec.role] || ISSUES.student;
    cur = { id: 'issue', chips: list.map(function (i) { return i.label; }) };
    say((prefix || '') + 'How can we help you today?', controls);
  }
  function afterIdentity() {
    if (!rec.name) return askName();
    if (!rec.phone) return askPhone();
    askIssue();
  }
  function askQuestion() {
    var issue = ISSUES[rec.role][cur.issueIdx];
    var q = issue.qs[cur.qi];
    cur = { id: 'q', issueIdx: cur.issueIdx, qi: cur.qi, chips: q.chips.slice(), other: !!q.other, awaitOther: false };
    say(q.text, controls);
  }
  function askDetails() {
    cur = { id: 'details', issueIdx: cur.issueIdx, chips: ['Skip'], placeholder: 'Write anything else we should know...' };
    say('Is there anything else you would like to tell us? You can type it below, or tap Skip.', controls);
  }
  function finish() {
    var issue = ISSUES[rec.role][cur.issueIdx];
    cur = { id: 'done', chips: ['I have another question', 'No, that is all'] };
    say(issue.reply, function () {
      var phone = rec.phone ? ' on ' + rec.phone : '';
      say("Thank you" + (firstName() ? ', ' + firstName() : '') + "! I have noted everything. Our team will call you" + phone +
        " soon. You can also reach us at " + PHONE_SUPPORT + " or support@modivs.com. Is there anything else?", controls);
    });
  }

  function matchChip(text, chips) {
    var t = text.trim().toLowerCase();
    for (var i = 0; i < chips.length; i++) { if (chips[i].toLowerCase() === t) return chips[i]; }
    for (var j = 0; j < chips.length; j++) {
      var c = chips[j].toLowerCase();
      if (t.length >= 3 && (c.indexOf(t) > -1 || t.indexOf(c) > -1)) return chips[j];
    }
    return '';
  }

  function handle(text) {
    if (!cur) return;
    // Questions about who is chatting: answer honestly.
    if (cur.id !== 'name' && cur.id !== 'phone' && cur.id !== 'details' && !cur.awaitOther && WHO_RE.test(text) && text.length < 60) {
      say("I'm the Modiv's Education chat desk. I collect your details and pass them to our team, and a team member will call you personally to follow up.", controls);
      return;
    }
    switch (cur.id) {
      case 'role': {
        var m = matchChip(text, cur.chips) || (/tutor|teacher|teach/i.test(text) ? cur.chips[1] : (/student|parent|child|son|daughter/i.test(text) ? cur.chips[0] : ''));
        if (!m) return say('Please tap one of the options: student / parent or tutor.', controls);
        rec.role = m === cur.chips[1] ? 'tutor' : 'student';
        save();
        if (rec.name && rec.phone) {
          return say("Thanks! I already have your details: " + rec.name + ' \u00b7 ' + rec.phone + '.', function () { askIssue(); });
        }
        return afterIdentity();
      }
      case 'name': {
        var nm = text.replace(/[^A-Za-z\u0900-\u097F\u0A00-\u0A7F .'-]/g, '').replace(/\s+/g, ' ').trim();
        if (nm.length < 2) return say('Please type your name (letters only).', controls);
        rec.name = nm.slice(0, 80);
        save();
        return afterIdentity();
      }
      case 'phone': {
        var ph = cleanPhone(text);
        if (!ph) return say('That does not look like a valid 10-digit mobile number. Please type it again, for example 98765 43210.', controls);
        rec.phone = ph;
        save();
        return askIssue('Thank you! ');
      }
      case 'issue': {
        var list = ISSUES[rec.role];
        var label = matchChip(text, cur.chips);
        if (!label) return say('Please tap one of the options below so I can help you better.', controls);
        var idx = cur.chips.indexOf(label);
        rec.issues.push({ issue: label, answers: {}, details: '', at: nowIso() });
        save();
        if (!list[idx].qs.length) { cur = { id: 'q', issueIdx: idx, qi: 0 }; return askDetails(); }
        cur = { id: 'q', issueIdx: idx, qi: 0 };
        return askQuestion();
      }
      case 'q': {
        var issue = ISSUES[rec.role][cur.issueIdx];
        var q = issue.qs[cur.qi];
        var val = '';
        if (cur.awaitOther) { val = text.trim().slice(0, 120); }
        else {
          val = matchChip(text, cur.chips);
          if (val === 'Other' && cur.other) {
            cur.awaitOther = true; persist();
            return say('Sure, please type it below.', controls);
          }
          if (!val && cur.other && text.trim().length >= 2) val = text.trim().slice(0, 120);
          if (!val) return say('Please tap one of the options below.', controls);
        }
        rec.issues[rec.issues.length - 1].answers[q.key] = val;
        save();
        cur = { id: 'q', issueIdx: cur.issueIdx, qi: cur.qi + 1 };
        if (cur.qi < issue.qs.length) return askQuestion();
        return askDetails();
      }
      case 'details': {
        if (text.trim().toLowerCase() !== 'skip') rec.issues[rec.issues.length - 1].details = text.trim().slice(0, 1000);
        save();
        return finish();
      }
      case 'done': {
        if (/another|more|yes|question/i.test(text) && !/no, that/i.test(text)) return askIssue('Sure! ');
        return closeChat('Thank you for chatting with us! Have a great day. 😊');
      }
    }
  }

  function submit(text) {
    text = (text || '').trim().slice(0, MAX_CHARS);
    if (!text || busy || ended) return;
    removeChips();
    if (END_RE.test(text) && cur && cur.id !== 'name' && cur.id !== 'details') {
      addMsg('user', text);
      input.value = '';
      input.style.height = 'auto';
      return closeChat('Thank you for chatting with us! Have a great day. 😊');
    }
    addMsg('user', text);
    input.value = '';
    input.style.height = 'auto';
    save();
    handle(text);
  }

  function closeChat(msg) {
    say(msg, function () {
      rec.status = 'closed';
      rec.closedAt = nowIso();
      saveNow();
      setTimeout(endChat, 900);
    });
  }

  // ---------- start / restore / end ----------
  function applyAgent() {
    titleB.textContent = agent;
    av.textContent = agent.charAt(0);
  }

  function start() {
    agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
    applyAgent();
    rec = newRecord();
    var u = knownUser();
    if (u) {
      rec.loggedIn = true; rec.email = u.email; rec.uid = u.uid;
      rec.name = u.name; rec.phone = u.phone;
    }
    log.innerHTML = '';
    cur = null;
    var hi = (u && u.name ? 'Hi ' + u.name.split(/\s+/)[0] + '! ' : 'Hi! ') + "I'm " + agent + " from Modiv's Education. \uD83D\uDE0A";
    say(hi, askRole, true);
  }

  function restore() {
    var s = null;
    try { s = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null'); } catch (e) {}
    if (!s || !s.rec || !s.rec.sessionId || !Array.isArray(s.rec.transcript) || !s.rec.transcript.length || !s.agent) return false;
    rec = s.rec; cur = s.cur; agent = s.agent;
    applyAgent();
    log.innerHTML = '';
    rec.transcript.forEach(function (m) { addMsg(m.from === 'user' ? 'user' : 'assistant', m.text, true); });
    controls();
    return true;
  }

  function endChat() {
    sid++;
    ended = true;
    try { sessionStorage.removeItem(STORE_KEY); } catch (e) {}
    if (rec && rec.status !== 'closed') { rec.status = 'closed'; rec.closedAt = nowIso(); saveNow(); }
    rec = null; cur = null;
    confirmBar.classList.remove('mvchat-show');
    busy = false;
    log.innerHTML = '';
    addMsg('assistant', "Chat ended. Thanks for visiting Modiv's Education! You can start a new chat any time.", true);
    var nb = el('button', 'mvchat-newchat', 'Start new chat');
    nb.type = 'button';
    nb.addEventListener('click', newChat);
    log.appendChild(nb);
    scroll(true);
    form.style.display = 'none';
    note.style.display = 'none';
    endBtn.style.display = 'none';
    nb.focus();
  }

  function newChat() {
    sid++;
    ended = false;
    form.style.display = '';
    note.style.display = '';
    endBtn.style.display = '';
    start();
  }

  endBtn.addEventListener('click', function () { confirmBar.classList.add('mvchat-show'); yesBtn.focus(); });
  yesBtn.addEventListener('click', endChat);
  noBtn.addEventListener('click', function () { confirmBar.classList.remove('mvchat-show'); input.focus(); });

  function setOpen(v) {
    open = v;
    panel.classList.toggle('mvchat-open', v);
    btn.setAttribute('aria-expanded', v ? 'true' : 'false');
    btn.setAttribute('aria-label', v ? 'Close chat' : 'Chat with us');
    if (v) { scroll(); setTimeout(function () { try { input.focus(); } catch (e) {} }, 50); }
  }

  btn.addEventListener('click', function () { setOpen(!open); });
  closeBtn.addEventListener('click', function () { setOpen(false); btn.focus(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !open) return;
    if (confirmBar.classList.contains('mvchat-show')) { confirmBar.classList.remove('mvchat-show'); input.focus(); return; }
    setOpen(false); btn.focus();
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); submit(input.value); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input.value); }
  });
  input.addEventListener('input', function () {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 90) + 'px';
  });

  if (!restore()) start();
})();
