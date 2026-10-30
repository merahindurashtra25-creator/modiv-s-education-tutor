(function(){
  'use strict';
  // Firebase chat bridge & real-time synchronization
  if(!window.EducationBFirebase || !window.ModivsChat) return;

  var auth = window.EducationBFirebase.auth;
  var db = window.EducationBFirebase.db;

  function syncFirestoreToLocal(){
    if(!db || !auth || !auth.currentUser) return;
    var u = auth.currentUser;
    var userEmail = String(u.email || '').toLowerCase();
    var isAdmin = (userEmail === 'admin@gmail.com');

    var query = db.collection('conversations');
    if(!isAdmin){
      query = query.where('participantIds', 'array-contains', userEmail);
    }

    query.limit(100).get().then(function(snapshot){
      if(snapshot.empty) return;
      var STORE = 'modivs_chat_conversations';
      var local = [];
      try { local = JSON.parse(localStorage.getItem(STORE) || '[]'); } catch(e){}
      if(!Array.isArray(local)) local = [];
      var byId = {};
      local.forEach(function(c){ byId[c.id] = c; });

      var promises = [];
      snapshot.docs.forEach(function(doc){
        var d = doc.data();
        var id = d.id || doc.id;
        if(!byId[id]){
          var newConv = {
            id: id,
            docId: doc.id,
            student: d.student || { name: 'Student', email: d.studentEmail || '' },
            tutor: d.tutor || { name: 'Tutor', email: d.tutorEmail || '' },
            studentEmail: d.studentEmail,
            tutorEmail: d.tutorEmail,
            studentId: d.studentId,
            tutorId: d.tutorId,
            participantIds: d.participantIds || [],
            unlocked: !!d.unlocked,
            unlockedAt: d.unlockedAt || null,
            status: d.status || (d.unlocked ? 'unlocked' : 'inquiry_pending'),
            messages: [],
            createdAt: d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString(),
            updatedAt: d.updatedAt && d.updatedAt.toDate ? d.updatedAt.toDate().toISOString() : new Date().toISOString()
          };
          local.unshift(newConv);
          byId[id] = newConv;
        } else {
          // Keep unlocked status synced
          byId[id].unlocked = !!d.unlocked;
          byId[id].unlockedAt = d.unlockedAt || byId[id].unlockedAt;
          byId[id].status = d.status || (d.unlocked ? 'unlocked' : 'inquiry_pending');
        }
      });

      localStorage.setItem(STORE, JSON.stringify(local));
      if(window.ModivsChat && window.ModivsChat.subscribe) {
        // notify listeners
        try { window.dispatchEvent(new Event('storage')); } catch(e){}
      }
    }).catch(function(err){
      console.warn('Initial Firestore conversations fetch skipped:', err);
    });
  }

  if(auth){
    auth.onAuthStateChanged(function(u){
      if(u) syncFirestoreToLocal();
    });
  }
})();
