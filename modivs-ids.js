/* Modiv's Education - readable IDs:  students STU101, STU102 ...   leads LD201, LD202 ...   tutors TUT301, TUT302 ...
   The internal record ids (stu_1731..., t_user_..., adm_...) are NOT changed: chats, unlocks and Firestore documents
   still point to them. This module only hands out a friendly "display id" for each student (by email), tutor (by email)
   and lead (by lead id), once, and always returns the same one afterwards.

   Shared numbering lives in Firestore (counters/display_ids + display_ids/<kind>_<key>, updated in a transaction,
   so two people can never get the same number). If Firestore is not reachable, a provisional number is used from this
   browser and is replaced by the real one the next time it can be reached.

     ModivsIds.peek('stu', email)            -> 'STU101' or '' (instant, from this browser)
     ModivsIds.get('ld', leadId)             -> Promise<'LD201'>
     ModivsIds.getMany('tut', [emails])      -> Promise<{ key: 'TUT301', ... }>  (in the order given, so the oldest records get the lowest numbers) */
(function(){
  'use strict';
  var CACHE='modivs_display_ids';
  var KIND={ stu:{prefix:'STU',start:101}, ld:{prefix:'LD',start:201}, tut:{prefix:'TUT',start:301} };
  var inflight={}, chain=Promise.resolve();

  function norm(kind,key){
    key=String(key==null?'':key).trim();
    return kind==='ld'?key:key.toLowerCase();
  }
  function ck(kind,key){return kind+'|'+key}
  function rd(){try{var o=JSON.parse(localStorage.getItem(CACHE)||'{}');return o&&typeof o==='object'?o:{}}catch(e){return {}}}
  function wr(o){try{localStorage.setItem(CACHE,JSON.stringify(o))}catch(e){}}
  function docId(kind,key){return kind+'_'+key.replace(/[\/\\#?\[\]*]/g,'_')}
  function fmt(kind,n){return KIND[kind].prefix+n}
  function db(){var f=window.EducationBFirebase;return f&&f.db?f.db:null}

  function peek(kind,key){
    key=norm(kind,key);if(!KIND[kind]||!key)return '';
    var c=rd()[ck(kind,key)];return c&&c.id?c.id:''}
  function store(kind,key,id,prov){var o=rd();o[ck(kind,key)]={id:id,prov:!!prov};wr(o)}

  /* provisional number, from this browser only */
  function local(kind,key){
    var o=rd(),max=KIND[kind].start-1,re=new RegExp('^'+KIND[kind].prefix+'(\\d+)$');
    Object.keys(o).forEach(function(k){if(k.indexOf(kind+'|')===0){var m=re.exec(o[k].id||'');if(m&&+m[1]>max)max=+m[1]}});
    var id=fmt(kind,max+1);store(kind,key,id,true);return id}

  function cloud(kind,key){
    var d=db();if(!d)return Promise.reject(new Error('no firestore'));
    var sync=window.ModivsFirebaseSync,au=sync&&sync.ensureAuth?sync.ensureAuth():Promise.resolve(window.EducationBFirebase.auth.currentUser);
    return Promise.resolve(au).then(function(u){
      if(!u)throw new Error('not signed in');
      var mapRef=d.collection('display_ids').doc(docId(kind,key)),cRef=d.collection('counters').doc('display_ids');
      return d.runTransaction(function(t){
        return t.get(mapRef).then(function(ms){
          if(ms.exists&&ms.data().id)return ms.data().id;
          return t.get(cRef).then(function(cs){
            var n=((cs.exists&&cs.data()[kind])||(KIND[kind].start-1))+1,id=fmt(kind,n),p={};p[kind]=n;
            t.set(cRef,p,{merge:true});
            t.set(mapRef,{id:id,kind:kind,key:key,createdAt:Date.now()});
            return id})})})})}

  /* one at a time, so numbers are handed out in the order asked for */
  function get(kind,key){
    key=norm(kind,key);
    if(!KIND[kind]||!key)return Promise.resolve('');
    var c=rd()[ck(kind,key)];
    if(c&&c.id&&!c.prov)return Promise.resolve(c.id);
    var f=ck(kind,key);if(inflight[f])return inflight[f];
    var run=function(){
      return cloud(kind,key).then(function(id){store(kind,key,id,false);return id},
        function(){var cur=rd()[f];return cur&&cur.id?cur.id:local(kind,key)})};
    var p=chain.then(run,run);
    chain=p.then(function(){},function(){});
    inflight[f]=p;
    p.then(function(){delete inflight[f]},function(){delete inflight[f]});
    return p}

  function getMany(kind,keys){
    var out={},seen={};
    return (keys||[]).reduce(function(pr,k){
      return pr.then(function(){
        var nk=norm(kind,k);if(!nk||seen[nk])return;seen[nk]=1;
        return get(kind,nk).then(function(id){out[nk]=id})})
    },Promise.resolve()).then(function(){return out})}

  window.ModivsIds={peek:peek,get:get,getMany:getMany,KIND:KIND};
})();
