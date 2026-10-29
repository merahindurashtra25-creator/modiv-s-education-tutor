(function(){
  'use strict';

  var STORE = 'modivs_chat_conversations';
  var CHANNEL = 'modivs_chat_updates';
  var RETENTION_HOURS = 96; // 4 days automatic deletion
  var listeners = [];
  var firestoreUnsubs = {};
  var bus = null;
  try { bus = new BroadcastChannel(CHANNEL); bus.onmessage = notify; } catch(e){}

  function db(){ return window.EducationBFirebase && window.EducationBFirebase.db; }
  function fbAuth(){ return window.EducationBFirebase && window.EducationBFirebase.auth; }

  function read(key, fallback){
    try {
      var v = JSON.parse(localStorage.getItem(key) || 'null');
      return v == null ? fallback : v;
    } catch(e){ return fallback; }
  }

  function user(){
    var u = read('modivs_auth_user', null);
    if(fbAuth() && fbAuth().currentUser){
      var f = fbAuth().currentUser;
      return Object.assign({}, u || {}, { uid: f.uid, email: (u && u.email) || f.email || '', name: (u && u.name) || f.displayName || 'User' });
    }
    return u;
  }

  function isAdmin(){
    var session = read('modivs_admin_session', null);
    var u = user();
    return !!((session && session.email === 'admin@gmail.com') || (u && u.email === 'admin@gmail.com'));
  }

  function cleanStr(s){ return String(s || '').trim(); }
  function emailOf(x){ return cleanStr(typeof x === 'string' ? x : ((x && x.email) || '')).toLowerCase(); }
  function nameOf(x){ return (x && (x.name || x.displayName)) || (x && x.email) || 'User'; }

  function hasTutorPlan(u){
    if(!u) return false;
    if(isAdmin()) return true;
    if(u.role !== 'Tutor') return true; // students and parents have free access

    var sub = u.subscription;
    if(sub && sub.active === true){
      if(!sub.expiresAt) return true;
      return new Date(sub.expiresAt) > new Date();
    }

    // Check tutor database for subscription / coins
    var list = read('modivs_tutors_db', []);
    var match = (Array.isArray(list) ? list : []).filter(function(x){
      return (u.email && x.email === u.email) || (u.uid && x.uid === u.uid);
    })[0];
    if(match && match.subscription && match.subscription.active === true){
      if(!match.subscription.expiresAt) return true;
      return new Date(match.subscription.expiresAt) > new Date();
    }

    // Check if tutor has unlocked coins in dashboard
    try {
      var st = JSON.parse(localStorage.getItem('modivs_tutor_coins') || 'null');
      if(st && st > 0) return true;
    } catch(e){}

    return false;
  }

  // Detect Indian and standard phone number patterns
  function detectPhoneNumber(text){
    if(!text) return null;
    var re = /(?:(?:\+91|0091|91|0)[\s.-]?)?[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b|(?:(?:\+91|0)[\s.-]?)?[6-9]\d{4}[\s.-]?\d{5}\b/g;
    var matches = text.match(re);
    if(!matches || !matches.length) return null;
    for(var i = 0; i < matches.length; i++){
      var digits = matches[i].replace(/\D/g, '');
      if(digits.length === 10 && /^[6-9]/.test(digits)) return matches[i];
      if(digits.length === 11 && digits[0] === '0' && /^[6-9]/.test(digits.slice(1))) return matches[i];
      if(digits.length === 12 && digits.slice(0, 2) === '91' && /^[6-9]/.test(digits.slice(2))) return matches[i];
    }
    return null;
  }

  function filterActiveMessages(messages){
    if(!Array.isArray(messages)) return [];
    var now = new Date();
    return messages.filter(function(m){
      if(!m.expiresAt) return true;
      try {
        return new Date(m.expiresAt) > now;
      } catch(e){ return true; }
    });
  }

  function conversations(){
    var val = read(STORE, []);
    var list = Array.isArray(val) ? val : [];
    // Ensure 96-hour active filter
    list.forEach(function(c){
      c.messages = filterActiveMessages(c.messages);
    });
    return list;
  }

  function save(val){
    localStorage.setItem(STORE, JSON.stringify(val));
    try { if(bus) bus.postMessage({ type: 'changed' }); } catch(e){}
    notify();
  }

  function notify(){
    listeners.slice().forEach(function(fn){ try { fn(); } catch(e){} });
  }

  function subscribe(fn){
    listeners.push(fn);
    return function(){ listeners = listeners.filter(function(x){ return x !== fn; }); };
  }

  window.addEventListener('storage', function(e){ if(e.key === STORE) notify(); });

  function tutorRecord(tutor){
    if(typeof tutor === 'object' && tutor) return tutor;
    var list = read('modivs_tutors_db', []);
    var match = (Array.isArray(list) ? list : []).filter(function(x){
      return x.id === tutor || x.email === tutor || x.name === tutor;
    })[0];
    return match || { id: String(tutor || ''), name: String(tutor || 'Tutor'), email: String(tutor && tutor.indexOf('@') > 0 ? tutor : '') };
  }

  function studentRecord(student){
    if(typeof student === 'object' && student) return student;
    var list = read('modivs_students_db', []);
    var match = (Array.isArray(list) ? list : []).filter(function(x){
      return x.id === student || x.name === student || emailOf(x) === emailOf(student);
    })[0];
    return match || { id: String(student || ''), name: String(student || 'Student'), email: String(student && student.indexOf('@') > 0 ? student : '') };
  }

  function convKey(student, tutor){
    var s = emailOf(student) || cleanStr(student.id || student.name).toLowerCase();
    var t = emailOf(tutor) || cleanStr(tutor.id || tutor.name).toLowerCase();
    return (s || 'student') + '__' + (t || 'tutor');
  }

  function safeDocId(key){
    return key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  }

  function find(id){
    return conversations().filter(function(x){ return x.id === id; })[0] || null;
  }

  function participant(c){
    var u = user();
    if(isAdmin()) return true;
    if(!u) return false;
    var e = emailOf(u), uid = u.uid;
    return (!!e && (e === emailOf(c.student) || e === emailOf(c.tutor))) ||
           (!!uid && (uid === c.student.uid || uid === c.tutor.uid || (c.participantIds && c.participantIds.indexOf(uid) > -1)));
  }

  function ensure(studentInput, tutorInput){
    var student = studentRecord(studentInput), tutor = tutorRecord(tutorInput);
    var id = convKey(student, tutor), all = conversations(), c = all.filter(function(x){ return x.id === id; })[0];
    if(!c){
      c = {
        id: id,
        docId: safeDocId(id),
        student: { id: student.id || '', name: nameOf(student), email: emailOf(student), uid: student.uid || '' },
        tutor: { id: tutor.id || '', name: nameOf(tutor), email: emailOf(tutor), uid: tutor.uid || '', hasPlan: hasTutorPlan(tutor) },
        participantIds: [student.uid, tutor.uid, student.email, tutor.email].filter(Boolean),
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      all.unshift(c);
      save(all);
    }
    syncConversationToFirestore(c);
    return c;
  }

  function syncConversationToFirestore(c){
    var firestore = db();
    if(!firestore) return;
    var docId = c.docId || safeDocId(c.id);
    var activeMsgs = filterActiveMessages(c.messages);
    var lastMsg = activeMsgs.length ? activeMsgs[activeMsgs.length - 1] : null;

    firestore.collection('conversations').doc(docId).set({
      id: c.id,
      studentId: c.student.uid || c.student.id || c.student.email,
      tutorId: c.tutor.uid || c.tutor.id || c.tutor.email,
      student: { name: c.student.name, email: c.student.email },
      tutor: { name: c.tutor.name, email: c.tutor.email },
      participantIds: [c.student.email, c.tutor.email, c.student.uid, c.tutor.uid].filter(Boolean),
      lastMessage: lastMsg ? lastMsg.text : 'No active messages',
      lastMessageAt: lastMsg ? lastMsg.createdAt : firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(function(){});
  }

  function watchFirestoreMessages(c, onChange){
    var firestore = db();
    if(!firestore) return;
    var meUser = user();
    var isTutorWithoutPlan = meUser && meUser.role === 'Tutor' && !hasTutorPlan(meUser);
    if(isTutorWithoutPlan) return; // Unsubscribed tutors are barred by rules and design from pulling message docs

    var docId = c.docId || safeDocId(c.id);
    if(firestoreUnsubs[docId]) return;

    var now = new Date();
    firestoreUnsubs[docId] = firestore.collection('conversations').doc(docId).collection('messages')
      .where('expiresAt', '>', now)
      .orderBy('expiresAt', 'asc')
      .limit(150)
      .onSnapshot(function(snapshot){
        if(snapshot.empty) return;
        var all = conversations();
        var conv = all.filter(function(x){ return x.id === c.id; })[0];
        if(!conv) return;
        var existingMsgIds = {};
        conv.messages.forEach(function(m){ existingMsgIds[m.id] = true; });
        var updated = false;

        snapshot.docs.forEach(function(doc){
          var d = doc.data();
          if(!existingMsgIds[doc.id]){
            conv.messages.push({
              id: doc.id,
              senderEmail: d.senderEmail || '',
              senderName: d.senderName || 'User',
              senderRole: d.senderRole || 'User',
              text: d.text || '',
              createdAt: d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : (d.createdAt || new Date().toISOString()),
              expiresAt: d.expiresAt && d.expiresAt.toDate ? d.expiresAt.toDate().toISOString() : (d.expiresAt || new Date(Date.now() + RETENTION_HOURS*3600000).toISOString()),
              readAt: d.readAt || ''
            });
            updated = true;
          }
        });

        if(updated){
          conv.messages = filterActiveMessages(conv.messages);
          save(all);
          if(onChange) onChange();
        }
      }, function(err){
        // Permission denied is expected for unsubscribed tutors attempting direct read
        console.warn('Firestore message listener Notice:', err.message);
      });
  }

  function unread(c, userIdent){
    if(!c || !c.messages) return 0;
    var me = cleanStr(userIdent).toLowerCase();
    var activeMsgs = filterActiveMessages(c.messages);
    return activeMsgs.filter(function(m){
      var isMine = emailOf(m.senderEmail) === me || (m.senderId && m.senderId === me);
      return !isMine && !m.readAt;
    }).length;
  }

  function escapeHtml(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }

  function formatTime(val){
    try {
      return new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date(val).toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch(e){ return ''; }
  }

  function ensureStyles(){
    if(document.getElementById('modivsChatStyles')) return;
    var s = document.createElement('style'); s.id = 'modivsChatStyles';
    s.textContent =
      '.mc-dialog{border:0;border-radius:20px;padding:0;max-width:640px;width:calc(100% - 24px);box-shadow:0 24px 60px rgba(26,32,53,0.3);background:#FEF7EA;color:#1A2035;overflow:hidden}' +
      '.mc-dialog::backdrop{background:rgba(20,33,61,0.65);backdrop-filter:blur(3px)}' +
      '.mc-head{padding:16px 22px;background:#1A2035;color:#FEF7EA;display:flex;align-items:center;justify-content:space-between;gap:12px}' +
      '.mc-user{display:flex;align-items:center;gap:12px}' +
      '.mc-avatar{width:40px;height:40px;border-radius:50%;background:#EBB92E;color:#1A2035;display:grid;place-items:center;font-weight:800;font-size:1.05rem}' +
      '.mc-user h2{margin:0;font-size:1.15rem;font-weight:700;line-height:1.2}' +
      '.mc-status{font-size:.78rem;color:#7fd1bd;display:flex;align-items:center;gap:4px;margin-top:2px}' +
      '.mc-status::before{content:"";width:8px;height:8px;border-radius:50%;background:#0e7c66;display:inline-block}' +
      '.mc-close{border:1px solid #4a5a7a;background:transparent;color:#FEF7EA;border-radius:8px;padding:6px 12px;font-weight:600;cursor:pointer;transition:background .15s}' +
      '.mc-close:hover{background:rgba(255,255,255,0.1)}' +
      '.mc-notice{margin:0;padding:8px 20px;background:#fff8db;color:#7a6207;font-size:.8rem;border-bottom:1px solid #eedda6}' +
      '.mc-retention-pill{display:inline-block;background:#e2e8f0;color:#475569;font-size:.72rem;padding:2px 8px;border-radius:99px;margin-left:6px;font-weight:600}' +
      '.mc-messages{padding:20px;height:380px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;background:#fdf9f1}' +
      '.mc-msg{max-width:80%;padding:10px 14px;border-radius:14px;background:#fff;border:1px solid #eadfc9;box-shadow:0 1px 3px rgba(0,0,0,0.03);line-height:1.45}' +
      '.mc-msg.mine{margin-left:auto;background:#EBB92E;border-color:#deb02c;color:#1A2035;border-bottom-right-radius:4px}' +
      '.mc-msg.theirs{margin-right:auto;background:#fff;border-bottom-left-radius:4px}' +
      '.mc-msg b{display:block;font-size:.82rem;margin-bottom:3px;color:#1A2035}' +
      '.mc-msg .txt{font-size:.92rem;word-break:break-word;white-space:pre-wrap}' +
      '.mc-msg small{display:block;color:#7180ad;font-size:.72rem;margin-top:4px;text-align:right}' +
      '.mc-msg.mine small{color:#4a3f12}' +
      '.mc-compose{display:flex;gap:10px;padding:14px 20px;background:#fff;border-top:1px solid #eadfc9;align-items:center}' +
      '.mc-compose textarea{flex:1;height:46px;max-height:110px;resize:none;padding:11px 14px;border:1.5px solid #dfe5ee;border-radius:10px;background:#fff;font:inherit;font-size:.92rem;color:#1A2035;outline:none}' +
      '.mc-compose textarea:focus{border-color:#1A2035}' +
      '.mc-compose button{border:0;border-radius:10px;background:#1A2035;color:#EBB92E;padding:11px 22px;font-weight:700;cursor:pointer;transition:transform .1s, background .15s}' +
      '.mc-compose button:hover{background:#2a3350}' +
      '.mc-empty{color:#555b78;text-align:center;padding:40px 20px;font-size:.95rem}' +
      '.mc-row{border:1.5px solid #eadfc9;border-radius:12px;padding:14px 16px;margin:10px 0;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:space-between;transition:transform .12s, border-color .15s}' +
      '.mc-row:hover{border-color:#1A2035;transform:translateY(-1px)}' +
      '.mc-row-left{display:flex;align-items:center;gap:12px}' +
      '.mc-row b{font-size:.98rem;color:#1A2035}' +
      '.mc-row small{color:#555b78;font-size:.82rem;display:block;margin-top:2px}' +
      '.mc-badge{background:#EBB92E;color:#1A2035;border-radius:99px;padding:2px 8px;font-weight:700;font-size:.75rem}' +
      /* Blue Card for Tutor without active paid plan */
      '.mc-row-blue{background:#ebf5ff!important;border:2px solid #2196f3!important;color:#0d47a1!important;box-shadow:0 4px 14px rgba(33,150,243,0.12)}' +
      '.mc-avatar-blue{background:#2196f3!important;color:#fff!important}' +
      '.mc-tag-blue{background:#2196f3;color:#fff;font-size:.72rem;padding:2px 8px;border-radius:99px;margin-left:6px;font-weight:700}' +
      '.mc-btn-upgrade{background:#0d47a1;color:#fff;border:0;border-radius:8px;padding:7px 14px;font-size:.82rem;font-weight:700;cursor:pointer;white-space:nowrap}' +
      '.mc-upgrade-modal{padding:26px 28px;text-align:center}' +
      '.mc-upgrade-modal h3{margin:0 0 10px;font-size:1.35rem;color:#1A2035}' +
      '.mc-upgrade-modal p{margin:0 0 20px;color:#555b78;font-size:.92rem;line-height:1.5}' +
      '.mc-upgrade-act{display:flex;gap:10px;justify-content:center}' +
      '.mc-upgrade-act .btn{padding:10px 20px;border-radius:8px;font-weight:700;cursor:pointer;text-decoration:none}';
    document.head.appendChild(s);
  }

  function showUpgradeModal(otherName){
    ensureStyles();
    var d = document.createElement('dialog');
    d.className = 'mc-dialog';
    d.innerHTML =
      '<div class="mc-head">' +
        '<h2>Subscription Plan Required</h2>' +
        '<button class="mc-close" type="button">Close</button>' +
      '</div>' +
      '<div class="mc-upgrade-modal">' +
        '<div style="font-size:2.4rem;margin-bottom:8px;">🔒</div>' +
        '<h3>Unlock Chat with ' + escapeHtml(otherName) + '</h3>' +
        '<p>A student has sent you an inquiry! Tutors require an active paid subscription plan to read student messages, view contact details, and reply in real time.</p>' +
        '<div class="mc-upgrade-act">' +
          '<button type="button" class="btn y" id="mcGoUpgrade" style="background:#0e7c66;color:#fff;border:0;padding:12px 24px;border-radius:8px;font-weight:700;cursor:pointer;">Select Plan / Recharge</button>' +
          '<button type="button" class="btn o" id="mcCloseUp" style="background:transparent;border:1.5px solid #1A2035;padding:12px 20px;border-radius:8px;font-weight:600;cursor:pointer;">Close</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(d);
    d.querySelector('.mc-close').onclick = function(){ d.close(); };
    d.querySelector('#mcCloseUp').onclick = function(){ d.close(); };
    d.querySelector('#mcGoUpgrade').onclick = function(){
      d.close();
      if(window.openRecharge) window.openRecharge();
      else window.location.href = 'modivs-tutor-dashboard.html';
    };
    d.addEventListener('close', function(){ d.remove(); });
    d.showModal();
  }

  function open(input){
    ensureStyles();
    var c = ensure(input.student, input.tutor);
    var meUser = user();
    var isTutorUser = meUser && meUser.role === 'Tutor';
    var tutorNeedsPlan = isTutorUser && !hasTutorPlan(meUser);

    if(tutorNeedsPlan){
      showUpgradeModal(c.student.name);
      return;
    }

    var d = document.createElement('dialog');
    d.className = 'mc-dialog';

    var meEmail = emailOf(meUser);
    var otherName = isAdmin() ? (c.student.name + ' & ' + c.tutor.name) : (meEmail === emailOf(c.student) ? c.tutor.name : c.student.name);
    var otherRole = isAdmin() ? 'Monitoring' : (meEmail === emailOf(c.student) ? 'Tutor' : 'Student / Parent');
    var initials = otherName.split(' ').filter(Boolean).map(function(w){ return w[0]; }).slice(0, 2).join('').toUpperCase();

    function markRead(conv){
      var updated = false;
      conv.messages.forEach(function(m){
        if(emailOf(m.senderEmail) !== meEmail && !m.readAt){
          m.readAt = new Date().toISOString();
          updated = true;
        }
      });
      if(updated){
        var all = conversations();
        all.forEach(function(x){ if(x.id === conv.id) x.messages = conv.messages; });
        save(all);
      }
    }

    function render(){
      var current = find(c.id) || c;
      current.messages = filterActiveMessages(current.messages);
      markRead(current);

      d.innerHTML =
        '<div class="mc-head">' +
          '<div class="mc-user">' +
            '<div class="mc-avatar">' + escapeHtml(initials) + '</div>' +
            '<div><h2>' + escapeHtml(otherName) + '</h2><div class="mc-status">' + escapeHtml(otherRole) + ' · Online</div></div>' +
          '</div>' +
          '<button class="mc-close" type="button">Close</button>' +
        '</div>' +
        '<div class="mc-notice">🔒 1-on-1 direct chat. Messages are retained for 4 days (96 hours). <span class="mc-retention-pill">96h Retention</span></div>' +
        '<div class="mc-messages" id="mcMsgs">' +
          (current.messages.length ? current.messages.map(function(m){
            var isMine = emailOf(m.senderEmail) === meEmail;
            return '<div class="mc-msg ' + (isMine ? 'mine' : 'theirs') + '">' +
              '<b>' + escapeHtml(m.senderName) + '</b>' +
              '<div class="txt">' + escapeHtml(m.text) + '</div>' +
              '<small>' + escapeHtml(formatTime(m.createdAt)) + '</small>' +
            '</div>';
          }).join('') : '<div class="mc-empty">👋 Say hello to ' + escapeHtml(otherName) + '!<br><small style="color:#7180ad">Send a message to discuss your tuition needs, class schedules, and trial demo.</small></div>') +
        '</div>' +
        (isAdmin() ? '<div style="padding:14px 20px;background:#fff;text-align:center;font-size:.85rem;color:#7180ad;">Read-only administrator view.</div>' :
          '<form class="mc-compose" id="mcForm">' +
            '<textarea id="mcText" required maxlength="2000" placeholder="Type a message to ' + escapeHtml(otherName) + '... (Enter to send)"></textarea>' +
            '<button type="submit">Send</button>' +
          '</form>');

      d.querySelector('.mc-close').onclick = function(){ d.close(); };

      var msgsDiv = d.querySelector('#mcMsgs');
      if(msgsDiv) msgsDiv.scrollTop = msgsDiv.scrollHeight;

      if(!isAdmin()){
        var form = d.querySelector('#mcForm');
        var ta = d.querySelector('#mcText');
        if(form && ta){
          ta.focus();
          ta.onkeydown = function(e){
            if(e.key === 'Enter' && !e.shiftKey){
              e.preventDefault();
              form.dispatchEvent(new Event('submit', { cancelable: true }));
            }
          };
          form.onsubmit = function(e){
            e.preventDefault();
            var text = ta.value.trim();
            if(!text) return;

            var now = new Date();
            var expiresAtDate = new Date(now.getTime() + RETENTION_HOURS * 3600 * 1000); // 96 hours
            var nowIso = now.toISOString();

            var newMsg = {
              id: Date.now() + '_' + Math.random().toString(36).slice(2, 8),
              senderEmail: meEmail,
              senderName: nameOf(meUser),
              senderId: (meUser && meUser.uid) || meEmail,
              senderRole: (meUser && meUser.role) || 'User',
              text: text,
              createdAt: nowIso,
              expiresAt: expiresAtDate.toISOString(),
              readAt: '',
              messageType: 'text'
            };

            var all = conversations();
            var fresh = all.filter(function(x){ return x.id === current.id; })[0];
            if(fresh){
              fresh.messages.push(newMsg);
              fresh.updatedAt = nowIso;
              save(all);
            }

            // Phone Number Detection & Safety Alert Generation
            var detectedPhone = detectPhoneNumber(text);

            // Send to Firestore
            var firestore = db();
            if(firestore){
              var docId = current.docId || safeDocId(current.id);
              var msgRef = firestore.collection('conversations').doc(docId).collection('messages').doc(newMsg.id);

              msgRef.set({
                senderEmail: meEmail,
                senderName: nameOf(meUser),
                senderId: (meUser && meUser.uid) || meEmail,
                senderRole: (meUser && meUser.role) || 'User',
                text: text,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: firebase.firestore.Timestamp.fromDate(expiresAtDate),
                readBy: [meEmail],
                messageType: 'text'
              }).catch(function(err){ console.warn('Firestore msg write failed:', err); });

              firestore.collection('conversations').doc(docId).set({
                lastMessage: text,
                lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessageSenderId: meEmail,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
              }, { merge: true }).catch(function(){});

              // If a phone number pattern is detected, write to adminChatAlerts
              if(detectedPhone){
                var alertId = 'alert_' + newMsg.id;
                firestore.collection('adminChatAlerts').doc(alertId).set({
                  id: alertId,
                  conversationId: current.id,
                  messageId: newMsg.id,
                  senderId: (meUser && meUser.uid) || meEmail,
                  senderRole: (meUser && meUser.role) || 'User',
                  senderName: nameOf(meUser),
                  studentName: current.student.name,
                  tutorName: current.tutor.name,
                  detectedNumber: detectedPhone,
                  messageSnippet: text.slice(0, 160),
                  detectedAt: firebase.firestore.FieldValue.serverTimestamp(),
                  alertType: 'phone_number_shared',
                  processingStatus: 'unread'
                }).catch(function(err){ console.warn('Admin alert save failed:', err); });
              }
            }

            ta.value = '';
            render();
          };
        }
      }
    }

    document.body.appendChild(d);
    var stopSub = subscribe(render);
    watchFirestoreMessages(c, render);
    render();

    d.addEventListener('close', function(){
      stopSub();
      d.remove();
    });
    d.showModal();
  }

  function inbox(container, onOpen){
    ensureStyles();
    var meUser = user();
    var me = emailOf(meUser);
    var isTutorUser = meUser && meUser.role === 'Tutor';
    var tutorNeedsPlan = isTutorUser && !hasTutorPlan(meUser);

    var rows = conversations().filter(function(c){ return isAdmin() || participant(c); });
    if(!rows.length){
      container.innerHTML = '<div class="mc-empty">No conversations yet.<br><small style="color:#7180ad">Messages from your enquiries and leads will appear here.</small></div>';
      return;
    }

    container.innerHTML = rows.map(function(c){
      var other = isAdmin() ? (c.student.name + ' ↔ ' + c.tutor.name) : (me === emailOf(c.student) ? c.tutor.name : c.student.name);
      var initials = other.split(' ').filter(Boolean).map(function(w){ return w[0]; }).slice(0, 2).join('').toUpperCase();
      var activeMsgs = filterActiveMessages(c.messages);
      var last = activeMsgs[activeMsgs.length - 1];
      var unreadCount = unread(c, me);

      // SECTION 5: Tutor without an active paid plan
      // The chat entry or chat card must appear in blue
      // Can see that a new chat exists and unread status, but CANNOT read student's message content
      if(tutorNeedsPlan){
        return '<div class="mc-row mc-row-blue" data-chat-id="' + escapeHtml(c.id) + '" data-needs-plan="1">' +
          '<div class="mc-row-left">' +
            '<div class="mc-avatar mc-avatar-blue">' + escapeHtml(initials) + '</div>' +
            '<div>' +
              '<b>' + escapeHtml(other) + ' <span class="mc-tag-blue">Plan Required</span></b>' +
              '<small style="color:#0d47a1;font-weight:500;">🔒 New student enquiry waiting · Upgrade plan to view messages and reply</small>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="mc-btn-upgrade">Select Plan</button>' +
        '</div>';
      }

      var snippet = last ? escapeHtml(last.text.slice(0, 75)) + (last.text.length > 75 ? '...' : '') : 'No active messages';
      return '<div class="mc-row" data-chat-id="' + escapeHtml(c.id) + '">' +
        '<div class="mc-row-left">' +
          '<div class="mc-avatar">' + escapeHtml(initials) + '</div>' +
          '<div>' +
            '<b>' + escapeHtml(other) + '</b>' +
            '<small>' + snippet + (last ? ' · ' + escapeHtml(formatTime(last.createdAt)) : '') + '</small>' +
          '</div>' +
        '</div>' +
        (unreadCount ? '<span class="mc-badge">' + unreadCount + ' unread</span>' : '') +
      '</div>';
    }).join('');

    Array.prototype.forEach.call(container.querySelectorAll('[data-chat-id]'), function(row){
      row.onclick = function(){
        var c = find(row.getAttribute('data-chat-id'));
        if(!c) return;
        if(row.getAttribute('data-needs-plan') === '1'){
          showUpgradeModal(c.student.name);
          return;
        }
        if(onOpen) onOpen(c);
      };
    });
  }

  function adminList(container, filters, onOpen){
    ensureStyles();
    filters = filters || {};
    var from = filters.from ? new Date(filters.from + 'T00:00:00') : null;
    var to = filters.to ? new Date(filters.to + 'T23:59:59') : null;

    var rows = conversations().filter(function(c){
      if(filters.student && (c.student.name + ' ' + c.student.email).toLowerCase().indexOf(filters.student.toLowerCase()) < 0) return false;
      if(filters.tutor && (c.tutor.name + ' ' + c.tutor.email).toLowerCase().indexOf(filters.tutor.toLowerCase()) < 0) return false;
      var activeMsgs = filterActiveMessages(c.messages);
      return activeMsgs.some(function(m){
        var d = new Date(m.createdAt);
        return (!from || d >= from) && (!to || d <= to);
      }) || (!from && !to);
    });

    if(!rows.length){
      container.innerHTML = '<div class="mc-empty">No conversations match the current filters.</div>';
      return;
    }

    container.innerHTML = rows.map(function(c){
      var activeMsgs = filterActiveMessages(c.messages);
      var last = activeMsgs[activeMsgs.length - 1];
      var tutorPlanActive = c.tutor && c.tutor.hasPlan;

      return '<div class="mc-row" data-chat-id="' + escapeHtml(c.id) + '">' +
        '<div>' +
          '<b>' + escapeHtml(c.student.name) + ' ↔ ' + escapeHtml(c.tutor.name) +
            (tutorPlanActive ? ' <span style="background:#d9f0e3;color:#1d7a4d;font-size:.72rem;padding:2px 8px;border-radius:99px;font-weight:700;">Tutor Subscribed</span>' :
              ' <span style="background:#e8f4fd;color:#0d47a1;font-size:.72rem;padding:2px 8px;border-radius:99px;font-weight:700;">Tutor No Plan</span>') +
          '</b>' +
          '<small>' + activeMsgs.length + ' active messages (96h window)' + (last ? ' · Last: ' + escapeHtml(formatTime(last.createdAt)) : '') + '</small>' +
        '</div>' +
        '<span style="font-size:.85rem;color:#7180ad;font-weight:600;">View →</span>' +
      '</div>';
    }).join('');

    Array.prototype.forEach.call(container.querySelectorAll('[data-chat-id]'), function(row){
      row.onclick = function(){
        var c = find(row.getAttribute('data-chat-id'));
        if(c && onOpen) onOpen(c);
      };
    });
  }

  window.ModivsChat = {
    open: open,
    inbox: inbox,
    adminList: adminList,
    conversations: conversations,
    subscribe: subscribe,
    unread: unread,
    isAdmin: isAdmin,
    detectPhoneNumber: detectPhoneNumber,
    filterActiveMessages: filterActiveMessages,
    hasTutorPlan: hasTutorPlan,
    firebaseReady: function(){ return !!(fbAuth() && fbAuth().currentUser); }
  };
})();
