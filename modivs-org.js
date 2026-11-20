/* Modiv's Education - organization accounts (tutor side: "Tutor / Organization").
   Organizations sign up on the same tutor sign-up page, log in through the tutor login,
   and get their own dashboard (modivs-org-dashboard.html) instead of the individual-tutor one.
   Data lives in localStorage: modivs_org_profiles = { "<email>": {...organization details...} }
   and is mirrored to Firestore (collection "organizations", doc id = lower-case email) so the admin can review it.

   Approval flow (status):  pending  ->  approved | rejected   (rejected -> pending again when the org re-submits)
   Only the admin can set approved / rejected (firestore.rules). "verified" is the old name for "approved". */
(function(){
  'use strict';
  var KEY='modivs_org_profiles', COL='organizations';
  /* fields an organization must fill before the admin can approve it */
  var REQ=[['name','Organization name'],['orgType','Organization type'],['regNo','Registration / GST number'],['contactPerson','Contact person'],['phone','Phone number'],['city','City'],['address','Address'],['about','About your organization'],['subjects','Subjects offered'],['levels','Classes / levels'],['modes','Teaching modes']];
  function all(){try{var o=JSON.parse(localStorage.getItem(KEY)||'{}');return o&&typeof o==='object'?o:{}}catch(e){return {}}}
  function put(o){try{localStorage.setItem(KEY,JSON.stringify(o))}catch(e){}}
  function norm(m){return String(m||'').trim().toLowerCase()}
  function fdb(){var f=window.EducationBFirebase;return f&&f.db?f.db:null}
  function fauth(){var f=window.EducationBFirebase;return f&&f.auth?f.auth:null}
  function status(o){var s=o&&o.status;return s==='verified'?'approved':(s==='approved'||s==='rejected'?s:'pending')}
  function missing(o){return REQ.filter(function(r){var v=(o||{})[r[0]];return Array.isArray(v)?!v.length:!String(v||'').trim()}).map(function(r){return r[1]})}
  /* what the admin sets: kept out of anything the organization itself writes to Firestore */
  var REVIEW=['status','reviewNote','reviewedAt','reviewedBy'];

  var ModivsOrg={
    DASH:'modivs-org-dashboard.html',
    REQ:REQ,
    status:status,
    missing:missing,
    isApproved:function(o){return status(o)==='approved'},
    isOrg:function(email){var m=norm(email);return !!(m&&all()[m])},
    get:function(email){return all()[norm(email)]||null},
    all:all,
    /* opts.local: save in this browser only (used when copying admin decisions down);
       opts.resubmit: also tell Firestore the organization is waiting for review again */
    save:function(email,patch,opts){
      opts=opts||{};
      var m=norm(email);if(!m)return null;var o=all();
      o[m]=Object.assign({email:m,tutors:[],created_at:new Date().toISOString()},o[m]||{},patch||{},{email:m});
      put(o);
      if(!opts.local)ModivsOrg.push(m,{resubmit:!!opts.resubmit});
      return o[m]},
    create:function(email,name){
      var m=norm(email);if(!m)return null;
      var ex=all()[m];if(ex)return ex;
      return ModivsOrg.save(m,{name:name||'',orgType:'',status:'pending',tutors:[]})},
    /* where this account should land after login */
    dashFor:function(email,role){
      if(ModivsOrg.isOrg(email))return ModivsOrg.DASH;
      return role==='Tutor'?'modivs-tutor-dashboard.html':null},

    /* ---- Firestore mirror (organization side) ---- */
    push:function(email,opts){
      opts=opts||{};var m=norm(email),db=fdb(),au=fauth(),o=all()[m];
      if(!m||!db||!o||!au||!au.currentUser)return Promise.resolve(false);
      var ref=db.collection(COL).doc(m),p=Object.assign({},o);
      REVIEW.forEach(function(k){delete p[k]});
      p.email=m;p.updatedAt=Date.now();
      return ref.get().then(function(snap){
        if(!snap.exists||opts.resubmit)p.status='pending';
        if(!snap.exists)p.createdAt=o.created_at||new Date().toISOString();
        return ref.set(p,{merge:true}).then(function(){return true})
      }).catch(function(e){console.warn('Organization sync notice:',e&&e.message);return false})},
    /* copy the admin's decision (approved / rejected + note) into this browser; resolves true when something changed */
    pull:function(email){
      var m=norm(email),db=fdb(),au=fauth();
      if(!m||!db||!au)return Promise.resolve(false);
      function go(){
        return db.collection(COL).doc(m).get().then(function(snap){
          if(!snap.exists){return ModivsOrg.push(m).then(function(){return false})}
          var r=snap.data()||{},loc=all()[m]||{},ch={};
          REVIEW.forEach(function(k){if(r[k]!==undefined&&r[k]!==loc[k])ch[k]=r[k]});
          if(!Object.keys(ch).length)return false;
          ModivsOrg.save(m,ch,{local:true});return true
        }).catch(function(e){console.warn('Organization sync notice:',e&&e.message);return false})}
      if(au.currentUser)return go();
      return new Promise(function(res){var off=au.onAuthStateChanged(function(u){off();res(u?go():false)})})},

    /* ---- admin side ---- */
    adminList:function(){
      var db=fdb();
      if(!db)return Promise.reject(new Error('Firebase is not available on this page.'));
      return db.collection(COL).get().then(function(s){
        var out=[];s.forEach(function(d){var x=d.data()||{};x.email=x.email||d.id;out.push(x)});
        return out})},
    adminDecide:function(email,st,note,adminEmail){
      var m=norm(email),db=fdb();
      if(st!=='approved'&&st!=='rejected'&&st!=='pending')return Promise.reject(new Error('Unknown status'));
      var patch={status:st,reviewNote:String(note||'').slice(0,600),reviewedBy:adminEmail||'',reviewedAt:new Date().toISOString()};
      if(all()[m])ModivsOrg.save(m,patch,{local:true});   /* same browser (testing) */
      if(!db)return Promise.reject(new Error('Firebase is not available on this page.'));
      return db.collection(COL).doc(m).set(patch,{merge:true}).then(function(){return patch})}
  };
  window.ModivsOrg=ModivsOrg;
})();
