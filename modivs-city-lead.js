/* Modiv's Education - City page "starting options" + quick lead capture (modivs-city-lead.js)

   Renders the UrbanPro-style starting flow inside any <div data-mv-lead data-city="Chandigarh">:
     1. How would you like to attend?  (Online / At my home / Tutor's place)
     2. When do you need a tutor?      (Immediately / Within a month / Just exploring)
     3. Learning details + contact     (class, board, subject, sector, name, phone)
   Submitting POSTs to /api/leads. The API always stores non-admin leads as approval:'pending',
   so the lead only goes live on Active Leads after an admin approves it (same as Post a Requirement).
*/
(function () {
  'use strict';

  var CLASSES = ['Kindergarten ( LKG-UKG)', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'College / University', 'Competitive Level'];
  var BOARDS = ['CBSE', 'ICSE', 'PSEB / State Board', 'IGCSE / IB', 'Other'];
  var SUBJECTS = ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Punjabi', 'Accountancy', 'Economics', 'Computer Science', 'Social Science'];
  var ATTEND = [
    { key: 'Online', icon: '💻', title: 'Live online classes', hint: 'Learn from home on Zoom / Google Meet' },
    { key: "Student's Home", icon: '🏠', title: 'At my home', hint: 'Tutor visits you for home tuition' },
    { key: "Tutor's Home", icon: '📍', title: 'Nearby classes', hint: "Go to the tutor's place near you" }
  ];
  var WHEN = [
    { key: 'Immediately', icon: '⚡', title: 'Immediately' },
    { key: 'Within a month', icon: '📅', title: 'Within a month' },
    { key: 'Just exploring options', icon: '👀', title: 'Just exploring' }
  ];
  var LIMIT_KEY = 'modivs_city_lead_log';

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function authUser() {
    var u = jget('modivs_auth_user', null);
    return u && (u.roleKey === 'student' || u.role === 'Student / Parent') ? u : null;
  }
  function tc(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function tooMany() {
    var now = Date.now(), log = jget(LIMIT_KEY, []).filter(function (t) { return now - t < 86400000; });
    return log.length >= 3;
  }
  function noteSent() {
    var now = Date.now(), log = jget(LIMIT_KEY, []).filter(function (t) { return now - t < 86400000; });
    log.push(now);
    try { localStorage.setItem(LIMIT_KEY, JSON.stringify(log)); } catch (e) { }
  }

  function init(root) {
    if (root.__mvLead) return;
    root.__mvLead = true;
    var city = root.getAttribute('data-city') || 'Chandigarh';
    var areas = (root.getAttribute('data-areas') || '').split('|').filter(Boolean);
    var user = authUser();
    var S = { step: 1, attend: [], when: '', done: false };

    function render() {
      root.textContent = '';
      var card = el('div', 'ml-card');
      var head = el('div', 'ml-head');
      head.appendChild(el('span', 'ml-badge', 'Free · takes 1 minute'));
      var steps = el('ol', 'ml-steps');
      steps.setAttribute('aria-label', 'Progress');
      ['Mode', 'Start', 'Details'].forEach(function (n, i) {
        var li = el('li', S.step === i + 1 ? 'on' : (S.step > i + 1 ? 'done' : ''), n);
        if (S.step === i + 1) li.setAttribute('aria-current', 'step');
        steps.appendChild(li);
      });
      head.appendChild(steps);
      card.appendChild(head);

      if (S.done) { card.appendChild(doneView()); }
      else if (S.step === 1) { card.appendChild(stepAttend()); }
      else if (S.step === 2) { card.appendChild(stepWhen()); }
      else { card.appendChild(stepDetails()); }
      root.appendChild(card);
    }

    function choice(opts, selected, multi, onPick) {
      var wrap = el('div', 'ml-opts');
      wrap.setAttribute('role', 'group');
      opts.forEach(function (o) {
        var on = multi ? selected.indexOf(o.key) > -1 : selected === o.key;
        var b = el('button', 'ml-opt' + (on ? ' on' : ''));
        b.type = 'button';
        b.setAttribute('aria-pressed', String(on));
        b.appendChild(el('span', 'ml-ic', o.icon));
        var t = el('span', 'ml-tx');
        t.appendChild(el('b', '', o.title));
        if (o.hint) t.appendChild(el('small', '', o.hint));
        b.appendChild(t);
        b.addEventListener('click', function () { onPick(o.key); });
        wrap.appendChild(b);
      });
      return wrap;
    }

    function stepAttend() {
      var f = el('div', 'ml-body');
      f.appendChild(el('h3', 'ml-q', 'How would you like to attend?'));
      f.appendChild(el('p', 'ml-sub', 'Pick one or more. Tutors in ' + city + ' will see this.'));
      f.appendChild(choice(ATTEND, S.attend, true, function (k) {
        var i = S.attend.indexOf(k);
        if (i > -1) S.attend.splice(i, 1); else S.attend.push(k);
        render();
      }));
      var err = el('p', 'ml-err'); err.setAttribute('role', 'alert');
      var go = el('button', 'ml-btn', 'Continue'); go.type = 'button';
      go.addEventListener('click', function () {
        if (!S.attend.length) { err.textContent = 'Please pick at least one option.'; return; }
        S.step = 2; render();
      });
      f.appendChild(err); f.appendChild(go);
      return f;
    }

    function stepWhen() {
      var f = el('div', 'ml-body');
      f.appendChild(el('h3', 'ml-q', 'When do you need a tutor?'));
      f.appendChild(choice(WHEN, S.when, false, function (k) { S.when = k; S.step = 3; render(); }));
      var back = el('button', 'ml-link', '← Back'); back.type = 'button';
      back.addEventListener('click', function () { S.step = 1; render(); });
      f.appendChild(back);
      return f;
    }

    function field(label, id, input) {
      var w = el('div', 'ml-f');
      var l = el('label', '', label); l.setAttribute('for', id);
      input.id = id;
      w.appendChild(l); w.appendChild(input);
      return w;
    }
    function select(opts, ph) {
      var s = document.createElement('select');
      var o0 = el('option', '', ph); o0.value = ''; s.appendChild(o0);
      opts.forEach(function (o) { var o1 = el('option', '', o); o1.value = o; s.appendChild(o1); });
      return s;
    }

    function stepDetails() {
      var f = el('form', 'ml-body');
      f.noValidate = true;
      f.appendChild(el('h3', 'ml-q', 'Tell us what you need'));
      f.appendChild(el('p', 'ml-sub', 'Your requirement is reviewed by our team and then shown to verified tutors on Active Leads.'));

      var cls = select(CLASSES, 'Select class'), board = select(BOARDS, 'Select board'), subj = select(SUBJECTS.concat(['Other']), 'Select subject');
      var row1 = el('div', 'ml-two'); row1.appendChild(field('Class', 'mlCls', cls)); row1.appendChild(field('Board', 'mlBoard', board));
      f.appendChild(row1);
      var subOther = document.createElement('input'); subOther.type = 'text'; subOther.placeholder = 'Type the subject'; subOther.maxLength = 60;
      var subOtherW = field('Subject name', 'mlSubOther', subOther); subOtherW.hidden = true;
      subj.addEventListener('change', function () { subOtherW.hidden = subj.value !== 'Other'; });
      f.appendChild(field('Subject', 'mlSubj', subj)); f.appendChild(subOtherW);

      var area = document.createElement('input'); area.type = 'text'; area.placeholder = 'e.g. ' + (areas[0] || 'Sector 15'); area.maxLength = 80; area.autocomplete = 'off';
      if (areas.length) { var dl = document.createElement('datalist'); dl.id = 'mlAreas'; areas.forEach(function (a) { var o = document.createElement('option'); o.value = a; dl.appendChild(o); }); area.setAttribute('list', 'mlAreas'); f.appendChild(dl); }
      f.appendChild(field('Your sector / area in ' + city, 'mlArea', area));

      var name = document.createElement('input'); name.type = 'text'; name.maxLength = 60; name.autocomplete = 'name'; name.placeholder = 'Student or parent name';
      var phone = document.createElement('input'); phone.type = 'tel'; phone.inputMode = 'numeric'; phone.maxLength = 14; phone.autocomplete = 'tel'; phone.placeholder = '10-digit mobile number';
      if (user) { name.value = user.name || ''; phone.value = String(user.phone || '').replace(/\D/g, '').slice(-10); }
      var row2 = el('div', 'ml-two'); row2.appendChild(field('Name', 'mlName', name)); row2.appendChild(field('Mobile number', 'mlPhone', phone));
      f.appendChild(row2);

      // honeypot: real people never see or fill this
      var hp = document.createElement('input'); hp.type = 'text'; hp.tabIndex = -1; hp.autocomplete = 'off'; hp.setAttribute('aria-hidden', 'true'); hp.name = 'website';
      var hpw = el('div', 'ml-hp'); hpw.appendChild(hp); f.appendChild(hpw);

      var consentW = el('label', 'ml-consent');
      var consent = document.createElement('input'); consent.type = 'checkbox'; consent.checked = true;
      consentW.appendChild(consent);
      consentW.appendChild(document.createTextNode(' I agree to be contacted by Modiv’s Education and verified tutors about this requirement.'));
      f.appendChild(consentW);

      var err = el('p', 'ml-err'); err.setAttribute('role', 'alert'); f.appendChild(err);
      var row = el('div', 'ml-row');
      var back = el('button', 'ml-link', '← Back'); back.type = 'button';
      back.addEventListener('click', function () { S.step = 2; render(); });
      var send = el('button', 'ml-btn', 'Get tutors for free'); send.type = 'submit';
      row.appendChild(back); row.appendChild(send); f.appendChild(row);

      f.addEventListener('submit', function (e) {
        e.preventDefault();
        err.textContent = '';
        var subject = subj.value === 'Other' ? tc(subOther.value) : subj.value;
        var ph = phone.value.replace(/\D/g, '').slice(-10);
        if (!cls.value) { err.textContent = 'Select the class.'; cls.focus(); return; }
        if (!board.value) { err.textContent = 'Select the board.'; board.focus(); return; }
        if (!subject) { err.textContent = 'Select or type the subject.'; subj.focus(); return; }
        if (tc(area.value).length < 2) { err.textContent = 'Enter your sector or area.'; area.focus(); return; }
        if (tc(name.value).length < 2) { err.textContent = 'Enter your name.'; name.focus(); return; }
        if (!/^[6-9]\d{9}$/.test(ph)) { err.textContent = 'Enter a valid 10-digit mobile number.'; phone.focus(); return; }
        if (!consent.checked) { err.textContent = 'Please allow us to contact you.'; return; }
        if (hp.value) { S.done = true; render(); return; } // bot: pretend success, send nothing
        if (tooMany()) { err.textContent = 'You have already sent a few requests today. Our team will call you soon.'; return; }

        send.disabled = true; send.textContent = 'Sending…';
        var now = new Date().toISOString();
        var id = 'enq_' + Date.now();
        var areaTxt = tc(area.value);
        var email = user && user.email ? String(user.email).toLowerCase() : '';
        var payload = {
          id: id, requirementId: id, leadId: id,
          name: tc(name.value), studentName: tc(name.value), parentName: tc(name.value),
          phone: ph, email: email,
          studentUid: user && user.uid ? user.uid : '',
          city: city, area: areaTxt,
          location: { city: city, area: areaTxt, formattedAddress: areaTxt + ', ' + city },
          cls: cls.value, 'class': cls.value, board: board.value,
          subjects: [subject], subs: [subject], subject: subject,
          modes: S.attend.slice(), mode: S.attend.join(', '),
          startPlan: S.when,
          description: 'Quick request from the ' + city + ' home tuition page. Wants: ' + S.attend.join(', ') + '. Start: ' + S.when + '.',
          notes: 'Quick request from the ' + city + ' home tuition page.',
          source: 'city-page-' + city.toLowerCase(),
          by: 'Student / Parent', sent: 'Just now',
          submitted_at: now, registered_at: now,
          status: 'pending', approval: 'pending', free: false
        };
        fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify(payload),
          credentials: 'include'
        }).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          noteSent();
          S.done = true; S.name = tc(name.value).split(' ')[0]; S.phone = ph;
          render();
        }).catch(function () {
          send.disabled = false; send.textContent = 'Get tutors for free';
          err.textContent = 'Could not send right now. Please try again, or call +91 98969 30443.';
        });
      });
      return f;
    }

    function doneView() {
      var f = el('div', 'ml-body ml-done');
      f.appendChild(el('div', 'ml-tick', '✓'));
      f.appendChild(el('h3', 'ml-q', 'Requirement received' + (S.name ? ', ' + S.name : '') + '!'));
      f.appendChild(el('p', 'ml-sub', 'Our team will review it and make it live on Active Leads so verified tutors in ' + city + ' can contact you. We may also call or WhatsApp you' + (S.phone ? ' on ' + S.phone : '') + '.'));
      var a = el('a', 'ml-btn', 'Browse tutors below'); a.href = '#tutors';
      f.appendChild(a);
      return f;
    }

    render();
  }

  function boot() {
    var nodes = document.querySelectorAll('[data-mv-lead]');
    for (var i = 0; i < nodes.length; i++) init(nodes[i]);
  }
  window.ModivsCityLead = { init: init, boot: boot };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
