/* Modiv's Education - "More" drop-down in the menu bar (Guide, Blogs, Contact us).
   Works on desktop (hover, click, keyboard) and in the mobile menu (tap to open). */
(function(){
  'use strict';
  var st=document.createElement('style');
  st.textContent=[
   'header nav li.mv-dd{position:relative}',
   'header nav .mv-dd-b{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;border:0;background:none;font:inherit;font-weight:600;font-size:.92rem;color:var(--mv-navy,var(--navy,#1A2035));cursor:pointer;white-space:nowrap;transition:background .2s}',
   'header nav .mv-dd-b:hover,header nav .mv-dd.open .mv-dd-b,header nav .mv-dd-b.cur{background:var(--mv-yellow,var(--yellow,#EBB92E))}',
   'header nav .mv-dd-b .car{display:inline-block;font-size:.7rem;transition:transform .2s}',
   'header nav .mv-dd.open .car{transform:rotate(180deg)}',
   'header nav ul.mv-dd-m{display:none;position:absolute;top:calc(100% + 6px);left:0;min-width:180px;flex-direction:column;gap:2px;margin:0;padding:8px;list-style:none;background:var(--mv-cream,var(--cream,#FEF7EA));border:1px solid var(--mv-line,var(--line,#eadfc9));border-radius:12px;box-shadow:0 12px 28px rgba(26,32,53,.14);z-index:120}',
   'header nav .mv-dd.open ul.mv-dd-m{display:flex}',
   'header nav ul.mv-dd-m li{margin:0;padding:0}',
   'header nav ul.mv-dd-m a{padding:9px 12px}',
   '@media(min-width:1025px){header nav .mv-dd:hover ul.mv-dd-m{display:flex}}',
   '@media(max-width:1024px){header nav li.mv-dd{width:100%}header nav .mv-dd-b{width:100%;justify-content:space-between}header nav ul.mv-dd-m{position:static;box-shadow:none;border:0;background:none;padding:4px 0 0 14px;min-width:0}}'
  ].join('\n');
  document.head.appendChild(st);
  function init(){
   [].forEach.call(document.querySelectorAll('header nav .mv-dd'),function(li){
    var b=li.querySelector('.mv-dd-b'),m=li.querySelector('.mv-dd-m');if(!b||!m)return;
    function set(o){li.classList.toggle('open',o);b.setAttribute('aria-expanded',o?'true':'false')}
    b.addEventListener('click',function(e){e.stopPropagation();set(!li.classList.contains('open'))});
    document.addEventListener('click',function(e){if(!li.contains(e.target))set(false)});
    li.addEventListener('keydown',function(e){if(e.key==='Escape'){set(false);b.focus()}});
    /* highlight "More" when one of its pages is open */
    var file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    [].forEach.call(m.querySelectorAll('a'),function(a){
     var h=(a.getAttribute('href')||'').split('#')[0].toLowerCase();
     if(h&&h===file){a.setAttribute('aria-current','page');b.classList.add('cur')}
    });
   });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
