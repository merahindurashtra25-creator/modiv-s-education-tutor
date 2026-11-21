/* Modiv's Education: shows the signed-in user's photo / avatar at the top of every page.
   - Tutor  -> profile photo (falls back to initials)
   - Student / Parent -> chosen boy / girl avatar (falls back to initials)
   Click it for Dashboard and Log out. Also hides the public Log in / Sign up buttons while signed in. */
(function () {
  'use strict';
  function rd(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v } catch (e) { return d } }
  var env = (typeof window !== 'undefined' && window.__ENV__) || {};
  var DEFAULT_ADMIN_EMAILS = ['happinessaggarwal@gmail.com', 'divyanshdhimanteam@gmail.com', 'luxmankumar628@gmail.com'];
  var adminEmails = ((env.MASTER_ADMIN_EMAILS) ? env.MASTER_ADMIN_EMAILS.split(',') : DEFAULT_ADMIN_EMAILS).map(function (e) { return String(e).trim().toLowerCase(); });

  function normalizeRole(r) {
    if (!r) return '';
    var s = String(r).toLowerCase();
    if (s.indexOf('admin') > -1) return 'Admin';
    if (s.indexOf('tutor') > -1) return 'Tutor';
    if (s.indexOf('student') > -1 || s.indexOf('parent') > -1) return 'Student / Parent';
    if (s.indexOf('org') > -1) return 'Organization';
    return 'General User';
  }

  function isAdminSession() {
    try {
      var a = rd('modivs_admin_session', null);
      if (a && (a.isAdmin === true || (a.email && adminEmails.indexOf(String(a.email).toLowerCase()) !== -1))) return true;
      var u = rd('modivs_auth_user', null);
      if (u && (u.role === 'Admin' || u.roleKey === 'admin' || (u.email && adminEmails.indexOf(String(u.email).toLowerCase()) !== -1))) return true;
    } catch (e) { }
    return false;
  }
  /* any signed-in account, whatever the role (Tutor, Student / Parent, General User, Organization, Admin) */
  function signedIn() {
    if (isAdminSession()) return true;
    var u = rd('modivs_auth_user', null);
    return !!(u && (u.email || u.uid))
  }
  function me() {
    if (isAdminSession()) {
      var a = rd('modivs_admin_session', null) || {};
      var u = rd('modivs_auth_user', null) || {};
      var em = a.email || u.email || '';
      return {
        name: a.name || u.name || 'Admin',
        email: em,
        role: 'Admin',
        uid: a.uid || u.uid || ''
      };
    }
    var u = rd('modivs_auth_user', null);
    if (!u) return null;
    var normRole = normalizeRole(u.role || u.roleKey);
    return normRole ? Object.assign({}, u, { role: normRole }) : null;
  }
  function initials(n) { return String(n || '?').trim().split(/\s+/).map(function (w) { return w.charAt(0) }).slice(0, 2).join('').toUpperCase() || '?' }
  function findByEmail(list, em) { return (Array.isArray(list) ? list : []).filter(function (x) { return x && String(x.email || '').toLowerCase() === em })[0] || null }
  function avatarFor(u) {
    if (u.role === 'Admin') {
      return { img: '', name: u.name || 'Admin' };
    }
    var em = String(u.email || '').toLowerCase();
    if (u.role === 'Tutor') {
      var t = findByEmail(rd('modivs_tutors_db', []), em), s = findByEmail(rd('modivs_submitted_tutors', []), em);
      var photo = (t && t.photo) || (s && s.photo) || '';
      return { img: photo, name: (t && t.name) || (s && s.name) || u.name }
    }
    var sr = rd('modivs_student_req', null);
    if (!sr || String(sr.email || '').toLowerCase() !== em) sr = findByEmail(rd('modivs_students_db', []), em);
    var key = sr && sr.avatar, img = (key && window.ModivsAvatars && ModivsAvatars.has(key)) ? ModivsAvatars.src(key) : '';
    return { img: img, name: u.name }
  }
  function css() {
    if (document.getElementById('mvUserCss')) return;
    var s = document.createElement('style'); s.id = 'mvUserCss'; s.textContent =
      '.mv-user{position:relative;display:inline-flex;align-items:center;flex:none;margin-left:8px;order:99}' +
      '.mv-av{width:40px;height:40px;border-radius:50%;border:2px solid #FABD4E;padding:0;background:#14213d;color:#fff;font:700 .9rem "Plus Jakarta Sans",system-ui,sans-serif;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer}' +
      '.mv-av.is-admin{border-color:#FABD4E;background:#14213d;color:#FABD4E;box-shadow:0 0 12px rgba(250,189,78,0.45);font-size:1.15rem}' +
      '.mv-av img{width:100%;height:100%;object-fit:cover;display:block}' +
      '.mv-av:focus-visible{outline:3px solid #7fd1bd;outline-offset:2px}' +
      '.mv-nm{max-width:150px;margin-right:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#14213d;font:700 .88rem "Plus Jakarta Sans",system-ui,sans-serif}' +
      '.mv-adm-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 15px;border-radius:99px;background:#FABD4E;color:#14213d;font:700 .84rem "Plus Jakarta Sans",system-ui,sans-serif;text-decoration:none;margin-right:8px;box-shadow:0 2px 8px rgba(250,189,78,0.35);transition:transform .15s,background .15s;order:98}' +
      '.mv-adm-btn:hover{transform:translateY(-1px);background:#f5b033}' +
      '@media(max-width:768px){.mv-adm-btn{display:none}}' +
      '@media(max-width:700px){.mv-nm{display:none}}' +
      '.mv-menu{position:absolute;right:0;top:calc(100% + 8px);z-index:80;min-width:220px;background:#fff;color:#14213d;border:1.5px solid #dfe5ee;border-radius:12px;box-shadow:0 12px 32px rgba(20,33,61,.18);padding:8px;font:500 .92rem "Plus Jakarta Sans",system-ui,sans-serif}' +
      '.mv-menu[hidden]{display:none}.mv-who{padding:8px 10px 10px;border-bottom:1px solid #dfe5ee;margin-bottom:6px}.mv-who b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mv-who small{color:#5d6b82}' +
      '.mv-menu a,.mv-menu button{display:block;width:100%;text-align:left;padding:9px 10px;border:0;border-radius:8px;background:none;color:inherit;font:inherit;text-decoration:none;cursor:pointer}' +
      '.mv-menu a:hover,.mv-menu button:hover{background:#f2f5f9}' +
      '.dash .mv-user, .dash #mvUser, .dash #mvAdmBtn, .dh .mv-user, .dh #mvUser, .dh-in .mv-user, .dh-user + .mv-user, .mv-user + .dh-user, body.dash .mv-user { display: none !important; }';
    document.head.appendChild(s)
  }
  function navUrl(u) {
    try {
      if (window.ModivsSlug && typeof window.ModivsSlug.resolveToRealFile === 'function' && window.ModivsSlug.isLocal && window.ModivsSlug.isLocal()) {
        var r = window.ModivsSlug.resolveToRealFile(u);
        if (r) return r;
      }
    } catch(e) {}
    return u;
  }
  function logout() {
    var pServer = fetch('/api/auth?action=logout', { method: 'POST', credentials: 'include' }).catch(function(){});
    var pFb = Promise.resolve();
    try {
      var fb = window.EducationBFirebase;
      if (fb && fb.auth && typeof fb.auth.signOut === 'function') {
        pFb = fb.auth.signOut().catch(function(){});
      }
    } catch(e){}
    Promise.all([pServer, pFb]).then(function(){
      try { localStorage.removeItem('modivs_auth_user'); } catch (e) { }
      try { localStorage.removeItem('modivs_admin_session'); } catch (e) { }
      try { sessionStorage.clear(); } catch (e) { }
      window.location.replace(navUrl('/login'));
    }).catch(function(){
      try { localStorage.removeItem('modivs_auth_user'); } catch (e) { }
      try { localStorage.removeItem('modivs_admin_session'); } catch (e) { }
      try { sessionStorage.clear(); } catch (e) { }
      window.location.replace(navUrl('/login'));
    });
  }
  function hideEl(b) { b.style.setProperty('display', 'none', 'important'); b.setAttribute('aria-hidden', 'true'); b.tabIndex = -1 }
  function hideGuestButtons(hd) {
    [].forEach.call(hd.querySelectorAll('a,button'), function (b) {
      if (b.classList.contains('mv-adm-btn') || b.closest('.mv-user')) return;
      var h = b.getAttribute('href') || '', t = (b.textContent || '').trim().toLowerCase();
      if (/#login$|#student-login$|#tutor-login$|#tutor-signup|modivs-signup\.html|modivs-student-signup\.html/.test(h) && !/^(book a demo class|book a free demo class|enquire now)$/.test(t) || /^(log in|login|sign up|sign up \(student\)|sign up as a tutor|become a tutor|become a modivian tutor)$/.test(t)) hideEl(b)
    });
    ['navLoginBtn', 'navSignup', 'navTutor'].forEach(function (id) { var b = document.getElementById(id); if (b) hideEl(b) })
  }
  function firstName(n) { return String(n || '').trim().split(/\s+/)[0] || 'there' }
  function tutorDash(u) { try { var o = JSON.parse(localStorage.getItem('modivs_org_profiles') || '{}'); if (o && u && u.email && o[String(u.email).toLowerCase()]) return '/org-dashboard' } catch (e) { } return '/tutor-dashboard' }
  function mount() {
    var old = document.getElementById('mvUser'); if (old) old.remove();
    var oldBtn = document.getElementById('mvAdmBtn'); if (oldBtn) oldBtn.remove();
    var p = (location.pathname.split('/').pop() || '').toLowerCase();
    var isDash = /dash|dashboard/i.test(p) || (document.body && document.body.classList.contains('dash')) || !!document.querySelector('.dh-user, .dh, .dh-in, header.dh, aside.side');
    if (isDash) {
      if (old) old.remove();
      if (oldBtn) oldBtn.remove();
      return;
    }
    var u = me();
    var hd = document.querySelector('header') || document.querySelector('.topl');
    if (hd && signedIn()) hideGuestButtons(hd);
    if (!u) return;
    if (!hd) return;
    css();
    var a = avatarFor(u);
    var host = hd.querySelector('.acts') || hd.querySelector('.bar') || hd.querySelector('.links') || hd.querySelector('.in') || hd.querySelector('div') || hd;
    var bur = host.querySelector('.burger');

    if (u.role === 'Admin') {
      var admBtn = document.createElement('a');
      admBtn.id = 'mvAdmBtn';
      admBtn.className = 'mv-adm-btn';
      admBtn.href = '/admin';
      admBtn.innerHTML = '👑 <span>Admin dashboard</span>';
      bur ? host.insertBefore(admBtn, bur) : host.appendChild(admBtn);
    }

    var wrap = document.createElement('div'); wrap.className = 'mv-user'; wrap.id = 'mvUser';
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'mv-av'; btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Account menu for ' + (a.name || 'you'));

    if (u.role === 'Admin') {
      btn.classList.add('is-admin');
      btn.innerHTML = '<span style="font-size:1.15rem;line-height:1" title="Administrator">👑</span>';
    } else if (a.img) {
      var im = document.createElement('img'); im.src = a.img; im.alt = ''; btn.appendChild(im);
    } else {
      btn.textContent = initials(a.name);
    }

    var menu = document.createElement('div'); menu.className = 'mv-menu'; menu.hidden = true;
    var who = document.createElement('div'); who.className = 'mv-who';
    var b = document.createElement('b'); b.textContent = a.name || 'Your account';
    var sm = document.createElement('small'); sm.textContent = (u.role === 'Admin' ? 'Administrator (' + (u.email || '') + ')' : u.role);
    who.appendChild(b); who.appendChild(sm);
    menu.appendChild(who);

    if (u.role === 'Admin') {
      var d = document.createElement('a'); d.href = navUrl('/admin'); d.innerHTML = '👑 <b>Admin Dashboard</b>';
      var leads = document.createElement('a'); leads.href = navUrl('/active-leads'); leads.textContent = 'Active Leads';
      var tutors = document.createElement('a'); tutors.href = navUrl('/tutors'); tutors.textContent = 'Tutors Directory';
      var out = document.createElement('button'); out.type = 'button'; out.textContent = 'Log out'; out.addEventListener('click', logout);
      menu.appendChild(d); menu.appendChild(leads); menu.appendChild(tutors); menu.appendChild(out);
    } else {
      var dash = u.role === 'Tutor' ? tutorDash(u) : (u.role === 'Student / Parent' ? '/student-dashboard' : '/');
      var d = document.createElement('a'); d.href = navUrl(dash); d.textContent = u.role === 'General User' ? 'Home' : 'My dashboard';
      var out = document.createElement('button'); out.type = 'button'; out.textContent = 'Log out'; out.addEventListener('click', logout);
      menu.appendChild(d); menu.appendChild(out);
    }

    btn.addEventListener('click', function (e) { e.stopPropagation(); var o = menu.hidden; menu.hidden = !o; btn.setAttribute('aria-expanded', String(o)) });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false') } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { menu.hidden = true; btn.setAttribute('aria-expanded', 'false') } });

    var nm = document.createElement('span'); nm.className = 'mv-nm';
    nm.textContent = u.role === 'Admin' ? 'Hi, Admin' : ('Hi, ' + firstName(a.name || u.name));
    nm.title = a.name || u.name || '';

    wrap.appendChild(nm); wrap.appendChild(btn); wrap.appendChild(menu);
    bur ? host.insertBefore(wrap, bur) : host.appendChild(wrap);
  }
  function guard() {
    if (!signedIn()) return false;
    var u = rd('modivs_auth_user', null);
    var p = (location.pathname.split('/').pop() || '').toLowerCase(), h = location.hash || '';
    var dash;
    if (isAdminSession()) dash = navUrl('/admin');
    else {
      var r = normalizeRole((u && (u.role || u.roleKey)) || '');
      if (r === 'Tutor') dash = navUrl(tutorDash(u));
      else if (r === 'Student / Parent') dash = navUrl('/student-dashboard');
      else dash = navUrl('/');
    }
    var isLogin = /^(modivs-education\.html|education|login)$/i.test(p) && /^(|#|#login|#student-login|#tutor-login)$/.test(h);
    var isSignupPage = /^(modivs-signup\.html|signup|modivs-user-signup\.html|user-signup)$/i.test(p) || (/^(modivs-student-signup\.html|student-signup)$/i.test(p) && !!u && normalizeRole(u.role || u.roleKey) === 'Student / Parent');
    if (isLogin || isSignupPage) { location.replace(dash); return true }
    return false
  }
  function go() {
    if (guard()) return;
    if (!window.ModivsAvatars && !go.tried) { go.tried = 1; var s = document.createElement('script'); s.src = 'modivs-avatars.js'; s.onload = mount; s.onerror = mount; document.head.appendChild(s); return }
    mount()
  }
  function syncAuthWithFirebase() {
    var fb = window.EducationBFirebase;
    if (!fb || !fb.auth) return;
    fb.auth.onAuthStateChanged(function (user) {
      if (!user || user.isAnonymous) {
        if (isAdminSession()) {
          mount();
          return;
        }
        return;
      }
      user.getIdTokenResult().then(function (res) {
        var isClaimsAdmin = Boolean(res && res.claims && res.claims.admin === true);
        var callerEmail = String(user.email || '').toLowerCase().trim();
        var isDesignatedAdmin = adminEmails.indexOf(callerEmail) !== -1;
        var curAdmin = rd('modivs_admin_session', null);
        var curUser = rd('modivs_auth_user', null);
        var isSessionAdmin = (curAdmin && curAdmin.isAdmin === true) || (curUser && (curUser.role === 'Admin' || curUser.roleKey === 'admin'));
        var isRealAdmin = isClaimsAdmin || isDesignatedAdmin || isSessionAdmin;
        if (isRealAdmin) {
          try { localStorage.setItem('modivs_admin_session', JSON.stringify({ email: callerEmail, isAdmin: true })) } catch (e) { }
          try { localStorage.setItem('modivs_auth_user', JSON.stringify({ email: callerEmail, role: 'Admin', roleKey: 'admin', name: user.displayName || (curUser && curUser.name) || 'Admin', uid: user.uid })) } catch (e) { }
          mount();
        } else {
          try { localStorage.removeItem('modivs_admin_session'); } catch (e) { }
          if (curUser && curUser.role === 'Admin' && !isRealAdmin) {
            try { localStorage.removeItem('modivs_auth_user'); } catch (e) { }
          } else if (!curUser || !curUser.email) {
            var role = (curUser && curUser.role) || 'Student / Parent';
            try { localStorage.setItem('modivs_auth_user', JSON.stringify({ name: user.displayName || callerEmail.split('@')[0], email: callerEmail, role: role, uid: user.uid })); } catch (e) { }
          }
          mount();
        }
      }).catch(function () {
        var callerEmail = String(user.email || '').toLowerCase().trim();
        var curAdmin = rd('modivs_admin_session', null);
        var curUser = rd('modivs_auth_user', null);
        var isSessionAdmin = (curAdmin && curAdmin.isAdmin === true) || (curUser && (curUser.role === 'Admin' || curUser.roleKey === 'admin'));
        if (adminEmails.indexOf(callerEmail) !== -1 || isSessionAdmin) {
          try { localStorage.setItem('modivs_admin_session', JSON.stringify({ email: callerEmail, isAdmin: true })) } catch (e) { }
          try { localStorage.setItem('modivs_auth_user', JSON.stringify({ email: callerEmail, role: 'Admin', roleKey: 'admin', name: user.displayName || 'Admin', uid: user.uid })) } catch (e) { }
          mount();
        }
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { go(); syncAuthWithFirebase(); }); else { go(); syncAuthWithFirebase(); }
  window.addEventListener('storage', function (e) { if (/^modivs_/.test(e.key || '')) mount() });
  window.ModivsSessionUI = { refresh: mount, isAdminSession: isAdminSession, syncAuthWithFirebase: syncAuthWithFirebase };
})();
