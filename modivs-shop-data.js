/* Modiv's Education - shop catalogue.
   Used by: modivs-shop.html (shop) and modivs-admin.html (admin adds / deletes items).
   Admin edits are saved to Firestore site_content/shop (anyone reads, only admins write; see firestore.rules)
   and mirrored in localStorage. The sample items below are shown until the admin saves a catalogue. */
(function(){
  'use strict';
  var KEY = 'modivs_shop_products';
  // type: 'ebook' | 'video' | 'bundle'.  preview: link for a free sample (YouTube or PDF), or ''.
  var DEFAULTS = [
 {id:'p1',type:'ebook',title:'Class 10 Maths: Formulas and Solved Examples',subject:'Mathematics',cls:'Class 10',board:'CBSE',format:'PDF e-book',price:199,mrp:349,
  desc:'A chapter-wise formula sheet with solved examples, written by Modiv’s maths tutors.',inc:['All chapters of the Class 10 syllabus','Formula sheet for quick revision','Solved examples for every chapter'],preview:''},
 {id:'p2',type:'ebook',title:'Class 12 Physics: Numericals Practice Book',subject:'Physics',cls:'Class 12',board:'CBSE',format:'PDF e-book',price:249,mrp:399,
  desc:'Graded numericals from easy to board level, with step-by-step solutions.',inc:['Chapter-wise numericals','Step-by-step solutions','Board-style practice sets'],preview:''},
 {id:'p3',type:'ebook',title:'Class 9 Science: Quick Revision Notes',subject:'Science',cls:'Class 9',board:'CBSE',format:'PDF e-book',price:149,mrp:249,
  desc:'Short notes, diagrams and key terms to revise Physics, Chemistry and Biology before exams.',inc:['Notes for all three sciences','Labelled diagrams','Key terms and definitions'],preview:''},
 {id:'p4',type:'ebook',title:'NEET Biology: Chapter-wise MCQ Bank',subject:'Biology',cls:'Competitive',board:'NEET',format:'PDF e-book',price:299,mrp:499,
  desc:'Practice MCQs arranged by chapter, with answer keys and explanations.',inc:['Chapter-wise MCQs','Answer key','Short explanations'],preview:''},
 {id:'p5',type:'ebook',title:'Spoken English Starter Workbook',subject:'English',cls:'All classes',board:'',format:'PDF workbook',price:129,mrp:199,
  desc:'Daily speaking practice, common phrases and pronunciation tips for beginners.',inc:['Daily speaking exercises','Common phrases','Pronunciation tips'],preview:''},
 {id:'p6',type:'video',title:'Class 10 Maths: Full Lecture Series',subject:'Mathematics',cls:'Class 10',board:'CBSE',format:'Video lectures',price:699,mrp:1199,
  desc:'Concept-by-concept video lessons covering the whole Class 10 maths syllabus.',inc:['Lectures for every chapter','Worked board-style questions','Access through a private YouTube playlist'],preview:'https://www.youtube.com/channel/UC1PXZRzp5Yp1kihDURNhkpg'},
 {id:'p7',type:'video',title:'Class 12 Chemistry: Organic Crash Course',subject:'Chemistry',cls:'Class 12',board:'CBSE',format:'Video lectures',price:599,mrp:999,
  desc:'A focused revision course on organic chemistry reactions and mechanisms.',inc:['Named reactions explained','Mechanism practice','Access through a private YouTube playlist'],preview:'https://www.youtube.com/channel/UC1PXZRzp5Yp1kihDURNhkpg'},
 {id:'p8',type:'video',title:'Class 8 Science: Concept Videos',subject:'Science',cls:'Class 8',board:'CBSE',format:'Video lectures',price:399,mrp:699,
  desc:'Simple explanations with examples for every Class 8 science chapter.',inc:['Chapter-wise concept videos','Quick quizzes in each lesson','Access through a private YouTube playlist'],preview:'https://www.youtube.com/channel/UC1PXZRzp5Yp1kihDURNhkpg'},
 {id:'p9',type:'video',title:'Class 11 Accountancy: Lecture Series',subject:'Accountancy',cls:'Class 11',board:'CBSE',format:'Video lectures',price:549,mrp:899,
  desc:'Journal entries, ledgers and trial balance explained step by step.',inc:['Full syllabus coverage','Practice problems with solutions','Access through a private YouTube playlist'],preview:'https://www.youtube.com/channel/UC1PXZRzp5Yp1kihDURNhkpg'},
 {id:'p10',type:'bundle',title:'Class 10 Maths Combo: Lectures and E-book',subject:'Mathematics',cls:'Class 10',board:'CBSE',format:'Video lectures + PDF',price:799,mrp:1548,
  desc:'The full Class 10 maths lecture series together with the formulas and solved examples e-book.',inc:['Class 10 Maths full lecture series','Formulas and Solved Examples e-book','Save compared with buying separately'],preview:'',includes:['p6','p1']}
];

  function copy(a){ return JSON.parse(JSON.stringify(a)); }
  function readLocal(){ try{ var v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : null; }catch(e){ return null; } }
  function writeLocal(a){ try{ localStorage.setItem(KEY, JSON.stringify(a)); }catch(e){} }
  function db(){ return window.EducationBFirebase && window.EducationBFirebase.db; }
  function waitDb(){
    return new Promise(function(res){
      var n = 0;
      (function chk(){ if(db()) return res(db()); if(++n > 50) return res(null); setTimeout(chk, 100); })();
    });
  }
  function doc(d){ return d.collection('site_content').doc('shop'); }

  function cached(){ return readLocal() || copy(DEFAULTS); }
  function load(){
    return waitDb().then(function(d){
      if(!d) return cached();
      return doc(d).get().then(function(s){
        var p = s.exists && s.data().products;
        if(Array.isArray(p)){ writeLocal(p); return p; }
        return cached();
      }, function(){ return cached(); });
    });
  }
  // Resolves with {cloud:true} when Firestore saved it, or {cloud:false, reason} when only this browser has it
  function save(list){
    writeLocal(list);
    return waitDb().then(function(d){
      if(!d) return { cloud: false, reason: 'Firebase is not available' };
      return doc(d).set({ products: list, updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
        .then(function(){ return { cloud: true }; }, function(e){ return { cloud: false, reason: (e && e.code) || 'error' }; });
    });
  }

  window.ModivsShop = {
    TYPES: { ebook: 'E-book', video: 'Video lectures', bundle: 'Combo' },
    defaults: function(){ return copy(DEFAULTS); }, cached: cached, load: load, save: save
  };
})();
