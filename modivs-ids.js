/* Modiv's Education - readable IDs:  students STU101, STU102 ...   leads LD201, LD202 ...   tutors MOD-TUT301, MOD-TUT302 ...
   The internal record ids (stu_1731..., t_user_..., adm_...) are NOT changed: chats, unlocks and Firestore documents
   still point to them. This module only hands out a friendly "display id" for each student (by email), tutor (by email)
   and lead (by lead id), once, and always returns the same one afterwards.

   Shared numbering lives in Firestore (counters/display_ids + display_ids/<kind>_<key>, updated in a transaction,
   so two people can never get the same number). If Firestore is not reachable, a provisional number is used from this
   browser and is replaced by the real one the next time it can be reached.

     ModivsIds.peek('stu', email)            -> 'STU101' or '' (instant, from this browser)
     ModivsIds.get('ld', leadId)             -> Promise<'LD201'>
     ModivsIds.getMany('tut', [emails])      -> Promise<{ key: 'TUT301', ... }>  (in the order given, so the oldest records get the lowest numbers) */
(function(){
  'use strict';
  var CACHE='modivs_display_ids';
  var KIND={ stu:{prefix:'STU',start:101}, ld:{prefix:'LD',start:201}, tut:{prefix:'MOD-TUT',start:301} };
  var inflight={}, chain=Promise.resolve();

  function norm(kind,key){
    key=String(key==null?'':key).trim();
    return kind==='ld'?key:key.toLowerCase();
  }
  function ck(kind,key){return kind+'|'+key}
  function rd(){try{var o=JSON.parse(localStorage.getItem(CACHE)||'{}');return o&&typeof o==='object'?o:{}}catch(e){return {}}}
  function wr(o){try{localStorage.setItem(CACHE,JSON.stringify(o))}catch(e){}}
  function docId(kind,key){return kind+'_'+key.replace(/[\/\\#?\[\]*]/g,'_')}
  /* tutor ids used to be TUT301; they are now MOD-TUT301 (same number) */
  function fixId(kind,id){id=String(id||'');return kind==='tut'?id.replace(/^TUT(?=\d)/,'MOD-TUT'):id}
  function fmt(kind,n){return KIND[kind].prefix+n}
  function db(){var f=window.EducationBFirebase;return f&&f.db?f.db:null}

  function peek(kind,key){
    key=norm(kind,key);if(!KIND[kind]||!key)return '';
    var c=rd()[ck(kind,key)];return c&&c.id?fixId(kind,c.id):''}
  function store(kind,key,id,prov){var o=rd();o[ck(kind,key)]={id:id,prov:!!prov};wr(o)}

  /* provisional number, from this browser only */
  function local(kind,key){
    var o=rd(),max=KIND[kind].start-1,re=new RegExp('^'+(kind==='tut'?'(?:MOD-)?TUT':KIND[kind].prefix)+'(\\d+)$');
    Object.keys(o).forEach(function(k){if(k.indexOf(kind+'|')===0){var m=re.exec(o[k].id||'');if(m&&+m[1]>max)max=+m[1]}});
    var id=fmt(kind,max+1);store(kind,key,id,true);return id}

  function syncLocalState(kind, key, id) {
    key = norm(kind, key);
    id = fixId(kind, id);
    if (!key || !id) return;
    store(kind, key, id, false);
    try {
      if (kind === 'tut') {
        var curT = JSON.parse(localStorage.getItem('modivs_current_tutor') || 'null');
        if (curT && norm('tut', curT.email || curT.id) === key) {
          curT.displayId = id; curT.tutId = id;
          localStorage.setItem('modivs_current_tutor', JSON.stringify(curT));
        }
        var dbT = JSON.parse(localStorage.getItem('modivs_tutors_db') || '[]');
        var modT = false;
        dbT.forEach(function (t) {
          if (t && norm('tut', t.email || t.id) === key) {
            t.displayId = id; t.tutId = id; modT = true;
          }
        });
        if (modT) localStorage.setItem('modivs_tutors_db', JSON.stringify(dbT));
      } else if (kind === 'stu') {
        var curS = JSON.parse(localStorage.getItem('modivs_current_student') || 'null');
        if (curS && norm('stu', curS.email || curS.id) === key) {
          curS.displayId = id; curS.stuId = id;
          localStorage.setItem('modivs_current_student', JSON.stringify(curS));
        }
        var dbS = JSON.parse(localStorage.getItem('modivs_students_db') || '[]');
        var modS = false;
        dbS.forEach(function (s) {
          if (s && norm('stu', s.email || s.id) === key) {
            s.displayId = id; s.stuId = id; modS = true;
          }
        });
        if (modS) localStorage.setItem('modivs_students_db', JSON.stringify(dbS));
      }
    } catch (e) { }

    try {
      window.dispatchEvent(new CustomEvent('modivs:id_updated', { detail: { kind: kind, key: key, id: id } }));
    } catch (e) { }
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        var ch = new BroadcastChannel('modivs_id_channel');
        ch.postMessage({ kind: kind, key: key, id: id });
        ch.close();
      }
    } catch (e) { }
  }

  function checkRemote(kind, key, currentId) {
    var d = db();
    if (!d) return;
    try {
      d.collection('display_ids').doc(docId(kind, key)).get().then(function (snap) {
        if (snap && snap.exists && snap.data() && snap.data().id) {
          var remoteId = fixId(kind, snap.data().id);
          if (remoteId && remoteId !== currentId) {
            syncLocalState(kind, key, remoteId);
          }
        }
      }).catch(function () { });
    } catch (e) { }
  }

  function cloud(kind,key){
    var d=db();if(!d)return Promise.reject(new Error('no firestore'));
    var mapDocName = docId(kind, key);
    var mapRef = d.collection('display_ids').doc(mapDocName);

    return mapRef.get().then(function (snap) {
      if (snap && snap.exists && snap.data() && snap.data().id) {
        return fixId(kind, snap.data().id);
      }
      var cRef = d.collection('counters').doc('display_ids');
      return d.runTransaction(function (t) {
        return t.get(mapRef).then(function (ms) {
          if (ms.exists && ms.data().id) return fixId(kind, ms.data().id);
          return t.get(cRef).then(function (cs) {
            var curNum = (cs.exists && cs.data() && Number(cs.data()[kind])) || (KIND[kind].start - 1);
            var n = Math.max(curNum + 1, KIND[kind].start);
            var id = fmt(kind, n), p = {}; p[kind] = n;
            t.set(cRef, p, { merge: true });
            t.set(mapRef, { id: id, kind: kind, key: key, createdAt: Date.now() });

            // Propagate permanent display ID to corresponding directory document
            if (kind === 'tut' && key) {
              var tid = 't_user_' + key.replace(/[^a-z0-9]/gi, '_');
              t.set(d.collection('tutors').doc(tid), { displayId: id, tutId: id }, { merge: true });
              t.set(d.collection('accounts').doc(key), { displayId: id, tutId: id }, { merge: true });
            } else if (kind === 'stu' && key) {
              var sid = 'stu_' + key.replace(/[^a-z0-9]/gi, '_');
              t.set(d.collection('students').doc(sid), { displayId: id, stuId: id }, { merge: true });
              t.set(d.collection('accounts').doc(key), { displayId: id, stuId: id }, { merge: true });
            }

            return id;
          });
        });
      });
    });
  }

  /* one at a time, so numbers are handed out in the order asked for */
  function get(kind,key,forceRefresh){
    key=norm(kind,key);
    if(!KIND[kind]||!key)return Promise.resolve('');
    var c=rd()[ck(kind,key)];
    if(c&&c.id&&!c.prov&&!forceRefresh){
      checkRemote(kind,key,fixId(kind,c.id));
      return Promise.resolve(fixId(kind,c.id));
    }
    var f=ck(kind,key);if(inflight[f])return inflight[f];
    var run=function(){
      return cloud(kind,key).then(function(id){
        syncLocalState(kind,key,id);
        return id;
      },
        function(){var cur=rd()[f];return cur&&cur.id?cur.id:local(kind,key)})};
    var p=chain.then(run,run);
    chain=p.then(function(){},function(){});
    inflight[f]=p;
    p.then(function(){delete inflight[f]},function(){delete inflight[f]});
    return p}

  function getMany(kind,keys){
    var out={},seen={};
    return (keys||[]).reduce(function(pr,k){
      return pr.then(function(){
        var nk=norm(kind,k);if(!nk||seen[nk])return;seen[nk]=1;
        return get(kind,nk).then(function(id){out[nk]=id})})
    },Promise.resolve()).then(function(){return out})}

  /* Full migration & audit of existing tutors and students (idempotent, safe batch) */
  function migrateAll(onProgress){
    var d = db();
    if(!d) return Promise.reject(new Error('Firestore is not initialized'));
    if(typeof onProgress !== 'function') onProgress = function(){};

    // Try Cloud Function first if available
    var fn = window.firebase && typeof firebase.functions === 'function' ? firebase.functions() : null;
    if(fn){
      var callMigrate = fn.httpsCallable('migrateDisplayIds');
      return callMigrate().then(function(res){
        return res && res.data ? res.data : res;
      }).catch(function(fnErr){
        console.info('Cloud function migrateDisplayIds fallback to direct Firestore batch migration:', fnErr && fnErr.message);
        return runDirectMigration();
      });
    }
    return runDirectMigration();

    function runDirectMigration(){
      var report = {
        tutors: { total: 0, existingValid: 0, assigned: 0, nextAvailable: 'MOD-TUT301', assignedList: [] },
        students: { total: 0, existingValid: 0, assigned: 0, nextAvailable: 'STU101', assignedList: [] },
        conflicts: [],
        errors: []
      };
      onProgress('Reading existing display IDs and counters...');
      var counterRef = d.collection('counters').doc('display_ids');

      return Promise.all([
        counterRef.get(),
        d.collection('display_ids').get(),
        d.collection('tutors').get(),
        d.collection('students').get()
      ]).then(function(res){
        var counterSnap = res[0], mapSnap = res[1], tutorsSnap = res[2], studentsSnap = res[3];
        var counters = counterSnap.exists ? (counterSnap.data() || {}) : {};
        var existingMap = {}, assignedIds = {};

        mapSnap.forEach(function(doc){
          var dt = doc.data() || {};
          if(dt.id && dt.key){
            existingMap[(dt.kind || '') + '_' + String(dt.key).toLowerCase()] = dt.id;
            assignedIds[dt.id] = true;
          }
        });

        var maxTut = Math.max(300, Number(counters.tut) || 300);
        var maxStu = Math.max(100, Number(counters.stu) || 100);

        Object.keys(assignedIds).forEach(function(id){
          var tm = /^(?:MOD-)?TUT(\d+)$/.exec(id); if(tm) maxTut = Math.max(maxTut, parseInt(tm[1], 10));
          var sm = /^STU(\d+)$/.exec(id); if(sm) maxStu = Math.max(maxStu, parseInt(sm[1], 10));
        });

        // 1. Process Tutors
        var tutorsList = [];
        tutorsSnap.forEach(function(doc){
          var dt = doc.data() || {}; dt._docId = doc.id;
          tutorsList.push(dt);
        });
        report.tutors.total = tutorsList.length;

        tutorsList.sort(function(a,b){
          var ta = new Date(a.createdAt || a.submitted_at || a.created_at || 0).getTime() || 0;
          var tb = new Date(b.createdAt || b.submitted_at || b.created_at || 0).getTime() || 0;
          return ta - tb;
        });

        var batch = d.batch(), ops = 0;
        tutorsList.forEach(function(t){
          var em = (t.email || t.id || '').toLowerCase();
          var k = 'tut_' + em.replace(/[\/\\#?\[\]*]/g, '_');
          var exId = fixId('tut', t.displayId || t.tutId || existingMap[k] || '');
          if(/^MOD-TUT\d+$/.test(exId)){
            report.tutors.existingValid++;
            maxTut = Math.max(maxTut, parseInt(exId.replace('MOD-TUT', ''), 10));
            store('tut', em, exId, false);
            if(!t.displayId || !t.tutId){
              batch.set(d.collection('tutors').doc(t._docId), { displayId: exId, tutId: exId }, { merge: true });
              ops++;
            }
          } else {
            maxTut++;
            while(assignedIds['MOD-TUT' + maxTut] || assignedIds['TUT' + maxTut]) maxTut++;
            var newId = 'MOD-TUT' + maxTut;
            assignedIds[newId] = true;
            existingMap[k] = newId;
            store('tut', em, newId, false);
            batch.set(d.collection('tutors').doc(t._docId), { displayId: newId, tutId: newId }, { merge: true });
            batch.set(d.collection('display_ids').doc(k), { id: newId, kind: 'tut', key: em, createdAt: Date.now() }, { merge: true });
            if(em) batch.set(d.collection('accounts').doc(em), { displayId: newId, tutId: newId }, { merge: true });
            ops += 3;
            report.tutors.assigned++;
            report.tutors.assignedList.push({ email: em, docId: t._docId, id: newId });
          }
        });

        // 2. Process Students
        var studentsList = [];
        studentsSnap.forEach(function(doc){
          var ds = doc.data() || {}; ds._docId = doc.id;
          studentsList.push(ds);
        });
        report.students.total = studentsList.length;

        studentsList.sort(function(a,b){
          var ta = new Date(a.createdAt || a.registered_at || a.created_at || 0).getTime() || 0;
          var tb = new Date(b.createdAt || b.registered_at || b.created_at || 0).getTime() || 0;
          return ta - tb;
        });

        studentsList.forEach(function(s){
          var em = (s.email || s.id || '').toLowerCase();
          var k = 'stu_' + em.replace(/[\/\\#?\[\]*]/g, '_');
          var exId = s.displayId || s.stuId || existingMap[k] || '';
          if(/^STU\d+$/.test(exId)){
            report.students.existingValid++;
            maxStu = Math.max(maxStu, parseInt(exId.replace('STU', ''), 10));
            store('stu', em, exId, false);
            if(!s.displayId || !s.stuId){
              batch.set(d.collection('students').doc(s._docId), { displayId: exId, stuId: exId }, { merge: true });
              ops++;
            }
          } else {
            maxStu++;
            while(assignedIds['STU' + maxStu]) maxStu++;
            var newId = 'STU' + maxStu;
            assignedIds[newId] = true;
            existingMap[k] = newId;
            store('stu', em, newId, false);
            batch.set(d.collection('students').doc(s._docId), { displayId: newId, stuId: newId }, { merge: true });
            batch.set(d.collection('display_ids').doc(k), { id: newId, kind: 'stu', key: em, createdAt: Date.now() }, { merge: true });
            if(em) batch.set(d.collection('accounts').doc(em), { displayId: newId, stuId: newId }, { merge: true });
            ops += 3;
            report.students.assigned++;
            report.students.assignedList.push({ email: em, docId: s._docId, id: newId });
          }
        });

        // 3. Update counter
        batch.set(counterRef, { tut: maxTut, stu: maxStu }, { merge: true });
        ops++;

        report.tutors.nextAvailable = 'MOD-TUT' + (maxTut + 1);
        report.students.nextAvailable = 'STU' + (maxStu + 1);

        onProgress('Committing permanent IDs to Firestore (' + ops + ' writes)...');
        return batch.commit().then(function(){
          return report;
        });
      });
    }
  }

  function updateDisplayId(kind, key, newId, targetDocId) {
    var d = db();
    key = norm(kind, key);
    newId = String(newId || '').trim().toUpperCase();
    if (!KIND[kind]) return Promise.reject(new Error('Invalid kind: ' + kind));
    var expectedPrefix = KIND[kind].prefix;
    if (newId.indexOf(expectedPrefix) !== 0) {
      return Promise.reject(new Error('ID must start with ' + expectedPrefix));
    }
    var numPart = parseInt(newId.slice(expectedPrefix.length), 10);
    if (isNaN(numPart) || numPart < 1) {
      return Promise.reject(new Error('ID must contain a valid number after ' + expectedPrefix));
    }

    var fn = window.firebase && typeof firebase.functions === 'function' ? firebase.functions() : null;
    if (fn) {
      var callAdminUpdate = fn.httpsCallable('adminUpdateDisplayId');
      return callAdminUpdate({ kind: kind, key: key, newId: newId, docId: targetDocId }).then(function (res) {
        syncLocalState(kind, key, newId);
        return res && res.data ? res.data : res;
      }).catch(function (cfErr) {
        console.warn('adminUpdateDisplayId Cloud Function fallback to direct Firestore:', cfErr && cfErr.message);
        return directUpdate();
      });
    }
    return directUpdate();

    function directUpdate() {
      if (!d) {
        syncLocalState(kind, key, newId);
        return Promise.resolve({ id: newId, localOnly: true });
      }

      var mapDocRef = d.collection('display_ids').doc(docId(kind, key));
      var counterRef = d.collection('counters').doc('display_ids');
      var collName = kind === 'tut' ? 'tutors' : 'students';
      var idField = kind === 'tut' ? 'tutId' : 'stuId';
      var canonicalId = kind === 'tut' ? ('t_user_' + key.replace(/[^a-z0-9]/gi, '_')) : ('stu_' + key.replace(/[^a-z0-9]/gi, '_'));

      return d.collection('display_ids').where('id', '==', newId).limit(1).get().then(function (snap) {
        if (!snap.empty) {
          var existData = snap.docs[0].data() || {};
          if (norm(kind, existData.key) !== key) {
            throw new Error('Display ID ' + newId + ' is already assigned to ' + (existData.key || 'another account') + '!');
          }
        }

        var batch = d.batch();
        batch.set(mapDocRef, {
          id: newId,
          kind: kind,
          key: key,
          updatedAt: Date.now()
        }, { merge: true });

        if (targetDocId) {
          var targetDoc = d.collection(collName).doc(targetDocId);
          var updatePayload = { displayId: newId };
          updatePayload[idField] = newId;
          batch.set(targetDoc, updatePayload, { merge: true });
        }

        var canDoc = d.collection(collName).doc(canonicalId);
        var canPayload = { displayId: newId };
        canPayload[idField] = newId;
        batch.set(canDoc, canPayload, { merge: true });

        if (key) {
          var accDoc = d.collection('accounts').doc(key);
          var accPayload = { displayId: newId };
          accPayload[idField] = newId;
          batch.set(accDoc, accPayload, { merge: true });
        }

        return counterRef.get().then(function (cs) {
          var curNum = (cs.exists && cs.data() && Number(cs.data()[kind])) || (KIND[kind].start - 1);
          if (numPart > curNum) {
            var p = {}; p[kind] = numPart;
            batch.set(counterRef, p, { merge: true });
          }

          var queryP = key ? d.collection(collName).where('email', '==', key).get() : Promise.resolve({ empty: true });
          return queryP.then(function (matchDocs) {
            if (matchDocs && !matchDocs.empty) {
              matchDocs.forEach(function (md) {
                var up = { displayId: newId };
                up[idField] = newId;
                batch.set(md.ref, up, { merge: true });
              });
            }
            return batch.commit().then(function () {
              syncLocalState(kind, key, newId);
              return { id: newId, success: true };
            });
          });
        });
      });
    }
  }

  function idOf(kind, obj){
    if(!obj) return '';
    return obj.displayId || obj.tutId || obj.stuId || peek(kind, obj.email || obj.id || '');
  }

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      var listenCh = new BroadcastChannel('modivs_id_channel');
      listenCh.onmessage = function (ev) {
        var msg = ev && ev.data;
        if (msg && msg.kind && msg.key && msg.id) {
          syncLocalState(msg.kind, msg.key, msg.id);
        }
      };
    }
  } catch (e) { }

  window.ModivsIds={peek:peek,get:get,getMany:getMany,migrateAll:migrateAll,updateDisplayId:updateDisplayId,idOf:idOf,syncLocalState:syncLocalState,KIND:KIND};
})();
