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
        +'#mvTagline.mvt-vision{gap:14px;padding:10px 16px;background:linear-gradient(180deg,rgba(255,153,51,.14) 0%,rgba(26,32,53,.98) 32%,rgba(26,32,53,.98) 68%,rgba(19,136,8,.16) 100%),#1A2035;border-top:3px solid #FF9933;border-bottom:3px solid #138808}'
        +'#mvTagline .mvt-flag{width:34px;height:22px;flex:none;border-radius:3px;box-shadow:0 2px 6px rgba(0,0,0,.35);display:block}'
        +'#mvTagline .mvt-hi{display:block;margin-top:3px;color:#fff;font-weight:600;font-size:13px}'
        +'#mvTagline .mvt-slogan{display:inline-flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:8px;margin-top:5px;padding:2px 12px;border-radius:999px;background:linear-gradient(90deg,rgba(255,153,51,.18),rgba(255,255,255,.08),rgba(19,136,8,.2));border:1px solid rgba(255,255,255,.2);font-size:12.5px;font-weight:700;letter-spacing:.02em}'
        +'#mvTagline .mvt-saffron{color:#FF9933}#mvTagline .mvt-sep{color:#fff;opacity:.85}#mvTagline .mvt-green{color:#4ADE80}'
        +'#mvTagline:focus-visible{outline:2px solid #EBB92E;outline-offset:-4px}'
        +'@media (max-width:560px){#mvTagline{font-size:12px;padding:7px 12px}#mvTagline.mvt-vision{gap:8px;padding:8px 10px}#mvTagline .mvt-flag{width:24px;height:16px}#mvTagline .mvt-hi,#mvTagline .mvt-slogan{font-size:11.5px}}'
        +'@media print{#mvTagline{display:none}}';
      document.head.appendChild(st);
    }
    var a=document.createElement('a');a.id='mvTagline';a.href=LINK;
    a.setAttribute('aria-label',TEXT+' Learn about Modiv\u2019s vision');
    a.innerHTML='<i class="mvt-dot" aria-hidden="true"></i><span></span><i class="mvt-dot" aria-hidden="true"></i>';
    a.querySelector('span').textContent=TEXT;
    if(p.indexOf('vision')!==-1){ /* Indian flag mixup + Hindi mission & slogan on the vision page */
      a.className='mvt-vision';
      var flagSvg='<svg class="mvt-flag" viewBox="0 0 36 24" aria-hidden="true">'
        +'<rect width="36" height="8" fill="#FF9933"/>'
        +'<rect y="8" width="36" height="8" fill="#FFFFFF"/>'
        +'<rect y="16" width="36" height="8" fill="#138808"/>'
        +'<circle cx="18" cy="12" r="3.1" fill="none" stroke="#000080" stroke-width="0.7"/>'
        +'<circle cx="18" cy="12" r="0.6" fill="#000080"/>'
        +'<path d="M18 8.9V15.1M14.9 12H21.1M15.8 9.8L20.2 14.2M20.2 9.8L15.8 14.2" stroke="#000080" stroke-width="0.45"/>'
        +'</svg>';
      a.innerHTML=flagSvg+'<span></span>'+flagSvg;
      var sp=a.querySelector('span');sp.style.textAlign='center';sp.textContent=TEXT;
      var hi=document.createElement('span');hi.lang='hi';hi.className='mvt-hi';
      hi.textContent='\u0939\u092e \u092e\u094b\u0926\u093f\u0935\u094d\u0938 \u090f\u091c\u0941\u0915\u0947\u0936\u0928, \u0936\u094d\u0930\u0940 \u0928\u0930\u0947\u0902\u0926\u094d\u0930 \u092e\u094b\u0926\u0940 \u091c\u0940 \u0915\u0947 \u0935\u093f\u0915\u0938\u093f\u0924 \u092d\u093e\u0930\u0924 \u0905\u092d\u093f\u092f\u093e\u0928 \u0915\u094b \u0938\u092b\u0932 \u092c\u0928\u093e\u0928\u0947 \u0915\u0947 \u092e\u093f\u0936\u0928 \u092e\u0947\u0902 \u091c\u0941\u091f\u0947 \u0939\u0948\u0902\u0964';
      var sl=document.createElement('span');sl.lang='hi';sl.className='mvt-slogan';
      sl.innerHTML='<span class="mvt-saffron">\u0930\u093e\u0937\u094d\u091f\u094d\u0930 \u0915\u0947 \u0939\u093f\u0924 \u092e\u0947\u0902</span>'
        +'<span class="mvt-sep" aria-hidden="true">\u2022</span>'
        +'<span class="mvt-green">\u0930\u093e\u0937\u094d\u091f\u094d\u0930 \u0915\u094b \u0938\u092e\u0930\u094d\u092a\u093f\u0924</span>';
      sp.appendChild(hi);
      sp.appendChild(sl);
    }
    document.body.insertBefore(a,document.body.firstChild);
  }
  if(document.body)add();else document.addEventListener('DOMContentLoaded',add);
})();
