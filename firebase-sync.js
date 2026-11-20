(function () {
  'use strict';

  var DEFAULT_FIREBASE_CONFIG = {
    apiKey: 'AIzaSyB2I8iFDkcUZJBDBwkALHNeoIR3a9k-fcY',
    authDomain: 'modivs-education.firebaseapp.com',
    databaseURL: 'https://modivs-education-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'modivs-education',
    storageBucket: 'modivs-education.firebasestorage.app',
    messagingSenderId: '821328108086',
    appId: '1:821328108086:web:852c06bc88fb39d0961697',
    measurementId: 'G-H4JWBNLBC5'
  };

  function isBadKey(k) {
    return !k || typeof k !== 'string' || !k.trim() || k.indexOf('your_') === 0;
  }

  if (typeof window !== 'undefined' && window.firebase) {
    try {
      var cfg = (window.__MODIVS_CONFIG__ && !isBadKey(window.__MODIVS_CONFIG__.apiKey))
        ? window.__MODIVS_CONFIG__
        : DEFAULT_FIREBASE_CONFIG;
      window.__MODIVS_CONFIG__ = cfg;

      if (!window.firebase.apps.length) {
        window.firebase.initializeApp(cfg);
      } else {
        var currentApp = window.firebase.app();
        if (!currentApp.options || isBadKey(currentApp.options.apiKey)) {
          if (typeof currentApp.delete === 'function') {
            currentApp.delete().then(function(){
              window.firebase.initializeApp(cfg);
            }).catch(function(){
              currentApp.options.apiKey = cfg.apiKey;
            });
          } else {
            currentApp.options.apiKey = cfg.apiKey;
          }
        }
      }
      window.EducationBFirebase = window.EducationBFirebase || {};
      if (!window.EducationBFirebase.auth && typeof window.firebase.auth === 'function') {
        window.EducationBFirebase.auth = window.firebase.auth();
      }
      if (!window.EducationBFirebase.db && typeof window.firebase.firestore === 'function') {
        window.EducationBFirebase.db = window.firebase.firestore();
      }
    } catch (e) {}
  }

  function ensureFirebase() {
    if (typeof window === 'undefined' || !window.firebase) return;
    try {
      if (typeof window.initFirebaseConfig === 'function') {
        window.initFirebaseConfig();
      }
      window.EducationBFirebase = window.EducationBFirebase || {};
      if (!window.EducationBFirebase.auth && typeof window.firebase.auth === 'function') {
        window.EducationBFirebase.auth = window.firebase.auth();
      }
      if (!window.EducationBFirebase.db && typeof window.firebase.firestore === 'function') {
        window.EducationBFirebase.db = window.firebase.firestore();
      }
    } catch (e) {}
  }

  function db() {
    if (window.EducationBFirebase && window.EducationBFirebase.db) return window.EducationBFirebase.db;
    ensureFirebase();
    if (window.EducationBFirebase && window.EducationBFirebase.db) return window.EducationBFirebase.db;
    if (window.firebase && firebase.apps && firebase.apps.length && typeof firebase.firestore === 'function') return firebase.firestore();
    return null;
  }

  function auth() {
    if (window.EducationBFirebase && window.EducationBFirebase.auth) return window.EducationBFirebase.auth;
    ensureFirebase();
    if (window.EducationBFirebase && window.EducationBFirebase.auth) return window.EducationBFirebase.auth;
    if (window.firebase && firebase.apps && firebase.apps.length && typeof firebase.auth === 'function') return firebase.auth();
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

  var DEFAULT_ADMIN_EMAILS = ['happinessaggarwal@gmail.com', 'divyanshdhimanteam@gmail.com', 'luxmankumar628@gmail.com'];
  function isAdminSession() {
    try {
      if (typeof window !== "undefined" && window.location && window.location.pathname && window.location.pathname.indexOf('modivs-admin') > -1) {
        return true;
      }
      if (typeof document !== "undefined" && document.body && document.body.classList.contains('is-admin')) {
        return true;
      }
      var as = JSON.parse(localStorage.getItem('modivs_admin_session') || 'null');
      if (as && (as.isAdmin === true || as.role === 'Admin')) return true;
      var adminEmails = ((typeof window !== "undefined" && window.__ENV__ && window.__ENV__.MASTER_ADMIN_EMAILS) ? window.__ENV__.MASTER_ADMIN_EMAILS.split(",") : DEFAULT_ADMIN_EMAILS).map(function(e){ return e.trim().toLowerCase(); });
      if (as && as.email && adminEmails.indexOf(String(as.email).toLowerCase()) > -1) return true;
      var au = JSON.parse(localStorage.getItem('modivs_auth_user') || 'null');
      if (au && (au.role === 'Admin' || au.roleKey === 'admin')) return true;
    } catch (e) { }
    return false;
  }

  function cleanPayload(obj, inArray) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      var flat = [];
      obj.forEach(function (x) {
        if (x === undefined) return;
        if (Array.isArray(x)) {
          var nested = cleanPayload(x, inArray);
          if (Array.isArray(nested)) {
            flat.push.apply(flat, nested);
          } else if (nested !== undefined) {
            flat.push(nested);
          }
        } else if (x !== null && typeof x === 'object') {
          flat.push(cleanPayload(x, true));
        } else {
          flat.push(x);
        }
      });
      if (inArray) {
        return flat.map(function (item) {
          return (item !== null && typeof item === 'object') ? JSON.stringify(item) : String(item);
        }).join(', ');
      }
      return flat;
    }
    var out = {};
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (v !== undefined) {
        if (k === 'mode' && Array.isArray(v)) {
          var flatM = cleanPayload(v, false);
          out.mode = Array.isArray(flatM) ? flatM.join(', ') : String(flatM || '');
          if (!out.modes) out.modes = Array.isArray(flatM) ? flatM : [out.mode];
        } else if (inArray && Array.isArray(v)) {
          out[k] = v.map(function (item) { return (item !== null && typeof item === 'object') ? JSON.stringify(item) : String(item); }).join(', ');
        } else {
          out[k] = (v !== null && typeof v === 'object' && !(v instanceof Date) && !(window.firebase && window.firebase.firestore && v instanceof window.firebase.firestore.FieldValue))
            ? cleanPayload(v, inArray)
            : v;
        }
      }
    });
    return out;
  }

  function getAuthHeader() {
    var a = auth();
    if (a && a.currentUser && typeof a.currentUser.getIdToken === 'function') {
      return a.currentUser.getIdToken().then(function (token) {
        return token ? { 'Authorization': 'Bearer ' + token } : {};
      }).catch(function () { return {}; });
    }
    return Promise.resolve({});
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
        done = true;
        authReadyPromise = null;
        try { off && off(); } catch (e) { }
        resolve(a.currentUser || null);
      }, 1500);
      if (typeof a.onAuthStateChanged === 'function') {
        off = a.onAuthStateChanged(function (u) {
          if (done) return;
          done = true; clearTimeout(t);
          authReadyPromise = null;
          try { off && off(); } catch (e) { }
          resolve(u || null);
        });
      } else {
        done = true; clearTimeout(t);
        authReadyPromise = null;
        resolve(null);
      }
    });
    return authReadyPromise;
  }

  // Ensure an authenticated session safely without exposing credentials
  var authPromise = null;
  function ensureAuth(forceAdmin) {
    var a = auth();
    if (!a) return Promise.resolve(null);
    if (a.currentUser && !a.currentUser.isAnonymous) return Promise.resolve(a.currentUser);

    // If an authenticated user/admin session exists in localStorage, never overwrite it with anonymous sign-in
    var au = null; try { au = JSON.parse(localStorage.getItem('modivs_auth_user') || 'null'); } catch(e){}
    var as = null; try { as = JSON.parse(localStorage.getItem('modivs_admin_session') || 'null'); } catch(e){}
    if (au || as) {
      if (authPromise) return authPromise;
      authPromise = waitAuthReady(a).then(function (u) {
        authPromise = null;
        if (u) return u;
        if (a.currentUser) return a.currentUser;
        if (typeof a.signInAnonymously === 'function') {
          return a.signInAnonymously().then(function (res) { return res.user; }).catch(function () { return a.currentUser || null; });
        }
        return null;
      });
      return authPromise;
    }

    if (authPromise) return authPromise;

    authPromise = waitAuthReady(a).then(function (u) {
      if (u && !u.isAnonymous) { authPromise = null; return u; }
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

  function normalizeLocationObject(loc, fallbackCity, fallbackArea) {
    loc = (loc && typeof loc === 'object') ? loc : {};
    var city = String(loc.city || fallbackCity || '').trim();
    var area = String(loc.area || fallbackArea || '').trim();
    var state = String(loc.state || '').trim();
    var country = String(loc.country || 'India').trim();
    var formattedAddress = String(loc.formattedAddress || loc.fullAddress || [area, city, state, country].filter(Boolean).join(', ')).trim();
    var lat = (typeof loc.latitude === 'number') ? loc.latitude : ((typeof loc.lat === 'number') ? loc.lat : null);
    var lon = (typeof loc.longitude === 'number') ? loc.longitude : ((typeof loc.lng === 'number') ? loc.lng : null);
    return {
      city: city,
      state: state,
      country: country,
      formattedAddress: formattedAddress,
      latitude: lat,
      longitude: lon,
      osmId: loc.osmId != null ? String(loc.osmId) : null,
      osmType: loc.osmType ? String(loc.osmType) : null,
      area: area
    };
  }

  function normalizeTutor(data, fallbackId) {
    var t = Object.assign({}, data || {});
    var em = String(t.email || '').trim().toLowerCase();
    t.email = em;
    t.id = String(t.id || fallbackId || ('t_user_' + (em ? em.replace(/[^a-z0-9]/gi, '_') : Date.now())));
    t.name = String(t.name || t.fullName || t.displayName || t.tutorName || (em ? em.split('@')[0] : 'Tutor')).trim();
    t.phone = t.phone || t.mobile || '—';
    t.city = t.city || (t.location && t.location.city) || '';
    t.area = t.area || (t.location && t.location.area) || '';
    t.location = normalizeLocationObject(t.location, t.city, t.area);
    t.subs = Array.isArray(t.subs) ? t.subs : (Array.isArray(t.subjects) ? t.subjects : []);
    t.subjects = t.subs;
    t.levels = Array.isArray(t.levels) ? t.levels : (Array.isArray(t.classes) ? t.classes : []);
    t.classes = t.levels;
    t.modes = Array.isArray(t.modes) ? t.modes : ['Online'];
    t.fee = t.fee != null ? t.fee : (t.rate || 0);
    t.rate = t.rate || (t.fee != null ? ('₹' + t.fee) : '');
    t.years = t.years != null ? t.years : (t.experience || 0);
    t.qual = t.qual || '';
    t.status = t.status || (t.verified ? 'approved' : 'pending');
    t.headline = t.headline || '';
    t.bio = t.bio || '';
    t.photo = t.photo || '';
    t.displayId = t.displayId || t.tutId || '';
    t.tutId = t.tutId || t.displayId || '';
    return t;
  }

  function tutorTime(t) {
    if (!t) return 0;
    var v = t.approved_at || t.approvedAt || t.reviewed_at || t.reviewedAt || t.submitted_at || t.submittedAt || t.updatedAt || t.updated_at || t.created_at || t.createdAt || t.registered_at || t.sent_at;
    if (!v) {
      var m = String(t.id || '').match(/_(\d{10,13})$/);
      if (m) { var n = +m[1]; return n < 1e11 ? n * 1000 : n; }
      return 0;
    }
    if (typeof v === 'number') return v < 1e11 ? v * 1000 : v;
    if (typeof v === 'object') {
      if (typeof v.toDate === 'function') { try { return v.toDate().getTime(); } catch (e) { } }
      if (v.seconds != null) return (+v.seconds * 1000) + Math.round((+v.nanoseconds || 0) / 1e6);
      if (v._seconds != null) return (+v._seconds * 1000);
    }
    var p = Date.parse(v); if (!isNaN(p)) return p;
    var num = Number(v); return (!isNaN(num) && num > 0) ? (num < 1e11 ? num * 1000 : num) : 0;
  }

  function normalizeLead(data, fallbackId) {
    var l = Object.assign({}, data || {});
    var em = String(l.email || l.studentEmail || '').trim().toLowerCase();
    l.email = em;
    l.id = String(l.id || fallbackId || ('ld_' + Date.now())).replace(/[\/\\#?]/g, '_').trim();
    l.name = String(l.name || l.studentName || l.parentName || l.by || (em ? em.split('@')[0] : 'Student')).trim();
    l.parentName = l.parentName || l.by || l.name || '';
    l.by = l.by || l.parentName || 'Parent';
    l.phone = l.phone || l.mobile || '—';
    l.city = l.city || (l.location && l.location.city) || '';
    l.area = l.area || (l.location && l.location.area) || '';
    l.location = normalizeLocationObject(l.location, l.city, l.area);
    l.cls = l.cls || l.class || 'Class 10';
    l.class = l.class || l.cls || 'Class 10';
    l.board = l.board || 'CBSE';
    var cleanSubs = (Array.isArray(l.subs) ? l.subs.flat(Infinity) : (Array.isArray(l.subjects) ? l.subjects.flat(Infinity) : (l.subjects ? String(l.subjects).split(',') : []))).map(function (s) { return String(s).trim(); }).filter(Boolean);
    l.subs = cleanSubs;
    l.subjects = cleanSubs;
    l.budget = l.budget || '₹500–700 / hr';
    var rawMode = l.modes || l.mode || 'Offline (At student’s home)';
    var cleanModes = (Array.isArray(rawMode) ? rawMode.flat(Infinity) : (typeof rawMode === 'string' ? [rawMode] : ['Offline (At student’s home)'])).map(function (m) { return String(m).trim(); }).filter(Boolean);
    l.modes = cleanModes.length ? cleanModes : ['Offline (At student’s home)'];
    l.mode = typeof l.mode === 'string' ? l.mode : (cleanModes.join(', ') || 'Offline (At student’s home)');
    l.status = l.status || 'active';
    l.approval = l.approval || 'approved';
    l.free = Boolean(l.free);
    l.leadBadge = l.leadBadge || (l.free ? 'Free Lead' : '');
    l.displayId = l.displayId || l.stuId || '';
    l.stuId = l.stuId || l.displayId || '';
    l.leadId = l.leadId || l.id;
    l.registered_at = l.registered_at || l.submitted_at || (l.createdAt && l.createdAt.toDate ? l.createdAt.toDate().toISOString() : new Date().toISOString());
    l.submitted_at = l.submitted_at || l.registered_at || new Date().toISOString();
    return l;
  }

  function fetchTutorsFromApi() {
    return fetch('/api/tutors?limit=300', { credentials: 'include' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (data && Array.isArray(data.tutors) && data.tutors.length) {
          var map = {};
          data.tutors.forEach(function (t) {
            var norm = normalizeTutor(t, t.id);
            var k = norm.id || norm.email;
            if (k) map[k] = norm;
          });
          rd('modivs_tutors_db').forEach(function (t) {
            if (t && t._optimistic && (Date.now() - (t._optimisticTime || 0) < 15000)) {
              var k = t.id || t.email;
              if (k) map[k] = t;
            }
          });
          var out = Object.keys(map).map(function (k) { return map[k]; });
          out.sort(function (a, b) { return tutorTime(b) - tutorTime(a) || (+b.years || 0) - (+a.years || 0); });
          wr('modivs_tutors_db', out);
          wr('modivs_submitted_tutors', out);
          notifyTutors(out);
        }
      }).catch(function (e) {
        console.warn('fetchTutorsFromApi notice:', e && e.message);
      });
  }

  function fetchLeadsFromApi() {
    return fetch('/api/leads?limit=300', { credentials: 'include' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (data && Array.isArray(data.leads) && data.leads.length) {
          var map = {};
          data.leads.forEach(function (l) {
            var norm = normalizeLead(l, l.id);
            var k = norm.id || norm.email;
            if (k) map[k] = norm;
          });
          rd('modivs_active_leads').forEach(function (l) {
            if (l && l._optimistic && (Date.now() - (l._optimisticTime || 0) < 15000)) {
              var k = l.id || l.email;
              if (k) map[k] = l;
            }
          });
          var out = Object.keys(map).map(function (k) { return map[k]; }).filter(function (l) {
            if (!l || !l.name) return false;
            if (l.status === 'closed' || l.status === 'rejected' || l.approval === 'rejected') return false;
            var apr = l.approval || (l.status === 'active' ? 'approved' : l.status);
            return apr === 'approved' && l.status !== 'pending';
          });
          wr('modivs_active_leads', out);
          notifyLeads(out);
        }
      }).catch(function (e) {
        console.warn('fetchLeadsFromApi notice:', e && e.message);
      });
  }

  function fetchStudentsFromApi() {
    return fetch('/api/students?limit=300', { credentials: 'include' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (data && Array.isArray(data.students) && data.students.length) {
          var map = {};
          data.students.forEach(function (s) {
            var norm = normalizeLead(s, s.id);
            var k = norm.id || norm.email;
            if (k) map[k] = norm;
          });
          rd('modivs_students_db').forEach(function (s) {
            if (s && s._optimistic && (Date.now() - (s._optimisticTime || 0) < 15000)) {
              var k = s.id || s.email;
              if (k) map[k] = s;
            }
          });
          var out = Object.keys(map).map(function (k) { return map[k]; });
          wr('modivs_students_db', out);
          notifyStudents(out);
        }
      }).catch(function (e) {
        console.warn('fetchStudentsFromApi notice:', e && e.message);
      });
  }

  function initTutorsListener() {
    fetchTutorsFromApi();
    if (isTutorsListening) return;
    var firestore = db();
    if (!firestore) {
      setTimeout(initTutorsListener, 1000);
      return;
    }
    isTutorsListening = true;

    function buildOut(snapshot) {
      var deletedTutors = rd('modivs_deleted_tutors');
      var map = {};

      if (snapshot) {
        snapshot.forEach(function (doc) {
          var norm = normalizeTutor(doc.data() || {}, doc.id);
          var key = norm.email ? ('em:' + String(norm.email).toLowerCase().trim()) : ('id:' + String(norm.id || doc.id).trim());
          if (key) map[key] = norm;
        });
      }

      // Merge the signed-in tutor's own Firestore doc so pending/incomplete tutors aren't wiped from cache
      if (myTutorDoc && (myTutorDoc.id || myTutorDoc.email)) {
        var myNorm = normalizeTutor(myTutorDoc, myTutorDoc.id);
        var mk = myNorm.email ? ('em:' + String(myNorm.email).toLowerCase().trim()) : ('id:' + String(myNorm.id || '').trim());
        map[mk] = Object.assign({}, map[mk] || {}, myNorm);
      }

      // Retain uncommitted optimistic or own-tutor local records so non-admin approved query doesn't erase them
      var myEm = currentSignedInTutorEmail();
      rd('modivs_tutors_db').forEach(function (t) {
        if (!t) return;
        var k = t.email ? ('em:' + String(t.email).toLowerCase().trim()) : ('id:' + String(t.id || '').trim());
        var isOpt = t._optimistic && (Date.now() - (t._optimisticTime || 0) < 15000);
        var isMine = myEm && String(t.email || '').toLowerCase() === myEm;
        if (k && !map[k] && (isOpt || isMine)) map[k] = normalizeTutor(t, t.id);
      });

      var out = Object.keys(map).map(function (k) { return map[k]; }).filter(function (t) {
        if (!t || !t.name) return false;
        var tid = String(t.id || '');
        var tem = String(t.email || '').toLowerCase();
        if ((tid && deletedTutors.indexOf(tid) > -1) || (tem && deletedTutors.indexOf(tem) > -1)) return false;
        return true;
      });
      out.sort(function (a, b) { return tutorTime(b) - tutorTime(a) || (+b.years || 0) - (+a.years || 0); });

      wr('modivs_tutors_db', out);
      wr('modivs_submitted_tutors', out);
      notifyTutors(out);
    }

    var lastSnap = null;
    function attach(colRef, isAll) {
      if (tutorsUnsub) { try { tutorsUnsub(); } catch (e) { } tutorsUnsub = null; }
      tutorsUnsub = colRef.onSnapshot(function (snapshot) {
        lastSnap = snapshot;
        buildOut(snapshot);
      }, function (err) {
        console.warn('Tutors snapshot listener notice, attempting fallback:', err);
        fetchTutorsFromApi();
        if (isAll) {
          attach(firestore.collection('tutors').where('status', '==', 'approved'), false);
        }
      });
    }

    function attachMine(em) {
      if (myTutorUnsub) { try { myTutorUnsub(); } catch (e) { } myTutorUnsub = null; }
      if (!em) return;
      myTutorUnsub = firestore.collection('tutors').where('email', '==', em).limit(1).onSnapshot(function (snap) {
        if (snap && !snap.empty) {
          var rawRemote = snap.docs[0].data() || {};
          var d = normalizeTutor(rawRemote, snap.docs[0].id);
          try {
            var cur = JSON.parse(localStorage.getItem('modivs_current_tutor') || 'null');
            if (cur && String(cur.email || '').toLowerCase() === em) {
              var hasLocalData = (cur.phone && cur.phone !== '—') || (cur.city && cur.city !== '—') || (cur.headline && cur.headline.indexOf('Account registered') !== 0);
              var merged = Object.assign({}, cur, d);
              if (d.status === 'incomplete' && (cur.status === 'pending' || cur.status === 'approved' || hasLocalData)) {
                merged.status = cur.status && cur.status !== 'incomplete' ? cur.status : 'pending';
              }
              if ((!d.phone || d.phone === '—') && cur.phone && cur.phone !== '—') merged.phone = cur.phone;
              if ((!d.city || d.city === '—') && cur.city && cur.city !== '—') merged.city = cur.city;
              if ((!d.photo || d.photo === '') && cur.photo) merged.photo = cur.photo;
              if ((!d.bio || d.bio === '') && cur.bio) merged.bio = cur.bio;
              if ((!d.headline || d.headline.indexOf('Account registered') === 0) && cur.headline && cur.headline.indexOf('Account registered') !== 0) merged.headline = cur.headline;
              if ((!d.levels || !d.levels.length) && cur.levels && cur.levels.length) {
                merged.levels = cur.levels;
                merged.classes = cur.levels;
              }
              if ((!d.fee || +d.fee === 0) && cur && (+cur.fee > 0 || +cur.rate > 0)) {
                merged.fee = cur.fee || cur.rate;
                merged.rate = cur.rate || ('₹' + cur.fee);
              }
              if ((!d.subs || !d.subs.length || (d.subs.length === 1 && d.subs[0] === 'General')) && cur.subs && cur.subs.length) {
                merged.subs = cur.subs;
                merged.subjects = cur.subs;
              }
              d = merged;
              localStorage.setItem('modivs_current_tutor', JSON.stringify(merged));
            } else if (!cur) {
              localStorage.setItem('modivs_current_tutor', JSON.stringify(d));
            }
          } catch (e) { }
          myTutorDoc = d;
          buildOut(lastSnap);
        }
      }, function () { });
    }

    function startWithAuth(user) {
      attach(firestore.collection('tutors'), true);
      var myEm = currentSignedInTutorEmail();
      if (myEm && user && !user.isAnonymous) attachMine(myEm);
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
    fetchLeadsFromApi();
    if (isLeadsListening) return;
    var firestore = db();
    if (!firestore) {
      setTimeout(initLeadsListener, 1000);
      return;
    }
    isLeadsListening = true;

    ensureAuth().then(function () {
      var col = firestore.collection('leads');
      col.onSnapshot(function (snapshot) {
        var deletedLeads = rd('modivs_deleted_leads');
        var map = {};

        // Overlay live Firestore documents (Firestore is Single Source of Truth)
        if (snapshot) {
          snapshot.forEach(function (doc) {
            var data = normalizeLead(doc.data() || {}, doc.id);
            var key = data.id || data.email || data.name;
            if (key) {
              map[key] = data;
            }
          });
        }

        // Retain uncommitted optimistic records created in the last 15 seconds
        rd('modivs_active_leads').forEach(function (l) {
          if (l && l._optimistic && (Date.now() - (l._optimisticTime || 0) < 15000)) {
            var k = l.id || l.email || l.name;
            if (k && !map[k]) map[k] = l;
          }
        });

        var out = Object.keys(map).map(function (k) { return map[k]; }).filter(function (l) {
          if (!l || !l.name) return false;
          if (l.status === 'closed' || l.status === 'rejected' || l.approval === 'rejected') return false;
          var apr = l.approval || (l.status === 'active' ? 'approved' : l.status);
          if (apr !== 'approved' || l.status === 'pending') return false;
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
        notifyLeads(out);
      }, function (err) {
        console.warn('Leads snapshot listener notice, attempting API fallback:', err);
        fetchLeadsFromApi();
      });
    });
  }

  // ==========================================
  // REAL-TIME STUDENTS SYNCHRONIZATION
  // ==========================================
  function initStudentsListener() {
    fetchStudentsFromApi();
    if (isStudentsListening) return;
    var firestore = db();
    if (!firestore) {
      setTimeout(initStudentsListener, 1000);
      return;
    }
    isStudentsListening = true;

    ensureAuth().then(function () {
      var col = firestore.collection('students');
      col.onSnapshot(function (snapshot) {
        var deletedLeads = rd('modivs_deleted_leads');
        var map = {};

        if (snapshot) {
          snapshot.forEach(function (doc) {
            var data = normalizeLead(doc.data() || {}, doc.id);
            var key = data.id || data.email;
            if (key) map[key] = data;
          });
        }

        // Merge leads that might represent student inquiries
        rd('modivs_active_leads').forEach(function (l) {
          if (!l) return;
          var k = l.id || l.email;
          if (k && !map[k]) map[k] = normalizeLead(l, l.id);
        });

        // Retain uncommitted optimistic records created in the last 15 seconds
        rd('modivs_students_db').forEach(function (s) {
          if (s && s._optimistic && (Date.now() - (s._optimisticTime || 0) < 15000)) {
            var k = s.id || s.email;
            if (k && !map[k]) map[k] = s;
          }
        });

        var out = Object.keys(map).map(function (k) { return map[k]; }).filter(function (s) {
          if (!s || !s.name) return false;
          var sid = String(s.id || '');
          var sem = String(s.email || '').toLowerCase();
          if ((sid && deletedLeads.indexOf(sid) > -1) || (sem && deletedLeads.indexOf(sem) > -1)) {
            return false;
          }
          return true;
        });

        out.sort(function (a, b) {
          return (new Date(b.registered_at || b.submitted_at || b.updatedAt || 0)) - (new Date(a.registered_at || a.submitted_at || a.updatedAt || 0));
        });

        wr('modivs_students_db', out);
        notifyStudents(out);
      }, function (err) {
        console.warn('Students snapshot listener notice, attempting API fallback:', err);
        fetchStudentsFromApi();
      });
    });
  }

  // ==========================================
  // REAL-TIME DELETED LEADS SYNCHRONIZATION
  // ==========================================
  var isDeletedLeadsListening = false;
  var deletedLeadsCallbacks = [];
  function onDeletedLeads(cb) {
    if (typeof cb === 'function') {
      deletedLeadsCallbacks.push(cb);
      var cur = rd('modivs_deleted_leads');
      if (cur && cur.length) {
        try { cb(cur); } catch (e) { }
      }
    }
  }

  function purgeDeletedLeadLocals(tomb) {
    if (!tomb || !tomb.length) return;
    function hit(x) {
      if (!x) return false;
      var sid = String(x.id || '');
      var sem = String(x.email || x.studentEmail || x.owner_email || '').toLowerCase().trim();
      return (sid && tomb.indexOf(sid) > -1) || (sem && tomb.indexOf(sem) > -1);
    }
    var act = rd('modivs_active_leads').filter(function (l) { return !hit(l); });
    wr('modivs_active_leads', act);
    notifyLeads(act);

    var st = rd('modivs_students_db').filter(function (s) { return !hit(s); });
    wr('modivs_students_db', st);
    notifyStudents(st);

    var dr = rd('modivs_demo_requests').filter(function (d) { return !hit(d); });
    wr('modivs_demo_requests', dr);

    var enq = rd('modivs_student_enquiries').filter(function (e) { return !hit(e); });
    wr('modivs_student_enquiries', enq);

    var sReq = rd('modivs_student_req', null);
    if (sReq && hit(sReq)) {
      try { localStorage.removeItem('modivs_student_req'); } catch (e) { }
    }
    deletedLeadsCallbacks.forEach(function (cb) {
      try { cb(tomb); } catch (e) { }
    });
  }

  function initDeletedLeadsListener() {
    if (isDeletedLeadsListening) return;
    var firestore = db();
    if (!firestore) {
      setTimeout(initDeletedLeadsListener, 1000);
      return;
    }
    isDeletedLeadsListening = true;
    ensureAuth().then(function () {
      firestore.collection('deleted_leads').onSnapshot(function (snapshot) {
        if (!snapshot) return;
        var tomb = rd('modivs_deleted_leads');
        var changed = false;
        snapshot.forEach(function (doc) {
          var d = doc.data() || {};
          var did = String(d.id || doc.id);
          var dem = d.email ? String(d.email).toLowerCase() : '';
          if (did && tomb.indexOf(did) < 0) { tomb.push(did); changed = true; }
          if (dem && tomb.indexOf(dem) < 0) { tomb.push(dem); changed = true; }
        });
        if (changed) {
          wr('modivs_deleted_leads', tomb);
          purgeDeletedLeadLocals(tomb);
        }
      }, function (err) {
        console.warn('Deleted leads listener notice:', err);
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
    if (!tutorData.status || tutorData.status === 'incomplete') tutorData.status = isAdminSession() ? 'approved' : 'pending';
    tutorData._optimistic = true;
    tutorData._optimisticTime = Date.now();
    tutorData.city = tutorData.city || (tutorData.location && tutorData.location.city) || '';
    tutorData.area = tutorData.area || (tutorData.location && tutorData.location.area) || '';
    tutorData.location = normalizeLocationObject(tutorData.location, tutorData.city, tutorData.area);

    // Allocate permanent display ID if missing
    if (window.ModivsIds && !tutorData.displayId && !tutorData.tutId && em) {
      var peeked = ModivsIds.peek ? ModivsIds.peek('tut', em) : '';
      if (peeked) {
        tutorData.displayId = peeked;
        tutorData.tutId = peeked;
      }
    }

    // Update local cache optimistically
    if (em && currentSignedInTutorEmail() === em) {
      myTutorDoc = Object.assign({}, myTutorDoc || {}, tutorData);
    }
    var tutors = rd('modivs_tutors_db');
    var idx = tutors.findIndex(function (x) { return x.id === tid || (x.email && em && String(x.email).toLowerCase() === em); });
    if (idx > -1) tutors[idx] = Object.assign({}, tutors[idx], tutorData);
    else tutors.unshift(tutorData);
    tutors.sort(function (a, b) { return tutorTime(b) - tutorTime(a) || (+b.years || 0) - (+a.years || 0); });
    wr('modivs_tutors_db', tutors);
    wr('modivs_submitted_tutors', tutors);
    notifyTutors(tutors);

    return ensureAuth().then(function (authU) {
      var firestore = db();
      var rawPayload = Object.assign({}, tutorData, {
        updatedAt: (window.firebase && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
      });
      delete rawPayload._optimistic;
      delete rawPayload._optimisticTime;
      var payload = cleanPayload(rawPayload);
      if (!isAdminSession()) {
        delete payload.rating;
        delete payload.reviewCount;
        delete payload.reviewsCount;
        delete payload.adminBadges;
        delete payload.customBadge;
        delete payload.ratingUpdatedBy;
        delete payload.ratingUpdatedAt;
      }

      if (!firestore) return tutorData;

      // Reuse existing Firestore doc ID for this email if one already exists (prevents duplicate tutor rows in Admin)
      var resolveId = em
        ? firestore.collection('tutors').where('email', '==', em).limit(1).get().then(function (snap) {
          if (snap && !snap.empty) {
            var existingData = snap.docs[0].data() || {};
            if (existingData.status === 'approved' && !isAdminSession() && tutorData.status !== 'pending') {
              payload.status = 'approved';
              tutorData.status = 'approved';
            }
            return snap.docs[0].id;
          }
          return tid;
        }).catch(function () { return tid; })
        : Promise.resolve(tid);

      return resolveId.then(function (targetId) {
        payload.id = targetId;
        tutorData.id = targetId;
        var writes = [firestore.collection('tutors').doc(targetId).set(payload, { merge: true })];

        var canWriteAccount = isAdminSession() || (authU && !authU.isAnonymous && (authU.email && String(authU.email).toLowerCase() === em));
        if (em && canWriteAccount) {
          writes.push(firestore.collection('accounts').doc(em).set(cleanPayload({
            email: em,
            role: 'tutor',
            roleName: 'Tutor',
            status: tutorData.status || 'pending',
            approval: tutorData.status || 'pending',
            name: tutorData.name || '',
            phone: tutorData.phone || '',
            city: tutorData.city || '',
            area: tutorData.area || '',
            subs: tutorData.subs || tutorData.subjects || [],
            location: tutorData.location || { city: tutorData.city || '', area: tutorData.area || '' },
            updatedAt: (window.firebase && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
          }), { merge: true }).catch(function () { }));

          var uid = tutorData.uid || (authU && authU.uid) || targetId;
          writes.push(firestore.collection('users').doc(uid).set(cleanPayload({
            email: em,
            role: 'Tutor',
            roleKey: 'tutor',
            name: tutorData.name || '',
            phone: tutorData.phone || '',
            location: tutorData.location || { city: tutorData.city || '', area: tutorData.area || '' },
            updatedAt: (window.firebase && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
          }), { merge: true }).catch(function () { }));
        }

        return Promise.all(writes).then(function () {
          return tutorData;
        }).catch(function (directErr) {
          console.warn('Direct Firestore saveTutor rejected, attempting server API fallback...', directErr);
          return getAuthHeader().then(function (headers) {
            headers['Content-Type'] = 'application/json';
            headers['X-Requested-With'] = 'XMLHttpRequest';
            return fetch('/api/tutors', {
              method: 'POST',
              headers: headers,
              credentials: 'include',
              body: JSON.stringify(cleanPayload(Object.assign({}, payload, { create: true, tutorEmail: em, status: tutorData.status || 'pending' })))
            }).then(function (res) {
              if (!res.ok) console.warn('API /api/tutors fallback response status:', res.status);
              return tutorData;
            }).catch(function (apiErr) {
              console.warn('API /api/tutors fallback error:', apiErr);
              return tutorData;
            });
          });
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

      // 6. Invoke server-side deletion API
      return getAuthHeader().then(function (headers) {
        headers['Content-Type'] = 'application/json';
        headers['X-Requested-With'] = 'XMLHttpRequest';
        return fetch('/api/tutors', {
          method: 'DELETE',
          headers: headers,
          body: JSON.stringify({ id: id, email: em })
        }).catch(function () { });
      });
    });
  }

  function saveLead(leadData) {
    if (!leadData) return Promise.reject(new Error('No lead data provided'));
    var lid = sanitizeId(leadData.id || ('adm_' + Date.now()));
    leadData.id = lid;
    if (!leadData.status) leadData.status = 'active';
    if (!leadData.approval) leadData.approval = 'pending';
    leadData._optimistic = true;
    leadData._optimisticTime = Date.now();
    leadData.city = leadData.city || (leadData.location && leadData.location.city) || '';
    leadData.area = leadData.area || (leadData.location && leadData.location.area) || '';
    leadData.location = normalizeLocationObject(leadData.location, leadData.city, leadData.area);

    // Allocate permanent display ID if missing
    if (window.ModivsIds && !leadData.displayId && !leadData.leadId) {
      var peekedLd = ModivsIds.peek ? ModivsIds.peek('ld', lid) : '';
      if (peekedLd) leadData.displayId = peekedLd;
    }

    // Update local cache optimistically (only approved leads belong on active leads board)
    var isApproved = leadData.approval === 'approved' || (leadData.status === 'active' && leadData.approval !== 'pending' && leadData.status !== 'pending');
    if (isApproved) {
      var leads = rd('modivs_active_leads');
      var idx = leads.findIndex(function (x) { return x.id === lid || (x.email && leadData.email && x.email.toLowerCase() === leadData.email.toLowerCase()); });
      if (idx > -1) leads[idx] = Object.assign({}, leads[idx], leadData);
      else leads.unshift(leadData);
      wr('modivs_active_leads', leads);
      notifyLeads(leads);
    }

    // Also update student db if it represents a student enquiry
    var students = rd('modivs_students_db');
    var sIdx = students.findIndex(function (x) { return x.id === lid || (x.email && leadData.email && String(x.email).toLowerCase() === String(leadData.email).toLowerCase()); });
    if (sIdx > -1) students[sIdx] = Object.assign({}, students[sIdx], leadData);
    else students.unshift(leadData);
    wr('modivs_students_db', students);
    notifyStudents(students);

    return ensureAuth().then(function () {
      var firestore = db();
      var rawPayload = Object.assign({}, leadData, {
        updatedAt: (window.firebase && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
      });
      delete rawPayload._optimistic;
      delete rawPayload._optimisticTime;
      var payload = cleanPayload(rawPayload);

      if (!firestore) return leadData;

      function fallbackLeadsApi(p, ld, err) {
        return getAuthHeader().then(function (headers) {
          headers['Content-Type'] = 'application/json';
          headers['X-Requested-With'] = 'XMLHttpRequest';
          return fetch('/api/leads', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(cleanPayload(p))
          }).then(function (res) {
            if (!res.ok) console.warn('API /api/leads fallback response status:', res.status);
            return ld;
          }).catch(function (apiErr) {
            console.warn('API /api/leads fallback error:', apiErr);
            throw (err || apiErr);
          });
        });
      }

      var writes = [];
      try {
        writes.push(firestore.collection('leads').doc(lid).set(payload, { merge: true }));
        writes.push(firestore.collection('students').doc(lid).set(payload, { merge: true }));
      } catch (syncErr) {
        console.warn('Direct Firestore saveLead threw synchronously:', syncErr);
        return fallbackLeadsApi(payload, leadData, syncErr);
      }

      return Promise.all(writes).then(function () {
        return leadData;
      }).catch(function (directErr) {
        console.warn('Direct Firestore saveLead rejected, attempting server API fallback...', directErr);
        return fallbackLeadsApi(payload, leadData, directErr);
      });
    });
  }

  function deleteLead(leadId, email) {
    var id = sanitizeId(leadId);
    var em = String(email || '').toLowerCase();

    function hit(x) { return x && ((id && String(x.id) === id) || (em && String(x.email || x.studentEmail || '').toLowerCase() === em)); }
    var a = rd('modivs_active_leads').filter(function (x) { return !hit(x); });
    wr('modivs_active_leads', a);
    var st = rd('modivs_students_db').filter(function (x) { return !hit(x); });
    wr('modivs_students_db', st);
    var dr = rd('modivs_demo_requests').filter(function (d) { return !hit(d); });
    wr('modivs_demo_requests', dr);
    var se = rd('modivs_student_enquiries').filter(function (e) { return !hit(e); });
    wr('modivs_student_enquiries', se);
    var sReq = rd('modivs_student_req', null);
    if (sReq && hit(sReq)) {
      try { localStorage.removeItem('modivs_student_req'); } catch (e) { }
    }

    var tb = rd('modivs_deleted_leads');
    if (id && tb.indexOf(id) < 0) tb.push(id);
    if (em && tb.indexOf(em) < 0) tb.push(em);
    wr('modivs_deleted_leads', tb);

    var ts = rd('modivs_deleted_students');
    if (id && ts.indexOf(id) < 0) ts.push(id);
    if (em && ts.indexOf(em) < 0) ts.push(em);
    wr('modivs_deleted_students', ts);

    notifyLeads(a);
    notifyStudents(st);
    deletedLeadsCallbacks.forEach(function (cb) {
      try { cb(tb); } catch (e) { }
    });

    return ensureAuth().then(function () {
      var firestore = db();
      if (firestore) {
        var sStamp = (window.firebase && firebase.firestore && firebase.firestore.FieldValue) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString();
        if (id) {
          firestore.collection('leads').doc(id).delete().catch(function () { });
          firestore.collection('students').doc(id).delete().catch(function () { });
          firestore.collection('demoRequests').doc(id).delete().catch(function () { });
          firestore.collection('deleted_leads').doc(id).set({ id: id, email: em || '', deletedAt: sStamp }, { merge: true }).catch(function () { });
        }
        if (em) {
          firestore.collection('deleted_leads').doc('em_' + em.replace(/[^a-z0-9]/gi, '_')).set({ id: id || '', email: em, deletedAt: sStamp }, { merge: true }).catch(function () { });
          firestore.collection('leads').where('email', '==', em).get().then(function (snap) {
            snap.forEach(function (d) { d.ref.delete().catch(function () { }); });
          }).catch(function () { });
          firestore.collection('students').where('email', '==', em).get().then(function (snap) {
            snap.forEach(function (d) { d.ref.delete().catch(function () { }); });
          }).catch(function () { });
          firestore.collection('demoRequests').where('email', '==', em).get().then(function (snap) {
            snap.forEach(function (d) { d.ref.delete().catch(function () { }); });
          }).catch(function () { });
        }
      }

      return getAuthHeader().then(function (headers) {
        headers['Content-Type'] = 'application/json';
        headers['X-Requested-With'] = 'XMLHttpRequest';
        return Promise.all([
          fetch('/api/leads', { method: 'DELETE', headers: headers, body: JSON.stringify({ id: id, email: em }) }).catch(function () { }),
          fetch('/api/students', { method: 'DELETE', headers: headers, body: JSON.stringify({ id: id, email: em }) }).catch(function () { })
        ]);
      });
    });
  }

  function saveStudent(studentData) {
    if (!studentData) return Promise.reject(new Error('No student data provided'));
    var em = String(studentData.email || '').trim().toLowerCase();
    if (em) studentData.email = em;
    var sid = sanitizeId(studentData.id || ('s_user_' + (em ? em.replace(/[^a-z0-9]/gi, '_') : Date.now())));
    studentData.id = sid;
    if (!studentData.status) studentData.status = 'active';
    if (!studentData.approval) studentData.approval = 'pending';
    studentData._optimistic = true;
    studentData._optimisticTime = Date.now();
    studentData.city = studentData.city || (studentData.location && studentData.location.city) || '';
    studentData.area = studentData.area || (studentData.location && studentData.location.area) || '';
    studentData.location = normalizeLocationObject(studentData.location, studentData.city, studentData.area);

    if (window.ModivsIds && !studentData.displayId && !studentData.studentId && sid) {
      var peeked = ModivsIds.peek ? ModivsIds.peek('stu', sid) : '';
      if (peeked) {
        studentData.displayId = peeked;
        studentData.studentId = peeked;
      }
    }

    var students = rd('modivs_students_db');
    var idx = students.findIndex(function (x) { return x.id === sid || (x.email && em && String(x.email).toLowerCase() === em); });
    if (idx > -1) students[idx] = Object.assign({}, students[idx], studentData);
    else students.unshift(studentData);
    wr('modivs_students_db', students);
    notifyStudents(students);

    return ensureAuth().then(function (authU) {
      var firestore = db();
      var rawPayload = Object.assign({}, studentData, {
        updatedAt: (window.firebase && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
      });
      delete rawPayload._optimistic;
      delete rawPayload._optimisticTime;
      var payload = cleanPayload(rawPayload);

      if (!firestore) return studentData;

      var resolveId = (studentData.requirementId || String(sid).startsWith('enq_') || String(sid).startsWith('adm_') || String(sid).startsWith('ld_'))
        ? Promise.resolve(sid)
        : (em
          ? firestore.collection('students').where('email', '==', em).limit(1).get().then(function (snap) {
            return (snap && !snap.empty) ? snap.docs[0].id : sid;
          }).catch(function () { return sid; })
          : Promise.resolve(sid));

      return resolveId.then(function (targetId) {
        payload.id = targetId;
        studentData.id = targetId;
        var writes = [
          firestore.collection('students').doc(targetId).set(payload, { merge: true }),
          firestore.collection('leads').doc(targetId).set(payload, { merge: true })
        ];

        var canWriteAccount = isAdminSession() || (authU && !authU.isAnonymous && (authU.email && String(authU.email).toLowerCase() === em));
        if (em && canWriteAccount) {
          writes.push(firestore.collection('accounts').doc(em).set(cleanPayload({
            email: em,
            role: 'student',
            roleName: 'Student',
            name: studentData.name || studentData.studentName || studentData.parentName || '',
            phone: studentData.phone || '',
            city: studentData.city || '',
            area: studentData.area || '',
            location: studentData.location || { city: studentData.city || '', area: studentData.area || '' },
            updatedAt: (window.firebase && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
          }), { merge: true }).catch(function () { }));

          var uid = studentData.uid || (authU && authU.uid) || targetId;
          writes.push(firestore.collection('users').doc(uid).set(cleanPayload({
            email: em,
            role: 'Student',
            roleKey: 'student',
            name: studentData.name || studentData.studentName || studentData.parentName || '',
            phone: studentData.phone || '',
            location: studentData.location || { city: studentData.city || '', area: studentData.area || '' },
            updatedAt: (window.firebase && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
          }), { merge: true }).catch(function () { }));
        }

        return Promise.all(writes).then(function () {
          return studentData;
        }).catch(function (directErr) {
          console.warn('Direct Firestore saveStudent rejected, attempting server API fallback...', directErr);
          return getAuthHeader().then(function (headers) {
            headers['Content-Type'] = 'application/json';
            headers['X-Requested-With'] = 'XMLHttpRequest';
            return fetch('/api/students', {
              method: 'POST',
              headers: headers,
              credentials: 'include',
              body: JSON.stringify(cleanPayload(payload))
            }).then(function (res) {
              if (!res.ok) console.warn('API /api/students fallback response status:', res.status);
              return studentData;
            }).catch(function (apiErr) {
              console.warn('API /api/students fallback error:', apiErr);
              return studentData;
            });
          });
        });
      });
    });
  }

  function deleteStudent(studentId, email) {
    var id = sanitizeId(studentId);
    var em = String(email || '').trim().toLowerCase();

    function hit(x) { return x && ((id && String(x.id) === id) || (em && String(x.email || x.studentEmail || '').toLowerCase() === em)); }
    var a = rd('modivs_students_db').filter(function (x) { return !hit(x); });
    wr('modivs_students_db', a);
    var actLeads = rd('modivs_active_leads').filter(function (x) { return !hit(x); });
    wr('modivs_active_leads', actLeads);
    var dr = rd('modivs_demo_requests').filter(function (d) { return !hit(d); });
    wr('modivs_demo_requests', dr);
    var se = rd('modivs_student_enquiries').filter(function (e) { return !hit(e); });
    wr('modivs_student_enquiries', se);
    var sReq = rd('modivs_student_req', null);
    if (sReq && hit(sReq)) {
      try { localStorage.removeItem('modivs_student_req'); } catch (e) { }
    }

    var tb = rd('modivs_deleted_students');
    if (id && tb.indexOf(id) < 0) tb.push(id);
    if (em && tb.indexOf(em) < 0) tb.push(em);
    wr('modivs_deleted_students', tb);

    var tbl = rd('modivs_deleted_leads');
    if (id && tbl.indexOf(id) < 0) tbl.push(id);
    if (em && tbl.indexOf(em) < 0) tbl.push(em);
    wr('modivs_deleted_leads', tbl);

    notifyStudents(a);
    notifyLeads(actLeads);
    deletedLeadsCallbacks.forEach(function (cb) {
      try { cb(tbl); } catch (e) { }
    });

    return ensureAuth().then(function () {
      var firestore = db();
      if (firestore) {
        var sStamp = (window.firebase && firebase.firestore && firebase.firestore.FieldValue) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString();
        if (id) {
          firestore.collection('students').doc(id).delete().catch(function () { });
          firestore.collection('leads').doc(id).delete().catch(function () { });
          firestore.collection('demoRequests').doc(id).delete().catch(function () { });
          firestore.collection('deleted_leads').doc(id).set({ id: id, email: em || '', deletedAt: sStamp }, { merge: true }).catch(function () { });
        }
        if (em) {
          firestore.collection('deleted_leads').doc('em_' + em.replace(/[^a-z0-9]/gi, '_')).set({ id: id || '', email: em, deletedAt: sStamp }, { merge: true }).catch(function () { });
          firestore.collection('students').where('email', '==', em).get().then(function (snap) {
            snap.forEach(function (d) { d.ref.delete().catch(function () { }); });
          }).catch(function () { });
          firestore.collection('leads').where('email', '==', em).get().then(function (snap) {
            snap.forEach(function (d) { d.ref.delete().catch(function () { }); });
          }).catch(function () { });
          firestore.collection('demoRequests').where('email', '==', em).get().then(function (snap) {
            snap.forEach(function (d) { d.ref.delete().catch(function () { }); });
          }).catch(function () { });
        }
      }
      return getAuthHeader().then(function (headers) {
        headers['Content-Type'] = 'application/json';
        headers['X-Requested-With'] = 'XMLHttpRequest';
        return Promise.all([
          fetch('/api/students', {
            method: 'DELETE',
            headers: headers,
            body: JSON.stringify({ id: id, email: em })
          }).catch(function () { }),
          fetch('/api/leads', {
            method: 'DELETE',
            headers: headers,
            body: JSON.stringify({ id: id, email: em })
          }).catch(function () { })
        ]);
      });
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
    fetchTutorsFromApi();
    initTutorsListener();
  }

  function onLeads(callback) {
    if (typeof callback !== 'function') return;
    leadsListeners.push(callback);
    var cached = rd('modivs_active_leads');
    if (cached.length) callback(cached);
    fetchLeadsFromApi();
    initLeadsListener();
  }

  function onStudents(callback) {
    if (typeof callback !== 'function') return;
    studentsListeners.push(callback);
    var cached = rd('modivs_students_db');
    if (cached.length) callback(cached);
    fetchStudentsFromApi();
    initStudentsListener();
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
        try { notifyStudents(JSON.parse(e.newValue)); } catch (err) { }
      }
    });

    // Auto-initialize listeners on page load
    setTimeout(function () {
      fetchTutorsFromApi();
      fetchLeadsFromApi();
      fetchStudentsFromApi();
      ensureAuth().then(function () {
        initTutorsListener();
        initLeadsListener();
        initStudentsListener();
        initDeletedLeadsListener();
      });
    }, 50);
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
          var hasLocalData = (local && local.phone && local.phone !== "—") || (full && full.phone && full.phone !== "—") ||
                             (local && local.city && local.city !== "—") || (full && full.city && full.city !== "—") ||
                             (local && local.headline && local.headline.indexOf("Account registered") !== 0) ||
                             (full && full.headline && full.headline.indexOf("Account registered") !== 0);

          if (remote.status === "incomplete" && ((local && local.status && local.status !== "incomplete") || (full && full.status && full.status !== "incomplete") || hasLocalData)) {
            var upgraded = Object.assign({}, remote, local || {}, full || {}, { id: doc.id, email: em, uid: remote.uid || u.uid, status: "pending" });
            return saveTutor(upgraded).then(function () { try { sessionStorage.setItem(flag, "1"); } catch (e) { } return "synced"; });
          }

          // Otherwise keep local cache and MY_TUTOR in sync with Firestore without letting empty remote fields erase filled local fields
          var merged = Object.assign({}, full || {}, local || {});
          Object.keys(remote).forEach(function(k){
            var rVal = remote[k];
            if (rVal != null && rVal !== "" && rVal !== "—" && rVal !== "Profile setup pending") {
              if (Array.isArray(rVal) && (!rVal.length || (rVal.length === 1 && rVal[0] === "General"))) {
                return;
              }
              merged[k] = rVal;
            }
          });
          if (remote.status === "approved" || remote.status === "rejected") {
            merged.status = remote.status;
          } else if ((full && full.status === "pending") || (local && local.status === "pending")) {
            merged.status = "pending";
          } else if (merged.status === "incomplete") {
            var hasData = (merged.phone && merged.phone !== '—') && (merged.city && merged.city !== '—') && (merged.subs && merged.subs.length > 0 && merged.subs[0] !== 'General');
            if (hasData) merged.status = "pending";
          }
          if (merged.status === "pending" && remote.status === "incomplete") {
            saveTutor(merged).catch(function () { });
          }
          myTutorDoc = merged;
          var list = rd("modivs_tutors_db"), li = list.findIndex(function (t) { return String(t && t.email || "").toLowerCase() === em; });
          if (li > -1) list[li] = Object.assign({}, list[li], merged); else list.unshift(merged);
          wr("modivs_tutors_db", list);
          wr("modivs_submitted_tutors", list);
          try { localStorage.setItem("modivs_current_tutor", JSON.stringify(merged)); } catch (e) { }
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
    onDeletedLeads: onDeletedLeads,
    saveTutor: saveTutor,
    ensureTutorProfile: ensureTutorProfile,
    deleteTutor: deleteTutor,
    saveLead: saveLead,
    deleteLead: deleteLead,
    saveStudent: saveStudent,
    deleteStudent: deleteStudent,
    fetchTutorsFromApi: fetchTutorsFromApi,
    fetchLeadsFromApi: fetchLeadsFromApi,
    fetchStudentsFromApi: fetchStudentsFromApi,
    initStudentsListener: initStudentsListener,
    initLeadsListener: initLeadsListener,
    initDeletedLeadsListener: initDeletedLeadsListener,
    initTutorsListener: initTutorsListener,
    syncAll: syncAll,
    tutorTime: tutorTime,
    // Unlock system
    isLeadUnlocked: isLeadUnlocked,
    saveUnlock: saveUnlock,
    onUnlocks: onUnlocks,
    onAllUnlocks: onAllUnlocks,
    onAllCoinTransactions: onAllCoinTransactions,
    onAllMembershipHistory: onAllMembershipHistory,
    cleanPayload: cleanPayload,
    normalizeLead: normalizeLead,
    updateLeadStatus: updateLeadStatus
  };
})();
