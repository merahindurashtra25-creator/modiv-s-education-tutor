/* Modiv's Education - subject categories + subject picker.
   Pick one or more categories, then the matching subjects appear as plain checkboxes (no chips).
   Categories and subjects are always shown in alphabetical order.
   Subject checkboxes keep data-group="<name>", so each form's existing group('<name>') still works. */
(function(w){
  var CATS={
    'Academic Subjects (School & College)':['Accountancy','Arts & Humanities','Biology','Business Studies','Chemistry','Commerce','Computer Science','Economics','Engineering Subjects','English','Environmental Science','Geography','Hindi','History','Informatics Practices','Legal Studies','Mathematics','Medical Subjects','Philosophy','Physics','Political Science','Psychology','Punjabi','Sanskrit','Science','Social Science','Sociology','Statistics','Urdu'],
    'Art, Craft & Design':['Art','Calligraphy','Candle & Resin Craft','Clay Modelling','Drawing & Painting','Fashion Designing','Graphic Designing','Handwriting Improvement','Interior Designing','Mehendi Design','Origami & Paper Craft','Sketching','Photography','Video Editing'],
    'Competitive Exam Preparation':['AFCAT','Banking Exams','CA / CS Foundation','CAT / MBA Entrance','CDS','CLAT','CTET / TET','CUET','Defence Exams','GATE','JEE (Main & Advanced)','NDA','NEET (UG / PG)','Olympiads','Railway Exams','SSC Exams','State PSC Exams','UPSC / PCS'],
    'IT, Coding & Technology':['Angular','App Development','Artificial Intelligence','C / C++','Cloud Computing','Coding / Programming','Computer Basics','CSS','Cyber Security','Data Science','DevOps','Digital Marketing','Ethical Hacking','Excel & MS Office','HTML','Java','JavaScript','Machine Learning','Node JS','PHP','Python','React JS','Software Testing','Web Development'],
    'Language Learning':['Arabic','Business English','Chinese (Mandarin)','Duolingo English Test','French','German','IELTS','Italian','Japanese','Korean','Personality & Communication Skills','PTE','Russian','Spanish','Spoken English','TOEFL'],
    'Music, Dance & Performing Arts':['Acting','Anchoring','Bharatanatyam','Contemporary Dance','Dance','Drums','Guitar','Harmonium','Hip Hop Dance','Kathak','Keyboard / Piano','Music','Public Speaking','Singing / Vocals','Tabla','Theatre Arts','Violin'],
    'Preschool & Early Learning':['Abacus / Vedic Maths','Activity Based Learning','Early Literacy','Early Maths','Early Reading Skills','Kindergarten Basics','Montessori Learning','Phonics','Pre-Primary (Nursery\u2013KG)','Storytelling'],
    'Sports, Fitness & Wellness':['Aerobics','Badminton','Basketball','Boxing','Chess','Cricket','Fitness Training','Football','Gym Training','Karate','Martial Arts','Meditation','Skating','Swimming','Table Tennis','Taekwondo','Yoga','Zumba']
  };
  function cmp(a,b){return a.localeCompare(b,'en',{sensitivity:'base'})}
  Object.keys(CATS).forEach(function(k){CATS[k].sort(cmp)});
  function categories(){return Object.keys(CATS).sort(cmp)}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function all(){var o=[];categories().forEach(function(c){o=o.concat(CATS[c])});return o.sort(cmp)}
  function catOf(sub){var l=String(sub).toLowerCase(),r='';categories().forEach(function(c){if(CATS[c].some(function(x){return x.toLowerCase()===l}))r=c});return r}

  // Returns the picker as an HTML string. Categories and subjects are real, visible checkboxes (not chips).
  function picker(name,selected,opts){
    opts=opts||{};selected=Array.isArray(selected)?selected:[];
    var map={},keys=categories();
    keys.forEach(function(k){map[k]=CATS[k].slice()});
    var other=selected.filter(function(s){return !catOf(s)}).sort(cmp);
    if(other.length){map['Other (added by you)']=other;keys=keys.concat('Other (added by you)')}
    var lower=selected.map(function(s){return String(s).toLowerCase()});
    var h='<div class="msub" data-name="'+esc(name)+'"><div class="msub-lab">1. Choose category</div><div class="msub-grid msub-cats" role="group" aria-label="Subject categories">';
    var panels='';
    keys.forEach(function(k,i){
      var n=map[k].filter(function(s){return lower.indexOf(s.toLowerCase())>-1}).length;
      h+='<label class="msub-cb"><input type="checkbox" data-cat="'+i+'"'+(n?' checked':'')+'><span>'+esc(k)+' <b class="msub-n">'+(n?n:'')+'</b></span></label>';
      panels+='<div class="msub-panel" data-p="'+i+'"'+(n?'':' hidden')+'><div class="msub-lab">2. '+esc(k)+': choose subjects</div><div class="msub-grid" role="group" aria-label="'+esc(k)+' subjects">'+
        map[k].map(function(s){return '<label class="msub-cb"><input type="checkbox" data-group="'+esc(name)+'" value="'+esc(s)+'"'+(lower.indexOf(s.toLowerCase())>-1?' checked':'')+'><span>'+esc(s)+'</span></label>'}).join('')+'</div></div>';
    });
    return h+'</div>'+panels+'</div>';
  }

  document.addEventListener('change',function(e){
    var t=e.target;if(!t||!t.closest)return;
    var box=t.closest('.msub');if(!box)return;
    var ci=t.getAttribute('data-cat');
    if(ci!==null){                                   // a category was ticked / unticked
      var p=box.querySelector('.msub-panel[data-p="'+ci+'"]');if(!p)return;
      if(t.checked){p.hidden=false}
      else{p.hidden=true;Array.prototype.forEach.call(p.querySelectorAll('input:checked'),function(x){x.checked=false});}
    }
    var pn=t.closest('.msub-panel');                 // keep the count next to the category up to date
    var idx=pn?pn.getAttribute('data-p'):ci;
    if(idx!==null){
      var cnt=box.querySelector('input[data-cat="'+idx+'"]');
      var pp=box.querySelector('.msub-panel[data-p="'+idx+'"]');
      if(cnt&&pp){var b=cnt.parentNode.querySelector('.msub-n'),n=pp.querySelectorAll('input:checked').length;if(b)b.textContent=n?n:''}
    }
  });

  var css=document.createElement('style');
  css.textContent='.msub-lab{font-weight:700;font-size:.85rem;margin:6px 0 8px}.msub-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:4px 14px}.msub-cb{display:flex!important;align-items:flex-start;gap:9px;margin:0!important;padding:6px 4px;font-weight:400!important;font-size:.92rem;cursor:pointer;line-height:1.35}.msub-cb input{position:static!important;opacity:1!important;width:18px;height:18px;flex:none;margin:1px 0 0;accent-color:var(--accent,#0e7c66);cursor:pointer}.msub-cb:has(input:checked) span{font-weight:600}.msub-cb:focus-within{outline:2px solid #7fd1bd;outline-offset:1px;border-radius:6px}.msub-panel{margin-top:14px;padding:14px;border:1.5px solid var(--line,#e5dcc7);border-radius:14px;background:rgba(0,0,0,.015)}.msub-panel[hidden]{display:none}.msub-n{display:inline-block;min-width:1.2em;margin-left:2px;font-size:.78rem}';
  (document.head||document.documentElement).appendChild(css);

  w.ModivsSubjects={CATS:CATS,categories:categories,subjectsFor:function(c){return (CATS[c]||[]).slice()},all:all,categoryOf:catOf,picker:picker};
})(window);
