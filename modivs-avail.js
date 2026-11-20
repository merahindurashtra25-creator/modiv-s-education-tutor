/* Modiv's Education: tutor availability picker (shared by the profile wizard and Edit profile).
   Same idea as the student "Post a Requirement" page:
     1. choose when you can teach: Morning, Afternoon, Evening or Flexible
     2. the matching time slots appear so you can tick the exact hours
   Usage:
     ModivsAvail.html(state)        -> markup   (state = { days:[], times:[], slots:[] })
     ModivsAvail.fromRecord(rec)    -> state    (reads availDays/availTimes/availSlots, or the old Mon-Morning grid)
     ModivsAvail.read(root)         -> state    (reads the ticked boxes inside root)
     ModivsAvail.check(state)       -> '' or an error message
     ModivsAvail.toLegacy(state)    -> { 'Mon-Morning':1, ... } (kept so the dashboard completeness check still works)
     ModivsAvail.handle(target)     -> call from a delegated "change" listener
*/
(function(){
  'use strict';
  var DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var TIMES = ['Morning','Afternoon','Evening','Flexible'];
  var PERIODS = ['Morning','Afternoon','Evening'];
  var SLOTS = {
    Morning:['6:00 - 7:00 AM','7:00 - 8:00 AM','8:00 - 9:00 AM','9:00 - 10:00 AM','10:00 - 11:00 AM','11:00 AM - 12:00 PM'],
    Afternoon:['12:00 - 1:00 PM','1:00 - 2:00 PM','2:00 - 3:00 PM','3:00 - 4:00 PM'],
    Evening:['4:00 - 5:00 PM','5:00 - 6:00 PM','6:00 - 7:00 PM','7:00 - 8:00 PM','8:00 - 9:00 PM']
  };
  var HINTS = { Morning:'6 AM to 12 PM', Afternoon:'12 PM to 4 PM', Evening:'4 PM to 9 PM', Flexible:'Any time that suits the student' };

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function uniq(a){ return a.filter(function(x, i){ return a.indexOf(x) === i; }); }

  function css(){
    if(document.getElementById('mvAvCss')) return;
    var s = document.createElement('style'); s.id = 'mvAvCss';
    s.textContent =
      '.mv-av .mv-av-lab{display:block;font-weight:600;font-size:.88rem;margin:16px 0 8px}' +
      '.mv-av .mv-av-hint{font-weight:400;color:#5d6b82;font-size:.8rem}' +
      '.mv-av .mv-av-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}' +
      '.mv-av .mv-av-days{display:flex;flex-wrap:wrap;gap:8px}' +
      '.mv-av label.mv-av-opt{position:relative;display:flex;align-items:center;gap:10px;margin:0;padding:12px 14px;border:1.5px solid #eadfc9;border-radius:12px;background:#fff;color:#1A2035;font-weight:500;font-size:.92rem;line-height:1.3;cursor:pointer;transition:border-color .15s,background .15s,box-shadow .15s,transform .15s}' +
      '.mv-av label.mv-av-opt:hover{border-color:#EBB92E;transform:translateY(-1px)}' +
      '.mv-av label.mv-av-opt input{width:18px;height:18px;margin:0;flex:none;accent-color:#1A2035}' +
      '.mv-av label.mv-av-opt span{display:block}' +
      '.mv-av label.mv-av-opt small{display:block;font-weight:400;color:#5d6b82;font-size:.76rem}' +
      '.mv-av label.mv-av-opt:has(input:checked){border-color:#EBB92E;background:#FEF7EA;font-weight:700;box-shadow:0 0 0 3px rgba(235,185,46,.22)}' +
      '.mv-av label.mv-av-opt:focus-within{outline:3px solid rgba(235,185,46,.55);outline-offset:2px}' +
      '.mv-av label.mv-av-day{padding:9px 18px;border-radius:999px}' +
      '.mv-av label.mv-av-day input{position:absolute;opacity:0;pointer-events:none}' +
      '.mv-av label.mv-av-day:has(input:checked){background:#1A2035;border-color:#1A2035;color:#fff;box-shadow:none}' +
      '.mv-av .mv-av-slotbox{margin-top:6px}' +
      '.mv-av .mv-av-slotgroup{margin-top:4px;animation:mvAvIn .25s ease both}' +
      '.mv-av .mv-av-slotgroup.hide{display:none}' +
      '.mv-av .mv-av-flex{margin:12px 0 0;padding:12px 14px;border:1.5px dashed #eadfc9;border-radius:12px;background:#fffcf5;font-size:.9rem;color:#1A2035}' +
      '.mv-av .mv-av-flex.hide{display:none}' +
      '@keyframes mvAvIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}' +
      '@media(prefers-reduced-motion:reduce){.mv-av .mv-av-slotgroup{animation:none}}' +
      '@media(max-width:480px){.mv-av .mv-av-grid{grid-template-columns:1fr 1fr}}';
    document.head.appendChild(s);
  }

  // old profiles stored a Mon-Morning style grid in `avail`; turn it back into days + periods
  function fromRecord(rec){
    rec = rec || {};
    var days = Array.isArray(rec.availDays) ? rec.availDays.slice() : null;
    var times = Array.isArray(rec.availTimes) ? rec.availTimes.slice() : null;
    var slots = Array.isArray(rec.availSlots) ? rec.availSlots.slice() : [];
    if(!days || !times){
      var d = [], t = [];
      Object.keys(rec.avail || {}).forEach(function(k){
        if(!rec.avail[k]) return;
        var p = String(k).split('-'); if(p.length !== 2) return;
        if(DAYS.indexOf(p[0]) > -1) d.push(p[0]);
        if(PERIODS.indexOf(p[1]) > -1) t.push(p[1]);
      });
      days = days || uniq(d).sort(function(a, b){ return DAYS.indexOf(a) - DAYS.indexOf(b); });
      times = times || uniq(t).sort(function(a, b){ return PERIODS.indexOf(a) - PERIODS.indexOf(b); });
    }
    times = times.filter(function(x){ return TIMES.indexOf(x) > -1; });
    // an old profile only knew "Morning" etc., so treat every hour of that period as available until the tutor narrows it down
    if(!Array.isArray(rec.availTimes)) times.forEach(function(t){ (SLOTS[t] || []).forEach(function(x){ if(slots.indexOf(x) < 0) slots.push(x); }); });
    return { days: days.filter(function(x){ return DAYS.indexOf(x) > -1; }), times: times, slots: slots };
  }

  function html(st){
    css();
    st = st || { days: [], times: [], slots: [] };
    var flex = st.times.indexOf('Flexible') > -1;
    var daysH = '<div class="mv-av-days" role="group" aria-label="Days you can teach">' + DAYS.map(function(d){
      return '<label class="mv-av-opt mv-av-day"><input type="checkbox" data-av-day value="'+d+'"'+(st.days.indexOf(d) > -1 ? ' checked' : '')+'><span>'+d+'</span></label>';
    }).join('') + '</div>';
    var timesH = '<div class="mv-av-grid" role="group" aria-label="What time suits you best for classes">' + TIMES.map(function(t){
      return '<label class="mv-av-opt"><input type="checkbox" data-av-time value="'+t+'"'+(st.times.indexOf(t) > -1 ? ' checked' : '')+'><span>'+t+'<small>'+esc(HINTS[t])+'</small></span></label>';
    }).join('') + '</div>';
    var slotsH = PERIODS.map(function(p){
      var on = st.times.indexOf(p) > -1;
      return '<div class="mv-av-slotgroup'+(on ? '' : ' hide')+'" data-av-for="'+p+'"><span class="mv-av-lab">'+p+' time slots <span class="mv-av-hint">pick one or more</span></span><div class="mv-av-grid">' +
        SLOTS[p].map(function(s){ return '<label class="mv-av-opt"><input type="checkbox" data-av-slot="'+p+'" value="'+esc(s)+'"'+(st.slots.indexOf(s) > -1 ? ' checked' : '')+'><span>'+esc(s)+'</span></label>'; }).join('') +
        '</div></div>';
    }).join('');
    return '<div class="mv-av" id="mvAv">' +
      '<span class="mv-av-lab">Days you can teach <span class="mv-av-hint">optional · tick all that apply</span></span>' + daysH +
      '<span class="mv-av-lab">What time suits you best for classes? <span class="mv-av-hint">optional</span></span>' + timesH +
      '<div class="mv-av-flex'+(flex ? '' : ' hide')+'" id="mvAvFlex">You are flexible, so students can ask for any time that works for both of you.</div>' +
      '<div class="mv-av-slotbox" id="mvAvSlots">' + slotsH + '</div></div>';
  }

  function ticked(root, sel){ return [].map.call(root.querySelectorAll(sel + ':checked'), function(x){ return x.value; }); }

  // read the ticked boxes; slots only count while their time of day is still ticked
  function read(root){
    root = root || document;
    var times = ticked(root, 'input[data-av-time]');
    if(times.indexOf('Flexible') > -1) times = ['Flexible'];
    var slots = ticked(root, 'input[data-av-slot]').filter(function(s){
      return times.some(function(p){ return (SLOTS[p] || []).indexOf(s) > -1; });
    });
    return { days: ticked(root, 'input[data-av-day]'), times: times, slots: slots };
  }

  function check(st){
    for(var i = 0; i < st.times.length; i++){
      var p = st.times[i];
      if(SLOTS[p] && !st.slots.some(function(s){ return SLOTS[p].indexOf(s) > -1; })) return 'Pick at least one ' + p.toLowerCase() + ' time slot, or untick ' + p + '.';
    }
    return '';
  }

  function toLegacy(st){
    var out = {}, periods = st.times.indexOf('Flexible') > -1 ? PERIODS : st.times.filter(function(t){ return PERIODS.indexOf(t) > -1; });
    if(!periods.length) return out;
    (st.days.length ? st.days : DAYS).forEach(function(d){ periods.forEach(function(p){ out[d + '-' + p] = 1; }); });
    return out;
  }

  // delegated change handler: Flexible is exclusive, and each time of day shows only its own slots
  function handle(t){
    if(!t || !t.matches) return false;
    var root = t.closest ? t.closest('.mv-av') : null; if(!root) return false;
    if(t.matches('input[data-av-time]')){
      if(t.checked){
        [].forEach.call(root.querySelectorAll('input[data-av-time]'), function(o){
          if(o === t) return;
          if(t.value === 'Flexible' || o.value === 'Flexible') o.checked = false;
        });
      }
      var on = ticked(root, 'input[data-av-time]');
      [].forEach.call(root.querySelectorAll('.mv-av-slotgroup'), function(g){
        var show = on.indexOf(g.getAttribute('data-av-for')) > -1;
        g.classList.toggle('hide', !show);
        if(!show) [].forEach.call(g.querySelectorAll('input'), function(i){ i.checked = false; });
      });
      var f = root.querySelector('#mvAvFlex'); if(f) f.classList.toggle('hide', on.indexOf('Flexible') < 0);
      return true;
    }
    return false;
  }

  window.ModivsAvail = { DAYS: DAYS, TIMES: TIMES, SLOTS: SLOTS, html: html, fromRecord: fromRecord, read: read, check: check, toLegacy: toLegacy, handle: handle };
})();
