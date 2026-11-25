/*
 * Modiv's Education - website chat assistant.
 * Load with:  <script src="chat-widget.js" data-endpoint="https://modivs-chat.happinessaggarwal.workers.dev" defer></script>
 *
 * Flow:
 *   - Guest (not logged in): asks Name -> Contact number -> Enquiry topic/question,
 *     then answers using custom data / AI endpoint and keeps the chat open.
 *   - Logged-in user: skips Name, Contact number, and Designation (uses login data
 *     directly for student/tutor) and answers immediately.
 * Every session is saved to Firestore `chat_leads` via /api/chat-leads (with browser
 * Firestore SDK fallback). Self-contained, all CSS scoped under .mvchat-*.
 */
(function () {
  'use strict';
  if (window.__mvChatLoaded) return;
  window.__mvChatLoaded = true;

  var script = document.currentScript || document.querySelector('script[src*="chat-widget"]');
  var API = (script && script.getAttribute('data-api')) || '/api/chat-leads';
  var ENDPOINT = (script && script.getAttribute('data-endpoint')) || '';
  var MAX_CHARS = 400;
  var MAX_SEND = 10;
  var STORE_KEY = 'mvchat_v3';
  var CHAT_TTL_MS = 10 * 60 * 1000; // 10 minutes
  var AGENTS = ['Priya', 'Anjali', 'Neha', 'Simran', 'Riya', 'Kavya', 'Pooja', 'Ishita', 'Meera', 'Sneha', 'Aarushi', 'Nisha'];
  var END_RE = /^\s*(bye|bye bye|goodbye|good bye|end chat|end|exit|quit|close chat|that'?s all|thats all|no thanks?|nothing else|ok bye|okay bye|thanks,? bye|alvida)\s*[.!]*\s*$/i;
  var WHO_RE = /\b(bot|robot|ai|a\.i\.?|artificial|human|real person|machine|chatgpt|automated)\b/i;
  var PHONE_SUPPORT = '+91 98969 30443';

  var CHIPS_BY_ROLE = {
    student: ['Find a tutor', 'Book a demo class', 'Post my requirement', 'Fees & payments', 'Free notes & shop', 'Contact support'],
    tutor: ['Student leads & coins', 'Membership & payment', 'Profile verification', 'Become a tutor', 'Login / account problem', 'Contact support'],
    guest: ['Find a tutor', 'Book a demo class', 'Become a tutor', 'Tutor membership & coins', 'Fees & payments', 'Free notes & shop', 'Contact support']
  };

  // Custom knowledge base used when custom data is provided or the remote endpoint is unavailable.
  var CUSTOM_DATA = [
    {
      keywords: ['find tutor', 'find a tutor', 'home tuition', 'online class', 'teacher', 'maths', 'science', 'english', 'physics', 'chemistry', 'chandigarh', 'mohali', 'panchkula', 'ludhiana'],
      answer: 'You can browse verified tutors at modivs-find-tutor.html or post your exact class, subject, and city requirement at modivs-post-requirement.html. Interested tutors will reach out, and our team can also help match the right tutor on ' + PHONE_SUPPORT + '.'
    },
    {
      keywords: ['demo', 'trial', 'book a demo', 'demo class'],
      answer: 'To book a demo class, open any tutor profile on modivs-find-tutor.html and click Request Demo Class, or sign up at modivs-student-signup.html. Our team will coordinate the demo for you.'
    },
    {
      keywords: ['post requirement', 'post my requirement', 'requirement'],
      answer: 'Post your full tuition requirement (class, subjects, mode, and area) at modivs-post-requirement.html. Once approved, verified tutors in your area can contact you.'
    },
    {
      keywords: ['become a tutor', 'register as tutor', 'teach', 'join as tutor', 'tutor registration'],
      answer: 'You can register for free as a tutor at modivs-become-tutor.html. Complete your profile, subjects, and documents so our team can verify your account quickly.'
    },
    {
      keywords: ['verification', 'verify', 'profile verification', 'document', 'rejected'],
      answer: 'Profile verification is handled by our review team after you upload your details and documents on modivs-become-tutor.html. For urgent verification help, call ' + PHONE_SUPPORT + ' or email support@modivs.com.'
    },
    {
      keywords: ['coin', 'coins', 'leads', 'student leads', 'unlock', 'membership', 'plan', 'subscription'],
      answer: 'Tutors use membership plans or coins to unlock student leads from active-leads.html and the Tutor Dashboard (modivs-tutor-dashboard.html). If coins or a plan did not activate after payment, share your transaction ID with us at ' + PHONE_SUPPORT + ' or support@modivs.com.'
    },
    {
      keywords: ['fee', 'fees', 'payment', 'refund', 'pay', 'price', 'charges', 'deducted'],
      answer: 'Tuition fees depend on class, subject, and mode (home or online) and are discussed directly with the tutor. For platform payments or refund rules, check modivs-refund-policy.html or contact support@modivs.com with your transaction ID.'
    },
    {
      keywords: ['notes', 'free notes', 'shop', 'study material', 'books', 'pdf'],
      answer: 'You can access study materials, free notes, and resources on modivs-students-corner.html and modivs-shop.html.'
    },
    {
      keywords: ['login', 'password', 'forgot', 'account', 'sign in', 'signup', 'sign up'],
      answer: 'You can log in or reset your password on login.html (or create a new account at signup.html). If you still face trouble accessing your account, call ' + PHONE_SUPPORT + ' or email support@modivs.com.'
    },
    {
      keywords: ['contact', 'support', 'call', 'phone', 'email', 'office', 'help', 'number'],
      answer: "You can reach Modiv's Education support at " + PHONE_SUPPORT + ' or email support@modivs.com, or visit modivs-contact.html.'
    },
    {
      keywords: ['vision', 'about', 'modiv', 'mission', 'who are you'],
      answer: "Modiv's Education connects students and parents with verified home and online tutors across Chandigarh, Mohali, Panchkula, Ludhiana, and online. Learn more about our mission at our-vision.html."
    }
  ];

  // ---------- state ----------
  var rec = null;
  var cur = null;
  var agent = '';
  var busy = false, open = false, ended = false, sid = 0;
  var saveTimer = null;
  var expiryTimer = null;

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

  function inferRoleFromUser(u, email) {
    var rk = String(u.roleKey || '').toLowerCase();
    var r = String(u.role || '').toLowerCase();
    if (rk === 'tutor' || r.indexOf('tutor') > -1 || rk === 'org') return 'tutor';
    if (rk === 'student' || rk === 'parent' || r.indexOf('student') > -1 || r.indexOf('parent') > -1) return 'student';
    var tk = ['modivs_current_tutor', 'modivs_tutor_profile', 'modivs_tutor_account'];
    for (var i = 0; i < tk.length; i++) {
      var to = rd(tk[i]);
      if (to && typeof to === 'object' && (!to.email || String(to.email).toLowerCase() === email)) return 'tutor';
    }
    return 'student';
  }

  // Details of a logged-in user (name, mobile, email, designation) are filled in automatically.
  function knownUser() {
    var u = rd('modivs_auth_user');
    if (!u || !u.email || u.isAdmin || u.roleKey === 'admin') return null;
    var email = String(u.email).toLowerCase();
    var phone = cleanPhone(u.phone || u.mobile || u.contact);
    var name = String(u.name || '').trim();
    var users = rd('modivs_users');
    if (Array.isArray(users)) {
      for (var i = 0; i < users.length; i++) {
        var x = users[i];
        if (x && String(x.email || '').toLowerCase() === email) {
          if (!phone) phone = cleanPhone(x.phone || x.mobile || x.contact);
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
    if (!name) name = email.split('@')[0];
    return { name: name, phone: phone, email: email, uid: String(u.uid || ''), role: inferRoleFromUser(u, email) };
  }

  function clearStored() {
    clearTimeout(expiryTimer);
    expiryTimer = null;
    try { sessionStorage.removeItem(STORE_KEY); } catch (e) {}
  }

  function scheduleExpiry(expiresAt) {
    clearTimeout(expiryTimer);
    if (!expiresAt) return;
    var remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      expiryTimer = setTimeout(expireChat, 0);
      return;
    }
    expiryTimer = setTimeout(expireChat, remaining);
  }

  function persist() {
    if (!rec) return;
    var expiresAt = Date.now() + CHAT_TTL_MS;
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({
        rec: rec,
        cur: cur,
        agent: agent,
        open: open,
        expiresAt: expiresAt
      }));
    } catch (e) {}
    scheduleExpiry(expiresAt);
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
    input.placeholder = cur.placeholder || (cur.chips && cur.chips.length ? 'Tap an option or type your question...' : 'Type here...');
    input.setAttribute('inputmode', cur.id === 'phone' ? 'numeric' : 'text');
    showChips(cur.chips);
    setBusy(false);
  }

  function setBusy(v) {
    busy = v;
    send.disabled = v;
    input.disabled = v;
    if (!v && open && !ended) { try { input.focus(); } catch (e) {} }
  }

  function say(text, next, instant) {
    var mySid = sid;
    var delay = instant ? 0 : Math.min(450 + text.length * 10, 1200);
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

  // ---------- custom data matching & endpoint ----------
  function scoreMatch(query, entry) {
    var q = query.toLowerCase();
    var kws = entry.keywords || entry.tags || [];
    if (typeof kws === 'string') kws = kws.split(',');
    var score = 0;
    for (var i = 0; i < kws.length; i++) {
      var kw = String(kws[i] || '').trim().toLowerCase();
      if (kw && q.indexOf(kw) > -1) score += kw.length > 4 ? 3 : 2;
    }
    var title = String(entry.q || entry.question || entry.title || '').toLowerCase();
    if (title && (q.indexOf(title) > -1 || title.indexOf(q) > -1)) score += 4;
    return score;
  }

  function matchCustomData(query, role) {
    var external = Array.isArray(window.MODIVS_CHAT_DATA) ? window.MODIVS_CHAT_DATA : [];
    var all = external.concat(CUSTOM_DATA);
    var best = null, bestScore = 0;
    for (var i = 0; i < all.length; i++) {
      var item = all[i];
      if (!item) continue;
      if (item.role && role && item.role !== role) continue;
      var s = scoreMatch(query, item);
      if (s > bestScore) { bestScore = s; best = item; }
    }
    if (best && bestScore > 0) return best.answer || best.a || best.reply || '';
    var namePart = firstName() ? ', ' + firstName() : '';
    var phonePart = rec && rec.phone ? ' on ' + rec.phone : '';
    return "Thanks for reaching out" + namePart + "! I have noted your enquiry. Our team will review it and reach out" + phonePart +
      ' soon. For immediate help, call ' + PHONE_SUPPORT + ' or email support@modivs.com.';
  }

  function replyFromData(text) {
    var mySid = sid;
    removeChips();
    setBusy(true);
    var typing = el('div', 'mvchat-typing');
    typing.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(typing);
    scroll(true);

    var fallbackReply = function () { return matchCustomData(text, rec && rec.role); };

    if (!ENDPOINT) {
      setTimeout(function () {
        if (typing.parentNode) typing.parentNode.removeChild(typing);
        if (mySid !== sid) return;
        addMsg('assistant', fallbackReply());
        save();
        controls();
      }, 550);
      return;
    }

    var history = (rec && Array.isArray(rec.transcript) ? rec.transcript : []).slice(-MAX_SEND).map(function (m) {
      return { role: m.from === 'user' ? 'user' : 'assistant', content: m.text };
    });
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 15000) : null;

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: history,
        user: rec ? { loggedIn: rec.loggedIn, role: rec.role, name: rec.name } : null
      }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; });
    }).then(function (data) {
      return (data && typeof data.reply === 'string' && data.reply.trim()) ? data.reply.trim() : fallbackReply();
    }).catch(fallbackReply).then(function (reply) {
      if (timer) clearTimeout(timer);
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      if (mySid !== sid) return;
      addMsg('assistant', reply);
      save();
      controls();
    });
  }

  // ---------- conversation flow ----------
  function firstName() { return (rec && rec.name ? rec.name : '').split(/\s+/)[0] || ''; }
  function chipsFor() { return CHIPS_BY_ROLE[(rec && rec.loggedIn && rec.role) ? rec.role : 'guest'] || CHIPS_BY_ROLE.guest; }

  function askName() {
    cur = { id: 'name', chips: [], placeholder: 'Type your full name...' };
    say("Hi! I'm " + agent + " from Modiv's Education. \uD83D\uDE0A May I know your name, please?", controls, true);
  }
  function askPhone() {
    cur = { id: 'phone', chips: [], placeholder: 'Type your 10-digit contact number...' };
    say('Thanks' + (firstName() ? ', ' + firstName() : '') + '! What is your contact number?', controls);
  }
  function askEnquiry() {
    cur = { id: 'enquiry', chips: chipsFor(), placeholder: 'Type which regarding your enquiry is...' };
    say('Thank you! Which regarding is your enquiry? Tap an option below or type your question.', controls);
  }

  function recordEnquiry(text) {
    if (!rec) return;
    if (!rec.role) {
      rec.role = /\b(become a tutor|teach|membership|coin|coins|leads|verification)\b/i.test(text) ? 'tutor' : 'student';
    }
    rec.issues.push({ issue: text.slice(0, 120), answers: {}, details: text.slice(0, 1000), at: nowIso() });
    save();
  }

  function handle(text) {
    if (!cur) return;
    if (cur.id !== 'name' && cur.id !== 'phone' && WHO_RE.test(text) && text.length < 60) {
      say("I'm " + agent + " from the Modiv's Education chat desk. Ask me anything about tutors, demo classes, fees, or accounts!", controls);
      return;
    }
    switch (cur.id) {
      case 'name': {
        var nm = text.replace(/[^A-Za-z\u0900-\u097F\u0A00-\u0A7F .'-]/g, '').replace(/\s+/g, ' ').trim();
        if (nm.length < 2) return say('Please type your name (letters only).', controls);
        rec.name = nm.slice(0, 80);
        save();
        return askPhone();
      }
      case 'phone': {
        var ph = cleanPhone(text);
        if (!ph) return say('Please enter a valid 10-digit mobile number, for example 98765 43210.', controls);
        rec.phone = ph;
        save();
        return askEnquiry();
      }
      case 'enquiry':
      case 'chat': {
        recordEnquiry(text);
        cur = { id: 'chat', chips: chipsFor(), placeholder: 'Ask another question...' };
        return replyFromData(text);
      }
    }
  }

  function submit(text) {
    text = (text || '').trim().slice(0, MAX_CHARS);
    if (!text || busy || ended) return;
    removeChips();
    if (END_RE.test(text) && cur && cur.id !== 'name' && cur.id !== 'phone') {
      addMsg('user', text);
      input.value = '';
      input.style.height = 'auto';
      return closeChat('Thank you for chatting with us! Have a great day. \uD83D\uDE0A');
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
    log.innerHTML = '';
    cur = null;
    if (u) {
      rec.loggedIn = true;
      rec.email = u.email;
      rec.uid = u.uid;
      rec.name = u.name;
      rec.phone = u.phone;
      rec.role = u.role;
      cur = { id: 'chat', chips: chipsFor(), placeholder: 'Ask your question or tap an option...' };
      say('Hi ' + firstName() + "! I'm " + agent + " from Modiv's Education. \uD83D\uDE0A How can I help you today?", controls, true);
      return;
    }
    askName();
  }

  function restore() {
    var s = null;
    try { s = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null'); } catch (e) {}
    if (!s || !s.rec || !s.rec.sessionId || !Array.isArray(s.rec.transcript) || !s.rec.transcript.length || !s.agent) return false;
    if (s.expiresAt && Date.now() > s.expiresAt) {
      clearStored();
      return false;
    }
    var u = knownUser();
    if (u && !s.rec.loggedIn) return false;
    rec = s.rec; cur = s.cur; agent = s.agent;
    applyAgent();
    log.innerHTML = '';
    rec.transcript.forEach(function (m) { addMsg(m.from === 'user' ? 'user' : 'assistant', m.text, true); });
    controls();
    scheduleExpiry(s.expiresAt || (Date.now() + CHAT_TTL_MS));
    if (s.open) setOpen(true, true);
    return true;
  }

  function expireChat() {
    clearStored();
    sid++;
    ended = false;
    confirmBar.classList.remove('mvchat-show');
    busy = false;
    form.style.display = '';
    note.style.display = '';
    endBtn.style.display = '';
    start();
  }

  function endChat() {
    sid++;
    ended = true;
    clearStored();
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

  function setOpen(v, skipPersist) {
    open = v;
    panel.classList.toggle('mvchat-open', v);
    btn.setAttribute('aria-expanded', v ? 'true' : 'false');
    btn.setAttribute('aria-label', v ? 'Close chat' : 'Chat with us');
    if (!skipPersist && rec && !ended) persist();
    if (v) { scroll(); setTimeout(function () { try { input.focus(); } catch (e) {} }, 50); }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    try {
      var s = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null');
      if (s && s.expiresAt && Date.now() > s.expiresAt) expireChat();
    } catch (e) {}
  });

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
