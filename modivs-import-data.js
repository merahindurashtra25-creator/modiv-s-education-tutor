/* Demo data removed.
   Earlier versions copied public tutor and lead listings from modivhometutors.com into this site
   (ids starting "mht-", emails ending ".invalid"). Those were not real accounts here and caused confusion.
   This script no longer imports anything. Once per browser it deletes any of those records that were
   imported before, and removes them from Firebase if it is connected. Real tutors and students are untouched. */
(function(){
 var FLAG='modivs_demo_purge_v1';
 function isDemo(x){
  if(!x||typeof x!=='object')return false;
  var id=String(x.id||''),em=String(x.email||'').toLowerCase();
  return x.imported===true||x.is_demo===true||x.source==='modivhometutors.com'||/^mht-/.test(id)||/\.invalid$/.test(em);
 }
 function rd(k){try{var v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[]}catch(e){return []}}
 var gone={tutors:[],leads:[],students:[]};
 try{
  if(localStorage.getItem(FLAG))return;
  [['modivs_tutors_db','tutors'],['modivs_submitted_tutors','tutors'],['modivs_active_leads','leads'],['modivs_students_db','students']].forEach(function(p){
   var all=rd(p[0]),keep=[];
   all.forEach(function(x){if(isDemo(x)){if(x.id)gone[p[1]].push(String(x.id))}else keep.push(x)});
   if(keep.length!==all.length)localStorage.setItem(p[0],JSON.stringify(keep));
  });
  localStorage.setItem(FLAG,'1');
 }catch(e){return}
 // best-effort cleanup in Firebase once it has loaded
 var tries=0;(function go(){
  var fb=window.EducationBFirebase;
  if(!(fb&&fb.db)){if(++tries<15)setTimeout(go,700);return}
  [['tutors','tutors'],['leads','leads'],['students','students']].forEach(function(p){
   gone[p[0]].forEach(function(id){fb.db.collection(p[1]).doc(id).delete().catch(function(){})});
  });
 })();
})();
