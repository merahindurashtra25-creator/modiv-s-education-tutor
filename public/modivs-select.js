/* Modiv's Education: themed drop-down.
   Replaces every native <select> on the page with a drop-down that matches the site theme
   (cream / navy / yellow), the same look as the City, Area and Country-code pickers.
   The native <select> stays in the page (visually hidden), so existing code that reads
   select.value, adds the "bad" class or listens for "change" keeps working unchanged.
   Opt out for one select with data-native="1". Lists longer than 12 options get a search box. */
(function(){
  'use strict';
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  var uid=0;

  function build(sel){
    if(sel.getAttribute('data-ms')||sel.getAttribute('data-native')||sel.multiple||sel.classList.contains('pl-sel'))return;
    sel.setAttribute('data-ms','1');
    var box=document.createElement('div');box.className='ms-box';
    var id='ms'+(++uid);
    box.innerHTML='<button type="button" class="ms-btn" aria-haspopup="listbox" aria-expanded="false"><span class="ms-val"></span><span class="ms-car" aria-hidden="true"></span></button>'+
      '<div class="ms-pop" hidden><input type="text" class="ms-search" placeholder="Type to search" autocomplete="off" aria-label="Search the list" hidden><ul class="ms-list" role="listbox" id="'+id+'"></ul></div>';
    sel.parentNode.insertBefore(box,sel.nextSibling);
    sel.classList.add('ms-native');sel.tabIndex=-1;sel.setAttribute('aria-hidden','true');
    var btn=box.querySelector('.ms-btn'),pop=box.querySelector('.ms-pop'),list=box.querySelector('.ms-list'),q=box.querySelector('.ms-search'),val=box.querySelector('.ms-val');
    btn.setAttribute('aria-controls',id);
    if(sel.disabled)btn.disabled=true;
    // keep label clicks / code that calls select.focus() working
    sel.focus=function(){btn.focus()};
    sel._msBox=box;

    function opts(){return [].slice.call(sel.options)}
    function paint(){
      var o=sel.options[sel.selectedIndex];
      var has=o&&o.value!=='';
      val.textContent=o?o.text:'Select';
      box.classList.toggle('ms-empty',!has);
      btn.disabled=sel.disabled;
      box.classList.toggle('ms-bad',sel.classList.contains('bad'));
    }
    function fill(term){
      term=(term||'').toLowerCase().trim();
      var html='';
      opts().forEach(function(o,i){
        if(o.value===''&&i===0)return;                       // skip the "Select" placeholder
        if(term&&o.text.toLowerCase().indexOf(term)<0)return;
        var on=i===sel.selectedIndex;
        html+='<li role="option" data-i="'+i+'"'+(on?' class="on" aria-selected="true"':'')+'><span>'+esc(o.text)+'</span></li>';
      });
      list.innerHTML=html||'<li class="none">Nothing found</li>';
    }
    function open(){
      closeAll(box);
      q.hidden=opts().length<=13;
      q.value='';fill('');pop.hidden=false;pop.classList.remove('up');
      btn.setAttribute('aria-expanded','true');box.classList.add('ms-open');
      // flip upwards when there is no room below
      var r=btn.getBoundingClientRect(),room=window.innerHeight-r.bottom,need=Math.min(300,pop.offsetHeight||260);
      if(room<need+12&&r.top>need)pop.classList.add('up');
      var on=list.querySelector('.on');
      if(on)list.scrollTop=Math.max(0,on.offsetTop-list.clientHeight/2+on.offsetHeight/2);   // scroll inside the list only, never the page
      if(!q.hidden)q.focus({preventScroll:true});
    }
    function close(refocus){
      if(pop.hidden)return;pop.hidden=true;btn.setAttribute('aria-expanded','false');box.classList.remove('ms-open');
      if(refocus)btn.focus({preventScroll:true});
    }
    function choose(i){
      sel.selectedIndex=i;paint();close(true);
      sel.dispatchEvent(new Event('input',{bubbles:true}));
      sel.dispatchEvent(new Event('change',{bubbles:true}));
    }
    box._open=open;box._close=close;box._paint=paint;
    btn.addEventListener('click',function(){pop.hidden?open():close()});
    list.addEventListener('mousedown',function(e){e.preventDefault()});
    list.addEventListener('click',function(e){var li=e.target.closest('li[data-i]');if(li)choose(+li.getAttribute('data-i'))});
    q.addEventListener('input',function(){fill(q.value)});
    box.addEventListener('keydown',function(e){
      var items=[].slice.call(list.querySelectorAll('li[data-i]')),cur=list.querySelector('li.hl'),i=items.indexOf(cur);
      if(e.key==='Escape'&&!pop.hidden){e.preventDefault();close(true);return}
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){
        e.preventDefault();if(pop.hidden){open();return}
        if(!items.length)return;if(cur)cur.classList.remove('hl');
        i=e.key==='ArrowDown'?(i+1)%items.length:(i<=0?items.length-1:i-1);
        items[i].classList.add('hl');items[i].scrollIntoView({block:'nearest'});
      }else if(e.key==='Enter'&&!pop.hidden){
        e.preventDefault();var t=cur||list.querySelector('li.on')||items[0];if(t)choose(+t.getAttribute('data-i'));
      }
    });
    sel.addEventListener('change',paint);
    // follow programmatic changes (value set by code, class "bad" added, disabled toggled)
    new MutationObserver(paint).observe(sel,{attributes:true,attributeFilter:['class','disabled']});
    paint();
  }

  function closeAll(except){
    [].forEach.call(document.querySelectorAll('.ms-box.ms-open'),function(b){if(b!==except&&b._close)b._close(false)});
  }
  function scan(root){[].forEach.call((root||document).querySelectorAll('select:not([data-ms]):not([data-native]):not(.pl-sel)'),build)}

  // a select with data-other="<id>" shows that box only while "Other" is chosen (the tutor then types their own value)
  document.addEventListener('change',function(e){
    var t=e.target;if(!t||!t.getAttribute||t.tagName!=='SELECT')return;
    var id=t.getAttribute('data-other');if(!id)return;
    var w=document.getElementById(id);if(!w)return;
    var on=t.value==='Other';w.hidden=!on;
    if(on){var i=w.querySelector('input');if(i)try{i.focus({preventScroll:true})}catch(x){i.focus()}}
  });
  document.addEventListener('mousedown',function(e){if(!e.target.closest||!e.target.closest('.ms-box'))closeAll()});
  document.addEventListener('focusin',function(e){if(e.target.closest&&!e.target.closest('.ms-box'))closeAll()});
  new MutationObserver(function(){scan()}).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState!=='loading')scan();else document.addEventListener('DOMContentLoaded',function(){scan()});

  var css=document.createElement('style');
  css.textContent=
   'select.ms-native{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden}'+
   '.ms-box{position:relative;width:100%}'+
   '.ms-btn{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:46px;padding:11px 13px;border:1.5px solid #eadfc9;border-radius:10px;background:#fff;color:#1A2035;font:inherit;text-align:left;cursor:pointer;transition:border-color .15s,box-shadow .15s}'+
   '.ms-btn:hover{border-color:#EBB92E}'+
   '.ms-btn:focus-visible,.ms-open .ms-btn{border-color:#EBB92E;box-shadow:0 0 0 4px rgba(235,185,46,.22);outline:none}'+
   '.ms-btn:disabled{background:#fffcf5;opacity:.7;cursor:not-allowed}'+
   '.ms-val{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
   '.ms-empty .ms-val{color:#7a8296}'+
   '.ms-car{flex:none;width:9px;height:9px;border-right:2px solid #1A2035;border-bottom:2px solid #1A2035;transform:rotate(45deg) translateY(-2px);transition:transform .2s}'+
   '.ms-open .ms-car{transform:rotate(-135deg) translate(-2px,-1px)}'+
   '.ms-bad .ms-btn{border-color:#b3261e}'+
   '.ms-pop{position:absolute;z-index:70;left:0;right:0;top:calc(100% + 6px);background:#FEF7EA;border:1.5px solid #eadfc9;border-radius:12px;box-shadow:0 14px 34px rgba(26,32,53,.18);padding:6px}'+
   '.ms-pop.up{top:auto;bottom:calc(100% + 6px)}'+
   '.ms-pop[hidden]{display:none}'+
   '.ms-search{width:100%;box-sizing:border-box;margin:0 0 6px;padding:10px 12px;border:1.5px solid #eadfc9;border-radius:8px;background:#fff;font:inherit}'+
   '.ms-search:focus{border-color:#EBB92E;box-shadow:0 0 0 3px rgba(235,185,46,.22);outline:none}'+
   '.ms-list{list-style:none;margin:0;padding:0;max-height:260px;overflow:auto;position:relative}'+
   '.ms-list li{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;font-size:.94rem;color:#1A2035}'+
   '.ms-list li:hover,.ms-list li.hl{background:#fff4d6}'+
   '.ms-list li.on{background:#fff;font-weight:700;box-shadow:inset 3px 0 0 #EBB92E}'+
   '.ms-list li.on::after{content:"";flex:none;width:6px;height:11px;border-right:2.5px solid #1A2035;border-bottom:2.5px solid #1A2035;transform:rotate(45deg) translateY(-2px)}'+
   '.ms-list li.none{color:#7a8296;cursor:default}.ms-list li.none:hover{background:none}';
  document.head.appendChild(css);
})();
