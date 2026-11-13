/* Modiv's shared location helpers (no map, no external services).
   - ModivsMap.areasOf(tutor): home area plus the extra areas the tutor can travel to
   - ModivsMap.groups(tutors): city and area groups with tutor counts
   - ModivsMap.normArea(text): "sec 20" -> "Sector 20"
   - ModivsMap.suggest(groups, city, text): the typed area plus nearby verified areas
   - ModivsMap.renderSuggest(panel, result, onPick): draws that result as tappable chips
   "Nearby" means: same-numbered sectors/phases close by number (Sector 20 -> 19, 21, 22 ...),
   areas sharing a word, then other verified areas in the city, then verified nearby cities. */
(function(){
 var CITY={
  ludhiana:[30.9010,75.8573],chandigarh:[30.7333,76.7794],mohali:[30.7046,76.7179],'sas nagar':[30.7046,76.7179],panchkula:[30.6942,76.8606],
  patiala:[30.3398,76.3869],jalandhar:[31.3260,75.5762],amritsar:[31.6340,74.8723],bathinda:[30.2110,74.9455],ambala:[30.3782,76.7767],
  zirakpur:[30.6425,76.8173],kharar:[30.7460,76.6460],khanna:[30.7050,76.2210],moga:[30.8160,75.1710],hoshiarpur:[31.5143,75.9115],
  phagwara:[31.2240,75.7708],pathankot:[32.2643,75.6421],sangrur:[30.2458,75.8421],ferozepur:[30.9331,74.6225],kapurthala:[31.3800,75.3800],
  delhi:[28.6139,77.2090],'new delhi':[28.6139,77.2090],gurugram:[28.4595,77.0266],gurgaon:[28.4595,77.0266],noida:[28.5355,77.3910],
  ghaziabad:[28.6692,77.4538],faridabad:[28.4089,77.3178],kolkata:[22.5726,88.3639],mumbai:[19.0760,72.8777],bengaluru:[12.9716,77.5946],
  bangalore:[12.9716,77.5946],hyderabad:[17.3850,78.4867],pune:[18.5204,73.8567],chennai:[13.0827,80.2707],jaipur:[26.9124,75.7873],
  lucknow:[26.8467,80.9462],dehradun:[30.3165,78.0322],shimla:[31.1048,77.1734],kanpur:[26.4499,80.3319],indore:[22.7196,75.8577],
  ahmedabad:[23.0225,72.5714],patna:[25.5941,85.1376],ranchi:[23.3441,85.3096],bhopal:[23.2599,77.4126]
 };
 function lc(s){return String(s||'').trim().toLowerCase()}
 function tc(c){return String(c||'').replace(/\s+/g,' ').trim().toLowerCase().replace(/(^|[\s-])([a-z])/g,function(m,a,b){return a+b.toUpperCase()})}
 function splitList(s){return String(s||'').split(/[,;\n\/]+/).map(tc).filter(function(x){return x&&x.length<=40})}
 /* "sec 20", "sector-20", "Sec.20" -> "Sector 20";  "ph 7" -> "Phase 7" */
 function cc(c){var P=window.ModivsPlaces;return P&&P.canon?P.canon('city',c):tc(c)}
 function normArea(s){
  var t=String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
  t=t.replace(/^(sector|sec)\.?\s*-?\s*(?=\d)/,'sector ').replace(/^(phase|ph)\.?\s*-?\s*(?=\d)/,'phase ');
  var P=window.ModivsPlaces;return P&&P.canon?P.canon('area',t):tc(t);
 }
 function areasOf(t){
  if(!t)return [];
  var out=[],seen={};
  [].concat(Array.isArray(t.areas)?t.areas.map(normArea):[],t.area?[normArea(t.area)]:[],splitList(t.travel).map(normArea)).forEach(function(a){
   if(a&&!seen[a.toLowerCase()]&&a.toLowerCase()!==lc(t.city)){seen[a.toLowerCase()]=1;out.push(a)}});
  return out.slice(0,8);
 }
 function groups(tutors){
  var m={};
  (tutors||[]).forEach(function(t){
   var city=cc(t.city);if(!city)return;
   var ck=city.toLowerCase();
   (m[ck]=m[ck]||{city:city,area:null,count:0,names:[]});m[ck].count++;m[ck].names.push(t.name);
   areasOf(t).forEach(function(a){
    var k=ck+'|'+a.toLowerCase();
    (m[k]=m[k]||{city:city,area:a,count:0,names:[]});m[k].count++;m[k].names.push(t.name);
   });
  });
  return Object.keys(m).map(function(k){return m[k]}).sort(function(a,b){return b.count-a.count||a.city.localeCompare(b.city)||String(a.area).localeCompare(String(b.area))});
 }

 /* ---- nearness ---- */
 function km(a,b){var R=6371,r=Math.PI/180,dl=(b[0]-a[0])*r,dn=(b[1]-a[1])*r,x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dn/2)*Math.sin(dn/2);return 2*R*Math.asin(Math.sqrt(x))}
 function parts(a){var m=/^([a-z][a-z .'-]*?)\s*(\d+)\s*([a-z0-9]*)$/.exec(lc(a));return m?{p:m[1].trim(),n:+m[2],s:m[3]}:null}
 function words(a){return lc(a).split(/[^a-z0-9]+/).filter(function(w){return w.length>2&&w!=='sector'&&w!=='phase'&&w!=='road'&&w!=='nagar'})}
 /* smaller = closer. <100 counts as "nearby" */
 function dist(a,b){
  var pa=parts(a),pb=parts(b);
  if(pa&&pb&&pa.p===pb.p)return Math.abs(pa.n-pb.n)+(pa.s===pb.s?0:.5);
  var wa=words(a),wb=words(b);
  if(wa.some(function(w){return wb.indexOf(w)>-1}))return 40;
  return 100;
 }
 function nearCities(gr,city){
  var here=CITY[lc(city)];if(!here)return [];
  return gr.filter(function(g){return !g.area&&lc(g.city)!==lc(city)&&CITY[lc(g.city)]&&km(here,CITY[lc(g.city)])<=60})
   .sort(function(a,b){return km(here,CITY[lc(a.city)])-km(here,CITY[lc(b.city)])});
 }

 /* suggest(groups, city, text) ->
    {city, typed, exact, items:[{g,near}], cityGroup, cities:[city groups]}
    typed: what the person typed (normalised), exact: matching verified area group or null */
 function suggest(gr,city,text){
  var typed=normArea(text),q=lc(typed);
  var all=gr.filter(function(g){return g.area});
  var pool=city?all.filter(function(g){return lc(g.city)===lc(city)}):all;
  var exact=null;
  pool.forEach(function(g){if(!exact&&lc(g.area)===q)exact=g});
  var eff=city||(exact?exact.city:'');
  if(!eff&&q){var hit=pool.filter(function(g){return lc(g.area).indexOf(q)>-1})[0];if(hit)eff=hit.city}
  var local=eff?all.filter(function(g){return lc(g.city)===lc(eff)}):pool;
  var items=[];
  if(!q){
   items=local.slice(0,8).map(function(g){return {g:g,near:false}});
  }else{
   var contains=local.filter(function(g){return g!==exact&&lc(g.area).indexOf(q)>-1});
   var seen={};contains.forEach(function(g){seen[g.city+'|'+g.area]=1;items.push({g:g,near:false})});
   local.filter(function(g){return g!==exact&&!seen[g.city+'|'+g.area]})
    .map(function(g){return {g:g,d:dist(typed,g.area)}})
    .sort(function(a,b){return a.d-b.d||b.g.count-a.g.count})
    .forEach(function(x){items.push({g:x.g,near:x.d<=12||x.d===40})});
  }
  var cg=null;gr.forEach(function(g){if(!g.area&&eff&&lc(g.city)===lc(eff))cg=g});
  return {city:eff||city||'',typed:typed,exact:exact,items:items.slice(0,10),cityGroup:cg,cities:eff?nearCities(gr,eff).slice(0,4):[]};
 }

 /* ---- shared look ---- */
 var st=document.createElement('style');
 st.textContent='.mvs{display:grid;gap:12px;font-size:.92rem;color:var(--navy,#1A2035)}.mvs h4{margin:0 0 6px;font-size:.82rem;font-weight:700;letter-spacing:.02em;text-transform:uppercase;color:var(--muted,#555b78)}'+
 '.mvs .typed{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:10px 14px;border-radius:12px;background:#fff;border:1.5px solid var(--yellow,#EBB92E)}.mvs .typed b{font-size:1rem}.mvs .typed span{color:var(--muted,#555b78);font-size:.85rem}'+
 '.mvs .chips{display:flex;flex-wrap:wrap;gap:8px}.mvs .chip{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:99px;border:1.5px solid var(--line,#eadfc9);background:#fff;color:var(--navy,#1A2035);font:600 .86rem "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer;transition:background .15s,border-color .15s}'+
 '.mvs .chip:hover,.mvs .chip:focus-visible{background:var(--yellow,#EBB92E);border-color:var(--yellow,#EBB92E)}.mvs .chip small{background:var(--navy,#1A2035);color:#fff;border-radius:99px;padding:0 8px;font-size:.74rem;line-height:1.5}.mvs .chip.go{background:var(--navy,#1A2035);color:#fff;border-color:var(--navy,#1A2035)}.mvs .chip.go small{background:var(--yellow,#EBB92E);color:var(--navy,#1A2035)}'+
 '.mvs .none{margin:0;color:var(--muted,#555b78)}';
 document.head.appendChild(st);
 function E(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
 function n(c){return c+(c===1?' verified tutor':' verified tutors')}

 /* draws a suggest() result into panel; onPick(group) gets a city or area group */
 function renderSuggest(panel,res,onPick,opts){
  opts=opts||{};panel.textContent='';
  var root=E('div','mvs');panel.appendChild(root);
  function chip(g,label,cls){
   var b=E('button','chip'+(cls?' '+cls:''),label);b.type='button';
   b.appendChild(E('small','',g.count));
   b.title='View verified tutors in '+(g.area?g.area+', ':'')+g.city;
   b.addEventListener('click',function(){onPick(g)});return b;
  }
  if(!res.city&&!res.typed){root.appendChild(E('p','none','Choose a city to see its verified areas.'));return}
  if(res.typed){
   var t=E('div','typed');
   t.appendChild(E('b','',res.typed+(res.city?', '+res.city:'')));
   if(res.exact){t.appendChild(E('span','',n(res.exact.count)));t.appendChild(chip(res.exact,'View tutors','go'))}
   else t.appendChild(E('span','','No verified tutor teaching here yet. Pick a nearby area below.'));
   root.appendChild(t);
  }
  var near=res.items.filter(function(x){return x.near||!res.typed||(res.typed&&x.g.area.toLowerCase().indexOf(res.typed.toLowerCase())>-1)});
  var rest=res.items.filter(function(x){return near.indexOf(x)<0}).slice(0,4);
  function section(title,list){
   if(!list.length)return;
   var s=E('div');s.appendChild(E('h4','',title));
   var c=E('div','chips');list.forEach(function(x){c.appendChild(chip(x.g,x.g.area+(res.city?'':', '+x.g.city)))});
   s.appendChild(c);root.appendChild(s);
  }
  section(res.typed?'Nearby verified areas'+(res.city?' in '+res.city:''):'Verified areas'+(res.city?' in '+res.city:''),near);
  section('More verified areas'+(res.city?' in '+res.city:''),rest);
  if(res.cityGroup){
   var s=E('div');s.appendChild(E('h4','',res.typed||res.items.length?'Or the whole city':'Verified tutors in this city'));
   var c=E('div','chips');c.appendChild(chip(res.cityGroup,'All of '+res.cityGroup.city));s.appendChild(c);root.appendChild(s);
  }
  if(!res.items.length&&res.cities.length){
   var s2=E('div');s2.appendChild(E('h4','','Verified tutors in nearby cities'));
   var c2=E('div','chips');res.cities.forEach(function(g){c2.appendChild(chip(g,g.city))});s2.appendChild(c2);root.appendChild(s2);
  }
  if(!res.items.length&&!res.cityGroup&&!res.cities.length){
   root.appendChild(E('p','none',opts.emptyText||'No verified tutors here yet. Online tuition is available from anywhere.'));
  }
 }

 window.ModivsMap={areasOf:areasOf,groups:groups,suggest:suggest,renderSuggest:renderSuggest,normArea:normArea,titleCase:tc,splitList:splitList,CITY:CITY};
})();
