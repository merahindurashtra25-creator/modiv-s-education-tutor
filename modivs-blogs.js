/* Modiv's Education - blogs (Firestore).
   Used by: index.html (home preview), modivs-blogs.html (list, article, comments),
            modivs-tutor-dashboard.html (tutors publish, max 2 per calendar month).
   Collections:  blogs/{uid_YYYY_M_n}  ·  blogs/{id}/comments/{auto}  ·  blog_quota/{uid_YYYY_M}
   The 2-per-month limit is enforced by firestore.rules (not only in the browser). */
(function(){
  'use strict';
  var MAX_PER_MONTH = 2;
  var CATEGORIES = ['Study Tips','Exam Prep','Home Tuition','Parents’ Corner','Student Life','Subject Help'];

  function fb(){ return window.EducationBFirebase || null; }
  function ts(){ return firebase.firestore.FieldValue.serverTimestamp(); }

  // Wait until Firebase has loaded (scripts are sometimes deferred)
  function ready(){
    return new Promise(function(res, rej){
      var n = 0;
      (function chk(){
        if(fb() && fb().db) return res(fb());
        if(++n > 100) return rej(new Error('Firebase is not available. Check your connection.'));
        setTimeout(chk, 100);
      })();
    });
  }
  // Resolves with the Firebase user (or null) once auth state is known
  var authP = null;
  function authReady(){
    if(authP) return authP;
    authP = ready().then(function(f){
      return new Promise(function(res){
        var off = f.auth.onAuthStateChanged(function(u){ if(off) off(); res(u || null); });
      });
    }).catch(function(){ return null; });
    return authP;
  }
  function me(){ var f = fb(); return f && f.auth && f.auth.currentUser || null; }

  function monthParts(d){ d = d || new Date(); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 }; }
  function quotaId(uid, d){ var p = monthParts(d); return uid + '_' + p.y + '_' + p.m; }
  function resetDate(d){ var p = monthParts(d); return new Date(Date.UTC(p.y, p.m, 1)); }  // 1st of next month (UTC)

  function toPost(doc){
    var d = doc.data() || {};
    var t = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : new Date();
    return { id: doc.id, title: d.title || '', category: d.category || '', excerpt: d.excerpt || '', body: d.body || '',
             authorName: d.authorName || 'Tutor', authorUid: d.authorUid || '', read: d.read || 1, date: t };
  }

  function list(n){
    return ready().then(function(f){
      return f.db.collection('blogs').orderBy('createdAt', 'desc').limit(n || 60).get();
    }).then(function(s){ return s.docs.map(toPost); });
  }
  function get(id){
    return ready().then(function(f){ return f.db.collection('blogs').doc(id).get(); })
      .then(function(d){ return d.exists ? toPost(d) : null; });
  }
  function byAuthor(uid){
    return ready().then(function(f){ return f.db.collection('blogs').where('authorUid', '==', uid).get(); })
      .then(function(s){ return s.docs.map(toPost).sort(function(a, b){ return b.date - a.date; }); });
  }

  // How many has this user published this month?
  function quota(uid){
    return ready().then(function(f){ return f.db.collection('blog_quota').doc(quotaId(uid)).get(); })
      .then(function(d){
        var used = d.exists ? (d.data().count || 0) : 0;
        return { used: used, left: Math.max(0, MAX_PER_MONTH - used), max: MAX_PER_MONTH, resets: resetDate() };
      });
  }

  function makeExcerpt(body){
    var t = String(body).replace(/^#+\s*/gm, '').replace(/^[-*]\s+/gm, '').replace(/\s+/g, ' ').trim();
    return t.length > 170 ? t.slice(0, 167).replace(/\s+\S*$/, '') + '…' : t;
  }

  // Publish a blog. Writes the quota counter and the blog in ONE batch; the rules reject the batch
  // if the tutor already has 2 posts this month.
  function publish(o){
    var u = me();
    if(!u) return Promise.reject(new Error('Please log out and log in again, then try publishing.'));
    var title = String(o.title || '').trim(), body = String(o.body || '').trim();
    if(title.length < 5) return Promise.reject(new Error('Please add a title (at least 5 characters).'));
    if(title.length > 150) return Promise.reject(new Error('The title is too long (max 150 characters).'));
    if(body.length < 100) return Promise.reject(new Error('Please write at least 100 characters in the blog.'));
    if(body.length > 20000) return Promise.reject(new Error('The blog is too long (max 20,000 characters).'));
    if(CATEGORIES.indexOf(o.category) < 0) return Promise.reject(new Error('Please choose a category.'));
    return quota(u.uid).then(function(q){
      if(q.used >= MAX_PER_MONTH) throw new Error('You have already published ' + MAX_PER_MONTH + ' blogs this month. You can publish again from ' + q.resets.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', timeZone: 'UTC' }) + '.');
      var next = q.used + 1, f = fb(), qid = quotaId(u.uid), blogId = qid + '_' + next;
      var words = body.split(/\s+/).length;
      var batch = f.db.batch();
      var qref = f.db.collection('blog_quota').doc(qid);
      batch.set(qref, { uid: u.uid, count: next });
      batch.set(f.db.collection('blogs').doc(blogId), {
        authorUid: u.uid, authorName: String(o.authorName || 'Tutor').slice(0, 80),
        title: title, category: o.category, excerpt: makeExcerpt(body), body: body,
        read: Math.max(1, Math.round(words / 200)), createdAt: ts()
      });
      return batch.commit().then(function(){ return blogId; });
    }).catch(function(e){
      if(e && e.code === 'permission-denied') throw new Error('Publishing was blocked by the database rules (permission-denied). If you have published fewer than ' + MAX_PER_MONTH + ' blogs this month, the site owner needs to publish the latest firestore.rules.');
      throw e;
    });
  }
  function remove(id){
    return ready().then(function(f){ return f.db.collection('blogs').doc(id).delete(); });
  }

  // Comments
  function comments(id){
    return ready().then(function(f){
      return f.db.collection('blogs').doc(id).collection('comments').orderBy('createdAt', 'asc').limit(200).get();
    }).then(function(s){
      return s.docs.map(function(d){
        var x = d.data(); return { id: d.id, uid: x.uid, name: x.name || 'Member', role: x.role || '', text: x.text || '',
          date: x.createdAt && x.createdAt.toDate ? x.createdAt.toDate() : new Date() };
      });
    });
  }
  function addComment(id, text, name, role){
    var u = me();
    if(!u) return Promise.reject(new Error('Please log in to comment.'));
    text = String(text || '').trim();
    if(!text) return Promise.reject(new Error('Please write a comment first.'));
    if(text.length > 1000) return Promise.reject(new Error('Comments can be up to 1000 characters.'));
    return ready().then(function(f){
      return f.db.collection('blogs').doc(id).collection('comments').add({
        uid: u.uid, name: String(name || 'Member').slice(0, 80), role: String(role || '').slice(0, 30), text: text, createdAt: ts()
      });
    }).catch(function(e){
      if(e && e.code === 'permission-denied') throw new Error('Could not post your comment. Please log in again.');
      throw e;
    });
  }
  function removeComment(id, cid){
    return ready().then(function(f){ return f.db.collection('blogs').doc(id).collection('comments').doc(cid).delete(); });
  }

  // Who is logged in on this site (display name + role), from the site's own session
  function session(){
    try{
      var a = JSON.parse(localStorage.getItem('modivs_admin_session') || 'null');
      var adminEmails = ['happinessaggarwal@gmail.com', 'divyanshdhimanteam@gmail.com', 'admin@gmail.com'];
      if(a && a.email && adminEmails.indexOf(a.email.toLowerCase()) !== -1) return { name: a.name || 'Admin', role: 'Admin', admin: true };
    }catch(e){}
    try{
      var u = JSON.parse(localStorage.getItem('modivs_auth_user') || 'null');
      if(u && u.email) return { name: u.name || String(u.email).split('@')[0], role: u.role === 'Tutor' ? 'Tutor' : 'Student / Parent', admin: false };
    }catch(e){}
    return null;
  }

  // ---- safe formatting: plain text -> HTML. "## Heading", "- bullet", blank line = new paragraph ----
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function render(body){
    var out = [], para = [], bul = [];
    function fp(){ if(para.length){ out.push('<p>' + para.join('<br>') + '</p>'); para = []; } }
    function fl(){ if(bul.length){ out.push('<ul>' + bul.map(function(b){ return '<li>' + b + '</li>'; }).join('') + '</ul>'); bul = []; } }
    String(body).replace(/\r/g, '').split('\n').forEach(function(line){
      var t = line.trim();
      if(!t){ fp(); fl(); return; }
      var h = /^#{1,3}\s+(.+)$/.exec(t), b = /^[-*]\s+(.+)$/.exec(t);
      if(h){ fp(); fl(); out.push('<h3>' + esc(h[1]) + '</h3>'); }
      else if(b){ fp(); bul.push(esc(b[1])); }
      else { fl(); para.push(esc(t)); }
    });
    fp(); fl();
    return out.join('');
  }
  function fmtDate(d, short){
    try{ return d.toLocaleDateString('en-IN', { day: 'numeric', month: short ? 'short' : 'long', year: 'numeric' }); }catch(e){ return ''; }
  }

  window.ModivsBlogs = {
    MAX_PER_MONTH: MAX_PER_MONTH, CATEGORIES: CATEGORIES,
    ready: ready, authReady: authReady, me: me, session: session,
    list: list, get: get, byAuthor: byAuthor, quota: quota, publish: publish, remove: remove,
    comments: comments, addComment: addComment, removeComment: removeComment,
    esc: esc, render: render, fmtDate: fmtDate
  };
})();
