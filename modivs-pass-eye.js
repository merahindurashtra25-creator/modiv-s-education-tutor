/* Modiv's Education: adds a show / hide "eye" button to every password box,
   including boxes that are rendered later by JavaScript. Add data-no-eye to skip one. */
(function(){
  'use strict';
  var SVG='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var EYE=SVG+'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var OFF=SVG+'<path d="M3 3l18 18"/><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1"/><path d="M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  function css(){
    if(document.getElementById('mvPwCss'))return;
    var s=document.createElement('style');s.id='mvPwCss';s.textContent=
      '.pw-wrap{position:relative;display:block}'+
      '.pw-wrap>input{width:100%;padding-right:46px!important}'+
      '.pw-eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:36px;height:36px;display:grid;place-items:center;border:0;border-radius:8px;background:none;color:#5d6b82;cursor:pointer;padding:0;margin:0}'+
      '.pw-eye:hover{color:#1A2035;background:rgba(235,185,46,.18)}'+
      '.pw-eye:focus-visible{outline:3px solid #EBB92E;outline-offset:1px}'+
      '#login .pw-wrap>input{border-color:#eadfc9;border-radius:10px}'+
      '#login .pw-wrap>input:focus{border-color:#EBB92E}';
    document.head.appendChild(s)}
  function add(inp){
    if(inp.getAttribute('data-pw-eye')||inp.hasAttribute('data-no-eye')||!inp.parentNode)return;
    inp.setAttribute('data-pw-eye','1');css();
    var w=document.createElement('span');w.className='pw-wrap';
    inp.parentNode.insertBefore(w,inp);w.appendChild(inp);
    var b=document.createElement('button');b.type='button';b.className='pw-eye';
    function set(show){
      inp.type=show?'text':'password';b.innerHTML=show?OFF:EYE;
      b.setAttribute('aria-label',show?'Hide password':'Show password');
      b.setAttribute('aria-pressed',String(show));b.title=show?'Hide password':'Show password'}
    b.addEventListener('click',function(){
      var p=inp.selectionStart,q=inp.selectionEnd;set(inp.type==='password');inp.focus();
      try{inp.setSelectionRange(p,q)}catch(e){}});
    set(false);w.appendChild(b)}
  function scan(root){[].forEach.call(root.querySelectorAll('input[type=password]'),add)}
  function start(){
    scan(document);
    new MutationObserver(function(ms){ms.forEach(function(m){[].forEach.call(m.addedNodes,function(n){
      if(n.nodeType!==1)return;
      if(n.matches&&n.matches('input[type=password]'))add(n);else scan(n)})})})
      .observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  window.ModivsPassEye={scan:function(){scan(document)}};
})();
