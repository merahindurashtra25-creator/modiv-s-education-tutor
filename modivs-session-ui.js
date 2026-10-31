/* Modiv's Education: shows the signed-in user's photo / avatar at the top of every page.
   - Tutor  -> profile photo (falls back to initials)
   - Student / Parent -> chosen boy / girl avatar (falls back to initials)
   Click it for Dashboard and Log out. Also hides the public Log in / Sign up buttons while signed in. */
(function(){
  'use strict';
  function rd(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch(e){return d}}
  var adminEmails = ['happinessaggarwal@gmail.com', 'divyanshdhimanteam@gmail.com', 'admin@gmail.com'];
  function me(){
    try{var a=rd('modivs_admin_session',null);if(a&&a.email&&adminEmails.indexOf(a.email.toLowerCase())!==-1)return null}catch(e){}
    var u=rd('modivs_auth_user',null);
    return u&&(u.role==='Tutor'||u.role==='Student / Parent')?u:null}
  function initials(n){return String(n||'?').trim().split(/\s+/).map(function(w){return w.charAt(0)}).slice(0,2).join('').toUpperCase()||'?'}
  function findByEmail(list,em){return (Array.isArray(list)?list:[]).filter(function(x){return x&&String(x.email||'').toLowerCase()===em})[0]||null}
  function avatarFor(u){
    var em=String(u.email||'').toLowerCase();
    if(u.role==='Tutor'){
      var t=findByEmail(rd('modivs_tutors_db',[]),em),s=findByEmail(rd('modivs_submitted_tutors',[]),em);
      var photo=(t&&t.photo)||(s&&s.photo)||'';
      return {img:photo,name:(t&&t.name)||(s&&s.name)||u.name}}
    var sr=rd('modivs_student_req',null);
    if(!sr||String(sr.email||'').toLowerCase()!==em)sr=findByEmail(rd('modivs_students_db',[]),em);
    var key=sr&&sr.avatar,img=(key&&window.ModivsAvatars&&ModivsAvatars.has(key))?ModivsAvatars.src(key):'';
    return {img:img,name:u.name}}
  function css(){
    if(document.getElementById('mvUserCss'))return;
    var s=document.createElement('style');s.id='mvUserCss';s.textContent=
     '.mv-user{position:relative;display:inline-flex;align-items:center;flex:none;margin-left:8px;order:99}'+
     '.mv-av{width:40px;height:40px;border-radius:50%;border:2px solid #FABD4E;padding:0;background:#14213d;color:#fff;font:700 .9rem "Plus Jakarta Sans",system-ui,sans-serif;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer}'+
     '.mv-av img{width:100%;height:100%;object-fit:cover;display:block}'+
     '.mv-av:focus-visible{outline:3px solid #7fd1bd;outline-offset:2px}'+
     '.mv-menu{position:absolute;right:0;top:calc(100% + 8px);z-index:80;min-width:210px;background:#fff;color:#14213d;border:1.5px solid #dfe5ee;border-radius:12px;box-shadow:0 12px 32px rgba(20,33,61,.18);padding:8px;font:500 .92rem "Plus Jakarta Sans",system-ui,sans-serif}'+
     '.mv-menu[hidden]{display:none}.mv-who{padding:8px 10px 10px;border-bottom:1px solid #dfe5ee;margin-bottom:6px}.mv-who b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mv-who small{color:#5d6b82}'+
     '.mv-menu a,.mv-menu button{display:block;width:100%;text-align:left;padding:9px 10px;border:0;border-radius:8px;background:none;color:inherit;font:inherit;text-decoration:none;cursor:pointer}'+
     '.mv-menu a:hover,.mv-menu button:hover{background:#f2f5f9}';
    document.head.appendChild(s)}
  function logout(){
    try{localStorage.removeItem('modivs_auth_user')}catch(e){}
    try{var fb=window.EducationBFirebase;if(fb&&fb.auth)fb.auth.signOut()}catch(e){}
    location.href='modivs-home.html'}
  function hideGuestButtons(hd){
    [].forEach.call(hd.querySelectorAll('a,button'),function(b){
      var h=b.getAttribute('href')||'',t=(b.textContent||'').trim().toLowerCase();
      if(/#login$|#tutor-signup|modivs-signup\.html/.test(h)||/^(log in|login|sign up|sign up \(student\)|sign up as a tutor|become a tutor)$/.test(t))b.style.display='none'})}
  function mount(){
    var u=me();var old=document.getElementById('mvUser');if(old)old.remove();
    if(!u)return;
    var hd=document.querySelector('header')||document.querySelector('.topl');if(!hd)return;
    css();hideGuestButtons(hd);
    var a=avatarFor(u),dash=u.role==='Tutor'?'modivs-tutor-dashboard.html':'modivs-student-dashboard.html';
    var host=hd.querySelector('.acts')||hd.querySelector('.bar')||hd.querySelector('.links')||hd.querySelector('.in')||hd.querySelector('div')||hd;
    var wrap=document.createElement('div');wrap.className='mv-user';wrap.id='mvUser';
    var btn=document.createElement('button');btn.type='button';btn.className='mv-av';btn.setAttribute('aria-haspopup','true');btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-label','Account menu for '+(a.name||'you'));
    if(a.img){var im=document.createElement('img');im.src=a.img;im.alt='';btn.appendChild(im)}else btn.textContent=initials(a.name);
    var menu=document.createElement('div');menu.className='mv-menu';menu.hidden=true;
    var who=document.createElement('div');who.className='mv-who';var b=document.createElement('b');b.textContent=a.name||'Your account';var sm=document.createElement('small');sm.textContent=u.role;who.appendChild(b);who.appendChild(sm);
    var d=document.createElement('a');d.href=dash;d.textContent='My dashboard';
    var out=document.createElement('button');out.type='button';out.textContent='Log out';out.addEventListener('click',logout);
    menu.appendChild(who);menu.appendChild(d);menu.appendChild(out);
    btn.addEventListener('click',function(e){e.stopPropagation();var o=menu.hidden;menu.hidden=!o;btn.setAttribute('aria-expanded',String(o))});
    document.addEventListener('click',function(e){if(!wrap.contains(e.target)){menu.hidden=true;btn.setAttribute('aria-expanded','false')}});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'){menu.hidden=true;btn.setAttribute('aria-expanded','false')}});
    wrap.appendChild(btn);wrap.appendChild(menu);
    var bur=host.querySelector('.burger');bur?host.insertBefore(wrap,bur):host.appendChild(wrap)}
  function go(){
    if(!window.ModivsAvatars&&!go.tried){go.tried=1;var s=document.createElement('script');s.src='modivs-avatars.js';s.onload=mount;s.onerror=mount;document.head.appendChild(s);return}
    mount()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
  window.addEventListener('storage',function(e){if(/^modivs_/.test(e.key||''))mount()});
  window.ModivsSessionUI={refresh:mount};
})();
