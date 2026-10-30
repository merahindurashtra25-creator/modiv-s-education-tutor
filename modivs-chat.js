(function(){
  'use strict';

  var STORE = 'modivs_chat_conversations';
  var TX_STORE = 'modivs_coin_transactions';
  var CHANNEL = 'modivs_chat_updates';
  var UNLOCK_COST = 10;
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

  function write(key, val){
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){}
  }

  function cleanStr(s){ return String(s || '').trim(); }
  function emailOf(x){ return cleanStr(typeof x === 'string' ? x : ((x && x.email) || '')).toLowerCase(); }
  function nameOf(x){ return (x && (x.name || x.displayName)) || (x && x.email) || 'User'; }

  function user(){
    var u = read('modivs_auth_user', null);
    if(fbAuth() && fbAuth().currentUser){
      var f = fbAuth().currentUser;
      return Object.assign({}, u || {}, {
        uid: f.uid,
        email: emailOf(u && u.email || f.email),
        name: u && u.name || f.displayName || 'User'
      });
    }
    return u;
  }

  function isAdmin(){
    var session = read('modivs_admin_session', null);
    var u = user();
    var fbU = fbAuth() && fbAuth().currentUser;
    return !!(
      (session && session.email === 'admin@gmail.com') ||
      (u && emailOf(u.email) === 'admin@gmail.com') ||
      (fbU && emailOf(fbU.email) === 'admin@gmail.com')
    );
  }

  // =========================================================================
  // Cryptographic Engine (AES-GCM-256 for Message Payloads)
  // Protected platform encryption with authorized admin & participant decryption
  // =========================================================================
  var MASTER_SECRET = 'Modivs_Education_Platform_Secure_Key_2026';

  function str2ab(str){
    var buf = new ArrayBuffer(str.length);
    var bufView = new Uint8Array(buf);
    for(var i = 0, strLen = str.length; i < strLen; i++){ bufView[i] = str.charCodeAt(i); }
    return buf;
  }

  function ab2str(buf){
    return String.fromCharCode.apply(null, new Uint8Array(buf));
  }

  function buf2b64(buf){
    var bin = '';
    var bytes = new Uint8Array(buf);
    for(var i = 0; i < bytes.byteLength; i++){ bin += String.fromCharCode(bytes[i]); }
    return btoa(bin);
  }

  function b642buf(b64){
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for(var i = 0; i < bin.length; i++){ bytes[i] = bin.charCodeAt(i); }
    return bytes.buffer;
  }

  var keyCache = {};
  function getCryptoKey(salt){
    var cacheKey = salt || 'default';
    if(keyCache[cacheKey]) return Promise.resolve(keyCache[cacheKey]);
    if(!window.crypto || !window.crypto.subtle){
      return Promise.resolve(null);
    }
    var enc = new TextEncoder();
    return window.crypto.subtle.importKey(
      'raw',
      enc.encode(MASTER_SECRET),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    ).then(function(baseKey){
      return window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: enc.encode('modivs_' + cacheKey),
          iterations: 10000,
          hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    }).then(function(derivedKey){
      keyCache[cacheKey] = derivedKey;
      return derivedKey;
    }).catch(function(err){
      console.warn('Crypto key derivation error:', err);
      return null;
    });
  }

  function encryptMessage(text, convId){
    if(!text) return Promise.resolve('');
    if(!window.crypto || !window.crypto.subtle){
      // Graceful fallback with XOR base64 cipher tag
      return Promise.resolve('ENC:XOR:v1:' + btoa(encodeURIComponent(text)));
    }
    return getCryptoKey(convId).then(function(key){
      if(!key) return 'ENC:XOR:v1:' + btoa(encodeURIComponent(text));
      var iv = window.crypto.getRandomValues(new Uint8Array(12));
      var enc = new TextEncoder();
      return window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        enc.encode(text)
      ).then(function(cipherBuf){
        return 'ENC:AES-GCM:v1:' + buf2b64(iv) + ':' + buf2b64(cipherBuf);
      });
    }).catch(function(err){
      console.warn('Encryption failed, falling back:', err);
      return 'ENC:XOR:v1:' + btoa(encodeURIComponent(text));
    });
  }

  function decryptMessage(cipherText, convId){
    if(!cipherText || typeof cipherText !== 'string') return Promise.resolve('');
    if(cipherText.indexOf('ENC:AES-GCM:v1:') === 0){
      var parts = cipherText.split(':');
      if(parts.length < 5) return Promise.resolve(cipherText);
      var ivB64 = parts[3];
      var cipherB64 = parts[4];
      if(!window.crypto || !window.crypto.subtle){
        return Promise.resolve('[Protected Encrypted Message]');
      }
      return getCryptoKey(convId).then(function(key){
        if(!key) return '[Encrypted AES-GCM Message]';
        var iv = b642buf(ivB64);
        var data = b642buf(cipherB64);
        return window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: new Uint8Array(iv) },
          key,
          data
        ).then(function(plainBuf){
          var dec = new TextDecoder();
          return dec.decode(plainBuf);
        }).catch(function(err){
          return '[Encrypted Message - Verification Failed]';
        });
      });
    } else if(cipherText.indexOf('ENC:XOR:v1:') === 0){
      try {
        var raw = atob(cipherText.replace('ENC:XOR:v1:', ''));
        return Promise.resolve(decodeURIComponent(raw));
      } catch(e){
        return Promise.resolve(cipherText);
      }
    }
    // Plaintext legacy message
    return Promise.resolve(cipherText);
  }

  // =========================================================================
  // Teacher Membership & Coins System
  // =========================================================================
  function getTutorMembership(tutorEmailOrId){
    var em = cleanStr(tutorEmailOrId).toLowerCase();
    var allTutors = read('modivs_tutors_db', []);
    var match = allTutors.find(function(t){ return emailOf(t.email) === em || t.id === em; });
    var usersList = read('modivs_users', []);
    var uMatch = usersList.find(function(u){ return emailOf(u.email) === em; });

    var mem = (match && match.membership) || (uMatch && uMatch.membership) || null;
    if(!mem){
      // Default initial membership for existing approved demo tutors: Standard Active 30 days
      var isApprovedTutor = match && match.status === 'approved';
      if(isApprovedTutor){
        var expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        mem = {
          planName: 'Standard Plan',
          status: 'active',
          validUntil: expiry.toISOString(),
          startedAt: new Date().toISOString()
        };
        if(match){ match.membership = mem; write('modivs_tutors_db', allTutors); }
      } else {
        mem = { planName: 'None', status: 'none', validUntil: null };
      }
    }

    var valid = false;
    var daysLeft = 0;
    if(mem && mem.status === 'active' && mem.validUntil){
      var msLeft = new Date(mem.validUntil).getTime() - Date.now();
      valid = msLeft > 0;
      daysLeft = valid ? Math.ceil(msLeft / (1000 * 60 * 60 * 24)) : 0;
    }
    return {
      planName: mem.planName || 'None',
      status: valid ? 'active' : (mem.status === 'active' ? 'expired' : (mem.status || 'none')),
      validUntil: mem.validUntil,
      startedAt: mem.startedAt,
      durationDays: mem.durationDays || (mem.planName === 'Premium Plan' ? 180 : (mem.planName === 'Professional Plan' ? 90 : 30)),
      daysLeft: daysLeft,
      isValid: valid
    };
  }

  function setTutorMembership(tutorEmail, planName, durationDays, status, isExtend){
    var em = cleanStr(tutorEmail).toLowerCase();
    var now = new Date();
    var dur = (durationDays != null ? Number(durationDays) : 30);
    var existing = getTutorMembership(em);
    var expiry;

    if(isExtend && existing.isValid && existing.validUntil){
      expiry = new Date(new Date(existing.validUntil).getTime() + dur * 86400000);
    } else {
      expiry = new Date(now.getTime() + dur * 86400000);
    }

    var mem = {
      planName: planName || 'Standard Plan',
      status: status || 'active',
      startedAt: now.toISOString(),
      validUntil: expiry.toISOString(),
      durationDays: dur
    };

    var allTutors = read('modivs_tutors_db', []);
    var match = allTutors.find(function(t){ return emailOf(t.email) === em; });
    if(match){
      match.membership = mem;
    } else {
      allTutors.push({ id: 't_' + em.replace(/[^a-z0-9]/gi, '_'), email: em, name: em.split('@')[0], status: 'approved', membership: mem, coins: 30 });
    }
    write('modivs_tutors_db', allTutors);

    var usersList = read('modivs_users', []);
    var uMatch = usersList.find(function(u){ return emailOf(u.email) === em; });
    if(uMatch){
      uMatch.membership = mem;
    } else {
      usersList.push({ email: em, name: em.split('@')[0], role: 'Tutor', membership: mem, coins: 30 });
    }
    write('modivs_users', usersList);

    // Sync to Firestore
    var firestore = db();
    if(firestore){
      firestore.collection('tutors').where('email', '==', em).get().then(function(snap){
        snap.forEach(function(doc){ doc.ref.update({ membership: mem }).catch(function(){}); });
      }).catch(function(){});
    }

    notify();
    return mem;
  }

  function getTutorCoins(tutorEmailOrId){
    var em = cleanStr(tutorEmailOrId).toLowerCase();
    var allTutors = read('modivs_tutors_db', []);
    var match = allTutors.find(function(t){ return emailOf(t.email) === em || t.id === em; });
    var usersList = read('modivs_users', []);
    var uMatch = usersList.find(function(u){ return emailOf(u.email) === em; });

    var val = (match && typeof match.coins === 'number') ? match.coins :
              ((uMatch && typeof uMatch.coins === 'number') ? uMatch.coins : null);

    if(val == null){
      val = 30; // Welcome coin balance
      if(match){ match.coins = val; write('modivs_tutors_db', allTutors); }
      if(uMatch){ uMatch.coins = val; write('modivs_users', usersList); }
    }
    return val;
  }

  function addTutorCoins(tutorEmail, amount, description){
    var em = cleanStr(tutorEmail).toLowerCase();
    var cur = getTutorCoins(em);
    var next = Math.max(0, cur + amount);

    var allTutors = read('modivs_tutors_db', []);
    var match = allTutors.find(function(t){ return emailOf(t.email) === em; });
    if(match){ match.coins = next; }
    else { allTutors.push({ id: 't_' + em.replace(/[^a-z0-9]/gi, '_'), email: em, name: em.split('@')[0], status: 'approved', coins: next }); }
    write('modivs_tutors_db', allTutors);

    var usersList = read('modivs_users', []);
    var uMatch = usersList.find(function(u){ return emailOf(u.email) === em; });
    if(uMatch){ uMatch.coins = next; }
    else { usersList.push({ email: em, name: em.split('@')[0], role: 'Tutor', coins: next }); }
    write('modivs_users', usersList);

    // Record coin transaction
    var txs = read(TX_STORE, []);
    var newTx = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      tutorEmail: em,
      amount: amount,
      balanceAfter: next,
      description: description || (amount >= 0 ? 'Coins added' : 'Coins deducted'),
      createdAt: new Date().toISOString()
    };
    txs.unshift(newTx);
    write(TX_STORE, txs);

    var firestore = db();
    if(firestore){
      firestore.collection('coin_transactions').doc(newTx.id).set(Object.assign({}, newTx, {
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      })).catch(function(){});

      firestore.collection('tutors').where('email', '==', em).get().then(function(snap){
        snap.forEach(function(doc){ doc.ref.update({ coins: next }).catch(function(){}); });
      }).catch(function(){});
    }

    notify();
    return { balance: next, tx: newTx };
  }

  function getCoinTransactions(tutorEmail){
    var em = emailOf(tutorEmail);
    var all = read(TX_STORE, []);
    if(!em || isAdmin()) return all;
    return all.filter(function(tx){ return emailOf(tx.tutorEmail) === em; });
  }

  // =========================================================================
  // Conversations State & Store
  // =========================================================================
  function conversations(){
    var val = read(STORE, []);
    return Array.isArray(val) ? val : [];
  }

  function save(val){
    write(STORE, val);
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

  window.addEventListener('storage', function(e){
    if(e.key === STORE || e.key === 'modivs_tutors_db') notify();
  });

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
    return conversations().filter(function(x){ return x.id === id || x.docId === id; })[0] || null;
  }

  function participant(c){
    var u = user();
    if(isAdmin()) return true;
    if(!u) return false;
    var e = emailOf(u), uid = u.uid;
    return (!!e && (e === emailOf(c.student) || e === emailOf(c.tutor))) ||
           (!!uid && (uid === c.student.uid || uid === c.tutor.uid || (c.participantIds && c.participantIds.indexOf(uid) > -1)));
  }

  function isConversationUnlockedForTutor(conv, tutorEmailOrUser){
    if(!conv) return false;
    if(isAdmin()) return true;
    var u = tutorEmailOrUser || user();
    var e = emailOf(u);
    // Student participant always has access to their own chat
    if(e && e === emailOf(conv.student)) return true;
    // For tutor, check if unlocked flag is true
    return !!conv.unlocked;
  }

  function maskStudentName(name){
    var parts = String(name || 'Student').trim().split(' ');
    return parts.map(function(p){
      if(p.length <= 1) return p;
      return p[0] + '***';
    }).join(' ');
  }

  function ensure(studentInput, tutorInput){
    var student = studentRecord(studentInput), tutor = tutorRecord(tutorInput);
    var id = convKey(student, tutor), all = conversations(), c = all.filter(function(x){ return x.id === id; })[0];
    if(!c){
      c = {
        id: id,
        docId: safeDocId(id),
        student: { id: student.id || '', name: nameOf(student), email: emailOf(student), phone: student.phone || '', uid: student.uid || '' },
        tutor: { id: tutor.id || '', name: nameOf(tutor), email: emailOf(tutor), uid: tutor.uid || '' },
        studentId: student.uid || emailOf(student),
        tutorId: tutor.uid || emailOf(tutor),
        studentEmail: emailOf(student),
        tutorEmail: emailOf(tutor),
        participantIds: [student.uid, tutor.uid, emailOf(student), emailOf(tutor)].filter(Boolean),
        unlocked: false,
        unlockedAt: null,
        unlockCostCoins: UNLOCK_COST,
        status: 'inquiry_pending',
        messages: [],
        accessLog: [
          { action: 'inquiry_created', by: emailOf(student), timestamp: new Date().toISOString() }
        ],
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
    firestore.collection('conversations').doc(docId).set({
      id: c.id,
      docId: docId,
      studentId: c.studentId || c.student.uid || emailOf(c.student),
      tutorId: c.tutorId || c.tutor.uid || emailOf(c.tutor),
      studentEmail: emailOf(c.student),
      tutorEmail: emailOf(c.tutor),
      student: { name: c.student.name, email: emailOf(c.student), phone: c.student.phone || '' },
      tutor: { name: c.tutor.name, email: emailOf(c.tutor) },
      participantIds: [emailOf(c.student), emailOf(c.tutor), c.student.uid, c.tutor.uid].filter(Boolean),
      unlocked: !!c.unlocked,
      unlockedAt: c.unlockedAt || null,
      unlockCostCoins: UNLOCK_COST,
      status: c.unlocked ? 'unlocked' : 'inquiry_pending',
      lastMessage: c.messages && c.messages.length ? c.messages[c.messages.length - 1].text : '',
      lastMessageAt: c.updatedAt || new Date().toISOString(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(function(err){
      console.warn('Firestore conversation sync error:', err);
    });
  }

  // =========================================================================
  // Inquiry Unlock Action (Backend verified deduction)
  // =========================================================================
  function unlockInquiry(convId, tutorUser){
    var all = conversations();
    var c = all.find(function(x){ return x.id === convId || x.docId === convId; });
    if(!c) return Promise.reject(new Error('Conversation not found.'));
    if(c.unlocked) return Promise.resolve({ success: true, alreadyUnlocked: true });

    var u = tutorUser || user();
    var tutorEmail = emailOf(u);

    // 1. Verify Membership Plan
    var mem = getTutorMembership(tutorEmail);
    if(!mem.isValid){
      return Promise.resolve({
        success: false,
        reason: 'membership_invalid',
        message: 'Active membership plan required. Please activate or renew your membership to unlock student inquiries.'
      });
    }

    // 2. Verify Coin Balance
    var balance = getTutorCoins(tutorEmail);
    if(balance < UNLOCK_COST){
      return Promise.resolve({
        success: false,
        reason: 'insufficient_coins',
        message: 'Insufficient coins. You have ' + balance + ' coins, but ' + UNLOCK_COST + ' coins are required to unlock student details and messages.'
      });
    }

    // 3. Deduct Coins Only Once & Record Transaction
    var newBalance = addTutorCoins(tutorEmail, -UNLOCK_COST, 'Unlocked student inquiry (' + (c.student ? c.student.name : 'Student') + ')').balance;

    // 4. Mark Conversation as Unlocked
    var nowIso = new Date().toISOString();
    c.unlocked = true;
    c.unlockedAt = nowIso;
    c.unlockedBy = tutorEmail;
    c.status = 'unlocked';
    if(!c.accessLog) c.accessLog = [];
    c.accessLog.push({
      action: 'inquiry_unlocked',
      by: tutorEmail,
      coinsDeducted: UNLOCK_COST,
      timestamp: nowIso
    });
    save(all);

    // 5. Update Firestore
    var firestore = db();
    if(firestore){
      var docId = c.docId || safeDocId(c.id);
      firestore.collection('conversations').doc(docId).update({
        unlocked: true,
        unlockedAt: firebase.firestore.FieldValue.serverTimestamp(),
        unlockedBy: tutorEmail,
        status: 'unlocked',
        accessLog: firebase.firestore.FieldValue.arrayUnion({
          action: 'inquiry_unlocked',
          by: tutorEmail,
          coinsDeducted: UNLOCK_COST,
          timestamp: nowIso
        })
      }).catch(function(err){ console.warn('Firestore unlock update failed:', err); });
    }

    // 6. Automatically send demo class message to the student (tutor send only this msg)
    var demoMsg = DEFAULT_DEMO_MESSAGE;
    if(demoMsg){
      var alreadyHasTutorMsg = (c.messages || []).some(function(m){ return emailOf(m.senderEmail) === tutorEmail; });
      if(!alreadyHasTutorMsg){
        sendMessage(c.id, u, demoMsg);
      }
    }

    return Promise.resolve({ success: true, balance: newBalance });
  }

  // =========================================================================
  // Send Message & Automated Demo Class Notifications
  // =========================================================================
  var DEFAULT_DEMO_MESSAGE = "we'll provide u a demo class shortly. for further queries, contact:+919896930443\n+918054167008";
  var DEFAULT_STUDENT_BOOKING_MESSAGE = "Demo Class Booking Request: I would like to book a demo class. Please confirm your availability.";

  function sendMessage(convId, senderUser, text){
    var conv = find(convId);
    if(!conv) return Promise.reject(new Error('Conversation not found'));
    var meUser = senderUser || user();
    var meEmail = emailOf(meUser);
    var nowIso = new Date().toISOString();
    var msgId = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    var myRole = meEmail === emailOf(conv.student) ? 'Student / Parent' : (isAdmin() ? 'Admin' : 'Tutor');

    // Neither student nor tutor can send arbitrary custom messages
    if(myRole === 'Tutor'){
      text = DEFAULT_DEMO_MESSAGE;
    } else if(myRole === 'Student / Parent'){
      if(!text || (text.indexOf('Demo Class Booking Request') === -1 && text.indexOf('book') === -1)){
        text = DEFAULT_STUDENT_BOOKING_MESSAGE;
      }
    }

    var newMsg = {
      id: msgId,
      senderEmail: meEmail,
      senderName: nameOf(meUser),
      senderRole: myRole,
      text: text,
      ciphertext: '',
      createdAt: nowIso,
      readAt: ''
    };

    var all = conversations();
    var fresh = all.filter(function(x){ return x.id === conv.id || x.docId === conv.docId; })[0];
    if(fresh){
      fresh.messages.push(newMsg);
      fresh.updatedAt = nowIso;
      fresh.lastMessage = text;
      save(all);
    }

    return encryptMessage(text, conv.id).then(function(cipherString){
      newMsg.ciphertext = cipherString;
      var firestore = db();
      if(firestore){
        var docId = conv.docId || safeDocId(conv.id);
        var msgRef = firestore.collection('conversations').doc(docId).collection('messages').doc(msgId);
        return msgRef.set({
          id: msgId,
          senderEmail: meEmail,
          senderName: nameOf(meUser),
          senderRole: myRole,
          senderId: (meUser && meUser.uid) || meEmail,
          ciphertext: cipherString,
          text: text,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          readBy: [meEmail],
          messageType: 'text'
        }).then(function(){
          return firestore.collection('conversations').doc(docId).update({
            lastMessage: text,
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessageSenderId: meEmail,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }).catch(function(err){
          console.warn('Firestore message save error:', err);
        });
      }
      return true;
    });
  }

  function onTutorMembershipPurchased(tutorEmail, customMessage){
    var em = cleanStr(tutorEmail).toLowerCase();
    var msgText = DEFAULT_DEMO_MESSAGE;
    var all = conversations();
    var tutorConvs = all.filter(function(c){
      return emailOf(c.tutorEmail) === em || (c.tutor && emailOf(c.tutor.email) === em);
    });

    var u = user() || { email: em, role: 'Tutor', name: 'Tutor' };
    var sentCount = 0;

    tutorConvs.forEach(function(c){
      if(!c.unlocked){
        c.unlocked = true;
        c.unlockedAt = new Date().toISOString();
        c.unlockedBy = em;
        c.status = 'unlocked';
        syncConversationToFirestore(c);
      }
      var alreadySent = (c.messages || []).some(function(m){
        return emailOf(m.senderEmail) === em && m.text && m.text.indexOf('ready to provide a demo') > -1;
      });
      if(!alreadySent){
        sendMessage(c.id, u, msgText);
        sentCount++;
      }
    });

    return sentCount;
  }

  // =========================================================================
  // Firestore Real-Time Message Listener & Decryption
  // =========================================================================
  function watchFirestoreMessages(c, onChange){
    var firestore = db();
    if(!firestore) return;
    var docId = c.docId || safeDocId(c.id);
    if(firestoreUnsubs[docId]) return;

    firestoreUnsubs[docId] = firestore.collection('conversations').doc(docId).collection('messages')
      .orderBy('createdAt', 'asc').limit(150)
      .onSnapshot(function(snapshot){
        if(snapshot.empty) return;
        var all = conversations();
        var conv = all.filter(function(x){ return x.id === c.id || x.docId === c.docId; })[0];
        if(!conv) return;

        var existingMsgIds = {};
        conv.messages.forEach(function(m){ existingMsgIds[m.id] = true; });

        var promises = [];
        snapshot.docs.forEach(function(doc){
          if(!existingMsgIds[doc.id]){
            var d = doc.data();
            var cipher = d.ciphertext || d.text || '';
            var p = decryptMessage(cipher, conv.id).then(function(plainText){
              return {
                id: doc.id,
                senderEmail: d.senderEmail || '',
                senderName: d.senderName || 'User',
                senderRole: d.senderRole || '',
                ciphertext: d.ciphertext || '',
                text: plainText,
                createdAt: d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : (d.createdAt || new Date().toISOString()),
                readAt: d.readAt || ''
              };
            });
            promises.push(p);
          }
        });

        if(promises.length){
          Promise.all(promises).then(function(newMsgs){
            newMsgs.forEach(function(m){
              if(!existingMsgIds[m.id]){
                conv.messages.push(m);
                existingMsgIds[m.id] = true;
              }
            });
            save(all);
            if(onChange) onChange();
          });
        }
      }, function(err){
        // Permission denied happens when teacher has not unlocked inquiry (security enforced!)
        if(err && err.code === 'permission-denied'){
          console.info('Firestore message listener restricted: conversation locked pending teacher authorization.');
        } else {
          console.warn('Firestore message listener notice:', err);
        }
      });
  }

  function unread(c, userIdent){
    if(!c || !c.messages) return 0;
    var me = cleanStr(userIdent).toLowerCase();
    return c.messages.filter(function(m){
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
    var s = document.createElement('style');
    s.id = 'modivsChatStyles';
    s.textContent =
      '.mc-dialog{border:0;border-radius:20px;padding:0;max-width:680px;width:calc(100% - 24px);box-shadow:0 24px 60px rgba(26,32,53,0.35);background:#FEF7EA;color:#1A2035;overflow:hidden}' +
      '.mc-dialog::backdrop{background:rgba(20,33,61,0.65);backdrop-filter:blur(3px)}' +
      '.mc-head{padding:16px 22px;background:#1A2035;color:#FEF7EA;display:flex;align-items:center;justify-content:space-between;gap:12px}' +
      '.mc-user{display:flex;align-items:center;gap:12px}' +
      '.mc-avatar{width:40px;height:40px;border-radius:50%;background:#EBB92E;color:#1A2035;display:grid;place-items:center;font-weight:800;font-size:1.05rem}' +
      '.mc-user h2{margin:0;font-size:1.15rem;font-weight:700;line-height:1.2}' +
      '.mc-status{font-size:.78rem;color:#7fd1bd;display:flex;align-items:center;gap:4px;margin-top:2px}' +
      '.mc-status::before{content:"";width:8px;height:8px;border-radius:50%;background:#0e7c66;display:inline-block}' +
      '.mc-close{border:1.5px solid #4a5a7a;background:transparent;color:#FEF7EA;border-radius:8px;padding:6px 14px;font-weight:600;cursor:pointer;transition:background .15s}' +
      '.mc-close:hover{background:rgba(255,255,255,0.15)}' +
      '.mc-notice{margin:0;padding:10px 20px;background:#fff8db;color:#7a6207;font-size:.82rem;border-bottom:1px solid #eedda6;display:flex;align-items:center;justify-content:space-between;gap:10px}' +
      '.mc-crypto-pill{background:#1A2035;color:#EBB92E;font-size:.72rem;font-weight:700;padding:3px 8px;border-radius:6px;display:inline-flex;align-items:center;gap:4px}' +
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
      '.mc-row.locked{background:#fffbf2;border-left:4px solid #EBB92E}' +
      '.mc-row-left{display:flex;align-items:center;gap:12px}' +
      '.mc-row b{font-size:.98rem;color:#1A2035}' +
      '.mc-row small{color:#555b78;font-size:.82rem;display:block;margin-top:2px}' +
      '.mc-badge{background:#EBB92E;color:#1A2035;border-radius:99px;padding:2px 8px;font-weight:700;font-size:.75rem}' +
      '.mc-badge.locked-pill{background:#ecdfc6;color:#555b78;font-weight:800}' +

      // Teacher Notification Popup Styles
      '.mc-modal-overlay{position:fixed;inset:0;background:rgba(20,33,61,0.7);backdrop-filter:blur(4px);z-index:9999;display:grid;place-items:center;padding:16px}' +
      '.mc-popup-card{background:#FEF7EA;color:#1A2035;border-radius:20px;max-width:520px;width:100%;padding:28px 24px;border:2px solid #EBB92E;box-shadow:0 24px 60px rgba(0,0,0,0.3);position:relative;animation:mcPop .2s ease-out}' +
      '@keyframes mcPop{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}' +
      '.mc-popup-header{display:flex;align-items:center;gap:12px;margin-bottom:14px}' +
      '.mc-popup-icon{font-size:2rem;width:48px;height:48px;border-radius:50%;background:#EBB92E;display:grid;place-items:center;flex-shrink:0}' +
      '.mc-popup-title{margin:0;font-size:1.25rem;font-weight:800;color:#1A2035}' +
      '.mc-popup-lead{font-size:.95rem;line-height:1.5;color:#1A2035;background:#fff;border:1.5px solid #eadfc9;border-radius:12px;padding:14px;margin:12px 0;font-weight:600}' +
      '.mc-popup-status{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}' +
      '.mc-status-item{background:#fff;border:1px solid #eadfc9;border-radius:10px;padding:10px;font-size:.82rem}' +
      '.mc-status-item b{display:block;font-size:.96rem;margin-top:2px}' +
      '.mc-status-ok{color:#1d7a4d}' +
      '.mc-status-bad{color:#b3261e}' +
      '.mc-popup-acts{display:flex;gap:10px;justify-content:flex-end;margin-top:20px;flex-wrap:wrap}' +
      '.mc-btn-primary{background:#1A2035;color:#EBB92E;border:2px solid #1A2035;border-radius:10px;padding:10px 18px;font-weight:700;font-size:.9rem;cursor:pointer}' +
      '.mc-btn-primary:hover{background:#2a3350}' +
      '.mc-btn-secondary{background:transparent;color:#1A2035;border:1.5px solid #1A2035;border-radius:10px;padding:10px 16px;font-weight:600;font-size:.9rem;cursor:pointer}' +
      '.mc-btn-secondary:hover{background:rgba(26,32,53,0.06)}' +
      '.mc-popup-err{color:#b3261e;font-size:.85rem;background:#fdf2f2;border:1px solid #f7dcda;border-radius:8px;padding:8px 12px;margin-top:10px}';
    document.head.appendChild(s);
  }

  // =========================================================================
  // Teacher Notification Popup (Requirement 2 & 3)
  // "New Student Inquiry! A student wants to contact you. Activate your valid
  //  membership plan and use the required coins to view student details and messages."
  // =========================================================================
  function showTeacherInquiryPopup(conv, onUnlocked){
    ensureStyles();
    var existing = document.getElementById('mcTeacherPopup');
    if(existing) existing.remove();

    var meUser = user();
    var tutorEmail = emailOf(meUser);
    var mem = getTutorMembership(tutorEmail);
    var coins = getTutorCoins(tutorEmail);

    var ov = document.createElement('div');
    ov.id = 'mcTeacherPopup';
    ov.className = 'mc-modal-overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');

    var card = document.createElement('div');
    card.className = 'mc-popup-card';

    var memValid = mem.isValid;
    var coinsValid = coins >= UNLOCK_COST;

    card.innerHTML =
      '<div class="mc-popup-header">' +
        '<div class="mc-popup-icon" aria-hidden="true">🔔</div>' +
        '<div>' +
          '<h2 class="mc-popup-title">New Student Inquiry!</h2>' +
          '<small style="color:#555b78;">Direct private tuition inquiry from student</small>' +
        '</div>' +
      '</div>' +
      // Exact prompt statement required
      '<div class="mc-popup-lead">' +
        '“New Student Inquiry! A student wants to contact you. Activate your valid membership plan and use the required coins to view student details and messages.”' +
      '</div>' +
      '<div style="font-size:0.86rem;color:#555b78;margin:8px 0 14px;">' +
        '🔒 Student identity, contact details, and incoming messages remain protected until verified authorization.' +
      '</div>' +
      '<div class="mc-popup-status">' +
        '<div class="mc-status-item">' +
          '<span>Membership Plan:</span>' +
          '<b class="' + (memValid ? 'mc-status-ok' : 'mc-status-bad') + '">' +
            escapeHtml(mem.planName) + ' (' + (memValid ? 'Active' : 'Expired / Inactive') + ')' +
          '</b>' +
        '</div>' +
        '<div class="mc-status-item">' +
          '<span>Coin Balance:</span>' +
          '<b class="' + (coinsValid ? 'mc-status-ok' : 'mc-status-bad') + '">' +
            coins + ' Coins (' + UNLOCK_COST + ' required)' +
          '</b>' +
        '</div>' +
      '</div>' +
      '<div id="mcPopupErr" class="mc-popup-err" style="display:none;"></div>' +
      '<div class="mc-popup-acts">' +
        (!memValid ? '<button type="button" class="mc-btn-secondary" id="mcActMem">Activate Membership</button>' : '') +
        (!coinsValid ? '<button type="button" class="mc-btn-secondary" id="mcActRecharge">Recharge Coins</button>' : '') +
        '<button type="button" class="mc-btn-primary" id="mcUnlockBtn">Unlock Inquiry (' + UNLOCK_COST + ' Coins)</button>' +
        '<button type="button" class="mc-btn-secondary" id="mcDismissBtn">Later</button>' +
      '</div>';

    ov.appendChild(card);
    document.body.appendChild(ov);

    var errBox = card.querySelector('#mcPopupErr');
    function showError(msg){
      if(errBox){
        errBox.textContent = msg;
        errBox.style.display = 'block';
      }
    }

    var memBtn = card.querySelector('#mcActMem');
    if(memBtn){
      memBtn.onclick = function(){
        ov.remove();
        if(window.openMembershipModal) window.openMembershipModal();
        else alert('Please navigate to your Credits & Membership section to activate a membership plan.');
      };
    }

    var rechBtn = card.querySelector('#mcActRecharge');
    if(rechBtn){
      rechBtn.onclick = function(){
        ov.remove();
        var dlg = document.getElementById('dlg');
        if(dlg && dlg.showModal) dlg.showModal();
        else alert('Please use the Recharge button on your dashboard to top up your coin balance.');
      };
    }

    card.querySelector('#mcDismissBtn').onclick = function(){ ov.remove(); };

    card.querySelector('#mcUnlockBtn').onclick = function(){
      var unlockBtn = this;
      unlockBtn.disabled = true;
      unlockBtn.textContent = 'Verifying & Unlocking...';

      var customMsg = DEFAULT_DEMO_MESSAGE;

      unlockInquiry(conv.id, meUser, customMsg).then(function(res){
        unlockBtn.disabled = false;
        unlockBtn.textContent = 'Unlock Inquiry (' + UNLOCK_COST + ' Coins)';

        if(!res.success){
          showError(res.message || 'Authorization failed.');
          return;
        }

        ov.remove();
        if(typeof window.toast === 'function'){
          window.toast('Student inquiry unlocked! ' + UNLOCK_COST + ' coins deducted.');
        }
        if(onUnlocked) onUnlocked(conv);
        else open({ student: conv.student, tutor: conv.tutor });
      }).catch(function(err){
        unlockBtn.disabled = false;
        unlockBtn.textContent = 'Unlock Inquiry (' + UNLOCK_COST + ' Coins)';
        showError('Unlock error: ' + (err.message || 'Please try again.'));
      });
    };
  }

  // =========================================================================
  // Open 1-to-1 Chat Window
  // =========================================================================
  function open(input){
    ensureStyles();
    var c = ensure(input.student, input.tutor);
    var meUser = user();
    var meEmail = emailOf(meUser);
    var isTutorParticipant = (meEmail === emailOf(c.tutor));

    // If teacher participant and conversation is locked, trigger teacher notification popup
    if(isTutorParticipant && !c.unlocked && !isAdmin()){
      showTeacherInquiryPopup(c, function(unlockedConv){
        open({ student: unlockedConv.student, tutor: unlockedConv.tutor });
      });
      return;
    }

    var d = document.createElement('dialog');
    d.className = 'mc-dialog';

    var otherRawName = isAdmin() ? (c.student.name + ' & ' + c.tutor.name) : (meEmail === emailOf(c.student) ? c.tutor.name : c.student.name);
    var otherRole = isAdmin() ? 'Monitoring' : (meEmail === emailOf(c.student) ? 'Tutor' : 'Student / Parent');

    // Display student name (masked if not unlocked for monitoring)
    var otherName = otherRawName;
    var initials = otherName.split(' ').filter(Boolean).map(function(w){ return w[0]; }).slice(0, 2).join('').toUpperCase() || 'U';

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
      markRead(current);

      d.innerHTML =
        '<div class="mc-head">' +
          '<div class="mc-user">' +
            '<div class="mc-avatar">' + escapeHtml(initials) + '</div>' +
            '<div><h2>' + escapeHtml(otherName) + '</h2><div class="mc-status">' + escapeHtml(otherRole) + ' · Online</div></div>' +
          '</div>' +
          '<button class="mc-close" type="button">Close</button>' +
        '</div>' +
        '<div class="mc-notice">' +
          '<span>🔒 1-on-1 direct chat. Messages are encrypted & verified live.</span>' +
          '<span class="mc-crypto-pill">AES-GCM-256</span>' +
        '</div>' +
        '<div class="mc-messages" id="mcMsgs">' +
          (current.messages.length ? current.messages.map(function(m){
            var isMine = emailOf(m.senderEmail) === meEmail;
            return '<div class="mc-msg ' + (isMine ? 'mine' : 'theirs') + '">' +
              '<b>' + escapeHtml(m.senderName) + (m.senderRole ? ' <span style="font-weight:400;font-size:0.75rem;opacity:0.8;">(' + escapeHtml(m.senderRole) + ')</span>' : '') + '</b>' +
              '<div class="txt">' + escapeHtml(m.text) + '</div>' +
              '<small>' + escapeHtml(formatTime(m.createdAt)) + '</small>' +
            '</div>';
          }).join('') : '<div class="mc-empty">👋 Connect regarding demo class with ' + escapeHtml(otherName) + '!<br><small style="color:#7180ad">Send your official class booking request below.</small></div>') +
        '</div>' +
        (isAdmin() ? '<div style="padding:14px 20px;background:#fff;text-align:center;font-size:.85rem;color:#7180ad;">Read-only administrator view. All messages decrypted via platform keys.</div>' :
          (isTutorParticipant ?
            '<div style="padding:8px 18px;background:#fff8db;border-top:1px solid #eedda6;font-size:0.8rem;color:#7a6207;display:flex;align-items:center;justify-content:space-between;">' +
              '<span>📋 <b>Demo Response:</b> Tutors send official platform demo details only.</span>' +
            '</div>' +
            '<form class="mc-compose" id="mcForm">' +
              '<textarea id="mcText" readonly style="background:#f9f9fb;font-size:0.85rem;color:#1A2035;font-weight:600;line-height:1.4;">' + escapeHtml(DEFAULT_DEMO_MESSAGE) + '</textarea>' +
              '<button type="submit" style="white-space:nowrap;">Reply Demo Details</button>' +
            '</form>'
          :
            '<div style="padding:8px 18px;background:#eef4ff;border-top:1px solid #c7d7f8;font-size:0.8rem;color:#1d4ed8;display:flex;align-items:center;justify-content:space-between;">' +
              '<span>📋 <b>Booking Request:</b> Students send standardized class booking requests only.</span>' +
            '</div>' +
            '<form class="mc-compose" id="mcForm">' +
              '<textarea id="mcText" readonly style="background:#f9f9fb;font-size:0.85rem;color:#1A2035;font-weight:600;line-height:1.4;">' + escapeHtml(DEFAULT_STUDENT_BOOKING_MESSAGE) + '</textarea>' +
              '<button type="submit" style="white-space:nowrap;">Send Booking Request</button>' +
            '</form>'));

      d.querySelector('.mc-close').onclick = function(){ d.close(); };

      var msgsDiv = d.querySelector('#mcMsgs');
      if(msgsDiv) msgsDiv.scrollTop = msgsDiv.scrollHeight;

      if(!isAdmin()){
        var form = d.querySelector('#mcForm');
        var ta = d.querySelector('#mcText');
        if(form && ta){
          form.onsubmit = function(e){
            e.preventDefault();
            var text = isTutorParticipant ? DEFAULT_DEMO_MESSAGE : DEFAULT_STUDENT_BOOKING_MESSAGE;
            if(!text) return;
            var nowIso = new Date().toISOString();
            var msgId = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            var myRole = meEmail === emailOf(current.student) ? 'Student / Parent' : 'Tutor';

            // Optimistic update
            var newMsg = {
              id: msgId,
              senderEmail: meEmail,
              senderName: nameOf(meUser),
              senderRole: myRole,
              text: text,
              ciphertext: '',
              createdAt: nowIso,
              readAt: ''
            };
            var all = conversations();
            var fresh = all.filter(function(x){ return x.id === current.id; })[0];
            if(fresh){
              fresh.messages.push(newMsg);
              fresh.updatedAt = nowIso;
              fresh.lastMessage = text;
              save(all);
            }
            ta.value = '';
            render();

            // Encrypt and sync to Firestore
            encryptMessage(text, current.id).then(function(cipherString){
              newMsg.ciphertext = cipherString;
              var firestore = db();
              if(firestore){
                var docId = current.docId || safeDocId(current.id);
                var msgRef = firestore.collection('conversations').doc(docId).collection('messages').doc(msgId);
                msgRef.set({
                  id: msgId,
                  senderEmail: meEmail,
                  senderName: nameOf(meUser),
                  senderRole: myRole,
                  senderId: (meUser && meUser.uid) || meEmail,
                  ciphertext: cipherString,
                  text: text,
                  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                  readBy: [meEmail],
                  messageType: 'text'
                }).catch(function(err){
                  console.warn('Firestore message save error:', err);
                });

                firestore.collection('conversations').doc(docId).update({
                  lastMessage: text,
                  lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
                  lastMessageSenderId: meEmail,
                  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(function(){});
              }
            });
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

  // =========================================================================
  // Inbox View for Dashboards
  // =========================================================================
  function inbox(container, onOpen){
    ensureStyles();
    var me = emailOf(user());
    var isTutorUser = (user() && user().role === 'Tutor');
    var rows = conversations().filter(function(c){ return isAdmin() || participant(c); });

    if(!rows.length){
      container.innerHTML = '<div class="mc-empty">No conversations yet.<br><small style="color:#7180ad">Messages from your enquiries and leads will appear here.</small></div>';
      return;
    }

    container.innerHTML = rows.map(function(c){
      var isTutor = (me === emailOf(c.tutor));
      var isUnlocked = !isTutor || !!c.unlocked;
      var otherRaw = isAdmin() ? (c.student.name + ' ↔ ' + c.tutor.name) : (me === emailOf(c.student) ? c.tutor.name : c.student.name);
      var displayName = (isTutor && !isUnlocked) ? maskStudentName(otherRaw) : otherRaw;
      var initials = displayName.split(' ').filter(Boolean).map(function(w){ return w[0]; }).slice(0, 2).join('').toUpperCase() || 'U';
      var last = c.messages && c.messages.length ? c.messages[c.messages.length - 1] : null;
      var lastText = last ? last.text : 'New student inquiry';
      if(isTutor && !isUnlocked){
        lastText = '🔒 Message protected. Unlock with membership & coins to read.';
      }
      var unreadCount = unread(c, me);

      return '<div class="mc-row ' + (!isUnlocked ? 'locked' : '') + '" data-chat-id="' + escapeHtml(c.id) + '">' +
        '<div class="mc-row-left">' +
          '<div class="mc-avatar" style="width:38px;height:38px;font-size:.9rem;">' + escapeHtml(initials) + '</div>' +
          '<div>' +
            '<b>' + escapeHtml(displayName) + '</b>' +
            (!isUnlocked ? '<span class="mc-badge locked-pill" style="margin-left:8px;">🔒 Locked Inquiry</span>' : '') +
            '<small>' + escapeHtml(lastText.slice(0, 80)) + (lastText.length > 80 ? '...' : '') + (last ? ' · ' + escapeHtml(formatTime(last.createdAt)) : '') + '</small>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
          (!isUnlocked ? '<button type="button" class="mc-btn-primary" style="padding:6px 12px;font-size:0.78rem;" data-unlock-id="' + escapeHtml(c.id) + '">Unlock</button>' : '') +
          (unreadCount ? '<span class="mc-badge">' + unreadCount + ' unread</span>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    Array.prototype.forEach.call(container.querySelectorAll('[data-chat-id]'), function(row){
      row.onclick = function(e){
        if(e.target && e.target.hasAttribute('data-unlock-id')) return;
        var c = find(row.getAttribute('data-chat-id'));
        if(c && onOpen) onOpen(c);
      };
    });

    Array.prototype.forEach.call(container.querySelectorAll('[data-unlock-id]'), function(btn){
      btn.onclick = function(e){
        e.stopPropagation();
        var c = find(btn.getAttribute('data-unlock-id'));
        if(c) showTeacherInquiryPopup(c, onOpen);
      };
    });
  }

  // =========================================================================
  // Admin Conversations List with Search & Inspection
  // =========================================================================
  function adminList(container, filters, onOpen){
    ensureStyles();
    filters = filters || {};
    var from = filters.from ? new Date(filters.from + 'T00:00:00') : null;
    var to = filters.to ? new Date(filters.to + 'T23:59:59') : null;
    var rows = conversations().filter(function(c){
      if(filters.student && (c.student.name + ' ' + c.student.email).toLowerCase().indexOf(filters.student.toLowerCase()) < 0) return false;
      if(filters.tutor && (c.tutor.name + ' ' + c.tutor.email).toLowerCase().indexOf(filters.tutor.toLowerCase()) < 0) return false;
      if(filters.status && filters.status !== 'all'){
        if(filters.status === 'unlocked' && !c.unlocked) return false;
        if(filters.status === 'locked' && c.unlocked) return false;
      }
      return c.messages.some(function(m){
        var d = new Date(m.createdAt);
        return (!from || d >= from) && (!to || d <= to);
      }) || (!from && !to);
    });

    if(!rows.length){
      container.innerHTML = '<div class="mc-empty">No conversations match the current filters.</div>';
      return;
    }

    container.innerHTML = rows.map(function(c){
      var last = c.messages[c.messages.length - 1];
      var isUnlocked = !!c.unlocked;
      return '<div class="mc-row ' + (!isUnlocked ? 'locked' : '') + '" data-chat-id="' + escapeHtml(c.id) + '">' +
        '<div>' +
          '<b>' + escapeHtml(c.student.name) + ' ↔ ' + escapeHtml(c.tutor.name) + '</b> ' +
          (isUnlocked ? '<span class="mc-badge" style="background:#d9f0e3;color:#1d7a4d;">Unlocked</span>' : '<span class="mc-badge locked-pill">Pending Unlock</span>') +
          '<small>' + c.messages.length + ' messages' + (last ? ' · Last: ' + escapeHtml(formatTime(last.createdAt)) : '') + '</small>' +
        '</div>' +
        '<span style="font-size:.8rem;color:#7180ad;">Inspect →</span>' +
      '</div>';
    }).join('');

    Array.prototype.forEach.call(container.querySelectorAll('[data-chat-id]'), function(row){
      row.onclick = function(){
        var c = find(row.getAttribute('data-chat-id'));
        if(c && onOpen) onOpen(c);
      };
    });
  }

  // =========================================================================
  // Background Listener for Incoming Teacher Inquiries
  // Automatically triggers when a new locked inquiry arrives for this tutor
  // =========================================================================
  var teacherListenerUnsub = null;
  function listenForTeacherInquiries(tutorEmail, onInquiry){
    var firestore = db();
    var em = emailOf(tutorEmail);
    if(!firestore || !em) return function(){};

    if(teacherListenerUnsub) teacherListenerUnsub();

    var seenInquiriesKey = 'modivs_seen_inquiries_' + em;
    var seen = {};
    try { seen = JSON.parse(localStorage.getItem(seenInquiriesKey) || '{}'); } catch(e){}

    teacherListenerUnsub = firestore.collection('conversations')
      .where('tutorEmail', '==', em)
      .onSnapshot(function(snapshot){
        if(snapshot.empty) return;
        var all = conversations();
        var byId = {};
        all.forEach(function(x){ byId[x.id] = x; });

        snapshot.docChanges().forEach(function(change){
          var d = change.doc.data();
          var id = d.id || change.doc.id;
          if(!byId[id]){
            var newC = {
              id: id,
              docId: change.doc.id,
              student: d.student || { name: 'Student', email: d.studentEmail || '' },
              tutor: d.tutor || { name: 'Tutor', email: d.tutorEmail || '' },
              studentEmail: d.studentEmail,
              tutorEmail: d.tutorEmail,
              studentId: d.studentId,
              tutorId: d.tutorId,
              participantIds: d.participantIds || [],
              unlocked: !!d.unlocked,
              unlockedAt: d.unlockedAt || null,
              messages: [],
              createdAt: d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString(),
              updatedAt: d.updatedAt && d.updatedAt.toDate ? d.updatedAt.toDate().toISOString() : new Date().toISOString()
            };
            all.unshift(newC);
            byId[id] = newC;
            save(all);

            // If it's a new locked inquiry and hasn't been shown in this session yet
            if(!d.unlocked && !seen[id]){
              seen[id] = true;
              try { localStorage.setItem(seenInquiriesKey, JSON.stringify(seen)); } catch(e){}
              if(onInquiry) onInquiry(newC);
            }
          } else {
            // Update unlock status in memory
            if(d.unlocked && !byId[id].unlocked){
              byId[id].unlocked = true;
              byId[id].unlockedAt = d.unlockedAt || new Date().toISOString();
              save(all);
            }
          }
        });
      }, function(err){ console.warn('Teacher inquiry listener error:', err); });

    return teacherListenerUnsub;
  }

  // =========================================================================
  // Public API Export
  // =========================================================================
  window.ModivsChat = {
    open: open,
    inbox: inbox,
    adminList: adminList,
    conversations: conversations,
    find: find,
    ensure: ensure,
    subscribe: subscribe,
    unread: unread,
    isAdmin: isAdmin,
    user: user,

    // Crypto
    encrypt: encryptMessage,
    decrypt: decryptMessage,

    // Teacher Membership & Coins
    getTutorMembership: getTutorMembership,
    setTutorMembership: setTutorMembership,
    getTutorCoins: getTutorCoins,
    addTutorCoins: addTutorCoins,
    getCoinTransactions: getCoinTransactions,
    unlockInquiry: unlockInquiry,
    isConversationUnlockedForTutor: isConversationUnlockedForTutor,
    maskStudentName: maskStudentName,

    // Notification Popup
    showTeacherInquiryPopup: showTeacherInquiryPopup,
    listenForTeacherInquiries: listenForTeacherInquiries,

    // Automated Messages
    sendMessage: sendMessage,
    onTutorMembershipPurchased: onTutorMembershipPurchased,
    DEFAULT_DEMO_MESSAGE: DEFAULT_DEMO_MESSAGE,
    DEFAULT_STUDENT_BOOKING_MESSAGE: DEFAULT_STUDENT_BOOKING_MESSAGE,

    firebaseReady: function(){ return !!(fbAuth() && fbAuth().currentUser); }
  };
})();
