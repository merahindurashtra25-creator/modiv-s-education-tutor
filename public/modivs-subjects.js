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
  var GROUPS={
    general:['Academic Subjects (School & College)','Competitive Exam Preparation','Preschool & Early Learning'],
    skill:['Art, Craft & Design','IT, Coding & Technology','Language Learning','Music, Dance & Performing Arts','Sports, Fitness & Wellness']
  };
  function groupOf(cat){return GROUPS.skill.indexOf(cat)>-1?'skill':(GROUPS.general.indexOf(cat)>-1?'general':'other')}
  function cmp(a,b){return a.localeCompare(b,'en',{sensitivity:'base'})}
  Object.keys(CATS).forEach(function(k){CATS[k].sort(cmp)});
  function categories(){return Object.keys(CATS).sort(cmp)}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function all(){var o=[];categories().forEach(function(c){o=o.concat(CATS[c])});return o.sort(cmp)}
  function catOf(sub){var l=String(sub).toLowerCase(),r='';categories().forEach(function(c){if(CATS[c].some(function(x){return x.toLowerCase()===l}))r=c});return r}

  /* Group a tutor's subjects under their categories. A subject added by the tutor that is not in the list is
     filed under the most relevant category (matched on keywords); if nothing fits it goes under "Other Subjects". */
  var HINTS=[
    ['Preschool & Early Learning',/\b(abacus|phonics|montessori|kindergarten|nursery|preschool|pre-school|toddler|early)\b/i],
    ['Competitive Exam Preparation',/\b(neet|jee|upsc|pcs|ssc|olympiad|clat|cuet|gate|cat|mba|nda|cds|afcat|tet|ctet|ias|banking|railway|entrance|competitive|exam|ntse|kvpy|sat|gre|gmat|ca|cs)\b/i],
    ['IT, Coding & Technology',/\b(cod(e|ing)|program(ming)?|python|java|javascript|html|css|php|sql|react|node|angular|web|software|app|android|ios|data|ai|ml|machine|cyber|hacking|cloud|devops|excel|tally|computer|linux|robotics|iot|blockchain|c\+\+|ui|ux)\b/i],
    ['Music, Dance & Performing Arts',/\b(music|dance|danc\w*|sing\w*|vocal|guitar|piano|keyboard|drum\w*|tabla|violin|flute|harmonium|ukulele|sitar|acting|theatre|theater|kathak|bharatanatyam|choreograph\w*|instrument\w*|anchor\w*|mimicry|stage)\b/i],
    ['Art, Craft & Design',/\b(art|draw\w*|paint\w*|sketch\w*|craft|design\w*|calligraphy|photograph\w*|video|mehendi|mehndi|pottery|origami|embroidery|knitting|crochet|resin|clay|animation|illustration|rangoli|tattoo)\b/i],
    ['Language Learning',/\b(language|spanish|russian|italian|french|german|japanese|korean|chinese|mandarin|arabic|portuguese|dutch|turkish|spoken|ielts|toefl|pte|duolingo|communication|speaking|accent|grammar|vocabulary|sign language)\b/i],
    ['Sports, Fitness & Wellness',/\b(yoga|fitness|gym|sport\w*|swim\w*|cricket|football|chess|karate|taekwondo|skating|zumba|meditat\w*|wellness|nutrition|martial|tennis|badminton|basketball|volleyball|boxing|athletic\w*|cycling|aerobics|pilates|diet)\b/i],
    ['Academic Subjects (School & College)',/\b(math\w*|maths|science|physics|chemistry|biology|zoology|botany|history|geography|civics|economics|accountancy|accounting|commerce|business|statistic\w*|psychology|sociology|philosophy|law|legal|evs|sanskrit|urdu|hindi|english|punjabi|social|polity|political|engineering|medical|anatomy|literature|finance|management|education)\b/i]
  ];
  function relevantCat(sub){
    for(var i=0;i<HINTS.length;i++){ if(HINTS[i][1].test(String(sub))) return HINTS[i][0]; }
    return 'Other Subjects';
  }
  function group(list){
    var seen={},map={};
    (Array.isArray(list)?list:[]).forEach(function(x){
      x=String(x==null?'':x).trim(); if(!x) return;
      var k=x.toLowerCase(); if(seen[k]) return; seen[k]=1;
      var c=catOf(x)||relevantCat(x);
      (map[c]=map[c]||[]).push(x);
    });
    var order=categories().concat('Other Subjects');
    return order.filter(function(c){return map[c]&&map[c].length}).map(function(c){return {cat:c,subs:map[c].sort(cmp)}});
  }

  // Returns the picker as an HTML string. Categories and subjects are real, visible checkboxes (not chips).
  function picker(name,selected,opts){
    opts=opts||{};selected=Array.isArray(selected)?selected:[];
    var map={},keys=categories();
    keys.forEach(function(k){map[k]=CATS[k].slice()});
    var other=selected.filter(function(s){return !catOf(s)}).sort(cmp);
    if(other.length){map['Other (added by you)']=other;keys=keys.concat('Other (added by you)')}
    var lower=selected.map(function(s){return String(s).toLowerCase()});
    var selGrp={};keys.forEach(function(k){if(map[k].some(function(x){return lower.indexOf(String(x).toLowerCase())>-1}))selGrp[groupOf(k)]=true});
    var h='<div class="msub" data-name="'+esc(name)+'"><div class="msub-find"><label class="msub-lab" for="msubq_'+esc(name)+'">Search subject <span style="font-weight:400;opacity:.7">type the first letters, then pick from the list</span></label><input type="text" class="msub-q" id="msubq_'+esc(name)+'" placeholder="e.g. Mat for Maths, Phy for Physics" autocomplete="off" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="msubl_'+esc(name)+'"><ul class="msub-list" id="msubl_'+esc(name)+'" role="listbox" hidden></ul></div>'+(opts.groups?'<div class="msub-lab">Or browse: 1. What do you teach?</div><div class="msub-grid msub-types" role="group" aria-label="Type of subjects"><label class="msub-cb"><input type="checkbox" data-type="general"'+(selGrp.general?' checked':'')+'><span>General subjects <small>school, college, exams, early learning</small></span></label><label class="msub-cb"><input type="checkbox" data-type="skill"'+(selGrp.skill?' checked':'')+'><span>Skill development <small>coding, music, dance, art, languages, sports</small></span></label></div><div class="msub-lab msub-catlab"'+((selGrp.general||selGrp.skill||other.length)?'':' hidden')+'>2. Choose category</div>':'<div class="msub-lab">Or browse: 1. Choose category</div>')+'<div class="msub-grid msub-cats'+(opts.groups?' mg'+(selGrp.general?' sg':'')+(selGrp.skill?' sk':'')+(other.length?' so':''):'')+'" role="group" aria-label="Subject categories">';
    var panels='';
    keys.forEach(function(k,i){
      var n=map[k].filter(function(s){return lower.indexOf(s.toLowerCase())>-1}).length;
      h+='<label class="msub-cb" data-grp="'+groupOf(k)+'"><input type="checkbox" data-cat="'+i+'"'+(n?' checked':'')+'><span>'+esc(k)+' <b class="msub-n">'+(n?n:'')+'</b></span></label>';
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


  // "General subjects" / "Skill development" switch (only when the picker was made with {groups:true})
  document.addEventListener('change',function(e){
    var t=e.target;if(!t||!t.getAttribute||t.getAttribute('data-type')===null)return;
    var box=t.closest('.msub'),cats=box&&box.querySelector('.msub-cats');if(!cats)return;
    var g=t.getAttribute('data-type'),cls=g==='general'?'sg':'sk';
    cats.classList.toggle(cls,t.checked);
    if(!t.checked){                                   // unticking a type clears the categories (and subjects) that belong to it
      Array.prototype.forEach.call(cats.querySelectorAll('label[data-grp="'+g+'"] input[data-cat]'),function(c){
        if(c.checked){c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}))}
      });
    }
    var lab=box.querySelector('.msub-catlab');
    if(lab)lab.hidden=!(cats.classList.contains('sg')||cats.classList.contains('sk')||cats.classList.contains('so'));
  });

  /* ---- type-ahead subject search ---- */
  function matches(q){
    q=q.trim().toLowerCase();if(!q)return [];
    var res=[];
    categories().forEach(function(c){CATS[c].forEach(function(sub){
      var l=sub.toLowerCase(),score=-1;
      if(l.indexOf(q)===0)score=0;
      else if(l.split(/[^a-z0-9]+/).some(function(wd){return wd.indexOf(q)===0}))score=1;
      else if(q.length>1&&l.indexOf(q)>-1)score=2;
      if(score>-1)res.push({s:sub,c:c,k:score});
    })});
    res.sort(function(a,b){return a.k-b.k||cmp(a.s,b.s)});
    return res.slice(0,10);
  }
  function findCb(box,sub){
    var l=sub.toLowerCase(),r=null;
    Array.prototype.forEach.call(box.querySelectorAll('input[data-group]'),function(x){if(!r&&x.value.toLowerCase()===l)r=x});
    return r;
  }
  function renderList(box){
    var q=box.querySelector('.msub-q'),ul=box.querySelector('.msub-list'),m=matches(q.value);
    box._m=m;box._i=-1;
    if(!q.value.trim()){ul.hidden=true;ul.innerHTML='';q.setAttribute('aria-expanded','false');return}
    if(!m.length){ul.innerHTML='<li class="msub-none">No match. Add it in the “other subject” box below.</li>'}
    else ul.innerHTML=m.map(function(x,i){
      var cb=findCb(box,x.s),on=cb&&cb.checked;
      return '<li role="option" class="msub-opt'+(on?' on':'')+'" data-i="'+i+'"><span>'+esc(x.s)+'</span><small>'+(on?'✓ Added':esc(x.c.replace(/ \(.*\)/,'').replace(/ &.*/,'')))+'</small></li>';
    }).join('');
    ul.hidden=false;q.setAttribute('aria-expanded','true');
  }
  function pick(box,i){
    var x=(box._m||[])[i];if(!x)return;
    var cb=findCb(box,x.s),q=box.querySelector('.msub-q');
    if(cb){
      var panel=cb.closest('.msub-panel'),pi=panel&&panel.getAttribute('data-p'),cat=pi!==null?box.querySelector('input[data-cat="'+pi+'"]'):null;
      if(cat&&!cat.checked)cat.checked=true;
      var lbl=cat&&cat.closest('label'),gg=lbl&&lbl.getAttribute('data-grp'),cg=box.querySelector('.msub-cats');
      if(cg&&cg.classList.contains('mg')&&(gg==='general'||gg==='skill')){var tb=box.querySelector('input[data-type="'+gg+'"]');if(tb&&!tb.checked){tb.checked=true;tb.dispatchEvent(new Event('change',{bubbles:true}))}}
      if(panel)panel.hidden=false;
      if(!cb.checked){cb.checked=true;cb.dispatchEvent(new Event('change',{bubbles:true}))}
      if(cb.scrollIntoView)try{cb.scrollIntoView({block:'nearest'})}catch(e){}
    }
    q.value='';renderList(box);q.focus();
  }
  function mark(box){
    var items=box.querySelectorAll('.msub-opt');
    Array.prototype.forEach.call(items,function(li,i){li.classList.toggle('act',i===box._i);if(i===box._i&&li.scrollIntoView)li.scrollIntoView({block:'nearest'})});
  }
  document.addEventListener('input',function(e){
    var t=e.target;if(t&&t.classList&&t.classList.contains('msub-q'))renderList(t.closest('.msub'));
  });
  document.addEventListener('focusin',function(e){
    var t=e.target;if(t&&t.classList&&t.classList.contains('msub-q'))renderList(t.closest('.msub'));
  });
  document.addEventListener('mousedown',function(e){
    var li=e.target.closest&&e.target.closest('.msub-opt');
    if(li){e.preventDefault();pick(li.closest('.msub'),+li.getAttribute('data-i'));return}
    Array.prototype.forEach.call(document.querySelectorAll('.msub-list'),function(ul){
      if(!ul.hidden&&!(e.target.closest&&e.target.closest('.msub-find'))){ul.hidden=true;var q=ul.parentNode.querySelector('.msub-q');if(q)q.setAttribute('aria-expanded','false')}
    });
  });
  document.addEventListener('keydown',function(e){
    var t=e.target;if(!t||!t.classList||!t.classList.contains('msub-q'))return;
    var box=t.closest('.msub'),ul=box.querySelector('.msub-list'),n=(box._m||[]).length;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      if(ul.hidden)renderList(box);n=(box._m||[]).length;if(!n)return;e.preventDefault();
      box._i=e.key==='ArrowDown'?(box._i+1)%n:(box._i<=0?n-1:box._i-1);mark(box);
    }else if(e.key==='Enter'){
      if(!ul.hidden){e.preventDefault();e.stopPropagation();if(n)pick(box,box._i>-1?box._i:0)}
    }else if(e.key==='Escape'){
      if(!ul.hidden){e.preventDefault();e.stopPropagation();ul.hidden=true;t.setAttribute('aria-expanded','false')}
    }
  },true);

  var css=document.createElement('style');
  css.textContent='.msub-cats.mg:not(.sg) label[data-grp=general],.msub-cats.mg:not(.sk) label[data-grp=skill]{display:none!important}.msub-cats.mg:not(.sg):not(.sk):not(.so){display:none!important}.msub-types small{display:block;font-weight:400;opacity:.75;font-size:.78rem;margin-top:2px}.msub-catlab[hidden]{display:none}.msub-find{position:relative;margin:0 0 14px}.msub-q{width:100%}.msub-list{position:absolute;left:0;right:0;top:100%;z-index:30;margin:4px 0 0;padding:4px;list-style:none;background:#fff;border:1.5px solid #dfe5ee;border-radius:12px;box-shadow:0 14px 34px rgba(20,33,61,.18);max-height:260px;overflow:auto}.msub-list[hidden]{display:none}.msub-opt{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 12px;border-radius:8px;cursor:pointer;font-size:.93rem;color:#14213d}.msub-opt small{color:#5d6b82;font-size:.76rem;white-space:nowrap}.msub-opt:hover,.msub-opt.act{background:#fff4d6}.msub-opt.on small{color:#0e7c66;font-weight:700}.msub-none{padding:10px 12px;font-size:.88rem;color:#5d6b82}.msub-lab{font-weight:700;font-size:.85rem;margin:6px 0 8px}.msub-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:4px 14px}.msub-cb{display:flex!important;align-items:flex-start;gap:9px;margin:0!important;padding:6px 4px;font-weight:400!important;font-size:.92rem;cursor:pointer;line-height:1.35}.msub-cb input{position:static!important;opacity:1!important;width:18px;height:18px;flex:none;margin:1px 0 0;accent-color:var(--accent,#0e7c66);cursor:pointer}.msub-cb:has(input:checked) span{font-weight:600}.msub-cb:focus-within{outline:2px solid #7fd1bd;outline-offset:1px;border-radius:6px}.msub-panel{margin-top:14px;padding:14px;border:1.5px solid var(--line,#e5dcc7);border-radius:14px;background:rgba(0,0,0,.015)}.msub-panel[hidden]{display:none}.msub-n{display:inline-block;min-width:1.2em;margin-left:2px;font-size:.78rem}';
  (document.head||document.documentElement).appendChild(css);

  w.ModivsSubjects={CATS:CATS,groups:GROUPS,categories:categories,subjectsFor:function(c){return (CATS[c]||[]).slice()},all:all,categoryOf:catOf,group:group,picker:picker};
})(window);
