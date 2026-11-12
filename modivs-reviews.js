/* Modiv's Education - student & parent reviews (Firestore collection: reviews).
   Used by: index.html (show approved reviews + "Write a review" form) and modivs-admin.html (approve / edit / delete).
   New reviews from visitors start as "pending" and appear on the home page after the admin approves them.
   Admin can add, edit, approve, hide and delete any review (rules: see firestore.rules, section "reviews"). */
(function(){
  'use strict';
  function fb(){ return window.EducationBFirebase || null; }
  function ready(){
    return new Promise(function(res, rej){
      var n = 0;
      (function chk(){
        if(fb() && fb().db) return res(fb());
        if(++n > 100) return rej(new Error('Could not connect. Check your internet and try again.'));
        setTimeout(chk, 100);
      })();
    });
  }
  function ts(){ return firebase.firestore.FieldValue.serverTimestamp(); }
  function toRev(doc){
    var d = doc.data() || {};
    var t = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : new Date();
    return { id: doc.id, name: d.name || '', role: d.role || '', place: d.place || '', stars: Number(d.stars) || 5,
             text: d.text || '', status: d.status || 'pending', date: t };
  }
  function clean(o){
    var name = String(o.name || '').replace(/\s+/g, ' ').trim();
    var role = String(o.role || '').replace(/\s+/g, ' ').trim();
    var place = String(o.place || '').replace(/\s+/g, ' ').trim();
    var text = String(o.text || '').replace(/\s+/g, ' ').trim();
    var stars = Math.round(Number(o.stars));
    if(name.length < 2) return { err: 'Please enter your name.', field: 'name' };
    if(name.length > 60) return { err: 'The name is too long (max 60 characters).', field: 'name' };
    if(!role) return { err: 'Please choose who you are (student, parent...).', field: 'role' };
    if(place.length > 40) return { err: 'The city is too long (max 40 characters).', field: 'place' };
    if(!(stars >= 1 && stars <= 5)) return { err: 'Please choose a star rating.', field: 'stars' };
    if(text.length < 20) return { err: 'Please write at least 20 characters about your experience.', field: 'text' };
    if(text.length > 500) return { err: 'The review is too long (max 500 characters).', field: 'text' };
    return { ok: { name: name, role: role, place: place, stars: stars, text: text } };
  }
  function ensureAuth(){
    return ready().then(function(f){
      if(f.auth.currentUser) return f.auth.currentUser;
      if(window.ModivsFirebaseSync && window.ModivsFirebaseSync.ensureAuth) return window.ModivsFirebaseSync.ensureAuth();
      return new Promise(function(res){ var off = f.auth.onAuthStateChanged(function(u){ if(off) off(); res(u); }); setTimeout(function(){ res(f.auth.currentUser); }, 2500); });
    });
  }
  /* approved reviews, newest first (public) */
  function listApproved(n){
    return ready().then(function(f){ return f.db.collection('reviews').where('status', '==', 'approved').limit(n || 60).get(); })
      .then(function(s){ return s.docs.map(toRev).sort(function(a, b){ return b.date - a.date; }); });
  }
  /* every review incl. pending (admin only) */
  function listAll(n){
    return ensureAuth().then(function(){ return ready(); }).then(function(f){ return f.db.collection('reviews').limit(n || 300).get(); })
      .then(function(s){ return s.docs.map(toRev).sort(function(a, b){ return b.date - a.date; }); });
  }
  /* any visitor: send a review (goes to the admin for approval) */
  function submit(o){
    var c = clean(o); if(!c.ok) return Promise.reject(Object.assign(new Error(c.err), { field: c.field }));
    var d = c.ok; d.status = 'pending';
    return ensureAuth().then(function(){ return ready(); }).then(function(f){ d.createdAt = ts(); return f.db.collection('reviews').add(d); });
  }
  /* admin: add (published at once) */
  function adminAdd(o){
    var c = clean(o); if(!c.ok) return Promise.reject(Object.assign(new Error(c.err), { field: c.field }));
    var d = c.ok; d.status = 'approved';
    return ensureAuth().then(function(){ return ready(); }).then(function(f){ d.createdAt = ts(); return f.db.collection('reviews').add(d); });
  }
  /* admin: edit text/name/stars etc. */
  function update(id, o){
    var c = clean(o); if(!c.ok) return Promise.reject(Object.assign(new Error(c.err), { field: c.field }));
    return ensureAuth().then(function(){ return ready(); }).then(function(f){ return f.db.collection('reviews').doc(id).update(c.ok); });
  }
  function setStatus(id, status){
    return ensureAuth().then(function(){ return ready(); }).then(function(f){ return f.db.collection('reviews').doc(id).update({ status: status }); });
  }
  function remove(id){
    return ensureAuth().then(function(){ return ready(); }).then(function(f){ return f.db.collection('reviews').doc(id).delete(); });
  }
  window.ModivsReviews = { listApproved: listApproved, listAll: listAll, submit: submit, adminAdd: adminAdd, update: update,
    setStatus: setStatus, remove: remove, clean: clean, ROLES: ['Student', 'Parent of a student', 'Tutor'] };
})();
