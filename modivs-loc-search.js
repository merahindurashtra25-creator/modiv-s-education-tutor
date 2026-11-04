/* Modiv's location search for the Find-a-tutor page.
   One search box with two modes:
     City      type the first letters ("lud") -> Ludhiana, ...
     Locality  type a locality ("shiv", "sec 17") -> Shivpuri, Ludhiana ...  (scoped to the chosen city when there is one)
   Suggestions come from two places, merged in one list:
     1. Our own lists (ModivsPlaces + cities/areas of approved tutors) - instant, with verified-tutor counts.
     2. Google Places Autocomplete, using the same Maps key and loader as modivs-location.js (loaded on first focus).
        Places API (New) is tried first, then the older AutocompleteService; if Google is unavailable
        (key restricted, API not enabled, offline) the box keeps working from our own lists.
   The page passes in a few small hooks (see init) so this file knows nothing about the page's filter state. */
(function(window){
 'use strict';
 var doc=document,uid=0,warned=false;
 function P(){return window.ModivsPlaces||null}
 function M(){return window.ModivsMap||null}
 function lc(s){return String(s==null?'':s).replace(/\s+/g,' ').trim().toLowerCase()}
 function tc(s){return lc(s).replace(/(^|[\s-])([a-z])/g,function(m,a,b){return a+b.toUpperCase()})}
 function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
 /* 0 = starts with, 1 = a later word starts with, 2 = contains somewhere */
 function rank(text,q){var t=lc(text);if(!q)return 0;if(t.indexOf(q)===0)return 0;if(t.indexOf(' '+q)>-1||t.indexOf('-'+q)>-1)return 1;return t.indexOf(q)>-1?2:-1}
 function warn(e){if(warned)return;warned=true;try{console.warn('Google location suggestions are not available (showing built-in suggestions only). Check that Places API is enabled for the Maps key and that the key allows this website.',e)}catch(x){}}

 /* Google sometimes names a city by its district or old name */
 var ALIAS={'sahibzada ajit singh nagar':'Mohali','s.a.s. nagar':'Mohali','sas nagar':'Mohali','ajitgarh':'Mohali','bengaluru urban':'Bengaluru','bengaluru rural':'Bengaluru','gurgaon':'Gurugram','new delhi':'Delhi','central delhi':'Delhi','south delhi':'Delhi','north delhi':'Delhi','east delhi':'Delhi','west delhi':'Delhi'};
 var STATES='andhra pradesh,arunachal pradesh,assam,bihar,chhattisgarh,goa,gujarat,haryana,himachal pradesh,jharkhand,karnataka,kerala,madhya pradesh,maharashtra,manipur,meghalaya,mizoram,nagaland,odisha,punjab,rajasthan,sikkim,tamil nadu,telangana,tripura,uttar pradesh,uttarakhand,west bengal,jammu and kashmir,ladakh,delhi,chandigarh,puducherry'.split(',');
 function isState(n){return STATES.indexOf(lc(n))>-1}
 function canonCity(n){
  var v=String(n||'').replace(/\s+(district|division)$/i,'').replace(/\s+/g,' ').trim();if(!v)return '';
  if(ALIAS[lc(v)])return ALIAS[lc(v)];
  var p=P();return p&&p.canon?p.canon('city',v):tc(v);
 }
 function canonArea(a,city){var p=P();return p&&p.canon?p.canon('area',a,city):tc(a)}

 function init(o){
  var input=o.input,list=o.list,clearBtn=o.clear,status=o.status,modeBtns=[].slice.call(o.modes||[]);
  if(!input||!list)return null;
  var id='ls'+(++uid),mode='city',items=[],active=-1,seq=0,timer=null,token=null,freeText='',googleOK=null;
  var cur={local:[],google:[],heading:'',pending:false,q:''};
  list.id=list.id||id+'-list';input.setAttribute('aria-controls',list.id);

  /* ---------- Google ---------- */
  function ensureMaps(cb){
   if(googleOK===true)return cb(true);
   if(googleOK===false)return cb(false);
   var L=window.ModivsLocation;
   if(!L||!L.loadGoogleMapsScript){googleOK=false;return cb(false)}
   L.loadGoogleMapsScript(function(err){
    googleOK=!err&&!!(window.google&&google.maps&&google.maps.places);
    if(!googleOK)warn(err);
    cb(googleOK);
   });
  }
  /* done(rawList|null). raw = {main, sec, types, id} */
  function fetchGoogle(text,city,done){
   ensureMaps(function(ok){
    if(!ok)return done(null);
    var pl=google.maps.places;
    if(!token&&pl.AutocompleteSessionToken)token=new pl.AutocompleteSessionToken();
    var typed=mode==='city'?['locality','administrative_area_level_3']:['sublocality','sublocality_level_1','neighborhood'];
    var base={input:text,sessionToken:token,language:'en'};
    function usable(r,strict){
     var t=r.types||[];if(!t.length)return true;
     var bad=['establishment','point_of_interest','route','street_address','premise','subpremise','postal_code','country','administrative_area_level_1','store'];
     if(t.some(function(x){return bad.indexOf(x)>-1}))return false;
     if(strict&&mode==='city')return t.some(function(x){return /^(locality|administrative_area_level_[234]|postal_town)$/.test(x)});
     return true;
    }
    function fromNew(res){return ((res&&res.suggestions)||[]).map(function(s){
     var p=s.placePrediction;if(!p)return null;
     return {main:p.mainText?p.mainText.text:(p.text&&p.text.text)||'',sec:p.secondaryText?p.secondaryText.text:'',types:p.types||[],id:p.placeId};
    }).filter(Boolean)}
    function viaNew(extra,strict,cb){
     var req={input:base.input,sessionToken:base.sessionToken,language:'en',region:'in',includedRegionCodes:['in']};
     for(var k in extra)req[k]=extra[k];
     pl.AutocompleteSuggestion.fetchAutocompleteSuggestions(req).then(function(r){cb(null,fromNew(r).filter(function(x){return usable(x,strict)}))},function(e){cb(e||true)});
    }
    function viaLegacy(){
     if(!pl.AutocompleteService)return done(null);
     try{
      new pl.AutocompleteService().getPlacePredictions({input:text,sessionToken:token,language:'en',componentRestrictions:{country:'in'},types:[mode==='city'?'(cities)':'(regions)']},function(pr,st){
       if(!pr||(st&&st!=='OK'&&st!=='ZERO_RESULTS')){warn(st);return done(null)}
       done(pr.map(function(p){var sf=p.structured_formatting||{};return {main:sf.main_text||p.description||'',sec:sf.secondary_text||'',types:p.types||[],id:p.place_id}}).filter(function(x){return usable(x,mode==='city')}));
      });
     }catch(e){warn(e);done(null)}
    }
    if(!(pl.AutocompleteSuggestion&&pl.AutocompleteSuggestion.fetchAutocompleteSuggestions))return viaLegacy();
    var extra={includedPrimaryTypes:typed};
    var xy=mode==='area'&&city&&M()&&M().CITY&&M().CITY[lc(city)];
    if(xy)extra.locationBias={center:{lat:xy[0],lng:xy[1]},radius:30000};
    viaNew(extra,false,function(err,res){
     if(!err&&res.length)return done(res);
     /* types not accepted, or nothing of that type: try again without the type filter */
     var e2={};if(xy)e2.locationBias=extra.locationBias;
     viaNew(e2,true,function(err2,res2){
      if(!err2)return done(res2);
      warn(err2);viaLegacy();
     });
    });
   });
  }

  /* ---------- our own lists ---------- */
  function counts(){
   var c={city:{},area:{}},m=M();
   if(m&&m.groups)m.groups(o.getTutors()||[]).forEach(function(g){if(g.area)c.area[lc(g.city)+'|'+lc(g.area)]=g.count;else c.city[lc(g.city)]=g.count});
   return c;
  }
  function knownCities(S){
   var p=P(),n={};(p?p.cities():[]).forEach(function(c){n[lc(c)]=c});
   Object.keys(S.city).forEach(function(k){if(!n[k])n[k]=tc(k)});
   return n;
  }
  function stateOf(c){var p=P();return p&&p.stateOf?p.stateOf(c):''}
  function localCities(q,S){
   var names=knownCities(S),out=[];
   Object.keys(names).forEach(function(k){
    var r=rank(names[k],q);if(r<0||(q&&r>1))return;
    var n=S.city[k]||0,st=stateOf(names[k]);
    out.push({kind:'city',name:names[k],sub:st,count:n,r:r,src:'local'});
   });
   out.sort(function(a,b){return a.r-b.r||b.count-a.count||a.name.localeCompare(b.name)});
   return out;
  }
  function localAreas(q,city,S){
   var p=P(),out=[],seen={};
   function add(a,c,r){var k=lc(a)+'|'+lc(c);if(seen[k])return;seen[k]=1;
    var st=stateOf(c);out.push({kind:'area',name:a,city:c,sub:[c,st].filter(Boolean).join(', '),count:S.area[lc(c)+'|'+lc(a)]||0,r:r,src:'local'})}
   if(city&&p){
    var names=p.areas(city);
    Object.keys(S.area).forEach(function(k){var i=k.indexOf('|');if(k.slice(0,i)===lc(city)&&!names.some(function(a){return lc(a)===k.slice(i+1)}))names.push(tc(k.slice(i+1)))});
    names.forEach(function(a){var r=rank(a,q);if(r>=0)add(a,city,r)});
   }else if(p&&p.findLocalities&&q){
    p.findLocalities(q,12).forEach(function(x){add(x.a,x.c,rank(x.a,q))});
   }
   out.sort(function(a,b){return a.r-b.r||(b.count>0)-(a.count>0)||b.count-a.count||a.name.localeCompare(b.name,'en',{numeric:true})});
   return out;
  }
  /* what to show for the text in the box, before Google answers */
  function compute(text){
   var S=counts(),city=o.getCity(),m=M(),res={heading:'',list:[]};
   var q0=lc(String(text).split(',')[0]);
   if(mode==='city'){
    var all=localCities(q0,S);
    if(!q0){
     var withT=all.filter(function(x){return x.count>0});
     if(withT.length){res.heading='Cities with verified tutors';res.list=withT.slice(0,7)}
     else{res.heading='Popular cities';var pref=['ludhiana','chandigarh','mohali','jalandhar','amritsar','patiala','delhi'];res.list=all.filter(function(x){return pref.indexOf(lc(x.name))>-1}).sort(function(a,b){return pref.indexOf(lc(a.name))-pref.indexOf(lc(b.name))})}
    }
    else res.list=all;
   }else{
    var nq=m&&m.normArea?lc(m.normArea(q0)):q0;
    var al=localAreas(nq,city,S);
    if(!nq){if(city){res.heading='Localities in '+city;res.list=al.slice(0,8)}}
    else res.list=al;
   }
   return res;
  }
  /* Google result -> list item */
  function toItems(raw,S){
   var known=knownCities(S),out=[];
   raw.forEach(function(r){
    var parts=String(r.sec||'').split(',').map(function(x){return x.trim()}).filter(function(x){return x&&lc(x)!=='india'});
    if(mode==='city'){
     var name=canonCity(r.main);if(!name||isState(name)&&!known[lc(name)])return;
     var st=parts.length?parts[parts.length-1]:'';
     out.push({kind:'city',name:name,sub:st,count:S.city[lc(name)]||0,src:'google'});
    }else{
     var city='',i;
     for(i=0;i<parts.length;i++){var c=canonCity(parts[i]);if(known[lc(c)]){city=c;break}}
     if(!city&&parts.length>1)city=canonCity(parts[parts.length-2]);
     if(!city&&parts.length===1&&!isState(parts[0]))city=canonCity(parts[0]);
     var st2=parts.length&&lc(parts[parts.length-1])!==lc(city)?parts[parts.length-1]:'';
     var nm=canonArea(r.main,city);if(!nm)return;
     out.push({kind:'area',name:nm,city:city,sub:[city,st2].filter(Boolean).join(', '),count:S.area[lc(city)+'|'+lc(nm)]||0,src:'google'});
    }
   });
   return out;
  }
  function merged(){
   var out=[],seen={};
   function add(it){
    var k=it.kind+'|'+lc(it.name)+'|'+(it.kind==='area'?lc(it.city):'');
    if(seen[k]||out.length>=8)return;seen[k]=1;out.push(it);
   }
   cur.local.slice(0,5).forEach(add);cur.google.forEach(add);cur.local.slice(5).forEach(add);
   return out;
  }

  /* ---------- drawing ---------- */
  function hl(name,q){
   var i=q?lc(name).indexOf(q):-1;if(i<0||lc(name).length!==name.length)return esc(name);
   return esc(name.slice(0,i))+'<b>'+esc(name.slice(i,i+q.length))+'</b>'+esc(name.slice(i+q.length));
  }
  var PIN='<svg class="ls-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
  function draw(){
   items=merged();active=-1;input.removeAttribute('aria-activedescendant');
   var html='';
   if(cur.heading&&items.length)html+='<li class="ls-h" role="presentation">'+esc(cur.heading)+'</li>';
   items.forEach(function(it,i){
    html+='<li class="ls-opt" role="option" id="'+id+'-o'+i+'" data-i="'+i+'" aria-selected="false">'+PIN+
     '<span class="ls-t"><span class="ls-m">'+hl(it.name,cur.q)+'</span>'+(it.sub?'<span class="ls-s">'+esc(it.sub)+'</span>':'')+'</span>'+
     (it.count?'<span class="ls-n">'+it.count+(it.count===1?' tutor':' tutors')+'</span>':'')+'</li>';
   });
   if(!items.length){
    var t=input.value.trim();
    if(cur.pending)html='<li class="ls-msg" role="presentation">Searching…</li>';
    else if(mode==='area'&&!t)html='<li class="ls-msg" role="presentation">Type a locality, for example “Model Town” or “Sector 17”.</li>';
    else if(t)html='<li class="ls-msg" role="presentation">No '+(mode==='city'?'cities':'localities')+' found for “'+esc(t)+'”. '+(mode==='city'?'Check the spelling, or try Locality.':'Check the spelling, or try City.')+'</li>';
   }
   if(items.some(function(x){return x.src==='google'}))html+='<li class="ls-g" role="presentation">Powered by Google</li>';
   list.innerHTML=html;
   var show=!!html;list.hidden=!show;input.setAttribute('aria-expanded',show?'true':'false');
   if(status)status.textContent=items.length?items.length+(items.length===1?' suggestion':' suggestions')+' available. Use up and down arrow keys.':'';
  }
  function close(){list.hidden=true;input.setAttribute('aria-expanded','false');active=-1;input.removeAttribute('aria-activedescendant');clearTimeout(timer);seq++}
  function setActive(i){
   var opts=list.querySelectorAll('.ls-opt');if(!opts.length)return;
   if(i<0)i=opts.length-1;if(i>=opts.length)i=0;
   [].forEach.call(opts,function(e){e.setAttribute('aria-selected','false')});
   active=i;opts[i].setAttribute('aria-selected','true');
   input.setAttribute('aria-activedescendant',opts[i].id);
   if(opts[i].scrollIntoView)opts[i].scrollIntoView({block:'nearest'});
  }

  /* ---------- behaviour ---------- */
  function refresh(){
   var text=input.value.trim(),my=++seq,q0=lc(text.split(',')[0]),m=M();
   var c=compute(text);
   cur.local=c.list;cur.heading=c.heading;cur.google=[];
   cur.q=mode==='area'&&m&&m.normArea?lc(m.normArea(q0)):q0;
   cur.pending=q0.length>=2;
   draw();
   clearTimeout(timer);
   if(q0.length<2)return;
   timer=setTimeout(function(){
    var city=o.getCity(),qtext=text;
    if(mode==='area'&&city&&text.indexOf(',')<0)qtext=text+', '+city;
    fetchGoogle(qtext,city,function(raw){
     if(my!==seq)return;
     cur.pending=false;
     cur.google=raw?toItems(raw,counts()):[];
     /* with a city chosen, show that city's localities first */
     if(mode==='area'&&city)cur.google.sort(function(a,b){return (lc(b.city)===lc(city))-(lc(a.city)===lc(city))});
     draw();
    });
   },220);
  }
  function currentText(){
   var city=o.getCity(),area=o.getArea();
   return area?area+(city?', '+city:''):city||'';
  }
  function upd(){if(clearBtn)clearBtn.hidden=!input.value}
  function setMode(m,silent){
   mode=m;
   modeBtns.forEach(function(b){b.setAttribute('aria-checked',b.getAttribute('data-mode')===m?'true':'false');b.tabIndex=b.getAttribute('data-mode')===m?0:-1});
   input.placeholder=m==='city'?'Type your city, e.g. Lud…':'Type a locality, e.g. Model Town…';
   if(!silent){token=null}
  }
  function choose(it){
   if(!it)return;
   if(it.kind==='city'){o.pickCity(it.name);input.value=it.name;setMode('city',true)}
   else{
    var city=it.city||o.getCity(),area=canonArea(it.name,city);
    o.pickLocality(city,area);input.value=area+(city?', '+city:'');setMode('area',true);
   }
   token=null;freeText='';close();upd();
   if(status)status.textContent='Showing tutors for '+input.value;
   input.blur();
  }
  function clearState(){
   if(o.getCity()||o.getArea())o.clearLocation();
   if(freeText){freeText='';o.freeText('')}
  }
  /* called when the search form is submitted */
  function commit(){
   var text=input.value.trim();
   if(!text||text===currentText())return false;
   var pick=items[active]||items[0];
   if(pick){choose(pick);return true}
   var c=compute(text).list;
   if(c.length){choose(c[0]);return true}
   if(o.getCity()||o.getArea())o.clearLocation();
   freeText=text;o.freeText(text);close();return true;
  }
  /* called by the page after every render, so the box follows the filters (checkboxes, Clear all, links) */
  function sync(){
   if(doc.activeElement===input)return;
   var city=o.getCity(),area=o.getArea();
   if(!city&&!area&&freeText&&o.getFreeText&&o.getFreeText()===freeText){input.value=freeText;upd();return}
   freeText='';
   if(area)setMode('area',true);
   input.value=currentText();upd();
  }

  input.addEventListener('input',function(){
   upd();
   if(!input.value.trim())clearState();
   refresh();
  });
  input.addEventListener('focus',function(){
   ensureMaps(function(){});
   try{input.select()}catch(e){}
   refresh();
  });
  input.addEventListener('click',function(){if(list.hidden)refresh()});
  input.addEventListener('blur',function(){close()});
  input.addEventListener('keydown',function(e){
   var k=e.key;
   if(k==='ArrowDown'||k==='ArrowUp'){
    e.preventDefault();
    if(list.hidden){refresh();return}
    setActive(active+(k==='ArrowDown'?1:-1));
   }else if(k==='Enter'){
    if(!list.hidden&&active>-1){e.preventDefault();choose(items[active])}
   }else if(k==='Escape'){
    if(!list.hidden){e.preventDefault();close()}
   }else if(k==='Tab'){close()}
  });
  /* mousedown (not click) so the box keeps focus and the list does not close before the pick */
  list.addEventListener('mousedown',function(e){
   e.preventDefault();
   var li=e.target.closest?e.target.closest('.ls-opt'):null;
   if(li)choose(items[+li.getAttribute('data-i')]);
  });
  if(clearBtn)clearBtn.addEventListener('click',function(){
   input.value='';upd();clearState();input.focus();refresh();
  });
  modeBtns.forEach(function(b){
   b.addEventListener('click',function(){
    var m=b.getAttribute('data-mode');if(m===mode){input.focus();return}
    setMode(m);
    /* the box shows the chosen place (e.g. "Ludhiana"): start fresh in the new mode instead of searching for it */
    if(input.value.trim()===currentText())input.value='';
    upd();input.focus();refresh();
   });
   b.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'||e.key==='ArrowDown'||e.key==='ArrowUp'){
     e.preventDefault();var other=modeBtns.filter(function(x){return x!==b})[0];if(other){other.click()}
    }
   });
  });
  setMode('city',true);upd();
  return {commit:commit,sync:sync,setMode:setMode};
 }

 var api=null;
 window.ModivsLocSearch={
  init:function(o){api=init(o);return api},
  commit:function(){return api?api.commit():false},
  sync:function(){if(api)api.sync()}
 };
})(window);
