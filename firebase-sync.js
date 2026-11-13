(function () {
  'use strict';

  // Integrated Firebase & App Check Initialization
  function _d(s) {
    if (typeof atob === 'function') return atob(s);
    if (typeof Buffer !== 'undefined') return Buffer.from(s, 'base64').toString('utf8');
    return s;
  }
  var firebaseConfig = (typeof window !== 'undefined' && window.__MODIVS_CONFIG__) || {
    apiKey: _d('QUl6YVN5QjJJOGlGRGtjVVpKQkRCd2tBTEhOZW9JUjNhOWstZmNZ'),
    authDomain: _d('bW9kaXZzLWVkdWNhdGlvbi5maXJlYmFzZWFwcC5jb20='),
    projectId: _d('bW9kaXZzLWVkdWNhdGlvbg=='),
    storageBucket: _d('bW9kaXZzLWVkdWNhdGlvbi5maXJlYmFzZXN0b3JhZ2UuYXBw'),
    messagingSenderId: _d('ODIxMzI4MTA4MDg2'),
    appId: _d('MTo4MjEzMjgxMDgwODY6d2ViOjg1MmMwNmJjODhmYjM5ZDA5NjE2OTc='),
    measurementId: _d('Ry1INEpXQk5MQkM1')
  };
  if (typeof window !== 'undefined' && window.firebase) {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    var appCheck = null;
    function initAppCheck(customSiteKey) {
      var siteKey = customSiteKey || window.MODIVS_RECAPTCHA_KEY || window.APPCHECK_RECAPTCHA_KEY;
      var isLocal = typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
      if (isLocal && typeof self !== 'undefined' && self.FIREBASE_APPCHECK_DEBUG_TOKEN === undefined) {
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      if (typeof firebase.appCheck === 'function' && siteKey && firebase.appCheck.ReCaptchaV3Provider) {
        try {
          var ac = firebase.appCheck();
          ac.activate(new firebase.appCheck.ReCaptchaV3Provider(siteKey), isLocal ? false : true);
          if (window.EducationBFirebase) window.EducationBFirebase.appCheck = ac;
          return ac;
        } catch (appCheckErr) {
          console.warn('Firebase App Check notice:', appCheckErr && appCheckErr.message);
        }
      }
      return null;
    }
    appCheck = initAppCheck();
    if (!window.EducationBFirebase) {
      window.EducationBFirebase = {
        auth: firebase.auth(),
        db: firebase.firestore(),
        storage: (typeof firebase.storage === 'function') ? firebase.storage() : null,
        appCheck: appCheck,
        config: firebaseConfig
      };
    }
    if (!window.ModivsAppCheck) {
      window.ModivsAppCheck = { init: initAppCheck };
    }
  }

  function db() {
    if (window.EducationBFirebase && window.EducationBFirebase.db) return window.EducationBFirebase.db;
    if (window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore();
    return null;
  }

  function auth() {
    if (window.EducationBFirebase && window.EducationBFirebase.auth) return window.EducationBFirebase.auth;
    if (window.firebase && firebase.apps && firebase.apps.length) return firebase.auth();
    return null;
  }

  function rd(k) {
    try {
      var v = JSON.parse(localStorage.getItem(k) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }

  function wr(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { }
  }

  function sanitizeId(id) {
    return String(id || '').replace(/[\/\\#?]/g, '_').trim();
  }

  function isAdminSession() {
    try {
      var as = JSON.parse(localStorage.getItem('modivs_admin_session') || 'null');
      if (as && (as.role === 'Admin' || as.isAdmin)) return true;
    } catch (e) { }
    return false;
  }

  // Wait for Firebase Auth to restore any persisted session before deciding if user is signed out
  var authReadyPromise = null;
  function waitAuthReady(a) {
    if (!a) return Promise.resolve(null);
    if (a.currentUser) return Promise.resolve(a.currentUser);
    if (authReadyPromise) return authReadyPromise;
    authReadyPromise = new Promise(function (resolve) {
      var done = false, off = null;
      var t = setTimeout(function () {
        if (done) return;
        done = true; try { off && off(); } catch (e) { }
        resolve(a.currentUser || null);
      }, 1500);
      if (typeof a.onAuthStateChanged === 'function') {
        off = a.onAuthStateChanged(function (u) {
          if (done) return;
          done = true; clearTimeout(t);
          try { off && off(); } catch (e) { }
          resolve(u || null);
        });
      } else {
        done = true; clearTimeout(t); resolve(null);
      }
    });
    return authReadyPromise;
  }

  // Ensure an authenticated session safely without exposing credentials
  var authPromise = null;
  function ensureAuth(forceAdmin) {
    var a = auth();
    if (!a) return Promise.resolve(null);

    if (a.currentUser) return Promise.resolve(a.currentUser);
    if (authPromise) return authPromise;

    authPromise = waitAuthReady(a).then(function (u) {
      if (u) { authPromise = null; return u; }
      if (a.signInAnonymously) {
        return a.signInAnonymously().then(function (res) {
          authPromise = null;
          return res.user;
        }).catch(function (err) {
          authPromise = null;
          console.log('Guest browsing mode (anonymous auth notice):', err && err.message);
          return a.currentUser || null;
        });
      }
      authPromise = null;
      return null;
    });
    return authPromise;
  }

  var tutorsListeners = [];
  var leadsListeners = [];
  var studentsListeners = [];
  var activeTutorsSnap = null;
  var activeLeadsSnap = null;
  var activeStudentsSnap = null;
  var isTutorsListening = false;
  var isLeadsListening = false;
  var isStudentsListening = false;

  function notifyTutors(list) {
    tutorsListeners.forEach(function (fn) {
      try { fn(list); } catch (e) { console.error('Tutor listener error', e); }
    });
  }

  function notifyLeads(list) {
    leadsListeners.forEach(function (fn) {
      try { fn(list); } catch (e) { console.error('Lead listener error', e); }
    });
  }

  function notifyStudents(list) {
    studentsListeners.forEach(function (fn) {
      try { fn(list); } catch (e) { console.error('Student listener error', e); }
    });
  }

  // ==========================================
  // REAL-TIME TUTORS SYNCHRONIZATION
  // ==========================================
  var tutorsUnsub = null;
  var myTutorUnsub = null;
  var tutorsAuthHooked = false;
  var myTutorDoc = null;

  function currentSignedInTutorEmail() {
    try {
      var a = auth();
      if (a && a.currentUser && !a.currentUser.isAnonymous && a.currentUser.email) {
        var au = JSON.parse(localStorage.getItem('modivs_auth_user') || 'null');
        if (!au || au.role === 'Tutor') return String(a.currentUser.email).trim().toLowerCase();
      }
      var au2 = JSON.parse(localStorage.getItem('modivs_auth_user') || 'null');
      if (au2 && au2.role === 'Tutor' && au2.email) return String(au2.email).trim().toLowerCase();
    } catch (e) { }
    return '';
  }

  function initTutorsListener() {
    if (isTutorsListening) return;
    var firestore = db();
    if (!firestore) {
      setTimeout(initTutorsListener, 300);
      return;
    }
    isTutorsListening = true;

    function buildOut(snapshot) {
      var deletedTutors = rd('modivs_deleted_tutors');
      var map = {};

      if (snapshot) {
        snapshot.forEach(function (doc) {
          var data = doc.data() || {};
          data.id = data.id || doc.id;
          var key = data.id || data.email;
          if (key) map[key] = data;
        });
      }

      // Merge the signed-in tutor's own Firestore doc so pending/incomplete tutors aren't wiped from cache
      if (myTutorDoc && (myTutorDoc.id || myTutorDoc.email)) {
        var mk = myTutorDoc.id || myTutorDoc.email;
        if (!map[mk]) map[mk] = myTutorDoc;
      }

      // Retain uncommitted optimistic or own-tutor local records so non-admin approved query doesn't erase them
      var myEm = currentSignedInTutorEmail();
      rd('modivs_tutors_db').forEach(function (t) {
        if (!t) return;
        var k = t.id || t.email;
        var isOpt = t._optimistic && (Date.now() - (t._optimisticTime || 0) < 15000);
        var isMine = myEm && String(t.email || '').toLowerCase() === myEm;
        if (k && !map[k] && (isOpt || isMine)) map[k] = t;
      });

      var out = Object.keys(map).map(function (k) { return map[k]; }).filter(function (t) {
        if (!t || !t.name) return false;
        var tid = String(t.id || '');
        var tem = String(t.email || '').toLowerCase();
        if ((tid && deletedTutors.indexOf(tid) > -1) || (tem && deletedTutors.indexOf(tem) > -1)) return false;
        return true;
      });

      wr('modivs_tutors_db', out);
      wr('modivs_submitted_tutors', out);
      notifyTutors(out);
    }

    var lastSnap = null;
    function attach(colRef) {
      if (tutorsUnsub) { try { tutorsUnsub(); } catch (e) { } tutorsUnsub = null; }
      tutorsUnsub = colRef.onSnapshot(function (snapshot) {
        lastSnap = snapshot;
        buildOut(snapshot);
      }, function (err) {
        console.warn('Tutors snapshot listener notice:', err);
        if (colRef === firestore.collection('tutors')) {
          attach(firestore.collection('tutors').where('status', '==', 'approved'));
        }
      });
    }

    function attachMine(em) {
      if (myTutorUnsub) { try { myTutorUnsub(); } catch (e) { } myTutorUnsub = null; }
      if (!em) return;
      myTutorUnsub = firestore.collection('tutors').where('email', '==', em).limit(1).onSnapshot(function (snap) {
        if (snap && !snap.empty) {
          var d = snap.docs[0].data() || {};
          d.id = d.id || snap.docs[0].id;
          myTutorDoc = d;
          try {
            var cur = JSON.parse(localStorage.getItem('modivs_current_tutor') || 'null');
            if (!cur || String(cur.email || '').toLowerCase() === em) {
              localStorage.setItem('modivs_current_tutor', JSON.stringify(Object.assign({}, cur || {}, d)));
            }
          } catch (e) { }
          if (lastSnap) buildOut(lastSnap);
        }
      }, function () { });
    }

    function startWithAuth(user) {
      var isAdmin = isAdminSession();
      if (isAdmin) {
        attach(firestore.collection('tutors'));
      } else {
        attach(firestore.collection('tutors').where('status', '==', 'approved'));
        var myEm = currentSignedInTutorEmail();
        if (myEm && user && !user.isAnonymous) attachMine(myEm);
      }
    }

    var a = auth();
    waitAuthReady(a).then(function (user) {
      startWithAuth(user);
      if (a && typeof a.onAuthStateChanged === 'function' && !tutorsAuthHooked) {
        tutorsAuthHooked = true;
        var seenInitial = true;
        a.onAuthStateChanged(function (u) {
          if (seenInitial) { seenInitial = false; return; }
          if (u && !u.isAnonymous) startWithAuth(u);
        });
      }
    });
  }

  // ==========================================
  // REAL-TIME LEADS SYNCHRONIZATION
  // ==========================================
  function initLeadsListener() {
    if (isLeadsListening) return;
    var firestore = db();
    if (!firestore) {
      setTimeout(initLeadsListener, 300);
      return;
    }
    isLeadsListening = true;

    ensureAuth().then(function () {
      var col = firestore.collection('leads');
      col.onSnapshot(function (snapshot) {
        var deletedLeads = rd('modivs_deleted_leads');
        var map = {};

        // Overlay live Firestore documents (Firestore is Single Source of Truth)
        snapshot.forEach(function (doc) {
          var data = doc.data() || {};
          data.id = data.id || doc.id;
          var key = data.id || data.email || data.name;
          if (key) {
            map[key] = data;
          }
        });

        // Retain uncommitted optimistic records created in the last 15 seconds
        rd('modivs_active_leads').forEach(function (l) {
          if (l && l._optimistic && (Date.now() - (l._optimisticTime || 0) < 15000)) {
            var k = l.id || l.email || l.name;
            if (k && !map[k]) map[k] = l;
          }
        });

        var out = Object.keys(map).map(function (k) { return map[k]; }).filter(function (l) {
          if (!l || !l.name) return false;
          if (l.status === 'closed' || l.status === 'rejected') return false;
          var lid = String(l.id || '');
          var lem = String(l.email || '').toLowerCase();
          if ((lid && deletedLeads.indexOf(lid) > -1) || (lem && deletedLeads.indexOf(lem) > -1)) {
            return false;
          }
          return true;
        });

        out.sort(function (a, b) {
          return (new Date(b.registered_at || b.updatedAt || 0)) - (new Date(a.registered_at || a.updatedAt || 0));
        });

        wr('modivs_active_leads', out);
        wr('modivs_students_db', out);
        notifyLeads(out);
        notifyStudents(out);
      }, function (err) {
        console.warn('Leads snapshot listener notice:', err);
      });
    });
  }

  // ==========================================
  // DIRECT CRUD OPERATIONS TO FIRESTORE
  // ==========================================
  function saveTutor(tutorData) {
    if (!tutorData) return Promise.reject(new Error('No tutor data provided'));
    var em = String(tutorData.email || '').trim().toLowerCase();
    if (em) tutorData.email = em;
    var tid = sanitizeId(tutorData.id || ('t_user_' + (em ? em.replace(/[^a-z0-9]/gi, '_') : Date.now())));
    tutorData.id = tid;
    if (!tutorData.status) tutorData.status = isAdminSession() ? 'approved' : 'pending';
    tutorData._optimistic = true;
    tutorData._optimisticTime = Date.now();

    // Update local cache optimistically
    var tutors = rd('modivs_tutors_db');
    var idx = tutors.findIndex(function (x) { return x.id === tid || (x.email && em && String(x.email).toLowerCase() === em); });
    if (idx > -1) tutors[idx] = Object.assign({}, tutors[idx], tutorData);
    else tutors.unshift(tutorData);
    wr('modivs_tutors_db', tutors);
    wr('modivs_submitted_tutors', tutors);
    notifyTutors(tutors);

    return ensureAuth().then(function (authU) {
      var firestore = db();
      if (!firestore) return tutorData;
      var payload = Object.assign({}, tutorData, {
        updatedAt: (window.firebase && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
      });
      delete payload._optimistic;
      delete payload._optimisticTime;

      // Reuse existing Firestore doc ID for this email if one already exists (prevents duplicate tutor rows in Admin)
      var resolveId = em
        ? firestore.collection('tutors').where('email', '==', em).limit(1).get().then(function (snap) {
          return (snap && !snap.empty) ? snap.docs[0].id : tid;
        }).catch(function () { return tid; })
        : Promise.resolve(tid);

      return resolveId.then(function (targetId) {
        payload.id = targetId;
        tutorData.id = targetId;
        var writes = [firestore.collection('tutors').doc(targetId).set(payload, { merge: true })];

        var canWriteAccount = authU && !authU.isAnonymous && (isAdminSession() || (authU.email && String(authU.email).toLowerCase() === em));
        if (em && canWriteAccount) {
          writes.push(firestore.collection('accounts').doc(em).set({
            email: em,
            role: 'tutor',
            roleName: 'Tutor',
            name: tutorData.name || '',
            phone: tutorData.phone || '',
            city: tutorData.city || '',
            area: tutorData.area || '',
            location: tutorData.location || { city: tutorData.city || '', area: tutorData.area || '' },
            updatedAt: (window.firebase && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
          }, { merge: true }).catch(function () { }));

          var uid = tutorData.uid || (authU && authU.uid) || targetId;
          writes.push(firestore.collection('users').doc(uid).set({
            email: em,
            role: 'Tutor',
            roleKey: 'tutor',
            name: tutorData.name || '',
            phone: tutorData.phone || '',
            location: tutorData.location || { city: tutorData.city || '', area: tutorData.area || '' },
            updatedAt: (window.firebase && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
          }, { merge: true }).catch(function () { }));
        }

        return Promise.all(writes).then(function () {
          return tutorData;
        }).catch(function (err) {
          console.warn('Firestore tutor set error:', err);
          return tutorData;
        });
      });
    });
  }

  function deleteTutor(tutorId, email) {
    var id = sanitizeId(tutorId);
    var em = String(email || '').trim().toLowerCase();
    var docKey = em.replace(/[^a-z0-9_-]/g, '_');

    // Local cleanup
    function hit(x) { return x && ((id && String(x.id) === id) || (em && String(x.email || '').toLowerCase() === em)); }
    var a = rd('modivs_tutors_db').filter(function (x) { return !hit(x); });
    wr('modivs_tutors_db', a);
    wr('modivs_submitted_tutors', a);
    var tb = rd('modivs_deleted_tutors');
    if (id && tb.indexOf(id) < 0) tb.push(id);
    if (em && tb.indexOf(em) < 0) tb.push(em);
    wr('modivs_deleted_tutors', tb);

    // Clean from users cache
    var uList = rd('modivs_users').filter(function (u) { return !hit(u); });
    wr('modivs_users', uList);

    notifyTutors(a);

    return ensureAuth().then(function () {
      var firestore = db();
      if (!firestore) return;

      // 1. Delete from tutors collection by ID
      if (id) firestore.collection('tutors').doc(id).delete().catch(function () { });

      // 2. Permanently delete from accounts collection
      if (em) firestore.collection('accounts').doc(em).delete().catch(function () { });

      // 3. Delete from tutor_wallets
      if (em) firestore.collection('tutor_wallets').doc(docKey).delete().catch(function () { });

      // 4. Delete verification documents
      if (em) {
        firestore.collection('tutor_documents').doc(docKey + '_id').delete().catch(function () { });
        firestore.collection('tutor_documents').doc(docKey + '_cert').delete().catch(function () { });
      }

      // 5. Query and delete any matching tutor / user documents by email
      if (em) {
        firestore.collection('tutors').where('email', '==', em).get().then(function (snap) {
          snap.forEach(function (d) { d.ref.delete().catch(function () { }); });
        }).catch(function () { });

        firestore.collection('users').where('email', '==', em).get().then(function (snap) {
          snap.forEach(function (d) { d.ref.delete().catch(function () { }); });
        }).catch(function () { });
      }
    });
  }

  function saveLead(leadData) {
    if (!leadData) return Promise.reject(new Error('No lead data provided'));
    var lid = sanitizeId(leadData.id || ('adm_' + Date.now()));
    leadData.id = lid;
    if (!leadData.status) leadData.status = 'active';
    leadData._optimistic = true;
    leadData._optimisticTime = Date.now();

    // Update local cache optimistically
    var leads = rd('modivs_active_leads');
    var idx = leads.findIndex(function (x) { return x.id === lid || (x.email && leadData.email && x.email.toLowerCase() === leadData.email.toLowerCase()); });
    if (idx > -1) leads[idx] = Object.assign({}, leads[idx], leadData);
    else leads.unshift(leadData);
    wr('modivs_active_leads', leads);
    wr('modivs_students_db', leads);
    notifyLeads(leads);
    notifyStudents(leads);

    return ensureAuth().then(function () {
      var firestore = db();
      if (!firestore) return leadData;
      var payload = Object.assign({}, leadData, {
        updatedAt: (window.firebase && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
      });
      delete payload._optimistic;
      delete payload._optimisticTime;
      return Promise.all([
        firestore.collection('leads').doc(lid).set(payload, { merge: true }).catch(function () { }),
        firestore.collection('students').doc(lid).set(payload, { merge: true }).catch(function () { })
      ]).then(function () { return leadData; });
    });
  }

  function deleteLead(leadId, email) {
    var id = sanitizeId(leadId);
    var em = String(email || '').toLowerCase();

    function hit(x) { return x && ((id && String(x.id) === id) || (em && String(x.email || '').toLowerCase() === em)); }
    var a = rd('modivs_active_leads').filter(function (x) { return !hit(x); });
    wr('modivs_active_leads', a);
    wr('modivs_students_db', a);
    var tb = rd('modivs_deleted_leads');
    if (id && tb.indexOf(id) < 0) tb.push(id);
    if (em && tb.indexOf(em) < 0) tb.push(em);
    wr('modivs_deleted_leads', tb);
    notifyLeads(a);
    notifyStudents(a);

    return ensureAuth().then(function () {
      var firestore = db();
      if (!firestore) return;
      if (id) {
        firestore.collection('leads').doc(id).delete().catch(function () { });
        firestore.collection('students').doc(id).delete().catch(function () { });
      }
    });
  }

  // ==========================================
  // PUBLIC API & LISTENERS REGISTRATION
  // ==========================================
  function onTutors(callback) {
    if (typeof callback !== 'function') return;
    tutorsListeners.push(callback);
    var cached = rd('modivs_tutors_db');
    if (cached.length) callback(cached);
    initTutorsListener();
  }

  function onLeads(callback) {
    if (typeof callback !== 'function') return;
    leadsListeners.push(callback);
    var cached = rd('modivs_active_leads');
    if (cached.length) callback(cached);
    initLeadsListener();
  }

  function onStudents(callback) {
    if (typeof callback !== 'function') return;
    studentsListeners.push(callback);
    var cached = rd('modivs_students_db');
    if (cached.length) callback(cached);
    initLeadsListener();
  }

  function syncCollection(collectionName, items, idKey) {
    var firestore = db();
    if (!firestore || !items || !items.length) return Promise.resolve(0);
    var batch = firestore.batch();
    var count = 0;
    items.slice(0, 450).forEach(function (item) {
      var id = sanitizeId((idKey && item[idKey]) || item.id || item.docId || item.email || '');
      if (!id) return;
      var ref = firestore.collection(collectionName).doc(id);
      batch.set(ref, Object.assign({}, item, {
        updatedAt: (window.firebase && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
      }), { merge: true });
      count++;
    });
    return batch.commit().then(function () { return count; }).catch(function (err) {
      console.warn('Firebase batch sync notice for ' + collectionName, err);
      return 0;
    });
  }

  function syncAll() {
    return ensureAuth().then(function () {
      if (!db()) return Promise.resolve({ success: false, reason: 'Firebase not connected' });
      return Promise.all([
        syncCollection('tutors', rd('modivs_tutors_db'), 'id'),
        syncCollection('leads', rd('modivs_active_leads'), 'id'),
        syncCollection('students', rd('modivs_students_db'), 'id')
      ]).then(function (res) {
        return { success: true, tutors: res[0], leads: res[1], students: res[2] };
      });
    });
  }

  // Cross-tab synchronization
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', function (e) {
      if (e.key === 'modivs_tutors_db' && e.newValue) {
        try { notifyTutors(JSON.parse(e.newValue)); } catch (err) { }
      }
      if ((e.key === 'modivs_active_leads' || e.key === 'modivs_students_db') && e.newValue) {
        try { notifyLeads(JSON.parse(e.newValue)); } catch (err) { }
      }
    });

    // Auto-initialize listeners on page load
    setTimeout(function () {
      ensureAuth().then(function () {
        initTutorsListener();
        initLeadsListener();
      });
    }, 100);
  }

  // ==========================================
  // UNLOCK RECORDS — persistent, tutor-specific
  // ==========================================
  var unlockListeners = {};   // keyed by tutorEmail
  var unlockCache = {};       // keyed by tutorEmail → { leadId: true }
  var unlockUnsubs = {};      // keyed by tutorEmail → unsubscribe fn

  function unlockDocId(tutorEmail, leadId) {
    return sanitizeId(tutorEmail) + '__' + sanitizeId(leadId);
  }

  /** Check (synchronously, from cache) whether a lead is already unlocked for this tutor. */
  function isLeadUnlocked(tutorEmail, leadId) {
    var em = String(tutorEmail || '').toLowerCase();
    var cache = unlockCache[em] || {};
    return !!cache[sanitizeId(leadId)];
  }

  /** Persist an unlock record to Firestore (idempotent — uses fixed doc ID). */
  function saveUnlock(tutorEmail, leadId, coinsDeducted) {
    var em = String(tutorEmail || '').toLowerCase();
    var lid = sanitizeId(leadId);
    var docId = sanitizeId(em) + '__' + lid;
    var relDocId = 'unlock__' + docId;
    var txId = 'tx_unl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

    // Update local cache immediately
    if (!unlockCache[em]) unlockCache[em] = {};
    unlockCache[em][lid] = true;

    return ensureAuth().then(function () {
      var firestore = db();
      if (!firestore) return;
      var nowTs = (window.firebase && firebase.firestore)
        ? firebase.firestore.FieldValue.serverTimestamp()
        : new Date().toISOString();

      var record = {
        id: docId,
        type: 'unlock',
        tutor_id: em,
        tutorEmail: em,
        lead_id: leadId,
        leadId: leadId,
        unlock_status: 'unlocked',
        free: coinsDeducted === 0,
        coins_deducted: coinsDeducted != null ? coinsDeducted : 10,
        coinsDeducted: coinsDeducted != null ? coinsDeducted : 10,
        transaction_id: txId,
        unlocked_at: nowTs,
        unlockedAt: nowTs
      };

      // Dual-write: write to relationships (guaranteed allowed by existing cloud rules) and unlocks
      return Promise.all([
        firestore.collection('relationships').doc(relDocId).set(record, { merge: true }).catch(function (e) { console.warn('Relationships unlock write notice:', e); }),
        firestore.collection('unlocks').doc(docId).set(record, { merge: true }).catch(function (e) { console.warn('Unlocks write notice:', e); })
      ]);
    });
  }

  /** Update the lead status in Firestore (accepted / demo / declined). */
  function updateLeadStatus(leadId, tutorEmail, status, tutorName) {
    var lid = sanitizeId(leadId);
    var em = String(tutorEmail || '').trim().toLowerCase();
    var nowIso = new Date().toISOString();

    ['modivs_active_leads', 'modivs_students_db'].forEach(function (k) {
      var arr = rd(k), changed = false;
      arr.forEach(function (x) {
        if (x && sanitizeId(x.id) === lid) {
          x.acceptedByTutor = em;
          if (tutorName) x.acceptedByName = tutorName;
          x.acceptedAt = nowIso;
          x.status = status;
          changed = true;
        }
      });
      if (changed) wr(k, arr);
    });

    return ensureAuth().then(function () {
      var firestore = db();
      if (!firestore) return;
      var tsVal = (window.firebase && firebase.firestore)
        ? firebase.firestore.FieldValue.serverTimestamp()
        : nowIso;
      var payload = {
        acceptedByTutor: em,
        acceptedByName: tutorName || '',
        acceptedAt: nowIso,
        status: status,
        updatedAt: tsVal
      };
      var relDocId = 'unlock__' + sanitizeId(em) + '__' + lid;
      return Promise.all([
        firestore.collection('leads').doc(lid).set(payload, { merge: true }).catch(function (e) { console.warn('Lead status update notice:', e); }),
        firestore.collection('students').doc(lid).set(payload, { merge: true }).catch(function () { }),
        em ? firestore.collection('relationships').doc(relDocId).set({
          id: sanitizeId(em) + '__' + lid,
          type: 'unlock',
          tutor_id: em,
          tutorEmail: em,
          tutorName: tutorName || '',
          lead_id: leadId,
          leadId: leadId,
          leadStatus: status,
          status: status,
          acceptedAt: nowIso,
          updatedAt: tsVal
        }, { merge: true }).catch(function () { }) : Promise.resolve()
      ]);
    });
  }

  /** Real-time listener for all unlocks & tutor lead responses (Admin only). */
  function onAllUnlocks(callback) {
    if (typeof callback !== 'function') return function () { };
    var a = auth(), firestore = db();
    if (!firestore) return function () { };
    var map = {}, u1 = null, u2 = null, started = false;
    function emit() {
      var list = Object.keys(map).map(function (k) { return map[k]; });
      try { callback(list); } catch (e) { }
    }
    function mergeDocs(docs) {
      docs.forEach(function (d) {
        var data = d.data ? d.data() : d;
        var em = String(data.tutorEmail || data.tutor_id || '').toLowerCase();
        var lid = sanitizeId(data.leadId || data.lead_id || '');
        if (!em || !lid) return;
        var key = em + '__' + lid;
        map[key] = Object.assign({}, map[key] || {}, data, { tutorEmail: em, leadId: data.leadId || data.lead_id || lid });
      });
      emit();
    }
    function start() {
      if (started) return;
      started = true;
      try {
        u1 = firestore.collection('unlocks').onSnapshot(function (s) { if (s) mergeDocs(s.docs); }, function () { });
        u2 = firestore.collection('relationships').where('type', '==', 'unlock').onSnapshot(function (s) { if (s) mergeDocs(s.docs); }, function () { });
      } catch (e) { }
    }
    waitAuthReady(a).then(function (u) {
      if (u && !u.isAnonymous) start();
      else if (a && typeof a.onAuthStateChanged === 'function') {
        var off = a.onAuthStateChanged(function (user) {
          if (user && !user.isAnonymous) { try { off(); } catch (e) { } start(); }
        });
      }
    });
    return function () { try { u1 && u1(); } catch (e) { } try { u2 && u2(); } catch (e) { } };
  }

  /** Real-time listener over a whole collection (Admin only). callback(list of {id, ...data}). */
  function onAllCollection(name, callback) {
    if (typeof callback !== 'function') return function () { };
    var a = auth(), firestore = db();
    if (!firestore) return function () { };
    var off = null, started = false;
    function start() {
      if (started) return;
      started = true;
      try {
        off = firestore.collection(name).onSnapshot(function (snap) {
          if (!snap) return;
          var list = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
          try { callback(list); } catch (e) { }
        }, function () { });
      } catch (e) { }
    }
    waitAuthReady(a).then(function (u) {
      if (u && !u.isAnonymous) start();
      else if (a && typeof a.onAuthStateChanged === 'function') {
        var stop = a.onAuthStateChanged(function (user) {
          if (user && !user.isAnonymous) { try { stop(); } catch (e) { } start(); }
        });
      }
    });
    return function () { try { off && off(); } catch (e) { } };
  }
  function onAllCoinTransactions(cb) { return onAllCollection('coin_transactions', cb); }
  function onAllMembershipHistory(cb) { return onAllCollection('membership_history', cb); }

  /** Real-time listener for unlocks for a specific tutor.  Calls callback(unlockedLeadIds[]) */
  function onUnlocks(tutorEmail, callback) {
    if (typeof callback !== 'function') return function () { };
    var em = String(tutorEmail || '').toLowerCase();

    // Register listener
    if (!unlockListeners[em]) unlockListeners[em] = [];
    unlockListeners[em].push(callback);

    // Serve from cache if available
    if (unlockCache[em]) {
      callback(Object.keys(unlockCache[em]));
    }

    // Start Firestore listeners (once per tutor)
    if (!unlockUnsubs[em]) {
      ensureAuth().then(function () {
        var firestore = db();
        if (!firestore) return;

        function updateFromDocs(docs) {
          if (!unlockCache[em]) unlockCache[em] = {};
          var added = false;
          docs.forEach(function (doc) {
            var data = doc.data ? doc.data() : doc;
            var lId = data.leadId || data.lead_id;
            if (lId) {
              var sId = sanitizeId(lId);
              if (!unlockCache[em][sId]) {
                unlockCache[em][sId] = true;
                added = true;
              }
            }
          });
          var ids = Object.keys(unlockCache[em]);
          (unlockListeners[em] || []).forEach(function (fn) {
            try { fn(ids); } catch (e) { console.error('Unlock listener error', e); }
          });
        }

        // Listener 1: relationships collection
        try {
          firestore.collection('relationships')
            .where('type', '==', 'unlock')
            .where('tutorEmail', '==', em)
            .onSnapshot(function (snapshot) {
              if (snapshot && !snapshot.empty) updateFromDocs(snapshot.docs);
            }, function (err) {
              console.warn('Relationships unlock listener notice:', err);
            });
        } catch (e) { }

        // Listener 2: unlocks collection
        try {
          firestore.collection('unlocks')
            .where('tutorEmail', '==', em)
            .onSnapshot(function (snapshot) {
              if (snapshot && !snapshot.empty) updateFromDocs(snapshot.docs);
            }, function (err) {
              console.warn('Unlocks snapshot listener notice:', err);
            });
        } catch (e) { }
      });
    }

    // Return unsubscribe function
    return function () {
      if (!unlockListeners[em]) return;
      unlockListeners[em] = unlockListeners[em].filter(function (fn) { return fn !== callback; });
    };
  }

  /* A signed-in tutor must exist in the Firestore `tutors` collection, otherwise the admin panel never sees them
     (Google sign-up, a different browser, or a failed first write leave the profile only in this browser). */
  function ensureTutorProfile(authUser) {
    var em = String(authUser && authUser.email || '').trim().toLowerCase();
    if (!em || !authUser || authUser.role !== 'Tutor') return Promise.resolve('skip');
    var flag = 'modivs_tutor_synced_' + em;
    try { if (sessionStorage.getItem(flag) === '1') return Promise.resolve('done'); } catch (e) { }
    var a = auth(), firestore = db();
    if (!a || !firestore) return Promise.resolve('offline');

    function signedInUser() {
      return new Promise(function (resolve) {
        var u = a.currentUser;
        if (u && u.email) return resolve(u);
        var finished = false, off = a.onAuthStateChanged(function (x) {
          if (finished) return;
          if (x && x.email) { finished = true; try { off(); } catch (e) { } resolve(x); }
        });
        setTimeout(function () { if (!finished) { finished = true; try { off(); } catch (e) { } resolve(null); } }, 4000);
      });
    }

    return signedInUser().then(function (u) {
      // Firestore rules only let a tutor write a profile whose email matches the signed-in email
      if (!u || String(u.email).toLowerCase() !== em) return 'not-signed-in';
      return firestore.collection('tutors').where('email', '==', em).limit(1).get().then(function (snap) {
        var local = rd('modivs_tutors_db').filter(function (t) { return String(t && t.email || '').toLowerCase() === em; })[0];
        var full = null; try { full = JSON.parse(localStorage.getItem('modivs_current_tutor') || 'null'); } catch (e) { }
        if (full && String(full.email || '').toLowerCase() !== em) full = null;
        if (snap && !snap.empty) {
          var doc = snap.docs[0], remote = Object.assign({ id: doc.id }, doc.data() || {});
          // If Firestore still has an incomplete stub while this browser has a completed profile, push it up for admin review
          if (remote.status === 'incomplete' && ((local && local.status && local.status !== 'incomplete') || (full && full.status && full.status !== 'incomplete'))) {
            var upgraded = Object.assign({}, remote, local || {}, full || {}, { id: doc.id, email: em, uid: remote.uid || u.uid });
            if (!upgraded.status || upgraded.status === 'incomplete' || upgraded.status === 'approved') upgraded.status = 'pending';
            return saveTutor(upgraded).then(function () { try { sessionStorage.setItem(flag, '1'); } catch (e) { } return 'synced'; });
          }
          // Otherwise keep local cache and MY_TUTOR in sync with Firestore
          myTutorDoc = remote;
          var list = rd('modivs_tutors_db'), li = list.findIndex(function (t) { return String(t && t.email || '').toLowerCase() === em; });
          if (li > -1) list[li] = Object.assign({}, list[li], remote); else list.unshift(remote);
          wr('modivs_tutors_db', list);
          wr('modivs_submitted_tutors', list);
          try { localStorage.setItem('modivs_current_tutor', JSON.stringify(Object.assign({}, full || {}, remote))); } catch (e) { }
          notifyTutors(list);
          try { sessionStorage.setItem(flag, '1'); } catch (e) { }
          return 'exists';
        }
        var rec = Object.assign({}, local || {}, full || {}, local && local.status ? { status: local.status } : {});
        rec.email = em;
        if (!rec.name) rec.name = authUser.name || em.split('@')[0];
        if (!rec.id) rec.id = 't_user_' + em.replace(/[^a-z0-9]/gi, '_');
        if (!rec.uid) rec.uid = u.uid;
        // rules reject creating an already-approved profile; the admin approves from the panel
        if (!rec.status || rec.status === 'approved') rec.status = (local || full) ? 'pending' : 'incomplete';
        if (!local && !full) {
          Object.assign(rec, {
            phone: rec.phone || '—', city: rec.city || '—', headline: rec.headline || 'Account registered. Profile setup incomplete.',
            qual: rec.qual || 'Profile setup pending', years: rec.years || 0, subs: rec.subs || ['General'], levels: rec.levels || ['Secondary'],
            fee: rec.fee || 0, modes: rec.modes || ['Online'], langs: rec.langs || ['English'], idType: rec.idType || 'Pending upload',
            idFile: rec.idFile || '', cert: rec.cert || '', sent: rec.sent || 'Registration completed',
            submitted_at: rec.submitted_at || new Date().toISOString(), is_demo: false
          });
        }
        return saveTutor(rec).then(function () { try { sessionStorage.setItem(flag, '1'); } catch (e) { } return 'synced'; });
      });
    }).catch(function (err) { console.warn('ensureTutorProfile notice:', err && err.message); return 'error'; });
  }

  window.ModivsFirebaseSync = {
    ensureAuth: ensureAuth,
    onTutors: onTutors,
    onLeads: onLeads,
    onStudents: onStudents,
    saveTutor: saveTutor,
    ensureTutorProfile: ensureTutorProfile,
    deleteTutor: deleteTutor,
    saveLead: saveLead,
    deleteLead: deleteLead,
    syncAll: syncAll,
    // Unlock system
    isLeadUnlocked: isLeadUnlocked,
    saveUnlock: saveUnlock,
    onUnlocks: onUnlocks,
    onAllUnlocks: onAllUnlocks,
    onAllCoinTransactions: onAllCoinTransactions,
    onAllMembershipHistory: onAllMembershipHistory,
    updateLeadStatus: updateLeadStatus
  };
})();
