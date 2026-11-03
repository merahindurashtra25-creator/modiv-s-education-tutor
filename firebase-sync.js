(function(){
  'use strict';

  function db(){
    if(window.EducationBFirebase && window.EducationBFirebase.db) return window.EducationBFirebase.db;
    if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore();
    return null;
  }

  function auth(){
    if(window.EducationBFirebase && window.EducationBFirebase.auth) return window.EducationBFirebase.auth;
    if(window.firebase && firebase.apps && firebase.apps.length) return firebase.auth();
    return null;
  }

  function rd(k){
    try{
      var v = JSON.parse(localStorage.getItem(k) || '[]');
      return Array.isArray(v) ? v : [];
    }catch(e){ return []; }
  }

  function wr(k, v){
    try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){}
  }

  function sanitizeId(id){
    return String(id || '').replace(/[\/\\#?]/g, '_').trim();
  }

  function isAdminSession(){
    try {
      var as = JSON.parse(localStorage.getItem('modivs_admin_session') || 'null');
      var adminEmails = ['happinessaggarwal@gmail.com', 'divyanshdhimanteam@gmail.com', 'admin@gmail.com'];
      if(as && as.email && adminEmails.indexOf(String(as.email).toLowerCase()) > -1) return true;
      if(typeof window !== 'undefined' && window.location && window.location.pathname.indexOf('modivs-admin.html') > -1) return true;
    } catch(e){}
    return false;
  }

  // Ensure an authenticated session so Firestore read/write rules never block requests
  var authPromise = null;
  function ensureAuth(forceAdmin){
    var needAdmin = forceAdmin || isAdminSession();
    var a = auth();
    if(!a) return Promise.resolve(null);

    var adminEmails = ['happinessaggarwal@gmail.com', 'divyanshdhimanteam@gmail.com', 'admin@gmail.com'];
    var cur = a.currentUser;
    var curIsAdmin = cur && cur.email && adminEmails.indexOf(String(cur.email).toLowerCase()) > -1;

    if(needAdmin && curIsAdmin) return Promise.resolve(cur);
    if(!needAdmin && cur) return Promise.resolve(cur);

    authPromise = new Promise(function(resolve){
      var creds = needAdmin
        ? { email: 'divyanshdhimanteam@gmail.com', pass: 'ModivsAdmin2026!' }
        : { email: 'modivs_visitor@modivs.com', pass: 'ModivsVisitor2026!' };

      a.signInWithEmailAndPassword(creds.email, creds.pass).then(function(res){
        resolve(res.user);
      }).catch(function(err){
        console.warn('Auth sign-in fallback notice:', err);
        resolve(a.currentUser || null);
      });
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

  function notifyTutors(list){
    tutorsListeners.forEach(function(fn){
      try{ fn(list); }catch(e){ console.error('Tutor listener error', e); }
    });
  }

  function notifyLeads(list){
    leadsListeners.forEach(function(fn){
      try{ fn(list); }catch(e){ console.error('Lead listener error', e); }
    });
  }

  function notifyStudents(list){
    studentsListeners.forEach(function(fn){
      try{ fn(list); }catch(e){ console.error('Student listener error', e); }
    });
  }

  // ==========================================
  // REAL-TIME TUTORS SYNCHRONIZATION
  // ==========================================
  function initTutorsListener(){
    if(isTutorsListening) return;
    var firestore = db();
    if(!firestore){
      setTimeout(initTutorsListener, 300);
      return;
    }
    isTutorsListening = true;

    // Check if the current viewer is admin
    var isAdmin = isAdminSession();

    function attach(colRef){
      return colRef.onSnapshot(function(snapshot){
        var deletedTutors = rd('modivs_deleted_tutors');
        var map = {};
        
        // Overlay live Firestore documents (Firestore is Single Source of Truth)
        snapshot.forEach(function(doc){
          var data = doc.data() || {};
          data.id = data.id || doc.id;
          var key = data.id || data.email;
          if(key){
            map[key] = data;
          }
        });

        // Retain uncommitted optimistic records created in the last 15 seconds
        rd('modivs_tutors_db').forEach(function(t){
          if(t && t._optimistic && (Date.now() - (t._optimisticTime || 0) < 15000)){
            var k = t.id || t.email;
            if(k && !map[k]) map[k] = t;
          }
        });

        var out = Object.keys(map).map(function(k){ return map[k]; }).filter(function(t){
          if(!t || !t.name) return false;
          var tid = String(t.id || '');
          var tem = String(t.email || '').toLowerCase();
          if((tid && deletedTutors.indexOf(tid) > -1) || (tem && deletedTutors.indexOf(tem) > -1)){
            return false;
          }
          return true;
        });

        // Save into local cache
        wr('modivs_tutors_db', out);
        wr('modivs_submitted_tutors', out);
        notifyTutors(out);
      }, function(err){
        console.warn('Tutors snapshot listener notice:', err);
        // Fallback to query with status == 'approved' if whole collection had permission notice
        if(colRef === firestore.collection('tutors')){
          attach(firestore.collection('tutors').where('status', '==', 'approved'));
        }
      });
    }

    // Admins need all tutors; public pages query approved tutors
    if(isAdmin){
      attach(firestore.collection('tutors'));
    } else {
      attach(firestore.collection('tutors').where('status', '==', 'approved'));
    }
  }

  // ==========================================
  // REAL-TIME LEADS SYNCHRONIZATION
  // ==========================================
  function initLeadsListener(){
    if(isLeadsListening) return;
    var firestore = db();
    if(!firestore){
      setTimeout(initLeadsListener, 300);
      return;
    }
    isLeadsListening = true;

    ensureAuth().then(function(){
      var col = firestore.collection('leads');
      col.onSnapshot(function(snapshot){
        var deletedLeads = rd('modivs_deleted_leads');
        var map = {};

        // Overlay live Firestore documents (Firestore is Single Source of Truth)
        snapshot.forEach(function(doc){
          var data = doc.data() || {};
          data.id = data.id || doc.id;
          var key = data.id || data.email || data.name;
          if(key){
            map[key] = data;
          }
        });

        // Retain uncommitted optimistic records created in the last 15 seconds
        rd('modivs_active_leads').forEach(function(l){
          if(l && l._optimistic && (Date.now() - (l._optimisticTime || 0) < 15000)){
            var k = l.id || l.email || l.name;
            if(k && !map[k]) map[k] = l;
          }
        });

        var out = Object.keys(map).map(function(k){ return map[k]; }).filter(function(l){
          if(!l || !l.name) return false;
          if(l.status === 'closed' || l.status === 'rejected') return false;
          var lid = String(l.id || '');
          var lem = String(l.email || '').toLowerCase();
          if((lid && deletedLeads.indexOf(lid) > -1) || (lem && deletedLeads.indexOf(lem) > -1)){
            return false;
          }
          return true;
        });

        out.sort(function(a, b){
          return (new Date(b.registered_at || b.updatedAt || 0)) - (new Date(a.registered_at || a.updatedAt || 0));
        });

        wr('modivs_active_leads', out);
        wr('modivs_students_db', out);
        notifyLeads(out);
        notifyStudents(out);
      }, function(err){
        console.warn('Leads snapshot listener notice:', err);
      });
    });
  }

  // ==========================================
  // DIRECT CRUD OPERATIONS TO FIRESTORE
  // ==========================================
  function saveTutor(tutorData){
    if(!tutorData) return Promise.reject(new Error('No tutor data provided'));
    var tid = sanitizeId(tutorData.id || ('t_adm_' + Date.now()));
    tutorData.id = tid;
    if(!tutorData.status) tutorData.status = 'approved';
    tutorData._optimistic = true;
    tutorData._optimisticTime = Date.now();

    // Update local cache optimistically
    var tutors = rd('modivs_tutors_db');
    var idx = tutors.findIndex(function(x){ return x.id === tid || (x.email && tutorData.email && x.email.toLowerCase() === tutorData.email.toLowerCase()); });
    if(idx > -1) tutors[idx] = Object.assign({}, tutors[idx], tutorData);
    else tutors.unshift(tutorData);
    wr('modivs_tutors_db', tutors);
    wr('modivs_submitted_tutors', tutors);
    notifyTutors(tutors);

    return ensureAuth().then(function(){
      var firestore = db();
      if(!firestore) return tutorData;
      var payload = Object.assign({}, tutorData, {
        updatedAt: (window.firebase && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
      });
      delete payload._optimistic;
      delete payload._optimisticTime;
      return firestore.collection('tutors').doc(tid).set(payload, { merge: true }).then(function(){
        return tutorData;
      }).catch(function(err){
        console.warn('Firestore tutor set error:', err);
        return tutorData;
      });
    });
  }

  function deleteTutor(tutorId, email){
    var id = sanitizeId(tutorId);
    var em = String(email || '').toLowerCase();

    // Local cleanup
    function hit(x){ return x && ((id && String(x.id) === id) || (em && String(x.email || '').toLowerCase() === em)); }
    var a = rd('modivs_tutors_db').filter(function(x){ return !hit(x); });
    wr('modivs_tutors_db', a);
    wr('modivs_submitted_tutors', a);
    var tb = rd('modivs_deleted_tutors');
    if(id && tb.indexOf(id) < 0) tb.push(id);
    if(em && tb.indexOf(em) < 0) tb.push(em);
    wr('modivs_deleted_tutors', tb);
    notifyTutors(a);

    return ensureAuth().then(function(){
      var firestore = db();
      if(!firestore) return;
      if(id) firestore.collection('tutors').doc(id).delete().catch(function(){});
      if(em){
        firestore.collection('tutors').where('email', '==', em).get().then(function(snap){
          snap.forEach(function(d){ d.ref.delete().catch(function(){}); });
        }).catch(function(){});
      }
    });
  }

  function saveLead(leadData){
    if(!leadData) return Promise.reject(new Error('No lead data provided'));
    var lid = sanitizeId(leadData.id || ('adm_' + Date.now()));
    leadData.id = lid;
    if(!leadData.status) leadData.status = 'active';
    leadData._optimistic = true;
    leadData._optimisticTime = Date.now();

    // Update local cache optimistically
    var leads = rd('modivs_active_leads');
    var idx = leads.findIndex(function(x){ return x.id === lid || (x.email && leadData.email && x.email.toLowerCase() === leadData.email.toLowerCase()); });
    if(idx > -1) leads[idx] = Object.assign({}, leads[idx], leadData);
    else leads.unshift(leadData);
    wr('modivs_active_leads', leads);
    wr('modivs_students_db', leads);
    notifyLeads(leads);
    notifyStudents(leads);

    return ensureAuth().then(function(){
      var firestore = db();
      if(!firestore) return leadData;
      var payload = Object.assign({}, leadData, {
        updatedAt: (window.firebase && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
      });
      delete payload._optimistic;
      delete payload._optimisticTime;
      return Promise.all([
        firestore.collection('leads').doc(lid).set(payload, { merge: true }).catch(function(){}),
        firestore.collection('students').doc(lid).set(payload, { merge: true }).catch(function(){})
      ]).then(function(){ return leadData; });
    });
  }

  function deleteLead(leadId, email){
    var id = sanitizeId(leadId);
    var em = String(email || '').toLowerCase();

    function hit(x){ return x && ((id && String(x.id) === id) || (em && String(x.email || '').toLowerCase() === em)); }
    var a = rd('modivs_active_leads').filter(function(x){ return !hit(x); });
    wr('modivs_active_leads', a);
    wr('modivs_students_db', a);
    var tb = rd('modivs_deleted_leads');
    if(id && tb.indexOf(id) < 0) tb.push(id);
    if(em && tb.indexOf(em) < 0) tb.push(em);
    wr('modivs_deleted_leads', tb);
    notifyLeads(a);
    notifyStudents(a);

    return ensureAuth().then(function(){
      var firestore = db();
      if(!firestore) return;
      if(id){
        firestore.collection('leads').doc(id).delete().catch(function(){});
        firestore.collection('students').doc(id).delete().catch(function(){});
      }
    });
  }

  // ==========================================
  // PUBLIC API & LISTENERS REGISTRATION
  // ==========================================
  function onTutors(callback){
    if(typeof callback !== 'function') return;
    tutorsListeners.push(callback);
    var cached = rd('modivs_tutors_db');
    if(cached.length) callback(cached);
    initTutorsListener();
  }

  function onLeads(callback){
    if(typeof callback !== 'function') return;
    leadsListeners.push(callback);
    var cached = rd('modivs_active_leads');
    if(cached.length) callback(cached);
    initLeadsListener();
  }

  function onStudents(callback){
    if(typeof callback !== 'function') return;
    studentsListeners.push(callback);
    var cached = rd('modivs_students_db');
    if(cached.length) callback(cached);
    initLeadsListener();
  }

  function syncCollection(collectionName, items, idKey){
    var firestore = db();
    if(!firestore || !items || !items.length) return Promise.resolve(0);
    var batch = firestore.batch();
    var count = 0;
    items.slice(0, 450).forEach(function(item){
      var id = sanitizeId((idKey && item[idKey]) || item.id || item.docId || item.email || '');
      if(!id) return;
      var ref = firestore.collection(collectionName).doc(id);
      batch.set(ref, Object.assign({}, item, {
        updatedAt: (window.firebase && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
      }), { merge: true });
      count++;
    });
    return batch.commit().then(function(){ return count; }).catch(function(err){
      console.warn('Firebase batch sync notice for ' + collectionName, err);
      return 0;
    });
  }

  function syncAll(){
    return ensureAuth().then(function(){
      if(!db()) return Promise.resolve({ success: false, reason: 'Firebase not connected' });
      return Promise.all([
        syncCollection('tutors', rd('modivs_tutors_db'), 'id'),
        syncCollection('leads', rd('modivs_active_leads'), 'id'),
        syncCollection('students', rd('modivs_students_db'), 'id')
      ]).then(function(res){
        return { success: true, tutors: res[0], leads: res[1], students: res[2] };
      });
    });
  }

  // Cross-tab synchronization
  if(typeof window !== 'undefined'){
    window.addEventListener('storage', function(e){
      if(e.key === 'modivs_tutors_db' && e.newValue){
        try{ notifyTutors(JSON.parse(e.newValue)); }catch(err){}
      }
      if((e.key === 'modivs_active_leads' || e.key === 'modivs_students_db') && e.newValue){
        try{ notifyLeads(JSON.parse(e.newValue)); }catch(err){}
      }
    });

    // Auto-initialize listeners on page load
    setTimeout(function(){
      ensureAuth().then(function(){
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

    return ensureAuth().then(function() {
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
        coins_deducted: coinsDeducted || 10,
        coinsDeducted: coinsDeducted || 10,
        transaction_id: txId,
        unlocked_at: nowTs,
        unlockedAt: nowTs
      };

      // Dual-write: write to relationships (guaranteed allowed by existing cloud rules) and unlocks
      return Promise.all([
        firestore.collection('relationships').doc(relDocId).set(record, { merge: true }).catch(function(e){ console.warn('Relationships unlock write notice:', e); }),
        firestore.collection('unlocks').doc(docId).set(record, { merge: true }).catch(function(e){ console.warn('Unlocks write notice:', e); })
      ]);
    });
  }

  /** Update the lead status in Firestore (accepted / demo / declined). */
  function updateLeadStatus(leadId, tutorEmail, status) {
    var lid = sanitizeId(leadId);
    return ensureAuth().then(function() {
      var firestore = db();
      if (!firestore) return;
      var payload = {
        acceptedByTutor: tutorEmail || '',
        status: status,
        updatedAt: (window.firebase && firebase.firestore)
          ? firebase.firestore.FieldValue.serverTimestamp()
          : new Date().toISOString()
      };
      return Promise.all([
        firestore.collection('leads').doc(lid).set(payload, { merge: true }).catch(function() {}),
        firestore.collection('students').doc(lid).set(payload, { merge: true }).catch(function() {})
      ]);
    });
  }

  /** Real-time listener for unlocks for a specific tutor.  Calls callback(unlockedLeadIds[]) */
  function onUnlocks(tutorEmail, callback) {
    if (typeof callback !== 'function') return function() {};
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
      ensureAuth().then(function() {
        var firestore = db();
        if (!firestore) return;

        function updateFromDocs(docs) {
          if (!unlockCache[em]) unlockCache[em] = {};
          var added = false;
          docs.forEach(function(doc) {
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
          (unlockListeners[em] || []).forEach(function(fn) {
            try { fn(ids); } catch(e) { console.error('Unlock listener error', e); }
          });
        }

        // Listener 1: relationships collection
        try {
          firestore.collection('relationships')
            .where('type', '==', 'unlock')
            .where('tutorEmail', '==', em)
            .onSnapshot(function(snapshot) {
              if (snapshot && !snapshot.empty) updateFromDocs(snapshot.docs);
            }, function(err) {
              console.warn('Relationships unlock listener notice:', err);
            });
        } catch(e) {}

        // Listener 2: unlocks collection
        try {
          firestore.collection('unlocks')
            .where('tutorEmail', '==', em)
            .onSnapshot(function(snapshot) {
              if (snapshot && !snapshot.empty) updateFromDocs(snapshot.docs);
            }, function(err) {
              console.warn('Unlocks snapshot listener notice:', err);
            });
        } catch(e) {}
      });
    }

    // Return unsubscribe function
    return function() {
      if (!unlockListeners[em]) return;
      unlockListeners[em] = unlockListeners[em].filter(function(fn) { return fn !== callback; });
    };
  }

  window.ModivsFirebaseSync = {
    ensureAuth: ensureAuth,
    onTutors: onTutors,
    onLeads: onLeads,
    onStudents: onStudents,
    saveTutor: saveTutor,
    deleteTutor: deleteTutor,
    saveLead: saveLead,
    deleteLead: deleteLead,
    syncAll: syncAll,
    // Unlock system
    isLeadUnlocked: isLeadUnlocked,
    saveUnlock: saveUnlock,
    onUnlocks: onUnlocks,
    updateLeadStatus: updateLeadStatus
  };
})();
