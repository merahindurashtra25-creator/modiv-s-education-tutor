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
      var id = String((idKey && item[idKey]) || item.id || item.docId || item.email || '').replace(/[/]/g, '_');
      if(!id) return;
      var ref = firestore.collection(collectionName).doc(id);
      batch.set(ref, Object.assign({}, item, { updatedAt: (window.firebase && firebase.firestore && firebase.firestore.FieldValue) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString() }), { merge: true });
      count++;
    });
    return batch.commit().then(function(){ return count; }).catch(function(err){
      console.warn('Firebase sync failed for ' + collectionName, err);
      return 0;
    });
  }

  function pullTutors(){
    var firestore = db();
    if(!firestore) return Promise.resolve([]);
    return firestore.collection('tutors').get().then(function(snapshot){
      var fbTutors = [];
      snapshot.forEach(function(doc){
        var d = doc.data();
        if(d && d.name){
          if(!d.id) d.id = doc.id;
          fbTutors.push(d);
        }
      });
      if(!fbTutors.length) return rd('modivs_tutors_db');

      var gone = rd('modivs_deleted_tutors');
      fbTutors = fbTutors.filter(function(t){
        var id = String(t.id || '');
        var em = String(t.email || '').toLowerCase();
        return gone.indexOf(id) < 0 && gone.indexOf(em) < 0;
      });

      // Reconcile with local tutors db
      var localDb = rd('modivs_tutors_db');
      var map = {};
      localDb.forEach(function(t){
        if(!t) return;
        var k = (t.email && String(t.email).toLowerCase()) || t.id;
        if(k) map[k] = t;
      });
      fbTutors.forEach(function(t){
        var k = (t.email && String(t.email).toLowerCase()) || t.id;
        if(k){
          var prev = map[k] || {};
          var merged = Object.assign({}, prev, t);
          if(prev.status === 'approved' || t.status === 'approved') merged.status = 'approved';
          map[k] = merged;
        }
      });
      var mergedList = Object.keys(map).map(function(k){ return map[k]; });
      localStorage.setItem('modivs_tutors_db', JSON.stringify(mergedList));

      // Also update submitted list
      var subm = rd('modivs_submitted_tutors');
      var submMap = {};
      subm.forEach(function(t){
        if(!t) return;
        var k = (t.email && String(t.email).toLowerCase()) || t.id;
        if(k) submMap[k] = t;
      });
      fbTutors.forEach(function(t){
        var k = (t.email && String(t.email).toLowerCase()) || t.id;
        if(k){
          var prev = submMap[k] || {};
          var merged = Object.assign({}, prev, t);
          if(prev.status === 'approved' || t.status === 'approved') merged.status = 'approved';
          submMap[k] = merged;
        }
      });
      var mergedSubm = Object.keys(submMap).map(function(k){ return submMap[k]; });
      localStorage.setItem('modivs_submitted_tutors', JSON.stringify(mergedSubm));

      if(typeof window !== 'undefined'){
        window.dispatchEvent(new CustomEvent('modivs:tutors-updated', { detail: { tutors: mergedList } }));
      }
      return mergedList;
    }).catch(function(err){
      console.warn('pullTutors error:', err);
      return rd('modivs_tutors_db');
    });
  }

  function listenTutors(callback){
    var firestore = db();
    if(!firestore) return null;
    return firestore.collection('tutors').onSnapshot(function(snapshot){
      pullTutors().then(function(tutors){
        if(typeof callback === 'function') callback(tutors);
      });
    }, function(err){
      console.warn('listenTutors error:', err);
    });
  }

  function saveTutor(tutorData){
    if(!tutorData) return Promise.resolve(false);
    var id = String(tutorData.id || ('t_' + Date.now())).replace(/[/]/g, '_');
    tutorData.id = id;

    // 1. Update localStorage
    var localDb = rd('modivs_tutors_db');
    var idx = localDb.findIndex(function(x){
      return (x.id && x.id === id) || (x.email && tutorData.email && String(x.email).toLowerCase() === String(tutorData.email).toLowerCase());
    });
    if(idx >= 0){ localDb[idx] = Object.assign({}, localDb[idx], tutorData); }
    else { localDb.unshift(tutorData); }
    localStorage.setItem('modivs_tutors_db', JSON.stringify(localDb));

    var localSubm = rd('modivs_submitted_tutors');
    var sidx = localSubm.findIndex(function(x){
      return (x.id && x.id === id) || (x.email && tutorData.email && String(x.email).toLowerCase() === String(tutorData.email).toLowerCase());
    });
    if(sidx >= 0){ localSubm[sidx] = Object.assign({}, localSubm[sidx], tutorData); }
    else { localSubm.unshift(tutorData); }
    localStorage.setItem('modivs_submitted_tutors', JSON.stringify(localSubm));

    // Remove from deleted list
    var gone = rd('modivs_deleted_tutors').filter(function(g){
      return g !== id && g !== String(tutorData.email || '').toLowerCase();
    });
    localStorage.setItem('modivs_deleted_tutors', JSON.stringify(gone));

    // 2. Save directly to Firestore
    var firestore = db();
    if(firestore){
      var payload = Object.assign({}, tutorData, {
        updatedAt: (window.firebase && firebase.firestore && firebase.firestore.FieldValue) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
      });
      return firestore.collection('tutors').doc(id).set(payload, { merge: true }).then(function(){
        return true;
      }).catch(function(err){
        console.warn('Failed saving tutor to Firestore:', err);
        return false;
      });
    }
    return Promise.resolve(true);
  }

  function deleteTutor(id, email){
    var firestore = db();
    if(firestore){
      if(id) firestore.collection('tutors').doc(String(id).replace(/[/]/g, '_')).delete().catch(function(){});
      if(email){
        firestore.collection('tutors').where('email', '==', email).get().then(function(sn){
          sn.forEach(function(d){ d.ref.delete().catch(function(){}); });
        }).catch(function(){});
      }
    }
  }

  function syncTutors(){ return syncCollection('tutors', rd('modivs_tutors_db'), 'id'); }
  function syncLeads(){ return syncCollection('leads', rd('modivs_active_leads'), 'id'); }
  function syncStudents(){ return syncCollection('students', rd('modivs_students_db'), 'id'); }
  function syncEnquiries(){ return syncCollection('enquiries', rd('modivs_student_enquiries'), 'id'); }
  function syncConversations(){ return syncCollection('conversations', rd('modivs_chat_conversations'), 'docId'); }
  function syncTransactions(){ return syncCollection('coin_transactions', rd('modivs_coin_transactions'), 'id'); }

  function syncAll(){
    if(!db()) return Promise.resolve({ success: false, reason: 'Firebase not connected' });
    return Promise.all([
      syncTutors(),
      syncLeads(),
      syncStudents(),
      syncEnquiries(),
      syncConversations(),
      syncTransactions()
    ]).then(function(res){
      return {
        success: true,
        tutors: res[0],
        leads: res[1],
        students: res[2],
        enquiries: res[3],
        conversations: res[4],
        transactions: res[5]
      };
    });
  }

  window.ModivsFirebaseSync = {
    syncAll: syncAll,
    syncTutors: syncTutors,
    pullTutors: pullTutors,
    listenTutors: listenTutors,
    saveTutor: saveTutor,
    deleteTutor: deleteTutor,
    syncLeads: syncLeads,
    syncStudents: syncStudents,
    syncEnquiries: syncEnquiries,
    syncConversations: syncConversations,
    syncTransactions: syncTransactions
  };

  // Auto pull and sync on page load
  if(typeof window !== 'undefined'){
    var attempts = 0;
    (function initSync(){
      if(db()){
        pullTutors().then(function(){
          if(!localStorage.getItem('modivs_fb_initial_synced')){
            syncAll().then(function(res){
              if(res && res.success) localStorage.setItem('modivs_fb_initial_synced', '1');
            });
          }
        });
      } else if(++attempts < 15){
        setTimeout(initSync, 600);
      }
    })();
  }
})();
