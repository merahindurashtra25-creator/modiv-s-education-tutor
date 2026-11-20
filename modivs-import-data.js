/* Demo and test data automatic cleanup.
   Automatically deletes legacy imported records, dummy test data, and demo request duplicates
   from localStorage and Firebase Firestore. Real tutors and genuine student requirements are preserved. */
(function(){
 var FLAG='modivs_demo_purge_v3';
 function isDemo(x){
  if(!x||typeof x!=='object')return false;
  var id=String(x.id||''),em=String(x.email||'').toLowerCase(),nm=String(x.name||x.studentName||'').toLowerCase();
  return x.imported===true||x.is_demo===true||x.source==='modivhometutors.com'||
         /^mht-/i.test(id)||/\.invalid$/i.test(em)||
         /^(?:demo|test)[_\-\.]/i.test(id)||
         /@(?:example\.com|test\.com)$/i.test(em)||
         /^(?:test|demo)(?:\s+(?:data|test|demo|user|student|lead))?$/i.test(nm);
 }
 function rd(k){try{var v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[]}catch(e){return []}}
 var gone={tutors:[],leads:[],students:[],demoRequests:[]};

 try{
  [['modivs_tutors_db','tutors'],['modivs_submitted_tutors','tutors'],['modivs_active_leads','leads'],['modivs_students_db','students']].forEach(function(p){
   var all=rd(p[0]),keep=[];
   all.forEach(function(x){if(isDemo(x)){if(x.id)gone[p[1]].push(String(x.id))}else keep.push(x)});
   if(keep.length!==all.length)localStorage.setItem(p[0],JSON.stringify(keep));
  });

  // Clean test data from modivs_users
  var uList=rd('modivs_users'),uKeep=[];
  uList.forEach(function(u){if(isDemo(u)){if(u.uid||u.email)gone.leads.push(String(u.uid||u.email))}else uKeep.push(u)});
  if(uKeep.length!==uList.length)localStorage.setItem('modivs_users',JSON.stringify(uKeep));

  // Clean test / duplicate records from modivs_demo_requests
  var drList=rd('modivs_demo_requests'),drKeep=[];
  drList.forEach(function(d){if(isDemo(d)){if(d.id)gone.demoRequests.push(String(d.id))}else drKeep.push(d)});
  if(drKeep.length!==drList.length)localStorage.setItem('modivs_demo_requests',JSON.stringify(drKeep));

  localStorage.setItem(FLAG,'1');
 }catch(e){}

 // Best-effort cleanup in Firebase Firestore
 var tries=0;
 (function go(){
  var fb=window.EducationBFirebase;
  if(!(fb&&fb.db)){if(++tries<15)setTimeout(go,700);return}
  var db=fb.db;
  [['tutors','tutors'],['leads','leads'],['students','students'],['demoRequests','demoRequests']].forEach(function(p){
   var list=gone[p[0]]||[];
   list.forEach(function(id){db.collection(p[1]).doc(id).delete().catch(function(){})});
  });
  // Clean documents flagged as demo in Firestore
  ['leads','students','tutors'].forEach(function(col){
   db.collection(col).where('is_demo','==',true).limit(30).get().then(function(snap){
    snap.forEach(function(doc){doc.ref.delete().catch(function(){})});
   }).catch(function(){});
   db.collection(col).where('imported','==',true).limit(30).get().then(function(snap){
    snap.forEach(function(doc){doc.ref.delete().catch(function(){})});
   }).catch(function(){});
  });
 })();
})();
