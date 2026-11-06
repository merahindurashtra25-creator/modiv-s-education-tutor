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

  var ADMIN_EMAILS = ['happinessaggarwal@gmail.com', 'divyanshdhimanteam@gmail.com'];

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
            created_at: nowIso
          });
          localStorage.setItem('modivs_users', JSON.stringify(users));
        }
        localStorage.setItem('modivs_auth_user', JSON.stringify({
          name: accountData.name,
          email: mail,
          uid: accountData.uid,
          role: meta.displayRole,
          roleKey: roleKey
        }));
      }catch(e){}
    }

    if(!firestore){
      syncLocalStorage();
      return Promise.resolve({ success: true, email: mail, role: roleKey, roleName: meta.name });
    }

    // Atomic transaction on accounts/{mail}
    var accountRef = firestore.collection('accounts').doc(mail);
    return firestore.runTransaction(function(transaction){
      return transaction.get(accountRef).then(function(doc){
        if(doc.exists){
          var ex = doc.data() || {};
          var exRole = normalizeRoleKey(ex.role);
          var err = new Error('EMAIL_EXISTS');
          err.code = 'EMAIL_EXISTS';
          err.existingRole = exRole;
          err.existingRoleName = ROLE_META[exRole].name;
          throw err;
        }
        transaction.set(accountRef, accountData);
      });
    }).then(function(){
      // Also update/sync users/{uid} collection for downstream security rules
      if(opts.uid){
        firestore.collection('users').doc(opts.uid).set({
          name: accountData.name,
          email: mail,
          role: meta.displayRole,
          roleKey: roleKey,
          uid: opts.uid,
          provider: opts.provider || 'password',
          location: accountData.location,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(function(){});
      }
      syncLocalStorage();
      return { success: true, email: mail, role: roleKey, roleName: meta.name };
    });
  }

  /*
    Unified Google Sign-In / Sign-Up handler
    Enforces that Google authentication follows the selected registration page role.
    If the email already exists with ANY role, stops registration and displays clear notification.
  */
  function continueWithGoogle(pageRole, options){
    options = options || {};
    var roleKey = normalizeRoleKey(pageRole);
    var meta = ROLE_META[roleKey];
    var fbAuth = auth();
    var noticeContainer = options.noticeContainer || options.msgEl;

    if(!fbAuth || !window.firebase || !firebase.auth){
      if(options.onError) options.onError('Firebase authentication is not available right now. Please check your connection.');
      return;
    }

    var provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    if(options.button) options.button.disabled = true;

    return fbAuth.signInWithPopup(provider).then(function(res){
      if(options.button) options.button.disabled = false;
      var user = res.user || {};
      var mail = normalizeEmail(user.email);
      var name = user.displayName || mail.split('@')[0];

      if(!mail){
        throw new Error('Google account has no verified email address.');
      }

      // Check admin
      if(ADMIN_EMAILS.indexOf(mail) > -1){
        if(options.onSuccess) options.onSuccess({ role: 'admin', user: user, isNew: false });
        else window.location.href = 'modivs-admin.html';
        return;
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
          try{ fbAuth.signOut(); }catch(e){}
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
    }).catch(function(err){
      if(options.button) options.button.disabled = false;
      var c = err && err.code;
      if(c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return;
      var msg = 'Google authentication failed: ' + (err.message || 'Please try again.');
      if(c === 'EMAIL_EXISTS'){
        if(noticeContainer) renderDuplicateNotice(noticeContainer, err.role || err.existingRole, roleKey);
        return Promise.reject(err);
      }
      if(options.onError) options.onError(msg);
      else console.error('Google auth error', err);
      return Promise.reject(err);
    });
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
    ROLE_META: ROLE_META,
    ADMIN_EMAILS: ADMIN_EMAILS
  };
  window.ModivsAuth = window.ModivsAuthUnique;

})(window);
