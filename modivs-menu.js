/* Modiv's Education - shared menu bar behaviour (same as the home page):
   mobile Menu button, highlight of the current page, and the Admin session pill.
   The signed-in avatar for tutors / students is added by modivs-session-ui.js. */
(function(){
  'use strict';
  function init(){
    var hd=document.querySelector('header.mv-header');if(!hd)return;
    var b=hd.querySelector('.burger'),n=hd.querySelector('nav');
    if(b&&n){
      b.addEventListener('click',function(){var o=n.classList.toggle('open');b.setAttribute('aria-expanded',o)});
      n.addEventListener('click',function(e){if(e.target.tagName==='A'){n.classList.remove('open');b.setAttribute('aria-expanded',false)}});
    }
    if(hd.hasAttribute('data-custom'))return;
    var file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    if(file==='modivs-home.html')file='index.html';
    [].forEach.call(hd.querySelectorAll('nav a'),function(a){
      var h=(a.getAttribute('href')||'').split('#')[0].toLowerCase();
      if(h==='modivs-home.html')h='index.html';
      if(h&&h===file)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
    var ADMIN_EMAILS=['happinessaggarwal@gmail.com','divyanshdhimanteam@gmail.com'];
    var ADMIN_EMAILS=['happinessaggarwal@gmail.com','divyanshdhimanteam@gmail.com','admin@gmail.com'];
    var isAdmin=false;
    var adminEmail='';
    try{
      var s=JSON.parse(localStorage.getItem('modivs_admin_session')||'null');
      if(s&&s.email&&ADMIN_EMAILS.indexOf(s.email.toLowerCase())!==-1){
        isAdmin=true;
        adminEmail=s.email;
      }
    }catch(e){}
    if(isAdmin){
      ['navLoginBtn','navSignup','navJoin'].forEach(function(id){var x=document.getElementById(id);if(x)x.style.display='none'});
      var acts=hd.querySelector('.acts');
      if(acts&&!acts.querySelector('.adm-pill')){
        var pill=document.createElement('span');pill.className='adm-pill';
        pill.innerHTML='Logged in as <b>Admin</b><span class="em"> \u00b7 '+adminEmail+'</span>';
        var dash=document.createElement('a');dash.className='btn y';dash.href='modivs-admin.html';dash.textContent='Admin dashboard';
        var out=document.createElement('a');out.className='btn o';out.href='index.html';out.textContent='Log out';
        out.addEventListener('click',function(){
          try{localStorage.removeItem('modivs_admin_session')}catch(e){}
          try{localStorage.removeItem('modivs_auth_user')}catch(e){}
          try{var fb=window.EducationBFirebase;if(fb&&fb.auth)fb.auth.signOut()}catch(e){}
        });
        acts.insertBefore(pill,b);acts.insertBefore(dash,b);acts.insertBefore(out,b);
      }
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
