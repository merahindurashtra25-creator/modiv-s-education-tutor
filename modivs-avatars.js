/* Modiv's Education: two default student avatars (male / female) as inline SVG data URIs.
   Usage: ModivsAvatars.src('male'|'female') -> data URI,  ModivsAvatars.has(key) -> bool */
(function(){
  'use strict';
  var MALE =
   '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">'+
   '<defs><clipPath id="c"><circle cx="60" cy="60" r="60"/></clipPath></defs>'+
   '<g clip-path="url(#c)">'+
   '<rect width="120" height="120" fill="#DCE8F7"/>'+
   '<circle cx="20" cy="24" r="14" fill="#C6D9F1"/><circle cx="104" cy="96" r="18" fill="#C6D9F1"/>'+
   '<path d="M14 124c2-24 20-38 46-38s44 14 46 38z" fill="#1A2035"/>'+
   '<path d="M46 88l14 14 14-14-5-4H51z" fill="#FEF7EA"/>'+
   '<rect x="51" y="70" width="18" height="20" rx="8" fill="#E2A97E"/>'+
   '<circle cx="36" cy="58" r="6" fill="#EDB78C"/><circle cx="84" cy="58" r="6" fill="#EDB78C"/>'+
   '<ellipse cx="60" cy="54" rx="24" ry="27" fill="#F3C39B"/>'+
   '<path d="M34 52c-3-20 8-32 26-32s30 10 26 32c-3-9-8-14-14-16-9 5-24 6-38 0-0 4-0 10 0 16z" fill="#2B1D14"/>'+
   '<path d="M34 50c1-6 4-11 8-14 6 3 14 4 22 3 7 0 14-2 20-6 2 5 2 12 2 17-4-8-9-12-16-13-12 4-25 4-36 13z" fill="#3A2819"/>'+
   '<circle cx="50" cy="56" r="3" fill="#1A2035"/><circle cx="70" cy="56" r="3" fill="#1A2035"/>'+
   '<circle cx="51" cy="55" r="1" fill="#fff"/><circle cx="71" cy="55" r="1" fill="#fff"/>'+
   '<path d="M44 49q6-4 12 0M64 49q6-4 12 0" stroke="#2B1D14" stroke-width="2.4" fill="none" stroke-linecap="round"/>'+
   '<path d="M52 68q8 7 16 0" stroke="#A8573B" stroke-width="2.6" fill="none" stroke-linecap="round"/>'+
   '<circle cx="42" cy="64" r="4" fill="#F0A58C" opacity=".45"/><circle cx="78" cy="64" r="4" fill="#F0A58C" opacity=".45"/>'+
   '</g></svg>';

  var FEMALE =
   '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">'+
   '<defs><clipPath id="c"><circle cx="60" cy="60" r="60"/></clipPath></defs>'+
   '<g clip-path="url(#c)">'+
   '<rect width="120" height="120" fill="#FCE4D3"/>'+
   '<circle cx="100" cy="22" r="14" fill="#F9D2B8"/><circle cx="16" cy="98" r="18" fill="#F9D2B8"/>'+
   '<path d="M30 40c-4 30-2 52 6 66h48c8-14 10-36 6-66-6-20-20-26-30-26S36 20 30 40z" fill="#3B2417"/>'+
   '<path d="M14 124c2-24 20-38 46-38s44 14 46 38z" fill="#FABD4E"/>'+
   '<path d="M46 88c4 8 24 8 28 0l-4-4H50z" fill="#FEF7EA"/>'+
   '<rect x="51" y="70" width="18" height="20" rx="8" fill="#E2A97E"/>'+
   '<ellipse cx="60" cy="54" rx="23" ry="26" fill="#F3C39B"/>'+
   '<path d="M35 54c-2-22 8-34 25-34s28 10 25 34c-2-10-6-17-12-21-6 4-14 6-24 5-6 3-11 9-14 16z" fill="#3B2417"/>'+
   '<path d="M37 46c6-2 14-6 18-12 6 6 16 10 28 12-1-14-10-22-23-22s-21 8-23 22z" fill="#4A2F1E"/>'+
   '<circle cx="50" cy="56" r="3" fill="#1A2035"/><circle cx="70" cy="56" r="3" fill="#1A2035"/>'+
   '<circle cx="51" cy="55" r="1" fill="#fff"/><circle cx="71" cy="55" r="1" fill="#fff"/>'+
   '<path d="M46 52l-2-2M48 51l-1-3M74 52l2-2M72 51l1-3" stroke="#1A2035" stroke-width="1.6" stroke-linecap="round"/>'+
   '<path d="M44 48q6-3 12 0M64 48q6-3 12 0" stroke="#3B2417" stroke-width="2" fill="none" stroke-linecap="round"/>'+
   '<path d="M52 67q8 7 16 0" stroke="#C0455A" stroke-width="2.8" fill="none" stroke-linecap="round"/>'+
   '<circle cx="42" cy="63" r="4" fill="#F08A8A" opacity=".4"/><circle cx="78" cy="63" r="4" fill="#F08A8A" opacity=".4"/>'+
   '<circle cx="82" cy="34" r="5" fill="#FABD4E"/><circle cx="82" cy="34" r="2" fill="#1A2035"/>'+
   '</g></svg>';

  var MAP = { male: MALE, female: FEMALE };
  function src(k){ return MAP[k] ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(MAP[k]) : ''; }
  window.ModivsAvatars = {
    src: src,
    has: function(k){ return !!MAP[k]; },
    labels: { male: 'Boy', female: 'Girl' }
  };
})();
