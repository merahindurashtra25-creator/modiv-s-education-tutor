/* Modiv's Education: searchable country-code picker.
   ModivsCountry.html(id, code, disabled)  -> markup for a phone country-code control. The control keeps a hidden
        <input id="{id}_cc"> that holds the dial code (e.g. "+91"), so existing code that reads/writes it keeps working.
   ModivsCountry.set(id, code) / ModivsCountry.setDisabled(id, bool) -> update the control programmatically. */
(function(){
  'use strict';
  var L=[['India','+91'],['United States','+1'],['Canada','+1'],['United Kingdom','+44'],['United Arab Emirates','+971'],['Saudi Arabia','+966'],['Qatar','+974'],['Kuwait','+965'],['Oman','+968'],['Bahrain','+973'],['Singapore','+65'],['Malaysia','+60'],['Australia','+61'],['New Zealand','+64'],['Nepal','+977'],['Bhutan','+975'],['Bangladesh','+880'],['Sri Lanka','+94'],['Pakistan','+92'],['Afghanistan','+93'],
  ['Albania','+355'],['Algeria','+213'],['Andorra','+376'],['Angola','+244'],['Argentina','+54'],['Armenia','+374'],['Austria','+43'],['Azerbaijan','+994'],['Bahamas','+1242'],['Barbados','+1246'],['Belarus','+375'],['Belgium','+32'],['Belize','+501'],['Benin','+229'],['Bolivia','+591'],['Bosnia and Herzegovina','+387'],['Botswana','+267'],['Brazil','+55'],['Brunei','+673'],['Bulgaria','+359'],['Burkina Faso','+226'],['Burundi','+257'],
  ['Cambodia','+855'],['Cameroon','+237'],['Cape Verde','+238'],['Central African Republic','+236'],['Chad','+235'],['Chile','+56'],['China','+86'],['Colombia','+57'],['Comoros','+269'],['Congo (DR)','+243'],['Congo (Republic)','+242'],['Costa Rica','+506'],['Croatia','+385'],['Cuba','+53'],['Cyprus','+357'],['Czech Republic','+420'],
  ['Denmark','+45'],['Djibouti','+253'],['Dominican Republic','+1809'],['Ecuador','+593'],['Egypt','+20'],['El Salvador','+503'],['Equatorial Guinea','+240'],['Eritrea','+291'],['Estonia','+372'],['Eswatini','+268'],['Ethiopia','+251'],
  ['Fiji','+679'],['Finland','+358'],['France','+33'],['Gabon','+241'],['Gambia','+220'],['Georgia','+995'],['Germany','+49'],['Ghana','+233'],['Greece','+30'],['Greenland','+299'],['Guatemala','+502'],['Guinea','+224'],['Guyana','+592'],
  ['Haiti','+509'],['Honduras','+504'],['Hong Kong','+852'],['Hungary','+36'],['Iceland','+354'],['Indonesia','+62'],['Iran','+98'],['Iraq','+964'],['Ireland','+353'],['Israel','+972'],['Italy','+39'],['Ivory Coast','+225'],
  ['Jamaica','+1876'],['Japan','+81'],['Jordan','+962'],['Kazakhstan','+7'],['Kenya','+254'],['Kosovo','+383'],['Kyrgyzstan','+996'],['Laos','+856'],['Latvia','+371'],['Lebanon','+961'],['Lesotho','+266'],['Liberia','+231'],['Libya','+218'],['Liechtenstein','+423'],['Lithuania','+370'],['Luxembourg','+352'],
  ['Macau','+853'],['Madagascar','+261'],['Malawi','+265'],['Maldives','+960'],['Mali','+223'],['Malta','+356'],['Mauritania','+222'],['Mauritius','+230'],['Mexico','+52'],['Moldova','+373'],['Monaco','+377'],['Mongolia','+976'],['Montenegro','+382'],['Morocco','+212'],['Mozambique','+258'],['Myanmar','+95'],
  ['Namibia','+264'],['Netherlands','+31'],['Nicaragua','+505'],['Niger','+227'],['Nigeria','+234'],['North Korea','+850'],['North Macedonia','+389'],['Norway','+47'],['Panama','+507'],['Papua New Guinea','+675'],['Paraguay','+595'],['Peru','+51'],['Philippines','+63'],['Poland','+48'],['Portugal','+351'],['Puerto Rico','+1787'],
  ['Romania','+40'],['Russia','+7'],['Rwanda','+250'],['Senegal','+221'],['Serbia','+381'],['Seychelles','+248'],['Sierra Leone','+232'],['Slovakia','+421'],['Slovenia','+386'],['Somalia','+252'],['South Africa','+27'],['South Korea','+82'],['South Sudan','+211'],['Spain','+34'],['Sudan','+249'],['Suriname','+597'],['Sweden','+46'],['Switzerland','+41'],['Syria','+963'],
  ['Taiwan','+886'],['Tajikistan','+992'],['Tanzania','+255'],['Thailand','+66'],['Togo','+228'],['Trinidad and Tobago','+1868'],['Tunisia','+216'],['Turkey','+90'],['Turkmenistan','+993'],['Uganda','+256'],['Ukraine','+380'],['Uruguay','+598'],['Uzbekistan','+998'],['Venezuela','+58'],['Vietnam','+84'],['Yemen','+967'],['Zambia','+260'],['Zimbabwe','+263']];
  var picked={};              // id -> country name chosen in this page session (disambiguates shared codes such as +1)
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function norm(s){return String(s).toLowerCase().replace(/[^a-z0-9+]/g,'')}
  function nameFor(id,code){
    if(picked[id]){for(var i=0;i<L.length;i++)if(L[i][0]===picked[id]&&L[i][1]===code)return picked[id]}
    for(var j=0;j<L.length;j++)if(L[j][1]===code)return L[j][0];
    return ''}
  function paintLabel(box){
    var h=box.querySelector('input[type=hidden]'),b=box.querySelector('.cc-btn');
    var n=nameFor(h.id.replace(/_cc$/,''),h.value);
    b.querySelector('.cc-code').textContent=h.value||'+';
    b.querySelector('.cc-name').textContent=n;
    b.title=(n?n+' ':'')+h.value}
  function html(id,code,dis){
    code=code||'+91';
    return '<div class="cc-box" data-cc-for="'+esc(id)+'"><input type="hidden" id="'+esc(id)+'_cc" value="'+esc(code)+'">'+
     '<button type="button" class="cc-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Country code"'+(dis?' disabled':'')+'><span class="cc-code"></span><span class="cc-name"></span><span class="cc-car" aria-hidden="true">▾</span></button>'+
     '<div class="cc-pop" hidden><input type="text" class="cc-search" placeholder="Search country or code" autocomplete="off" aria-label="Search country"><ul class="cc-list" role="listbox"></ul></div></div>'}
  function fill(box,q){
    var ul=box.querySelector('.cc-list'),h=box.querySelector('input[type=hidden]'),nq=norm(q||'');
    var rows=L.filter(function(c){return !nq||norm(c[0]).indexOf(nq)>-1||norm(c[1]).indexOf(nq.replace(/^\+?/,'+'))>-1&&/^\+?\d+$/.test(q.trim())});
    if(nq){rows.sort(function(a,b){return (norm(a[0]).indexOf(nq)===0?0:1)-(norm(b[0]).indexOf(nq)===0?0:1)})}
    ul.innerHTML=rows.length?rows.map(function(c){var on=c[1]===h.value&&nameFor(h.id.replace(/_cc$/,''),h.value)===c[0];
      return '<li role="option" data-n="'+esc(c[0])+'" data-c="'+esc(c[1])+'"'+(on?' aria-selected="true" class="on"':'')+'><span>'+esc(c[0])+'</span><b>'+esc(c[1])+'</b></li>'}).join(''):'<li class="none">No country found</li>';
    var cur=ul.querySelector('.on');if(cur&&!nq)cur.scrollIntoView({block:'nearest'})}
  function closeAll(except){
    [].forEach.call(document.querySelectorAll('.cc-box'),function(b){if(b===except)return;var p=b.querySelector('.cc-pop');if(p&&!p.hidden){p.hidden=true;b.querySelector('.cc-btn').setAttribute('aria-expanded','false')}})}
  function open(box){
    closeAll(box);var p=box.querySelector('.cc-pop'),s=box.querySelector('.cc-search');
    p.hidden=false;box.querySelector('.cc-btn').setAttribute('aria-expanded','true');s.value='';fill(box,'');s.focus()}
  function close(box,refocus){
    box.querySelector('.cc-pop').hidden=true;var b=box.querySelector('.cc-btn');b.setAttribute('aria-expanded','false');if(refocus)b.focus()}
  function choose(box,li){
    var h=box.querySelector('input[type=hidden]');picked[h.id.replace(/_cc$/,'')]=li.getAttribute('data-n');
    h.value=li.getAttribute('data-c');paintLabel(box);close(box,true);
    h.dispatchEvent(new Event('change',{bubbles:true}))}
  function boxFor(id){return document.querySelector('.cc-box[data-cc-for="'+id+'"]')}
  function init(root){
    [].forEach.call((root||document).querySelectorAll('.cc-box:not([data-ready])'),function(b){b.setAttribute('data-ready','1');paintLabel(b)})}
  document.addEventListener('click',function(e){
    var box=e.target.closest&&e.target.closest('.cc-box');
    if(!box){closeAll();return}
    var btn=e.target.closest('.cc-btn');
    if(btn){if(btn.disabled)return;box.querySelector('.cc-pop').hidden?open(box):close(box);return}
    var li=e.target.closest('.cc-list li[data-c]');if(li)choose(box,li)});
  document.addEventListener('input',function(e){if(e.target.classList&&e.target.classList.contains('cc-search'))fill(e.target.closest('.cc-box'),e.target.value)});
  document.addEventListener('keydown',function(e){
    var box=e.target.closest&&e.target.closest('.cc-box');if(!box)return;
    var pop=box.querySelector('.cc-pop');
    if(e.key==='Escape'&&!pop.hidden){e.preventDefault();close(box,true);return}
    if(e.target.classList.contains('cc-search')){
      var items=[].slice.call(box.querySelectorAll('.cc-list li[data-c]')),cur=box.querySelector('.cc-list li.hl'),i=items.indexOf(cur);
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!items.length)return;if(cur)cur.classList.remove('hl');i=e.key==='ArrowDown'?(i+1)%items.length:(i<=0?items.length-1:i-1);items[i].classList.add('hl');items[i].scrollIntoView({block:'nearest'})}
      else if(e.key==='Enter'){e.preventDefault();var t=cur||items[0];if(t)choose(box,t)}}
    else if(e.target.classList.contains('cc-btn')&&(e.key==='ArrowDown')){e.preventDefault();if(!e.target.disabled)open(box)}});
  new MutationObserver(function(){init()}).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState!=='loading')init();else document.addEventListener('DOMContentLoaded',function(){init()});
  var css=document.createElement('style');css.textContent=
   '.cc-box{position:relative;flex:0 0 150px}.cc-btn{width:100%;height:100%;min-height:44px;display:flex;align-items:center;gap:6px;padding:0 8px;border:1.5px solid var(--line,#dfe5ee);border-radius:8px;background:#fff;color:inherit;font:inherit;cursor:pointer;text-align:left}'+
   '.cc-btn:disabled{opacity:.6;cursor:not-allowed}.cc-code{font-weight:700}.cc-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.8em;color:#5d6b82}.cc-car{font-size:.8em;color:#5d6b82}'+
   '.cc-pop{position:absolute;z-index:60;top:calc(100% + 4px);left:0;width:280px;max-width:calc(100vw - 32px);background:#fff;border:1.5px solid var(--line,#dfe5ee);border-radius:10px;box-shadow:0 10px 30px rgba(20,33,61,.18);padding:8px}'+
   '.cc-pop[hidden]{display:none}.cc-pop .cc-search{width:100%;padding:10px 12px;border:1.5px solid var(--line,#dfe5ee);border-radius:8px;font:inherit;margin:0}'+
   '.cc-list{list-style:none;margin:6px 0 0;padding:0;max-height:220px;overflow:auto}.cc-list li{display:flex;justify-content:space-between;gap:10px;padding:9px 10px;border-radius:6px;cursor:pointer;font-size:.92rem}'+
   '.cc-list li:hover,.cc-list li.hl{background:#f2f5f9}.cc-list li.on{background:#e8f5f1}.cc-list li b{color:#0a5f4e;font-weight:700}.cc-list li.none{color:#5d6b82;cursor:default}';
  document.head.appendChild(css);
  window.ModivsCountry={html:html,list:L,nameFor:function(c){return nameFor('',c)},
   set:function(id,code){var b=boxFor(id);if(!b)return;b.querySelector('input[type=hidden]').value=code;paintLabel(b)},
   setDisabled:function(id,d){var b=boxFor(id);if(b)b.querySelector('.cc-btn').disabled=!!d}};
})();
