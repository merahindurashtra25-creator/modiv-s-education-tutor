(function(){
  'use strict';
  // Firebase chat bridge & synchronization
  if(!window.EducationBFirebase || !window.ModivsChat) return;

  var auth = window.EducationBFirebase.auth;
  var db = window.EducationBFirebase.db;

  function syncFirestoreToLocal(){
    if(!db) return;
    db.collection('conversations').limit(100).get().then(function(snapshot){
      if(snapshot.empty) return;
      var STORE = 'modivs_chat_conversations';
      var local = [];
      try { local = JSON.parse(localStorage.getItem(STORE) || '[]'); } catch(e){}
      if(!Array.isArray(local)) local = [];
      var byId = {};
      local.forEach(function(c){ byId[c.id] = c; });

      snapshot.docs.forEach(function(doc){
        var d = doc.data();
        var id = d.id || doc.id;
        if(!byId[id]){
          var newConv = {
            id: id,
            docId: doc.id,
            student: d.student || { name: 'Student', email: '' },
            tutor: d.tutor || { name: 'Tutor', email: '' },
            participantIds: d.participantIds || [],
            messages: [],
            createdAt: d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString(),
            updatedAt: d.updatedAt && d.updatedAt.toDate ? d.updatedAt.toDate().toISOString() : new Date().toISOString()
          };
          local.unshift(newConv);
          byId[id] = newConv;
        }
      });
      localStorage.setItem(STORE, JSON.stringify(local));
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
