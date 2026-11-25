/* Modiv's Education - site-wide tagline strip shown at the very top of every page.
   Edit TEXT / LINK below and rebuild; the bundle puts it on all pages. */
(function(){
  'use strict';
  var TEXT='Empower her. Educate the world.';
  var LINK='modivs-social-vision.html';
  function add(){
    if(document.getElementById('mvTagline'))return;
    var p=(location.pathname||'').toLowerCase();
    if(p.indexOf('admin')!==-1)return; /* internal admin panel only */
    if(!document.getElementById('mvTaglineCss')){
      var st=document.createElement('style');st.id='mvTaglineCss';
      st.textContent='#mvTagline{display:flex;align-items:center;justify-content:center;gap:10px;margin:0;padding:8px 16px;background:#1A2035;color:#EBB92E;font:700 13px/1.4 "Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.04em;text-align:center;text-decoration:none;box-sizing:border-box;width:100%}'
        +'#mvTagline:hover{color:#fff}#mvTagline .mvt-dot{width:6px;height:6px;border-radius:50%;background:#EBB92E;flex:none}'
        +'#mvTagline:focus-visible{outline:2px solid #EBB92E;outline-offset:-4px}'
        +'@media (max-width:560px){#mvTagline{font-size:12px;padding:7px 12px}}'
        +'@media print{#mvTagline{display:none}}';
      document.head.appendChild(st);
    }
    var a=document.createElement('a');a.id='mvTagline';a.href=LINK;
    a.setAttribute('aria-label',TEXT+' Learn about Modiv\u2019s vision');
    a.innerHTML='<i class="mvt-dot" aria-hidden="true"></i><span></span><i class="mvt-dot" aria-hidden="true"></i>';
    a.querySelector('span').textContent=TEXT;
    document.body.insertBefore(a,document.body.firstChild);
  }
  if(document.body)add();else document.addEventListener('DOMContentLoaded',add);
})();
