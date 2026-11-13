/* Modiv's Unique Account Authentication System
   - Main Rule: One email address can create only ONE account across the entire platform
   - Roles: student ('Student / Parent'), tutor ('Tutor'), user ('General User'), admin ('Admin')
   - Firestore Centralized Collection: 'accounts/{normalizedEmail}'
   - Enforces atomic database transactions to prevent duplicate registrations and race conditions
   - Page-based role assignment on Google Sign-In and Email/Password registration
   - Duplicate email detection with role notification and Login redirection
*/
(function(window){
  'use strict';

  function db(){ return window.EducationBFirebase && window.EducationBFirebase.db; }
  function auth(){ return window.EducationBFirebase && window.EducationBFirebase.auth; }

  function normalizeEmail(email){
    return String(email || '').trim().toLowerCase();
  }

  var ROLE_META = {
    'student': {
      key: 'student',
      name: 'Student',
      displayRole: 'Student / Parent',
      loginHash: '#student-login',
      dashboardUrl: 'modivs-student-dashboard.html',
      signupUrl: 'modivs-student-signup.html'
    },
    'tutor': {
      key: 'tutor',
      name: 'Tutor',
      displayRole: 'Tutor',
      loginHash: '#tutor-login',
      dashboardUrl: 'modivs-tutor-dashboard.html',
      signupUrl: 'modivs-education.html#tutor-signup'
    },
    'user': {
      key: 'user',
      name: 'General User',
      displayRole: 'General User',
      loginHash: '#login',
      dashboardUrl: 'modivs-home.html',
      signupUrl: 'modivs-signup.html'
    },
    'admin': {
      key: 'admin',
      name: 'Administrator',
      displayRole: 'Admin',
      loginHash: '#admin-login',
      dashboardUrl: 'modivs-admin.html',
      signupUrl: 'modivs-admin.html'
    }
  };

  var ADMIN_EMAILS = ['aGFwcGluZXNzYWdnYXJ3YWxAZ21haWwuY29t', 'ZGl2eWFuc2hkaGltYW50ZWFtQGdtYWlsLmNvbQ==', 'bHV4bWFua3VtYXI2MjhAZ21haWwuY29t'].map(function(b){ try{ return (typeof atob==='function'?atob(b):Buffer.from(b,'base64').toString('utf8')); }catch(e){ return ''; } });

  function normalizeRoleKey(role){
    if(!role) return 'user';
    var r = String(role).toLowerCase();
    if(r.indexOf('admin') > -1) return 'admin';
    if(r.indexOf('tutor') > -1) return 'tutor';
    if(r.indexOf('student') > -1 || r.indexOf('parent') > -1) return 'student';
    return 'user';
  }

  // Check local cache for account existence
  function checkLocalEmail(email){
    var mail = normalizeEmail(email);
    if(!mail) return null;
    if(ADMIN_EMAILS.indexOf(mail) > -1) return { role: 'admin', roleName: 'Administrator', source: 'admin' };

    try{
      var users = JSON.parse(localStorage.getItem('modivs_users') || '[]');
      var matchUser = users.find(function(u){ return normalizeEmail(u.email) === mail; });
      if(matchUser){
        var k = normalizeRoleKey(matchUser.role);
        return { role: k, roleName: ROLE_META[k].name, account: matchUser, source: 'local_users' };
      }

      var tutors = JSON.parse(localStorage.getItem('modivs_tutors_db') || '[]');
      var matchTutor = tutors.find(function(t){ return normalizeEmail(t.email) === mail; });
      if(matchTutor) return { role: 'tutor', roleName: 'Tutor', account: matchTutor, source: 'local_tutors' };

      var students = JSON.parse(localStorage.getItem('modivs_students_db') || '[]');
      var matchStudent = students.find(function(s){ return normalizeEmail(s.email) === mail; });
      if(matchStudent) return { role: 'student', roleName: 'Student', account: matchStudent, source: 'local_students' };
    }catch(e){}
    return null;
  }

  // Query Firestore and local cache to check if email is already registered anywhere
  function checkEmailExists(email){
    var mail = normalizeEmail(email);
    if(!mail) return Promise.resolve(null);

    // Immediate admin check
    if(ADMIN_EMAILS.indexOf(mail) > -1){
      return Promise.resolve({ exists: true, role: 'admin', roleName: 'Administrator', email: mail });
    }

    var localMatch = checkLocalEmail(mail);
    var firestore = db();

    if(!firestore){
      if(localMatch) return Promise.resolve(Object.assign({ exists: true, email: mail }, localMatch));
      return Promise.resolve({ exists: false, email: mail });
    }

    // Check accounts collection first
    var accountRef = firestore.collection('accounts').doc(mail);
    return accountRef.get().then(function(doc){
      if(doc.exists){
        var data = doc.data() || {};
        var k = normalizeRoleKey(data.role);
        return { exists: true, email: mail, role: k, roleName: ROLE_META[k].name, account: data };
      }

      // Check users collection by email
      return firestore.collection('users').where('email', '==', mail).limit(1).get().then(function(snap){
        if(!snap.empty){
          var uData = snap.docs[0].data() || {};
          var uk = normalizeRoleKey(uData.role);
          return { exists: true, email: mail, role: uk, roleName: ROLE_META[uk].name, account: uData };
        }

        // Check tutors collection
        return firestore.collection('tutors').where('email', '==', mail).limit(1).get().then(function(tSnap){
          if(!tSnap.empty){
            return { exists: true, email: mail, role: 'tutor', roleName: 'Tutor', account: tSnap.docs[0].data() };
          }

          // Check students collection
          return firestore.collection('students').where('email', '==', mail).limit(1).get().then(function(sSnap){
            if(!sSnap.empty){
              return { exists: true, email: mail, role: 'student', roleName: 'Student', account: sSnap.docs[0].data() };
            }

            if(localMatch) return Object.assign({ exists: true, email: mail }, localMatch);
            return { exists: false, email: mail };
          });
        });
      });
    }).catch(function(err){
      console.warn('Firestore email check fallback to local check:', err);
      if(localMatch) return Object.assign({ exists: true, email: mail }, localMatch);
      return { exists: false, email: mail };
    });
  }

  // Renders standard duplicate email banner with Login button
  function renderDuplicateNotice(container, existingRole, targetRole){
    if(!container) return;
    var k = normalizeRoleKey(existingRole);
    var meta = ROLE_META[k] || ROLE_META['user'];
    var roleLabel = meta.name;

    var message = 'This email address is already registered as a ' + roleLabel + '. Please log in using your existing account.';
    if(k === 'user') message = 'This email address is already associated with an account. You cannot create another account using this email.';

    var loginUrl = 'modivs-education.html' + meta.loginHash;

    var html = [
      '<div class="dup-email-box" style="background:#fff7ed;border:1.5px solid #f97316;border-radius:12px;padding:16px;margin:16px 0;font-family:inherit;box-shadow:0 4px 12px rgba(249,115,22,.1)" role="alert">',
      '  <div style="display:flex;align-items:flex-start;gap:12px">',
      '    <div style="font-size:1.6rem;line-height:1">⚠️</div>',
      '    <div style="flex:1">',
      '      <div style="font-weight:800;font-size:.98rem;color:#9a3412;margin-bottom:4px">Account Already Exists (' + roleLabel + ')</div>',
      '      <p style="margin:0 0 12px;font-size:.9rem;color:#7c2d12;line-height:1.45">' + message + '</p>',
      '      <a href="' + loginUrl + '" style="display:inline-flex;align-items:center;gap:6px;background:#c2410c;color:#ffffff;text-decoration:none;font-weight:700;font-size:.88rem;padding:9px 18px;border-radius:8px;transition:background .15s">',
      '        <span>Log in to your ' + roleLabel + ' account</span> <span aria-hidden="true">&rarr;</span>',
      '      </a>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');

    if(typeof container === 'string'){
      var el = document.getElementById(container);
      if(el) el.innerHTML = html;
    } else if(container.nodeType){
      container.innerHTML = html;
    }
  }

  /*
    Atomic account registration into Firestore 'accounts' collection
    Params:
      opts: {
        email: string,
        password: string (optional),
        role: 'student' | 'tutor' | 'user',
        name: string,
        phone: string,
        location: object,
        provider: 'password' | 'google',
        uid: string (optional)
      }
  */
  function registerAccountAtomic(opts){
    var mail = normalizeEmail(opts.email);
    var roleKey = normalizeRoleKey(opts.role);
    var meta = ROLE_META[roleKey];
    var isTutor = (roleKey === 'tutor');
    var isStudent = (roleKey === 'student');
    var kind = isTutor ? 'tut' : (isStudent ? 'stu' : null);
    var firestore = db();

    if(!mail) return Promise.reject(new Error('Valid email address is required.'));

    var nowIso = new Date().toISOString();
    var accountData = {
      email: mail,
      role: roleKey,
      roleName: meta.displayRole,
      name: opts.name || mail.split('@')[0],
      phone: opts.phone || '',
      uid: opts.uid || '',
      provider: opts.provider || 'password',
      location: opts.location || {},
      city: (opts.location && opts.location.city) || '',
      area: (opts.location && opts.location.area) || '',
      createdAt: (window.firebase && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : nowIso,
      updatedAt: (window.firebase && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : nowIso
    };

    function syncLocalStorage(){
      try{
        var users = JSON.parse(localStorage.getItem('modivs_users') || '[]');
        if(!users.some(function(u){ return normalizeEmail(u.email) === mail; })){
          users.push({
            name: accountData.name,
            email: mail,
            phone: accountData.phone,
            role: meta.displayRole,
            roleKey: roleKey,
            uid: accountData.uid,
            displayId: accountData.displayId || '',
            created_at: nowIso
          });
          localStorage.setItem('modivs_users', JSON.stringify(users));
        }
        localStorage.setItem('modivs_auth_user', JSON.stringify({
          name: accountData.name,
          email: mail,
          uid: accountData.uid,
          role: meta.displayRole,
          roleKey: roleKey,
          displayId: accountData.displayId || ''
        }));

        if(accountData.displayId && kind && window.ModivsIds && window.ModivsIds.syncLocalState){
          window.ModivsIds.syncLocalState(kind, mail, accountData.displayId);
        }
      }catch(e){}
    }

    if(!firestore){
      if(kind && window.ModivsIds && typeof window.ModivsIds.local === 'function'){
        var localId = window.ModivsIds.local(kind, mail);
        accountData.displayId = localId;
        if(isTutor) accountData.tutId = localId;
        if(isStudent) accountData.stuId = localId;
      }
      syncLocalStorage();
      return Promise.resolve({ success: true, email: mail, role: roleKey, roleName: meta.name, displayId: accountData.displayId || '' });
    }

    // Atomic transaction on accounts/{mail} and display_ids
    var accountRef = firestore.collection('accounts').doc(mail);
    var counterRef = kind ? firestore.collection('counters').doc('display_ids') : null;
    var mapRef = kind ? firestore.collection('display_ids').doc(kind + '_' + mail.replace(/[\/\\#?\[\]*]/g, '_')) : null;

    return firestore.runTransaction(function(transaction){
      var gets = [transaction.get(accountRef)];
      if(kind && counterRef && mapRef){
        gets.push(transaction.get(counterRef));
        gets.push(transaction.get(mapRef));
      }

      return Promise.all(gets).then(function(docs){
        var accDoc = docs[0];
        if(accDoc && accDoc.exists){
          var ex = accDoc.data() || {};
          var exRole = normalizeRoleKey(ex.role);
          var err = new Error('EMAIL_EXISTS');
          err.code = 'EMAIL_EXISTS';
          err.existingRole = exRole;
          err.existingRoleName = ROLE_META[exRole].name;
          throw err;
        }

        var assignedId = '';
        if(kind){
          var counterDoc = docs[1];
          var mapDoc = docs[2];
          if(mapDoc && mapDoc.exists && mapDoc.data() && mapDoc.data().id){
            assignedId = String(mapDoc.data().id).replace(/^TUT(?=\d)/, 'MOD-TUT');
          } else {
            var startNum = (kind === 'tut') ? 301 : 101;
            var prefix = (kind === 'tut') ? 'MOD-TUT' : 'STU';
            var cData = (counterDoc && counterDoc.exists) ? (counterDoc.data() || {}) : {};
            var curNum = Number(cData[kind]);
            if(isNaN(curNum) || curNum < (startNum - 1)){
              curNum = startNum - 1;
            }
            var nextNum = curNum + 1;
            assignedId = prefix + nextNum;
            var cUpdate = {}; cUpdate[kind] = nextNum;
            transaction.set(counterRef, cUpdate, { merge: true });
            transaction.set(mapRef, {
              id: assignedId,
              kind: kind,
              key: mail,
              createdAt: Date.now()
            });
          }
          accountData.displayId = assignedId;
          if(isTutor) accountData.tutId = assignedId;
          if(isStudent) accountData.stuId = assignedId;
        }

        transaction.set(accountRef, accountData);

        if(isTutor && assignedId){
          var tutDocId = 't_user_' + mail.replace(/[^a-z0-9]/gi, '_');
          transaction.set(firestore.collection('tutors').doc(tutDocId), {
            id: tutDocId,
            email: mail,
            name: accountData.name,
            phone: accountData.phone,
            displayId: assignedId,
            tutId: assignedId,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } else if(isStudent && assignedId){
          var stuDocId = 'stu_' + mail.replace(/[^a-z0-9]/gi, '_');
          transaction.set(firestore.collection('students').doc(stuDocId), {
            id: stuDocId,
            email: mail,
            name: accountData.name,
            phone: accountData.phone,
            displayId: assignedId,
            stuId: assignedId,
            status: 'active',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }
      });
    }).then(function(){
      // Also update/sync users/{uid} collection for downstream security rules
      if(opts.uid){
        var uPayload = {
          name: accountData.name,
          email: mail,
          role: meta.displayRole,
          roleKey: roleKey,
          uid: opts.uid,
          provider: opts.provider || 'password',
          location: accountData.location,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if(accountData.displayId){
          uPayload.displayId = accountData.displayId;
          if(isTutor) uPayload.tutId = accountData.displayId;
          if(isStudent) uPayload.stuId = accountData.displayId;
        }
        firestore.collection('users').doc(opts.uid).set(uPayload, { merge: true }).catch(function(){});
      }
      syncLocalStorage();
      return { success: true, email: mail, role: roleKey, roleName: meta.name, displayId: accountData.displayId || '' };
    });
  }

  /*
    Processes authenticated Google user, enforcing role integrity & global email uniqueness.
  */
  function processGoogleUser(user, pageRole, options){
    options = options || {};
    var roleKey = normalizeRoleKey(pageRole);
    var meta = ROLE_META[roleKey];
    var fbAuth = auth();
    var noticeContainer = options.noticeContainer || options.msgEl;

    var mail = normalizeEmail(user && user.email);
    var name = (user && user.displayName) || (mail ? mail.split('@')[0] : 'User');

    if(!mail){
      return Promise.reject(new Error('Google account has no verified email address.'));
    }

    // Check admin
    if(ADMIN_EMAILS.indexOf(mail) > -1){
      if(options.onSuccess) options.onSuccess({ role: 'admin', user: user, isNew: false });
      else window.location.href = 'modivs-admin.html';
      return Promise.resolve({ role: 'admin', user: user });
    }

    // Check if email already exists anywhere in the platform
    return checkEmailExists(mail).then(function(checkRes){
      // Scenario A: Email already registered
      if(checkRes && checkRes.exists){
        var existingRole = checkRes.role;
        var existingMeta = ROLE_META[existingRole] || ROLE_META['user'];

        // If role matches the page or it's a login action, log in directly
        if(options.isLogin === true || existingRole === roleKey){
          try{
            localStorage.setItem('modivs_auth_user', JSON.stringify({
              name: name,
              email: mail,
              uid: user.uid,
              role: existingMeta.displayRole,
              roleKey: existingRole
            }));
          }catch(e){}

          // Update user document
          if(db()){
            db().collection('users').doc(user.uid).set({
              name: name,
              email: mail,
              role: existingMeta.displayRole,
              roleKey: existingRole,
              lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(function(){});
          }

          var resPayload = { role: existingRole, user: user, email: mail, isNew: false, isExisting: true, account: checkRes.account };
          if(options.onSuccess){
            options.onSuccess(resPayload);
          } else if(!options.isLogin && existingRole === roleKey){
            window.location.href = existingMeta.dashboardUrl;
          }
          return resPayload;
        }

        // Email exists with a DIFFERENT role: STOP and notify
        try{ if(fbAuth) fbAuth.signOut(); }catch(e){}
        if(noticeContainer){
          renderDuplicateNotice(noticeContainer, existingRole, roleKey);
        }
        var errMsg = 'This email address is already registered as a ' + existingMeta.name + '. Please log in using your existing account.';
        if(options.onError) options.onError(errMsg, existingRole);
        var dupErr = new Error(errMsg);
        dupErr.code = 'EMAIL_EXISTS';
        dupErr.isExisting = true;
        dupErr.role = existingRole;
        dupErr.roleName = existingMeta.name;
        return Promise.reject(dupErr);
      }

      // Scenario B: New registration
      // Atomic account creation in accounts collection with the page role
      return registerAccountAtomic({
        email: mail,
        role: roleKey,
        name: name,
        uid: user.uid,
        provider: 'google',
        location: options.location || {}
      }).then(function(){
        var newPayload = { role: roleKey, user: user, email: mail, isNew: true, isExisting: false };
        if(options.onSuccess){
          options.onSuccess(newPayload);
        } else {
          window.location.href = meta.dashboardUrl;
        }
        return newPayload;
      });
    });
  }

  /*
    Unified Google Sign-In / Sign-Up handler
    Enforces that Google authentication follows the selected registration page role.
    If the email already exists with ANY role, stops registration and displays clear notification.
    Resilient: falls back to redirect when browser blocks popups or throws auth/internal-error.
  */
  function continueWithGoogle(pageRole, options){
    options = options || {};
    var roleKey = normalizeRoleKey(pageRole);
    var fbAuth = auth();
    var noticeContainer = options.noticeContainer || options.msgEl;

    if(!fbAuth || !window.firebase || !firebase.auth){
      if(options.onError) options.onError('Firebase authentication is not available right now. Please check your connection.');
      return;
    }

    if(typeof location !== 'undefined' && location.protocol === 'file:'){
      var fileMsg = 'Google Sign-In cannot run from a local file (file://). Please open through a local web server (e.g. Live Server / http://localhost) or test on your deployed website, or log in with Email & Password above.';
      if(options.onError) options.onError(fileMsg);
      if(options.button) options.button.disabled = false;
      return Promise.reject(new Error(fileMsg));
    }

    var provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    if(options.button) options.button.disabled = true;

    function handleAuthError(err){
      if(options.button) options.button.disabled = false;
      var c = err && err.code;
      if(c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return;

      if(c === 'EMAIL_EXISTS'){
        if(noticeContainer) renderDuplicateNotice(noticeContainer, err.role || err.existingRole, roleKey);
        return Promise.reject(err);
      }

      // If popup fails with internal error or popup-blocked, fall back to redirect automatically
      if(c === 'auth/internal-error' || c === 'auth/popup-blocked'){
        console.warn('Google popup encountered ' + c + ', falling back to signInWithRedirect...');
        try {
          sessionStorage.setItem('modivs_google_pending', JSON.stringify({
            role: roleKey,
            isLogin: !!options.isLogin
          }));
          return fbAuth.signInWithRedirect(provider);
        } catch(redirErr){
          console.warn('Redirect fallback error:', redirErr);
        }
      }

      var cleanMsg = (err && err.message) ? err.message.replace(/^Firebase:\s*Error\s*\(([^)]+)\)\.?/i, '$1') : 'Please try again.';
      if(c === 'auth/internal-error'){
        cleanMsg = 'Popup was interrupted. Please disable popup blockers, allow third-party cookies, or log in with Email & Password.';
      } else if(c === 'auth/unauthorized-domain'){
        var host = (typeof location !== 'undefined') ? location.hostname : 'current domain';
        cleanMsg = 'Domain (' + host + ') is not authorized in Firebase Console yet. Please add it to Firebase Console > Authentication > Settings > Authorized Domains.';
      } else if(c === 'auth/api-key-not-valid' || (cleanMsg && cleanMsg.indexOf('api-key-not-valid') > -1)){
        cleanMsg = 'Authentication service is initializing. Please refresh your browser cache (Ctrl+Shift+R) and try again.';
      } else if(c === 'auth/network-request-failed'){
        cleanMsg = 'Network connection issue. Please check your internet connection and try again.';
      }

      var msg = 'Google authentication notice: ' + cleanMsg;
      if(options.onError) options.onError(msg);
      else console.error('Google auth error', err);
      return Promise.reject(err);
    }

    return fbAuth.signInWithPopup(provider).then(function(res){
      if(options.button) options.button.disabled = false;
      return processGoogleUser(res.user, pageRole, options);
    }).catch(handleAuthError);
  }

  // Auto-resolve Google Auth redirect results on page load
  try {
    var initAuth = auth();
    if(initAuth && typeof initAuth.getRedirectResult === 'function'){
      initAuth.getRedirectResult().then(function(res){
        if(res && res.user){
          var pending = null;
          try {
            pending = JSON.parse(sessionStorage.getItem('modivs_google_pending') || 'null');
            sessionStorage.removeItem('modivs_google_pending');
          } catch(e){}
          var rk = (pending && pending.role) || 'student';
          return processGoogleUser(res.user, rk, { isLogin: pending ? pending.isLogin : true });
        }
      }).catch(function(err){
        console.warn('Redirect auth result warning:', err);
      });
    }
  } catch(e){}

  // Progressive Login Rate Limiting & Lockout Enforcement
  var LOCKOUT_PREFIX = 'modivs_login_lockout_';

  function getStorage(){
    try {
      if(typeof window !== 'undefined' && window.localStorage) return window.localStorage;
      if(typeof localStorage !== 'undefined') return localStorage;
    } catch(e){}
    return null;
  }

  function getLockoutStatus(email){
    var mail = normalizeEmail(email);
    if(!mail) return { locked: false, attempts: 0, remainingMs: 0 };
    var storage = getStorage();
    if(!storage) return { locked: false, attempts: 0, remainingMs: 0 };
    try {
      var raw = storage.getItem(LOCKOUT_PREFIX + mail);
      if(!raw) return { locked: false, attempts: 0, remainingMs: 0 };
      var data = JSON.parse(raw);
      var now = Date.now();
      if(data.lockoutUntil && now < data.lockoutUntil){
        return {
          locked: true,
          attempts: data.attempts || 0,
          remainingMs: data.lockoutUntil - now,
          lockoutUntil: data.lockoutUntil,
          requireReset: (data.attempts >= 5)
        };
      }
      if(data.lockoutUntil && now >= data.lockoutUntil){
        storage.removeItem(LOCKOUT_PREFIX + mail);
        return { locked: false, attempts: 0, remainingMs: 0 };
      }
      return { locked: false, attempts: data.attempts || 0, remainingMs: 0 };
    } catch(e){
      return { locked: false, attempts: 0, remainingMs: 0 };
    }
  }

  function recordFailedAttempt(email){
    var mail = normalizeEmail(email);
    if(!mail) return { locked: false, attempts: 1, remainingMs: 0 };
    var storage = getStorage();
    try {
      var status = getLockoutStatus(mail);
      var attempts = (status.attempts || 0) + 1;
      var lockoutDurationMs = 0;
      var requireReset = false;

      if(attempts >= 5){
        lockoutDurationMs = 60 * 60 * 1000;
        requireReset = true;
      } else if(attempts === 4){
        lockoutDurationMs = 10 * 60 * 1000;
      } else if(attempts === 3){
        lockoutDurationMs = 3 * 60 * 1000;
      }

      var record = {
        attempts: attempts,
        lastFailed: Date.now(),
        lockoutUntil: lockoutDurationMs > 0 ? (Date.now() + lockoutDurationMs) : 0,
        requireReset: requireReset
      };
      if(storage) storage.setItem(LOCKOUT_PREFIX + mail, JSON.stringify(record));
      return {
        locked: lockoutDurationMs > 0,
        attempts: attempts,
        remainingMs: lockoutDurationMs,
        requireReset: requireReset
      };
    } catch(e){
      return { locked: false, attempts: 1, remainingMs: 0 };
    }
  }

  function resetFailedAttempts(email){
    var mail = normalizeEmail(email);
    if(!mail) return;
    var storage = getStorage();
    try { if(storage) storage.removeItem(LOCKOUT_PREFIX + mail); } catch(e){}
  }

  function formatLockoutRemaining(remainingMs){
    var totalSec = Math.max(1, Math.ceil(remainingMs / 1000));
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    return m > 0 ? (m + 'm ' + (s < 10 ? '0' : '') + s + 's') : (s + 's');
  }

  window.ModivsAuthUnique = {
    normalizeEmail: normalizeEmail,
    normalizeRoleKey: normalizeRoleKey,
    checkEmailExists: checkEmailExists,
    checkEmailRole: checkEmailExists,
    registerAccountAtomic: registerAccountAtomic,
    registerAccount: registerAccountAtomic,
    renderDuplicateNotice: renderDuplicateNotice,
    continueWithGoogle: continueWithGoogle,
    getLockoutStatus: getLockoutStatus,
    recordFailedAttempt: recordFailedAttempt,
    resetFailedAttempts: resetFailedAttempts,
    formatLockoutRemaining: formatLockoutRemaining,
    ROLE_META: ROLE_META,
    ADMIN_EMAILS: ADMIN_EMAILS
  };
  window.ModivsAuth = window.ModivsAuthUnique;

})(window);
