(function(){
  'use strict';
  function db(){ return window.EducationBFirebase && window.EducationBFirebase.db; }
  function rd(k){ try{ var v=JSON.parse(localStorage.getItem(k)||'[]'); return Array.isArray(v)?v:[]; }catch(e){ return []; } }

  function syncCollection(collectionName, items, idKey){
    var firestore = db();
    if(!firestore || !items || !items.length) return Promise.resolve(0);
    items = items.filter(function(item){
      if(!item) return false;
      if(item.is_demo === true || item.imported === true) return false;
      var em = String(item.email || '').toLowerCase();
      if(/example\.com|modivhometutors\.invalid/.test(em)) return false;
      var id = String(item.id || '');
      if(/^mht-|^t[1-5]$|^r[1-5]$/.test(id)) return false;
      return true;
    });
    if(!items.length) return Promise.resolve(0);
    var batch = firestore.batch();
    var count = 0;
    items.slice(0, 450).forEach(function(item){
      var id = String((idKey && item[idKey]) || item.id || item.email || '').replace(/[/]/g, '_');
      if(!id) return;
      var ref = firestore.collection(collectionName).doc(id);
      batch.set(ref, Object.assign({}, item, { updatedAt: firebase.firestore.FieldValue.serverTimestamp() }), { merge: true });
      count++;
    });
    return batch.commit().then(function(){ return count; }).catch(function(err){
      console.warn('Firebase sync failed for ' + collectionName, err);
      return 0;
    });
  }

  function syncTutors(){ return syncCollection('tutors', rd('modivs_tutors_db'), 'id'); }
  function syncLeads(){ return syncCollection('leads', rd('modivs_active_leads'), 'id'); }
  function syncStudents(){ return syncCollection('students', rd('modivs_students_db'), 'id'); }
  function syncEnquiries(){ return syncCollection('enquiries', rd('modivs_student_enquiries'), 'id'); }

  function cleanupExpiredChats(){
    var firestore = db();
    if(!firestore) return Promise.resolve({ success: false, reason: 'Firebase not connected' });
    var now = new Date();
    return firestore.collection('conversations').get().then(function(convSnap){
      var tasks = [];
      convSnap.docs.forEach(function(convDoc){
        var p = convDoc.ref.collection('messages')
          .where('expiresAt', '<=', now)
          .limit(100)
          .get()
          .then(function(msgSnap){
            if(msgSnap.empty) return 0;
            var batch = firestore.batch();
            msgSnap.docs.forEach(function(doc){ batch.delete(doc.ref); });
            return batch.commit().then(function(){
              return convDoc.ref.collection('messages').orderBy('createdAt', 'desc').limit(1).get().then(function(remSnap){
                if(remSnap.empty){
                  return convDoc.ref.update({
                    lastMessage: 'No active messages (chat messages expire after 4 days)',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                  });
                }
              });
            }).then(function(){ return msgSnap.size; });
          }).catch(function(){ return 0; });
        tasks.push(p);
      });
      return Promise.all(tasks).then(function(counts){
        var total = counts.reduce(function(a, b){ return a + b; }, 0);
        return { success: true, deletedCount: total };
      });
    }).catch(function(err){
      return { success: false, error: err.message };
    });
  }

  function purgeDemoFromFirestore(){
    var firestore = db();
    if(!firestore) return Promise.resolve(0);
    return firestore.collection('tutors').get().then(function(snap){
      var batch = firestore.batch();
      var count = 0;
      snap.docs.forEach(function(doc){
        var d = doc.data();
        if(d.is_demo === true || d.imported === true || /example\.com|invalid/.test(d.email || '') || /^mht-|^t[1-5]$/.test(doc.id)){
          batch.delete(doc.ref);
          count++;
        }
      });
      return firestore.collection('leads').get().then(function(leadSnap){
        leadSnap.docs.forEach(function(doc){
          var d = doc.data();
          if(d.is_demo === true || d.imported === true || /example\.com/.test(d.email || '') || /^r[1-5]$/.test(doc.id)){
            batch.delete(doc.ref);
            count++;
          }
        });
        if(count > 0){
          return batch.commit().then(function(){
            console.log('Purged ' + count + ' demo records from Firestore.');
            return count;
          });
        }
        return 0;
      });
    }).catch(function(){ return 0; });
  }

  function syncAll(){
    if(!db()) return Promise.resolve({ success: false, reason: 'Firebase not connected' });
    return Promise.all([syncTutors(), syncLeads(), syncStudents(), syncEnquiries(), cleanupExpiredChats(), purgeDemoFromFirestore()]).then(function(res){
      return { success: true, tutors: res[0], leads: res[1], students: res[2], enquiries: res[3], expiredChatsDeleted: res[4] ? res[4].deletedCount : 0, demoPurged: res[5] || 0 };
    });
  }

  window.ModivsFirebaseSync = {
    syncAll: syncAll,
    syncTutors: syncTutors,
    syncLeads: syncLeads,
    syncStudents: syncStudents,
    syncEnquiries: syncEnquiries,
    cleanupExpiredChats: cleanupExpiredChats,
    purgeDemoFromFirestore: purgeDemoFromFirestore
  };

  // Auto-sync in background after initial page load
  if(typeof window !== 'undefined'){
    setTimeout(function(){
      if(db()){
        purgeDemoFromFirestore();
        if(!localStorage.getItem('modivs_fb_initial_synced')){
          syncAll().then(function(res){
            if(res && res.success) localStorage.setItem('modivs_fb_initial_synced', '1');
          });
        }
      }
    }, 1500);
  }
})();

