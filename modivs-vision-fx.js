/* Modiv's Social vision - scroll progress bar + reveal-on-scroll. Skipped when reduced motion is on. */
(function(){
 function start(){
 if(!document.querySelector('main.sv'))return;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window))return;
 var bar=document.createElement('div');bar.className='sv-prog';bar.setAttribute('aria-hidden','true');document.body.appendChild(bar);
 var tick=false;function upd(){tick=false;var h=document.documentElement.scrollHeight-innerHeight;bar.style.setProperty('--p',h>0?Math.min(1,scrollY/h):0)}
 addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(upd)}},{passive:true});upd();
 var groups=['.sv-why>div','.sv-bridge','.sv-strip li','.sv-head','.sv-grid4 li','.sv-beyond .ph','.sv-beyond>div>*:not(.sv-ck)','.sv-ck li','.sv-subj li','.sv-gg li','.sv-earn-t>*','.sv-earn-s li','.sv-faq .in','.sv-faq details','.sv-reg .sv-w>div:first-child>*','.sv-form'];
 var io=new IntersectionObserver(function(es){es.forEach(function(e){
  if(!e.isIntersecting)return;var el=e.target;io.unobserve(el);
  el.classList.remove('sv-hide');
  setTimeout(function(){el.classList.remove('sv-rv');el.style.removeProperty('--i')},1100+(+el.style.getPropertyValue('--i')||0)*90);
 })},{threshold:.15,rootMargin:'0px 0px -6% 0px'});
 groups.forEach(function(sel){[].forEach.call(document.querySelectorAll(sel),function(el,i){
  if(el.getBoundingClientRect().top<innerHeight*.9)return;  /* already on screen: leave visible */
  el.classList.add('sv-rv','sv-hide');el.style.setProperty('--i',i%4);io.observe(el);
 })});
}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
