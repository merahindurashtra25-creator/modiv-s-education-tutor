(function(){
  'use strict';
  function db(){ return window.EducationBFirebase && window.EducationBFirebase.db; }
  function rd(k){ try{ var v=JSON.parse(localStorage.getItem(k)||'[]'); return Array.isArray(v)?v:[]; }catch(e){ return []; } }

  function syncCollection(collectionName, items, idKey){
    var firestore = db();
    if(!firestore || !items || !items.length) return Promise.resolve(0);
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

  function syncAll(){
    if(!db()) return Promise.resolve({ success: false, reason: 'Firebase not connected' });
    return Promise.all([syncTutors(), syncLeads(), syncStudents(), syncEnquiries()]).then(function(res){
      return { success: true, tutors: res[0], leads: res[1], students: res[2], enquiries: res[3] };
    });
  }

  window.ModivsFirebaseSync = {
    syncAll: syncAll,
    syncTutors: syncTutors,
    syncLeads: syncLeads,
    syncStudents: syncStudents,
    syncEnquiries: syncEnquiries
  };

  // Auto-sync in background after initial page load
  if(typeof window !== 'undefined'){
    setTimeout(function(){
      if(db() && !localStorage.getItem('modivs_fb_initial_synced')){
        syncAll().then(function(res){
          if(res && res.success) localStorage.setItem('modivs_fb_initial_synced', '1');
        });
      }
    }, 2000);
  }
})();

