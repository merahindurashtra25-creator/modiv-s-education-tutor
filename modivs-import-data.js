/**
 * Clean up legacy demo data and prevent seeding of mock profiles.
 * Ensures only real tutors, students, and inquiries exist.
 */
(function(){
  'use strict';
  try {
    ['modivs_import_mht', 'modivs_import_mht_v2', 'modivs_demo_seeded', 'modivs_demo_tutors_v1'].forEach(function(k){
      localStorage.removeItem(k);
    });

    // Scrub mock demo records from local storage
    var scrubCollection = function(key){
      try {
        var raw = localStorage.getItem(key);
        if(!raw) return;
        var list = JSON.parse(raw);
        if(!Array.isArray(list)) return;
        var cleaned = list.filter(function(item){
          if(!item) return false;
          if(item.is_demo === true || item.imported === true) return false;
          var em = String(item.email || '').toLowerCase();
          if(/example\.com|modivhometutors\.invalid|@import\./.test(em)) return false;
          var id = String(item.id || '');
          if(/^mht-|^t[1-5]$|^r[1-5]$/.test(id)) return false;
          return true;
        });
        localStorage.setItem(key, JSON.stringify(cleaned));
      } catch(e){}
    };

    scrubCollection('modivs_tutors_db');
    scrubCollection('modivs_active_leads');
    scrubCollection('modivs_students_db');
    scrubCollection('modivs_student_enquiries');
    scrubCollection('modivs_submitted_tutors');
    scrubCollection('modivs_users');
  } catch(e){}
})();
