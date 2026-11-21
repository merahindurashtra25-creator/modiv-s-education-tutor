/*
 * Modiv's Education - Tutor Wallet (Firestore is the source of truth)
 *
 * Firestore layout
 *   tutor_wallets/{email}        -> { tutorEmail, coins, membership{...}, updatedAt }
 *   coin_transactions/{txId}     -> every coin credit / debit (purchase, bonus, unlock, admin)
 *   membership_history/{id}      -> every plan purchase / extension / upgrade
 *   unlocks/{email__leadId}      -> one record per unlocked lead (written in the SAME transaction
 *                                   that deducts coins, so a lead can never be charged twice)
 *
 * localStorage is only a read cache so the page can paint the last known balance instantly
 * after a refresh. Every snapshot from Firestore overwrites it.
 */
(function(){
  'use strict';

  var CACHE_KEY = 'modivs_wallet_cache_v2';
  var TX_STORE = 'modivs_coin_transactions';
  var MEM_HIST = 'modivs_membership_history';
  var WELCOME_COINS = 0;           // starting balance for a brand-new tutor wallet (0 = no demo coins)
  /* Coins charged to unlock one lead. The admin sets it (Admin > Lead Unlock Rate), it is stored in
     Firestore site_content/pricing { unlockCost } and cached in localStorage so pages show it at once. */
  var DEFAULT_UNLOCK_COST = 10, COST_KEY = 'modivs_unlock_cost';
  var costListeners = [], costWatching = false;
  function validCost(v){ v = Number(v); return isFinite(v) && v >= 1 && v <= 100000 ? Math.round(v) : 0; }
  var UNLOCK_COST = (function(){ try { return validCost(localStorage.getItem(COST_KEY)) || DEFAULT_UNLOCK_COST; } catch(e){ return DEFAULT_UNLOCK_COST; } })();
  function applyCost(v){
    v = validCost(v); if(!v || v === UNLOCK_COST) return;
    UNLOCK_COST = v;
    try { localStorage.setItem(COST_KEY, String(v)); } catch(e){}
    costListeners.slice().forEach(function(fn){ try { fn(v); } catch(e){} });
  }
  function getUnlockCost(){ return UNLOCK_COST; }
  /* Coins to unlock ONE inquiry: the admin's per-inquiry rate if set on the lead, else the global rate. */
  function leadCost(l){ var v = l && validCost(l.unlockCost); return v || UNLOCK_COST; }
  function onUnlockCost(fn){ if(typeof fn === 'function') costListeners.push(fn); }
  function watchUnlockCost(){
    if(costWatching) return;
    var tries = 0;
    (function go(){
      var fs = db();
      if(!fs){ if(++tries < 40) setTimeout(go, 500); return; }
      costWatching = true;
      fs.collection('site_content').doc('pricing').onSnapshot(function(s){
        if(s.exists) applyCost(s.data().unlockCost);
      }, function(){ costWatching = false; });
    })();
  }
  /* Admin only (Firestore rules let only admins write site_content). */
  function saveUnlockCost(n){
    var v = validCost(n);
    if(!v) return Promise.reject(new Error('Enter a whole number of coins, 1 or more.'));
    return auth().then(function(){
      var fs = db(); if(!fs) throw new Error('Firebase is not available.');
      var who = '';
      try { who = (firebase.auth().currentUser && firebase.auth().currentUser.email) || ''; } catch(e){}
      return fs.collection('site_content').doc('pricing').set({ unlockCost: v, updatedBy: who, updatedAt: ts() }, { merge: true });
    }).then(function(){ applyCost(v); return v; });
  }

  var wallets = {};                // email -> { coins, membership, ready }
  var watchers = {};               // email -> true
  var listeners = [];

  try {
    var raw = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    if(raw && typeof raw === 'object') Object.keys(raw).forEach(function(k){
      wallets[k] = { coins: Number(raw[k].coins) || 0, membership: raw[k].membership || null, ready: false };
    });
  } catch(e){}

  function clean(s){ return String(s || '').trim().toLowerCase(); }
  function docKey(em){ return clean(em).replace(/[\/\\#?]/g, '_'); }
  function db(){
    if(window.EducationBFirebase && window.EducationBFirebase.db) return window.EducationBFirebase.db;
    if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore();
    return null;
  }
  function ts(){ return firebase.firestore.FieldValue.serverTimestamp(); }
  function auth(){
    return (window.ModivsFirebaseSync && ModivsFirebaseSync.ensureAuth) ? ModivsFirebaseSync.ensureAuth() : Promise.resolve(null);
  }
  function iso(v){
    if(!v) return new Date().toISOString();
    if(typeof v.toDate === 'function') return v.toDate().toISOString();
    if(typeof v === 'string') return v;
    return new Date(v).toISOString();
  }
  function persist(){
    try {
      var out = {};
      Object.keys(wallets).forEach(function(k){ out[k] = { coins: wallets[k].coins, membership: wallets[k].membership }; });
      localStorage.setItem(CACHE_KEY, JSON.stringify(out));
    } catch(e){}
  }
  function emit(em){
    listeners.slice().forEach(function(fn){ try { fn(em); } catch(e){ console.error(e); } });
    try { window.dispatchEvent(new CustomEvent('modivs-wallet-change', { detail: { email: em } })); } catch(e){}
  }
  function setLocal(em, patch){
    em = clean(em);
    var w = wallets[em] || (wallets[em] = { coins: 0, membership: null, ready: false });
    Object.keys(patch).forEach(function(k){ w[k] = patch[k]; });
    persist();
    emit(em);
  }
  function walletRef(em){ return db().collection('tutor_wallets').doc(docKey(em)); }
  function fail(reason, message){ var e = new Error(message || reason); e.reason = reason; return e; }

  function membershipValid(m){
    return !!(m && m.status === 'active' && m.validUntil && new Date(m.validUntil).getTime() > Date.now());
  }

  /* ---------- live subscription ---------- */
  function mergeStore(storeKey, em, rows){
    try {
      var all = JSON.parse(localStorage.getItem(storeKey) || '[]');
      if(!Array.isArray(all)) all = [];
      all = all.filter(function(x){ return clean(x.tutorEmail) !== em; }).concat(rows);
      all.sort(function(a, b){ return new Date(b.createdAt) - new Date(a.createdAt); });
      localStorage.setItem(storeKey, JSON.stringify(all.slice(0, 500)));
    } catch(e){}
  }

  function watch(email){
    var em = clean(email);
    if(!em || watchers[em]) return;
    watchers[em] = true;
    auth().then(function(){
      var fs = db();
      if(!fs) { watchers[em] = false; return; }

      walletRef(em).onSnapshot(function(snap){
        if(snap.exists){
          var d = snap.data() || {};
          setLocal(em, { coins: Number(d.coins) || 0, membership: d.membership || null, ready: true });
        } else if(!snap.metadata.fromCache){
          // First time this tutor is seen: create the wallet once (transaction => no double welcome bonus)
          createWallet(em);
        }
      }, function(err){ console.warn('Wallet listener error:', err); });

      fs.collection('coin_transactions').where('tutorEmail', '==', em).onSnapshot(function(s){
        var rows = [];
        s.forEach(function(doc){
          var d = doc.data();
          rows.push(Object.assign({}, d, { id: doc.id, createdAt: iso(d.createdAt) }));
        });
        mergeStore(TX_STORE, em, rows);
        emit(em);
      }, function(err){ console.warn('Coin history listener error:', err); });

      fs.collection('membership_history').where('tutorEmail', '==', em).onSnapshot(function(s){
        var rows = [];
        s.forEach(function(doc){
          var d = doc.data();
          rows.push(Object.assign({}, d, { id: doc.id, createdAt: iso(d.createdAt) }));
        });
        mergeStore(MEM_HIST, em, rows);
        emit(em);
      }, function(err){ console.warn('Membership history listener error:', err); });
    });
  }

  function createWallet(em){
    var fs = db(), ref = walletRef(em);
    return fs.runTransaction(function(t){
      return t.get(ref).then(function(s){
        if(s.exists) return;
        t.set(ref, { tutorEmail: em, coins: WELCOME_COINS, membership: null, createdAt: ts(), updatedAt: ts() });
        if(WELCOME_COINS > 0){
          var txRef = fs.collection('coin_transactions').doc();
          t.set(txRef, { tutorEmail: em, amount: WELCOME_COINS, balanceAfter: WELCOME_COINS, type: 'welcome', description: 'Welcome bonus', createdAt: ts() });
        }
      });
    }).catch(function(e){ console.warn('Wallet create failed:', e); });
  }

  /* ---------- reads ---------- */
  function getCoins(em){ var w = wallets[clean(em)]; return w ? w.coins : 0; }
  function getMembershipRaw(em){ var w = wallets[clean(em)]; return w ? w.membership : null; }
  function isReady(em){ var w = wallets[clean(em)]; return !!(w && w.ready); }
  function onChange(fn){ listeners.push(fn); return function(){ listeners = listeners.filter(function(x){ return x !== fn; }); }; }

  /* ---------- writes (all atomic with offline/quota fallback) ---------- */
  function addCoins(email, amount, description, extra){
    var em = clean(email);
    amount = Number(amount) || 0;
    extra = extra || {};
    watch(em);
    return auth().then(function(){
      var fs = db(); if(!fs) throw fail('offline', 'Firebase is not available.');
      var ref = walletRef(em), txRef = fs.collection('coin_transactions').doc();
      return fs.runTransaction(function(t){
        return t.get(ref).then(function(s){
          var cur = s.exists ? (Number(s.data().coins) || 0) : WELCOME_COINS;
          var next = cur + amount;
          if(next < 0) throw fail('insufficient_coins', 'Not enough coins.');
          t.set(ref, { tutorEmail: em, coins: next, updatedAt: ts() }, { merge: true });
          t.set(txRef, Object.assign({
            tutorEmail: em, amount: amount, balanceAfter: next,
            type: amount >= 0 ? 'credit' : 'debit',
            description: description || (amount >= 0 ? 'Coins added' : 'Coins deducted'),
            createdAt: ts()
          }, extra));
          return next;
        });
      }).catch(function(txErr){
        console.warn('Wallet transaction error (quota/network):', txErr && txErr.message);
        var cur = getCoins(em) || WELCOME_COINS;
        var next = Math.max(0, cur + amount);
        if(next < 0 && amount < 0) throw fail('insufficient_coins', 'Not enough coins.');
        try { ref.set({ tutorEmail: em, coins: next, updatedAt: ts() }, { merge: true }).catch(function(){}); } catch(e){}
        try {
          txRef.set(Object.assign({
            tutorEmail: em, amount: amount, balanceAfter: next,
            type: amount >= 0 ? 'credit' : 'debit',
            description: description || (amount >= 0 ? 'Coins added' : 'Coins deducted'),
            createdAt: ts()
          }, extra)).catch(function(){});
        } catch(e){}
        return next;
      }).then(function(next){ setLocal(em, { coins: next, ready: true }); return { balance: next }; });
    }).catch(function(err){
      var cur = getCoins(em) || WELCOME_COINS;
      var next = Math.max(0, cur + amount);
      if(next < 0 && amount < 0) throw fail('insufficient_coins', 'Not enough coins.');
      setLocal(em, { coins: next, ready: true });
      return { balance: next, fallback: true, warning: err && err.message };
    });
  }

  function buildMembership(existing, plan){
    var now = new Date();
    var days = Number(plan.days) || 30;
    var base = now;
    if(plan.extend && membershipValid(existing) && existing.planName === plan.planName){
      base = new Date(existing.validUntil);
    }
    var expiry = new Date(base.getTime() + days * 86400000);
    return {
      planName: plan.planName,
      status: plan.status || 'active',
      startedAt: (plan.extend && membershipValid(existing) && existing.startedAt) ? existing.startedAt : now.toISOString(),
      validUntil: expiry.toISOString(),
      durationDays: days
    };
  }

  /** plan = { planName, days, price, bonusCoins, extend, status, orderId } */
  /* copy the plan tier onto the public tutor record so the tutors page can show the membership badge */
  var TIER_OF = { 'Standard Plan': 'Silver', 'Professional Plan': 'Gold', 'Premium Plan': 'Platinum' };
  function publishTier(em, mem){
    try{
      var fs = db(); if(!fs) return;
      var live = mem && mem.status === 'active' && mem.validUntil && new Date(mem.validUntil).getTime() > Date.now();
      var patch = { membershipTier: live ? (TIER_OF[mem.planName] || '') : '', membershipUntil: live ? mem.validUntil : '' };
      fs.collection('tutors').where('email', '==', String(em).toLowerCase()).limit(1).get().then(function(snap){
        if(snap && !snap.empty) return snap.docs[0].ref.set(patch, { merge: true });
      }).catch(function(){});
    }catch(e){}
  }

  function setMembership(email, plan){
    var em = clean(email);
    watch(em);
    return auth().then(function(){
      var fs = db(); if(!fs) throw fail('offline', 'Firebase is not available.');
      var ref = walletRef(em), hRef = fs.collection('membership_history').doc();
      var bonus = Number(plan.bonusCoins) || 0;
      return fs.runTransaction(function(t){
        return t.get(ref).then(function(s){
          var d = s.exists ? s.data() : {};
          var cur = Number(d.coins) || 0;
          var existing = d.membership || null;
          var mem = (plan.status === 'expired')
            ? { planName: existing ? existing.planName : 'None', status: 'expired', startedAt: existing ? existing.startedAt : null, validUntil: new Date(Date.now() - 1000).toISOString(), durationDays: existing ? existing.durationDays : 0 }
            : buildMembership(existing, plan);
          var type = 'activated';
          if(plan.status === 'expired') type = 'expired';
          else if(membershipValid(existing) && existing.planName === plan.planName) type = 'extended';
          else if(membershipValid(existing)) type = 'upgraded';
          else if(existing && existing.planName && existing.planName !== 'None') type = 'renewed';
          var next = cur + bonus;
          t.set(ref, { tutorEmail: em, coins: next, membership: mem, updatedAt: ts() }, { merge: true });
          t.set(hRef, {
            tutorEmail: em, planName: mem.planName, type: type, durationDays: mem.durationDays,
            price: plan.price || '', orderId: plan.orderId || '', paymentId: plan.paymentId || '',
            gateway: plan.gateway || 'razorpay', bonusCoins: bonus,
            startedAt: mem.startedAt, validUntil: mem.validUntil, createdAt: ts()
          });
          if(bonus > 0){
            var txRef = fs.collection('coin_transactions').doc();
            t.set(txRef, {
              tutorEmail: em, amount: bonus, balanceAfter: next, type: 'membership_bonus',
              description: 'Bonus coins for ' + mem.planName + (plan.price ? ' (' + plan.price + ')' : ''),
              orderId: plan.orderId || '', paymentId: plan.paymentId || '', gateway: plan.gateway || 'razorpay', createdAt: ts()
            });
          }
          return { membership: mem, balance: next };
        });
      }).then(function(r){
        setLocal(em, { coins: r.balance, membership: r.membership, ready: true });
        publishTier(em, r.membership);
        return r;
      });
    });
  }

  /** Buy a coin pack. */
  function purchaseCoins(email, coins, price, orderId, extraData){
    var txData = Object.assign({ type: 'purchase', price: price, orderId: orderId || '', gateway: 'razorpay' }, extraData || {});
    return addCoins(email, coins, 'Purchased ' + coins + ' coins (' + price + ')', txData);
  }

  /**
   * Unlock one lead. One transaction does ALL of this or none of it:
   *   - lead already unlocked?  -> return { already:true }, charge nothing
   *   - membership active?      -> else reject 'membership_invalid'
   *   - enough coins?           -> else reject 'insufficient_coins'
   *   - deduct coins, write coin_transactions row, write unlocks record
   */
  function unlockLead(email, leadId, leadName, cost, costLeadId){
    var em = clean(email);
    var costArg = Number(cost) || UNLOCK_COST;
    var lid = String(leadId || '').replace(/[\/\\#?]/g, '_').trim();
    watch(em);
    return auth().then(function(){
      var fs = db(); if(!fs) throw fail('offline', 'Firebase is not available.');
      var ref = walletRef(em);
      var uRef = fs.collection('unlocks').doc(docKey(em) + '__' + lid);
      var txRef = fs.collection('coin_transactions').doc();
      var pRef = fs.collection('site_content').doc('pricing');
      // admin can set a different rate on one inquiry (leads/{id}.unlockCost); it wins over the global rate
      var baseId = String(costLeadId || lid).replace(/^conv_/, '').replace(/[\/\\#?]/g, '_').trim() || 'none';
      var lRef = fs.collection('leads').doc(baseId), sRef = fs.collection('students').doc(baseId);
      return fs.runTransaction(function(t){
        return Promise.all([t.get(ref), t.get(uRef), t.get(pRef), t.get(lRef), t.get(sRef)]).then(function(r){
          var ws = r[0], us = r[1], ps = r[2];
          var lc = (r[3] && r[3].exists && validCost(r[3].data().unlockCost)) || (r[4] && r[4].exists && validCost(r[4].data().unlockCost)) || 0;
          if(us.exists) return { already: true, balance: ws.exists ? (Number(ws.data().coins) || 0) : 0 };
          // the admin-set rate in Firestore always wins over whatever the page passed in
          var cost = lc || (ps && ps.exists && validCost(ps.data().unlockCost)) || costArg;
          var d = ws.exists ? ws.data() : {};
          if(!membershipValid(d.membership)) throw fail('membership_invalid', 'An active membership plan is required to unlock leads.');
          var cur = Number(d.coins) || 0;
          if(cur < cost) throw fail('insufficient_coins', 'Not enough coins. You have ' + cur + ', need ' + cost + '.');
          var next = cur - cost;
          t.set(ref, { tutorEmail: em, coins: next, updatedAt: ts() }, { merge: true });
          t.set(txRef, {
            tutorEmail: em, amount: -cost, balanceAfter: next, type: 'unlock', leadId: lid,
            description: 'Unlocked lead ' + (leadName || lid), createdAt: ts()
          });
          t.set(uRef, {
            id: docKey(em) + '__' + lid, type: 'unlock', tutorEmail: em, tutor_id: em, leadId: lid, lead_id: lid,
            leadName: leadName || '', unlock_status: 'unlocked', coinsDeducted: cost, coins_deducted: cost,
            transaction_id: txRef.id, unlockedAt: ts(), unlocked_at: ts()
          });
          return { already: false, balance: next, charged: cost };
        });
      }).then(function(r){
        setLocal(em, { coins: r.balance, ready: true });
        return r;
      });
    });
  }

  /** Unlock a lead the admin marked FREE: no membership check, no coins charged. */
  function unlockFreeLead(email, leadId, leadName){
    var em = clean(email);
    var lid = String(leadId || '').replace(/[\/\\#?]/g, '_').trim();
    watch(em);
    return auth().then(function(){
      var fs = db(); if(!fs) throw fail('offline', 'Firebase is not available.');
      var uRef = fs.collection('unlocks').doc(docKey(em) + '__' + lid);
      return uRef.get().catch(function(){ return { exists: false }; }).then(function(us){
        var bal = getCoins(em);
        if(us && us.exists) return { already: true, balance: bal };
        return uRef.set({
          id: docKey(em) + '__' + lid, type: 'unlock', tutorEmail: em, tutor_id: em, leadId: lid, lead_id: lid,
          leadName: leadName || '', unlock_status: 'unlocked', coinsDeducted: 0, coins_deducted: 0,
          free: true, unlockedAt: ts(), unlocked_at: ts()
        }).then(function(){ return { already: false, balance: bal }; });
      });
    });
  }

  watchUnlockCost();

  window.ModivsWallet = {
    get UNLOCK_COST(){ return UNLOCK_COST; },
    getUnlockCost: getUnlockCost,
    leadCost: leadCost,
    onUnlockCost: onUnlockCost,
    saveUnlockCost: saveUnlockCost,
    watch: watch,
    onChange: onChange,
    getCoins: getCoins,
    getMembershipRaw: getMembershipRaw,
    isReady: isReady,
    membershipValid: membershipValid,
    addCoins: addCoins,
    purchaseCoins: purchaseCoins,
    setMembership: setMembership,
    unlockLead: unlockLead,
    unlockFreeLead: unlockFreeLead,
    setLocal: setLocal,
    isReadyFor: isReady,
    publishTier: publishTier
  };
})();
