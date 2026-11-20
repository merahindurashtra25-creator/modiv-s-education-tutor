/* Modiv's Education - "From Modiv's Education" videos (YouTube, played inside the page)
   ------------------------------------------------------------------
   The admin adds, edits, re-orders and deletes these videos in the Admin page > "Videos" tab.
   They are saved to Firestore site_content/stories (anyone reads, only admins write; see firestore.rules)
   and mirrored in localStorage. The two videos below are shown until the admin saves a list.
   Any normal YouTube link works: youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...
   ------------------------------------------------------------------ */
(function(w){
  'use strict';
  var KEY = 'modivs_story_videos';
  var DEFAULTS = [
    { id: 'v1', url: 'https://youtu.be/hAQ0uQuJ1tI', name: 'From Modiv’s Education', note: 'Watch the video' },
    { id: 'v2', url: 'https://youtu.be/-cNWq_uc_JM', name: 'From Modiv’s Education', note: 'Watch the video' }
  ];

  function copy(a){ return JSON.parse(JSON.stringify(a)); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function ytId(u){
    u = String(u || '').trim(); if(!u) return '';
    if(/^[\w-]{11}$/.test(u)) return u;
    var m = u.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/i);
    return m ? m[1] : '';
  }
  function clean(list){
    return (Array.isArray(list) ? list : []).map(function(x, i){
      return { id: String(x.id || ('v' + Date.now().toString(36) + i)), url: String(x.url || '').trim(),
               name: String(x.name || '').trim().slice(0, 100), note: String(x.note || '').trim().slice(0, 160) };
    }).filter(function(x){ return ytId(x.url); });
  }
  function readLocal(){ try{ var v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : null; }catch(e){ return null; } }
  function writeLocal(a){ try{ localStorage.setItem(KEY, JSON.stringify(a)); }catch(e){} }
  function db(){ return w.EducationBFirebase && w.EducationBFirebase.db; }
  function waitDb(){
    return new Promise(function(res){
      var n = 0;
      (function chk(){ if(db()) return res(db()); if(++n > 50) return res(null); setTimeout(chk, 100); })();
    });
  }
  function doc(d){ return d.collection('site_content').doc('stories'); }
  function cached(){ return readLocal() || copy(DEFAULTS); }
  function load(){
    return waitDb().then(function(d){
      if(!d) return cached();
      return doc(d).get().then(function(s){
        var v = s.exists && s.data().items;
        if(Array.isArray(v)){ v = clean(v); writeLocal(v); return v; }
        return cached();
      }, function(){ return cached(); });
    });
  }
  // Resolves with {cloud:true} when Firestore saved it, or {cloud:false, reason} when only this browser has it
  function save(list){
    list = clean(list); writeLocal(list);
    return waitDb().then(function(d){
      if(!d) return { cloud: false, reason: 'Firebase is not available' };
      return doc(d).set({ items: list, updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
        .then(function(){ return { cloud: true }; }, function(e){ return { cloud: false, reason: (e && e.code) || 'error' }; });
    });
  }
  w.ModivsStories = { ytId: ytId, defaults: function(){ return copy(DEFAULTS); }, cached: cached, load: load, save: save };

  /* ---------- home page rendering (only where #storiesBox exists) ---------- */
  var box = document.getElementById('storiesBox');
  if(!box) return;
  var list = cached();

  var css = document.createElement('style');
  css.textContent = [
    '#stories .st-tabs{display:inline-flex;gap:6px;padding:5px;background:#fff;border:1.5px solid var(--line);border-radius:99px;margin:0 0 26px}',
    '#stories .st-tab{border:0;background:none;font:inherit;font-weight:700;font-size:.92rem;padding:9px 20px;border-radius:99px;cursor:pointer;color:var(--navy)}',
    '#stories .st-tab[aria-selected=true]{background:var(--navy);color:#fff}',
    '#stories .st-tab:focus-visible,#stories .st-play:focus-visible{outline:3px solid var(--yellow);outline-offset:2px}',
    '#stories .st-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:20px}',
    '#stories .st-card{background:#fff;border:1.5px solid var(--line);border-radius:18px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 8px 24px rgba(26,32,53,.07)}',
    '#stories .st-vid{position:relative;aspect-ratio:16/9;background:linear-gradient(150deg,#1A2035,#2a3558);overflow:hidden}',
    '#stories .st-vid img,#stories .st-vid iframe{position:absolute;inset:0;width:100%;height:100%;border:0;object-fit:cover}',
    '#stories .st-play{position:absolute;inset:0;width:100%;height:100%;border:0;background:rgba(26,32,53,.18);cursor:pointer;display:grid;place-items:center;padding:0;transition:background .2s}',
    '#stories .st-play:hover{background:rgba(26,32,53,.34)}',
    '#stories .st-btn{width:64px;height:64px;border-radius:50%;background:var(--yellow);display:grid;place-items:center;box-shadow:0 8px 22px rgba(0,0,0,.35);transition:transform .2s}',
    '#stories .st-play:hover .st-btn{transform:scale(1.08)}',
    '#stories .st-btn svg{width:26px;height:26px;margin-left:4px;fill:var(--navy)}',
    '#stories .st-soon{position:absolute;inset:0;display:grid;place-items:center;align-content:center;gap:8px;color:#fff;text-align:center;font-weight:700;padding:12px}',
    '#stories .st-soon span{font-size:2rem;opacity:.9}#stories .st-soon small{font-weight:500;opacity:.75}',
    '#stories .st-body{padding:16px 18px 18px;display:flex;flex-direction:column;gap:6px}',
    '#stories .st-body b{display:block;font-size:1.02rem;color:var(--navy)}',
    '#stories .st-body p{margin:0;color:var(--muted);font-size:.9rem}',
    '#stories .st-ext{display:inline-flex;align-items:center;gap:4px;color:var(--navy);font-weight:700;font-size:.85rem;text-decoration:none;margin-top:2px}',
    '#stories .st-ext:hover{text-decoration:underline;color:#0b1124}',
    '#stories .st-fail{position:absolute;inset:0;z-index:2;display:grid;place-content:center;justify-items:center;gap:10px;text-align:center;padding:16px;background:rgba(26,32,53,.96);color:#FEF7EA;font-weight:600;font-size:.9rem;line-height:1.4}',
    '#stories .st-fail a{display:inline-block;background:var(--yellow);color:var(--navy);font-weight:800;text-decoration:none;padding:9px 18px;border-radius:10px}',
    '#stories .st-empty{color:var(--muted)}',
    '@media(prefers-reduced-motion:reduce){#stories .st-btn,#stories .st-play{transition:none}}'
  ].join('\n');
  document.head.appendChild(css);

  function thumbMedia(id, i, name){
    return '<img src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
      '<button type="button" class="st-play" data-i="' + i + '" aria-label="Play video: ' + esc(name || 'video') + '"><span class="st-btn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span></button>';
  }

  function card(s, i){
    var id = ytId(s.url);
    return '<article class="st-card"><div class="st-vid" data-i="' + i + '">' + thumbMedia(id, i, s.name) + '</div>' +
      ((s.name || s.note) ? '<div class="st-body">' + (s.name ? '<b>' + esc(s.name) + '</b>' : '') + (s.note ? '<p>' + esc(s.note) + '</p>' : '') +
      '<a class="st-ext" href="https://www.youtube.com/watch?v=' + esc(id) + '" target="_blank" rel="noopener">Watch on YouTube ↗</a></div>' : '') + '</article>';
  }

  var activeIndex = null;

  function render(){
    activeIndex = null;
    box.innerHTML = list.length ? '<div class="st-grid">' + list.map(card).join('') + '</div>' : '<p class="st-empty">Videos coming soon.</p>';
  }

  function failUI(vid, id, msg){
    if(vid.querySelector('.st-fail')) return;
    var d = document.createElement('div'); d.className = 'st-fail';
    d.innerHTML = '<span>' + esc(msg || 'This video can’t be played on this page.') + '</span><a href="https://www.youtube.com/watch?v=' + esc(id) + '" target="_blank" rel="noopener">Watch on YouTube</a>';
    vid.appendChild(d);
  }

  function play(i){
    var s = list[i], id = s && ytId(s.url); if(!id) return;

    // Local files (file://) cannot embed YouTube videos because browsers send no referer (YouTube Error 153).
    // In that case, open the video directly on YouTube and show a helpful prompt.
    if(location.protocol === 'file:'){
      window.open('https://www.youtube.com/watch?v=' + encodeURIComponent(id), '_blank', 'noopener');
      var fVid = box.querySelector('.st-vid[data-i="' + i + '"]');
      if(fVid) failUI(fVid, id, 'Opened video on YouTube! (Local file:// URLs cannot embed YouTube players due to YouTube security policy. Run via a local web server to play inside the page.)');
      return;
    }

    // Reset other playing video containers to thumbnail
    box.querySelectorAll('.st-vid').forEach(function(el){
      var idx = +el.getAttribute('data-i');
      if(idx !== i && list[idx]){
        el.innerHTML = thumbMedia(ytId(list[idx].url), idx, list[idx].name);
      }
    });

    var vid = box.querySelector('.st-vid[data-i="' + i + '"]'); if(!vid) return;
    activeIndex = i;
    vid.innerHTML = '<iframe src="https://www.youtube.com/embed/' + esc(id) + '?autoplay=1&rel=0&playsinline=1" title="' + esc(s.name || 'Video') + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  }

  box.addEventListener('click', function(e){
    var p = e.target.closest ? e.target.closest('.st-play') : null;
    if(p) play(+p.getAttribute('data-i'));
  });

  render();
  load().then(function(v){
    if(JSON.stringify(v) !== JSON.stringify(list)){
      list = v;
      if(activeIndex == null) render();
    }
  });
})(window);
