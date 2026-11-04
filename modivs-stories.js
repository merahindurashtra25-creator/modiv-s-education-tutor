/* Modiv's Education - Success Stories (YouTube videos that play inside the page)
   ------------------------------------------------------------------
   HOW TO ADD A VIDEO: paste the YouTube link into the "url" of a story below.
   Any normal link works: youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...
   Add or delete lines as you like. Leave url empty ('') to show "Video coming soon".
   ------------------------------------------------------------------ */
(function(w){
  var STORIES = {
    students: [
      { url: '', name: 'Student name', note: 'Class / subject, e.g. Class 10 Maths' },
      { url: '', name: 'Student name', note: 'Class / subject, e.g. Class 12 Physics' },
      { url: '', name: 'Parent name',  note: 'What the family says about Modiv’s' }
    ],
    tutors: [
      { url: '', name: 'Tutor name', note: 'Subject taught, city' },
      { url: '', name: 'Tutor name', note: 'Subject taught, city' },
      { url: '', name: 'Tutor name', note: 'Subject taught, city' }
    ]
  };

  var box = document.getElementById('storiesBox');
  if(!box) return;
  var TABS = [['students', 'Student stories'], ['tutors', 'Tutor stories']];
  var tab = 'students';

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function ytId(u){
    u = String(u || '').trim(); if(!u) return '';
    if(/^[\w-]{11}$/.test(u)) return u;
    var m = u.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/i);
    return m ? m[1] : '';
  }

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
    '#stories .st-body{padding:16px 18px 18px}',
    '#stories .st-body b{display:block;font-size:1.02rem;color:var(--navy)}',
    '#stories .st-body p{margin:4px 0 0;color:var(--muted);font-size:.9rem}',
    '@media(prefers-reduced-motion:reduce){#stories .st-btn,#stories .st-play{transition:none}}'
  ].join('\n');
  document.head.appendChild(css);

  function card(s, i){
    var id = ytId(s.url), media;
    if(id){
      media = '<img src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
        '<button type="button" class="st-play" data-i="' + i + '" aria-label="Play video: ' + esc(s.name) + '"><span class="st-btn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span></button>';
    } else {
      media = '<div class="st-soon"><span>▶</span>Video coming soon<small>Watch this space</small></div>';
    }
    return '<article class="st-card"><div class="st-vid" data-i="' + i + '">' + media + '</div><div class="st-body"><b>' + esc(s.name) + '</b><p>' + esc(s.note) + '</p></div></article>';
  }

  function render(){
    var list = STORIES[tab] || [];
    box.innerHTML =
      '<div class="st-tabs" role="tablist" aria-label="Success stories">' +
      TABS.map(function(t){ return '<button type="button" class="st-tab" role="tab" data-tab="' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + '</button>'; }).join('') +
      '</div><div class="st-grid" role="tabpanel">' + list.map(card).join('') + '</div>';
  }

  box.addEventListener('click', function(e){
    var t = e.target.closest ? e.target.closest('.st-tab') : null;
    if(t){ tab = t.getAttribute('data-tab'); render(); return; }       // switching tab also stops any playing video
    var p = e.target.closest ? e.target.closest('.st-play') : null;
    if(!p) return;
    var i = +p.getAttribute('data-i'), s = (STORIES[tab] || [])[i], id = s && ytId(s.url);
    if(!id) return;
    render();                                                              // stop any other video that is playing
    var vid = box.querySelector('.st-vid[data-i="' + i + '"]');
    if(vid) vid.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1&playsinline=1" title="' + esc(s.name) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  });

  w.ModivsStories = { data: STORIES };
  render();
})(window);
