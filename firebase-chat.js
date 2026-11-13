(function(){
  'use strict';
  // Firebase chat bridge: initial sync of conversations from Firestore to localStorage.
  // Uses the same tutorEmail / studentEmail / enquiry_owner_email queries as modivs-chat.js
  // to avoid needing a composite index on participantIds.
  if(!window.EducationBFirebase || !window.ModivsChat) return;

  var auth = window.EducationBFirebase.auth;
  var db = window.EducationBFirebase.db;

  function syncFirestoreToLocal(userEmail){
    if(!db) return;
    var em = String(userEmail || '').toLowerCase();
    if(!em) return;

    var adminEmails = ((typeof window !== "undefined" && window.__ENV__ && window.__ENV__.MASTER_ADMIN_EMAILS) ? window.__ENV__.MASTER_ADMIN_EMAILS.split(",") : []).map(function(e){ return e.trim().toLowerCase(); });
    var isAdmin = adminEmails.indexOf(em) !== -1;

    // For admins fetch all; for regular users fetch by all three participant email fields.
    var queries = isAdmin
      ? [db.collection('conversations').limit(200).get()]
      : [
          db.collection('conversations').where('tutorEmail', '==', em).get(),
          db.collection('conversations').where('studentEmail', '==', em).get(),
          db.collection('conversations').where('enquiry_owner_email', '==', em).get()
        ];

    Promise.all(queries).then(function(snapshots){
      var STORE = 'modivs_chat_conversations';
      var local = [];
      try { local = JSON.parse(localStorage.getItem(STORE) || '[]'); } catch(e){}
      if(!Array.isArray(local)) local = [];
      var byId = {};
      local.forEach(function(c){ byId[c.id] = c; if(c.docId) byId[c.docId] = c; });

      // Merge all query results, deduplicated by doc ID
      var seen = {};
      snapshots.forEach(function(snapshot){
        if(!snapshot || snapshot.empty) return;
        snapshot.docs.forEach(function(doc){
          if(seen[doc.id]) return;
          seen[doc.id] = true;

          var d = doc.data();
          var id = d.id || doc.id;
          var existing = byId[id] || byId[doc.id];

          if(!existing){
            var newConv = {
              id: id,
              docId: doc.id,
              student: d.student || { name: 'Student', email: d.studentEmail || '' },
              tutor: d.tutor || { name: 'Tutor', email: d.tutorEmail || '' },
              studentEmail: d.studentEmail || '',
              tutorEmail: d.tutorEmail || '',
              enquiry_owner_email: d.enquiry_owner_email || d.studentEmail || '',
              studentId: d.studentId || '',
              tutorId: d.tutorId || '',
              participantIds: d.participantIds || [],
              enquiry_id: d.enquiry_id || d.enquiryId || '',
              enquiryId: d.enquiryId || d.enquiry_id || '',
              enquiry: d.enquiry || null,
              free: !!(d.free || (d.enquiry && d.enquiry.free)),
              unlocked: !!d.unlocked,
              unlockedAt: d.unlockedAt || null,
              unlockedBy: d.unlockedBy || null,
              status: d.status || (d.unlocked ? 'unlocked' : 'inquiry_pending'),
              lastMessage: d.lastMessage || '',
              messages: [],
              createdAt: d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString(),
              updatedAt: d.updatedAt && d.updatedAt.toDate ? d.updatedAt.toDate().toISOString() : new Date().toISOString()
            };
            local.unshift(newConv);
            byId[id] = newConv;
            byId[doc.id] = newConv;
          } else {
            // Preserve permanent unlock: never downgrade an unlocked conversation
            var isLeadUnl = window.ModivsFirebaseSync && window.ModivsFirebaseSync.isLeadUnlocked && (
              (d.enquiry_id && window.ModivsFirebaseSync.isLeadUnlocked(em, d.enquiry_id)) ||
              (d.enquiryId && window.ModivsFirebaseSync.isLeadUnlocked(em, d.enquiryId)) ||
              (id && window.ModivsFirebaseSync.isLeadUnlocked(em, 'conv_' + id)) ||
              (id && window.ModivsFirebaseSync.isLeadUnlocked(em, id))
            );
            var nowUnlocked = !!d.unlocked || !!existing.unlocked || !!isLeadUnl;
            byId[id] = existing;
            byId[id].unlocked = nowUnlocked;
            byId[id].unlockedAt = d.unlockedAt || existing.unlockedAt || (nowUnlocked ? new Date().toISOString() : null);
            byId[id].status = nowUnlocked ? 'unlocked' : (d.status || 'inquiry_pending');

            // Update lastMessage so dashboards reflect the latest message
            if(d.lastMessage && d.lastMessage !== existing.lastMessage){
              existing.lastMessage = d.lastMessage;
            }

            // Self-heal: if locally unlocked but Firestore still shows locked, push the fix
            if(nowUnlocked && !d.unlocked && db){
              db.collection('conversations').doc(doc.id).set({
                unlocked: true,
                unlockedAt: existing.unlockedAt || new Date().toISOString(),
                unlockedBy: existing.unlockedBy || em,
                status: 'unlocked'
              }, { merge: true }).catch(function(){});
            }
          }
        });
      });

      localStorage.setItem(STORE, JSON.stringify(local));
      // Notify ModivsChat listeners so dashboards re-render
      if(window.ModivsChat && window.ModivsChat.subscribe){
        try { window.dispatchEvent(new Event('storage')); } catch(e){}
      }
    }).catch(function(err){
      console.warn('Initial Firestore conversations fetch notice:', err);
    });
  }

  if(auth){
    auth.onAuthStateChanged(function(u){
      if(u && !u.isAnonymous && u.email){
        syncFirestoreToLocal(u.email);
      }
    });
  }
})();
