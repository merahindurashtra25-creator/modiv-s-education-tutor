/* Modiv's Education - shared menu bar behaviour (same as the home page):
   mobile Menu button, highlight of the current page, and the Admin session pill.
   The signed-in avatar for tutors / students is added by modivs-session-ui.js. */
(function(){
  'use strict';
  function init(){
    var hd=document.querySelector('header.mv-header');if(!hd)return;
    var b=hd.querySelector('.burger'),n=hd.querySelector('nav');
    var KEEP={navSignup:1,navJoin:1,navLoginBtn:1};
    function buildExtras(){
      var ul=n&&n.querySelector('ul');var acts=hd.querySelector('.acts');if(!ul||!acts)return;
      [].forEach.call(ul.querySelectorAll('li.mv-extra'),function(x){x.remove()});
      var first=true;
      [].forEach.call(acts.children,function(el){
        if(!el.classList||!el.classList.contains('btn')||KEEP[el.id]||el.classList.contains('cartbtn'))return;
        if(el.hidden||el.style.display==='none')return;
        var li=document.createElement('li');li.className='mv-extra'+(first?' mv-extra-first':'');first=false;
        var a=document.createElement('a');a.textContent=(el.textContent||'').trim();
        if(el.tagName==='A'&&el.getAttribute('href')){a.href=el.getAttribute('href')}
        else{a.href='#';a.addEventListener('click',function(e){e.preventDefault();el.click()})}
        li.appendChild(a);ul.appendChild(li);
      });
    }
    [].forEach.call(hd.querySelectorAll('.acts > .btn'),function(el){if(!KEEP[el.id]&&!el.classList.contains('cartbtn'))el.classList.add('mv-moved')});
    if(b&&n){
      b.addEventListener('click',function(){buildExtras();var o=n.classList.toggle('open');b.setAttribute('aria-expanded',o)});
      n.addEventListener('click',function(e){if(e.target.tagName==='A'){n.classList.remove('open');b.setAttribute('aria-expanded',false)}});
    }
    if(hd.hasAttribute('data-custom'))return;
    var file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    if(window.ModivsSlug && typeof window.ModivsSlug.resolve==='function'){
      var r=window.ModivsSlug.resolve(location.pathname);
      if(r && r.file) file=r.file.toLowerCase();
    }
    if(file==='modivs-home.html')file='index.html';
    [].forEach.call(hd.querySelectorAll('nav a'),function(a){
      var h=(a.getAttribute('href')||'').split('#')[0].toLowerCase();
      if(window.ModivsSlug && typeof window.ModivsSlug.resolve==='function'){
        var hr=window.ModivsSlug.resolve(h);
        if(hr && hr.file) h=hr.file.toLowerCase();
      }
      if(h==='modivs-home.html')h='index.html';
      if(h&&h===file)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
    var DEFAULT_ADMIN_EMAILS = ['happinessaggarwal@gmail.com', 'divyanshdhimanteam@gmail.com', 'luxmankumar628@gmail.com'];
    var ADMIN_EMAILS=((typeof window !== "undefined" && window.__ENV__ && window.__ENV__.MASTER_ADMIN_EMAILS) ? window.__ENV__.MASTER_ADMIN_EMAILS.split(",") : DEFAULT_ADMIN_EMAILS).map(function(e){ return e.trim().toLowerCase(); });
    var isAdmin=false;
    var adminEmail='';
    try{
      var s=JSON.parse(localStorage.getItem('modivs_admin_session')||'null');
      if(!s){
        var u=JSON.parse(localStorage.getItem('modivs_auth_user')||'null');
        if(u&&(u.role==='Admin'||(u.email&&ADMIN_EMAILS.indexOf(String(u.email).toLowerCase())!==-1))) s=u;
      }
      if(s&&s.email&&ADMIN_EMAILS.indexOf(String(s.email).toLowerCase())!==-1){
        isAdmin=true;
        adminEmail=s.email;
      }
    }catch(e){}
    if(isAdmin){
      ['navLoginBtn','navSignup','navJoin'].forEach(function(id){var x=document.getElementById(id);if(x)x.style.display='none'});
      function navUrl(u){
        try{if(window.ModivsSlug&&typeof window.ModivsSlug.resolveToRealFile==='function'&&window.ModivsSlug.isLocal&&window.ModivsSlug.isLocal()){var r=window.ModivsSlug.resolveToRealFile(u);if(r)return r}}catch(e){}
        return u;
      }
      var acts=hd.querySelector('.acts');
      if(acts&&!acts.querySelector('#mvUser')&&!acts.querySelector('#mvAdmBtn')&&!window.ModivsSessionUI){
        var dash=document.createElement('a');dash.className='btn y';dash.href=navUrl('/admin');dash.textContent='Admin dashboard';
        var out=document.createElement('a');out.className='btn o';out.href=navUrl('/');out.textContent='Log out';
        out.addEventListener('click',function(e){
          e.preventDefault();
          var pServer = fetch('/api/auth?action=logout', { method: 'POST', credentials: 'include' }).catch(function(){});
          var pFb = Promise.resolve();
          try{var fb=window.EducationBFirebase;if(fb&&fb.auth&&typeof fb.auth.signOut==='function')pFb=fb.auth.signOut().catch(function(){})}catch(e){}
          Promise.all([pServer, pFb]).then(function(){
            try{localStorage.removeItem('modivs_admin_session')}catch(e){}
            try{localStorage.removeItem('modivs_auth_user')}catch(e){}
            try{sessionStorage.clear()}catch(e){}
            window.location.replace(navUrl('/login'));
          }).catch(function(){
            try{localStorage.removeItem('modivs_admin_session')}catch(e){}
            try{localStorage.removeItem('modivs_auth_user')}catch(e){}
            try{sessionStorage.clear()}catch(e){}
            window.location.replace(navUrl('/login'));
          });
        });
        acts.insertBefore(dash,b);acts.insertBefore(out,b);
      }
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
