/* Modiv's Education - lead lifecycle + admin badges (shared by admin, active leads, tutor and student dashboards)

   Lead fields used:
     approval      'pending' | 'approved' | 'rejected'   (missing = 'approved', so old leads stay live)
     submitted_at  when the student/parent first submitted the requirement
     approvedAt / approvedBy / liveAt   set when admin approves (that is also when it goes live on Active Leads)
     reviewedAt / rejectionNote         set when admin rejects
     status        active/new -> accepted / demo / converted / declined / closed   (tutor side, unchanged)
     free          true = Free lead (existing field)
     leadBadge     '' | 'active' | 'hot'   (admin-set badge)

   ModivsLeadStatus.stage(lead, {unlocks, firstUnlockAt}) -> { key,label,short,hint,icon,bg,fg }
   ModivsLeadStatus.timeline(lead, opts)                  -> [ {key,label,done,at,fail} ]
   ModivsLeadStatus.badges(lead)                          -> [ {key,label,bg,fg} ]
   ModivsLeadStatus.visible(lead)                         -> true when tutors may see it (approved)
   ModivsLeadStatus.fmt(dateLike)                         -> '11 Nov 2026, 3:42 PM' */
(function () {
  'use strict';
  var S = {
    submitted: { label: 'Submitted · Awaiting admin approval', short: 'Awaiting approval', icon: '⏳', bg: '#fff3cd', fg: '#856404', hint: 'Our team is reviewing this requirement. It goes live to tutors once approved.' },
    rejected: { label: 'Rejected by admin', short: 'Rejected', icon: '⛔', bg: '#f7dcda', fg: '#b3261e', hint: 'This requirement was not approved. See the admin note and submit it again with the corrections.' },
    live: { label: 'Approved · Live on Active Leads', short: 'Live', icon: '✅', bg: '#d9f0e3', fg: '#1b7a43', hint: 'Approved and uploaded. Tutors can see this requirement and unlock it.' },
    unlocked: { label: 'Unlocked by tutor', short: 'Unlocked', icon: '🔓', bg: '#e8f4fd', fg: '#1A2035', hint: 'At least one tutor has unlocked this lead and can contact the student.' },
    demo: { label: 'Demo class offered', short: 'Demo offered', icon: '🎓', bg: '#e8f4fd', fg: '#1A2035', hint: 'A tutor has offered a demo class.' },
    accepted: { label: 'Accepted by tutor', short: 'Accepted', icon: '🤝', bg: '#d9f0e3', fg: '#1b7a43', hint: 'A tutor has accepted this requirement.' },
    converted: { label: 'Converted · Tuition started', short: 'Converted', icon: '🏆', bg: '#d9f0e3', fg: '#1b7a43', hint: 'The student started tuition with a tutor.' },
    declined: { label: 'Declined by tutor', short: 'Declined', icon: '↩️', bg: '#e2e3e5', fg: '#495057', hint: 'The tutor declined. The lead can still be taken by other tutors.' },
    closed: { label: 'Closed', short: 'Closed', icon: '🔒', bg: '#e2e3e5', fg: '#495057', hint: 'This lead is closed.' }
  };
  var B = {
    free: { label: '🎁 Free Lead', bg: '#d9f0e3', fg: '#1b7a43' },
    hot: { label: '🔥 Hot Lead', bg: '#fde2d4', fg: '#b4440e' },
    active: { label: '⚡ Active Lead', bg: '#fff3cd', fg: '#856404' }
  };

  function approval(l) { var a = l && l.approval; return (a === 'pending' || a === 'rejected') ? a : 'approved'; }
  function visible(l) { return approval(l) === 'approved'; }

  function toDate(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'object') {
      if (typeof v.toDate === 'function') { try { return v.toDate(); } catch (e) { return null; } }
      if (v.seconds != null) return new Date(v.seconds * 1000);
    }
    var d = new Date(v); return isNaN(d) ? null : d;
  }
  function fmt(v) {
    var d = toDate(v); if (!d) return '';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  function stage(l, o) {
    o = o || {}; l = l || {};
    var key, a = approval(l), s = String(l.status || '').toLowerCase();
    if (a === 'pending') key = 'submitted';
    else if (a === 'rejected' || s === 'rejected') key = 'rejected';
    else if (s === 'converted') key = 'converted';
    else if (s === 'accepted') key = 'accepted';
    else if (s === 'demo') key = 'demo';
    else if (s === 'declined') key = 'declined';
    else if (s === 'closed') key = 'closed';
    else if (o.unlocks > 0) key = 'unlocked';
    else key = 'live';
    var r = Object.assign({ key: key }, S[key]);
    if (key === 'rejected' && l.rejectionNote) r.hint = 'Admin note: ' + l.rejectionNote;
    return r;
  }

  function timeline(l, o) {
    o = o || {}; l = l || {};
    var a = approval(l), s = String(l.status || '').toLowerCase();
    var live = a === 'approved' && s !== 'closed' && s !== 'rejected';
    var steps = [
      { key: 'submitted', label: 'Submitted', done: true, at: l.submitted_at || l.registered_at || l.created_at || '' }
    ];
    if (a === 'rejected') steps.push({ key: 'rejected', label: 'Rejected by admin', done: true, fail: true, at: l.reviewedAt || '' });
    else {
      steps.push({ key: 'approved', label: 'Approved by admin', done: a === 'approved', at: l.approvedAt || '' });
      steps.push({ key: 'live', label: 'Uploaded to Active Leads', done: live || (a === 'approved'), at: l.liveAt || l.approvedAt || '' });
      steps.push({ key: 'unlocked', label: 'Unlocked by tutor', done: (o.unlocks > 0) || s === 'accepted' || s === 'demo' || s === 'converted', at: o.firstUnlockAt || '' });
      steps.push({ key: 'accepted', label: 'Accepted by tutor', done: s === 'accepted' || s === 'converted', at: l.acceptedAt || '' });
      steps.push({ key: 'converted', label: 'Converted', done: s === 'converted', at: l.convertedAt || '' });
    }
    return steps;
  }

  function badges(l) {
    var out = [];
    if (l && l.free === true) out.push(Object.assign({ key: 'free' }, B.free));
    if (l && (l.leadBadge === 'hot' || l.leadBadge === 'active')) out.push(Object.assign({ key: l.leadBadge }, B[l.leadBadge]));
    return out;
  }

  window.ModivsLeadStatus = { stage: stage, timeline: timeline, badges: badges, visible: visible, approval: approval, fmt: fmt, STAGES: S, BADGES: B };
})();
