/* Modiv's Education - shared dashboard helpers (Student + Tutor).
   - injects the icon sprite used by the sidebar, header and cards
   - runs the "Hi, Name" account menu in the dashboard header
   - ModivsDash.paintAvatar / initials / icon helpers */
(function(){
  'use strict';

  var P = {
    dash:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    doc:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    msg:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1.1.9-1.1 1.7"/><path d="M12 17h.01"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    coin:'<circle cx="12" cy="12" r="9"/><path d="M9 9.5c.5-1 1.6-1.5 3-1.5 1.7 0 3 .8 3 2s-1.3 1.8-3 2-3 .8-3 2 1.3 2 3 2c1.4 0 2.5-.5 3-1.5M12 6v2M12 16v2"/>',
    star:'<path d="m12 3 2.8 5.9 6.2.8-4.5 4.3 1.2 6.5L12 17.3 6.3 20.5l1.2-6.5L3 9.7l6.2-.8z"/>',
    heart:'<path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z"/>',
    bell:'<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    chev:'<path d="m6 9 6 6 6-6"/>',
    out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    hist:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    crown:'<path d="m3 7 4 4 5-7 5 7 4-4-2 12H5z"/>',
    gear:'<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',
    home:'<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/>',
    arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>'
  };

  function sprite(){
    var s = '<svg id="mvIcons" xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">';
    Object.keys(P).forEach(function(k){ s += '<symbol id="i-' + k + '" viewBox="0 0 24 24">' + P[k] + '</symbol>'; });
    return s + '</svg>';
  }
  function inject(){
    if(document.getElementById('mvIcons') || !document.body) return;
    document.body.insertAdjacentHTML('afterbegin', sprite());
  }
  inject();

  function icon(name){ return '<svg class="ic" aria-hidden="true"><use href="#i-' + name + '"></use></svg>'; }
  function initials(n){
    return String(n || '').trim().split(/\s+/).map(function(w){ return w.charAt(0); }).slice(0, 2).join('').toUpperCase();
  }
  function firstName(n, fallback){
    var f = String(n || '').trim().split(/\s+/)[0];
    return f || fallback || '';
  }
  /* Show a photo inside an avatar circle, or fall back to initials. */
  function paintAvatar(el, src, text){
    if(!el) return;
    el.textContent = '';
    if(src){
      var im = document.createElement('img');
      im.src = src; im.alt = '';
      el.appendChild(im);
    } else {
      el.textContent = text || '';
    }
  }

  function initHeader(){
    inject();
    var btn = document.getElementById('dhUserBtn'), menu = document.getElementById('dhMenu');
    if(!btn || !menu) return;
    function close(){ menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      var open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function(e){ if(!menu.contains(e.target) && e.target !== btn) close(); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') close(); });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHeader);
  else initHeader();

  window.ModivsDash = { icon: icon, initials: initials, firstName: firstName, paintAvatar: paintAvatar };
})();
