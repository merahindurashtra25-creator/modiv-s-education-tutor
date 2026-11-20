/* Modiv's Education: tutor verification documents (ID proof, qualification certificate).
   Files are kept OUT of the public tutor records. They live in:
     - localStorage key  modivs_tutor_docs        { "<email>": { id:{...}, cert:{...} } }
     - Firestore         tutor_documents/<email>_<kind>   (rules: admin + the owning tutor only)
   Usage:
     ModivsDocs.prepare(file)            -> Promise<{name,type,size,dataUrl}>  (images are compressed)
     ModivsDocs.save(email, kind, doc)   -> boolean  ('id' | 'cert')
     ModivsDocs.load(email)              -> Promise<{id?:doc, cert?:doc}>      (local first, then Firestore)
     ModivsDocs.view(doc, title)         -> opens a full-screen viewer
*/
(function(){
  'use strict';
  var KEY = 'modivs_tutor_docs';
  /* No upload size limit. Photos of documents are shrunk automatically (MAX_IMG_OUT is only the target size
     after shrinking, not a limit on what can be chosen). A Firestore record can hold ~1 MB, so a bigger
     file (e.g. a large PDF) is saved in several pieces and joined again when it is opened. */
  var MAX_IMG_OUT = 380 * 1024;      // target bytes for an image after compression
  var CHUNK = 700000;                // characters per Firestore piece (each record must stay under 1,048,576)

  function rd(){ try{ var v = JSON.parse(localStorage.getItem(KEY) || '{}'); return v && typeof v === 'object' ? v : {}; }catch(e){ return {}; } }
  function ek(email){ return String(email || '').toLowerCase().replace(/[^a-z0-9_-]/g, '_'); }
  function fs(){ return window.EducationBFirebase && window.EducationBFirebase.db; }
  function fail(m){ var e = new Error(m); e.userMessage = m; return e; }

  function readAsDataUrl(file){
    return new Promise(function(res, rej){
      var r = new FileReader();
      r.onload = function(){ res(r.result); };
      r.onerror = function(){ rej(fail('Could not read that file. Try another one.')); };
      r.readAsDataURL(file);
    });
  }

  function compressImage(dataUrl){
    return new Promise(function(res, rej){
      var img = new Image();
      img.onerror = function(){ rej(fail('That file is not a valid image.')); };
      img.onload = function(){
        var max = 1700, w = img.width, h = img.height, s = Math.min(1, max / Math.max(w, h));
        var q = 0.82, out = '';
        for(var pass = 0; pass < 6; pass++){
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
          x.drawImage(img, 0, 0, c.width, c.height);
          out = c.toDataURL('image/jpeg', q);
          if(out.length * 0.75 <= MAX_IMG_OUT) break;
          if(q > 0.55) q -= 0.1; else s *= 0.8;
        }
        res(out);
      };
      img.src = dataUrl;
    });
  }

  function prepare(file){
    if(!file) return Promise.reject(fail('No file selected.'));
    var isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    var isImg = /^image\/(jpeg|png|webp)$/.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
    if(!isPdf && !isImg) return Promise.reject(fail('Upload a JPG, PNG or PDF file.'));
    if(isPdf){
      return readAsDataUrl(file).then(function(d){
        if(d.indexOf('data:application/pdf') !== 0) d = 'data:application/pdf;base64,' + d.split(',')[1];
        return { name: file.name, type: 'application/pdf', size: file.size, dataUrl: d };
      });
    }
    return readAsDataUrl(file).then(compressImage).then(function(d){
      return { name: file.name, type: 'image/jpeg', size: Math.round(d.length * 0.75), dataUrl: d };
    });
  }

  function save(email, kind, doc){
    if(!email || !doc || !doc.dataUrl) return false;
    var localOk = true, remote = false;
    try{
      var all = rd(), k = String(email).toLowerCase();
      all[k] = all[k] || {};
      all[k][kind] = { name: doc.name, type: doc.type, size: doc.size, dataUrl: doc.dataUrl, savedAt: new Date().toISOString() };
      localStorage.setItem(KEY, JSON.stringify(all));
    }catch(e){
      localOk = false;   // browser storage is full (a big file): keep the cloud copy only
      try{ var a2 = rd(), k2 = String(email).toLowerCase(); if(a2[k2]){ delete a2[k2][kind]; localStorage.setItem(KEY, JSON.stringify(a2)); } }catch(e2){}
    }
    try{
      var db = fs();
      if(db){
        remote = true;
        var col = db.collection('tutor_documents'), base = ek(email) + '_' + kind, mail = String(email).toLowerCase();
        var meta = { email: mail, kind: kind, name: doc.name, type: doc.type, size: doc.size, updatedAt: new Date().toISOString() };
        if(doc.dataUrl.length <= CHUNK){
          col.doc(base).set(Object.assign({ dataUrl: doc.dataUrl, parts: 0 }, meta)).catch(function(){});
        }else{
          var n = Math.ceil(doc.dataUrl.length / CHUNK), jobs = [];
          for(var i = 0; i < n; i++){
            jobs.push(col.doc(base + '_p' + i).set({ email: mail, kind: kind, part: i, dataUrl: doc.dataUrl.slice(i * CHUNK, (i + 1) * CHUNK), updatedAt: meta.updatedAt }));
          }
          // the main record is written last, so a half-uploaded file is never shown as complete
          Promise.all(jobs).then(function(){ return col.doc(base).set(Object.assign({ dataUrl: '', parts: n }, meta)); }).catch(function(){});
        }
      }
    }catch(e){}
    return localOk || remote;
  }

  function loadLocal(email){ return rd()[String(email || '').toLowerCase()] || {}; }

  function load(email){
    var have = loadLocal(email);
    var db = fs();
    if(!db || !email || (have.id && have.cert)) return Promise.resolve(have);
    var need = ['id', 'cert'].filter(function(k){ return !have[k]; });
    return Promise.all(need.map(function(k){
      var col = db.collection('tutor_documents'), base = ek(email) + '_' + k;
      return col.doc(base).get().then(function(s){
        if(!(s && s.exists)) return null;
        var d = s.data(), n = +d.parts || 0;
        if(!n) return { k: k, d: d };
        var gets = []; for(var i = 0; i < n; i++) gets.push(col.doc(base + '_p' + i).get());
        return Promise.all(gets).then(function(ps){
          d.dataUrl = ps.map(function(p){ return p && p.exists ? (p.data().dataUrl || '') : ''; }).join('');
          return { k: k, d: d };
        });
      }).catch(function(){ return null; });
    })).then(function(rs){
      var out = Object.assign({}, have);
      rs.forEach(function(r){ if(r && r.d && r.d.dataUrl) out[r.k] = r.d; });
      return out;
    });
  }

  function toBlobUrl(dataUrl){
    try{
      var p = dataUrl.split(','), mime = (p[0].match(/:(.*?);/) || [])[1] || 'application/octet-stream';
      var bin = atob(p[1]), u8 = new Uint8Array(bin.length);
      for(var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      return URL.createObjectURL(new Blob([u8], { type: mime }));
    }catch(e){ return dataUrl; }
  }

  function view(doc, title){
    if(!doc || !doc.dataUrl) return;
    var old = document.getElementById('mvDocViewer'); if(old) old.remove();
    var url = toBlobUrl(doc.dataUrl), isPdf = /pdf/i.test(doc.type || '');
    var ov = document.createElement('div'); ov.id = 'mvDocViewer';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(20,26,45,.78);display:flex;align-items:center;justify-content:center;padding:18px;font-family:inherit';
    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:14px;max-width:960px;width:100%;max-height:100%;display:flex;flex-direction:column;overflow:hidden';
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #e4e8ef';
    var ttl = document.createElement('b'); ttl.textContent = (title || 'Document') + (doc.name ? ' · ' + doc.name : ''); ttl.style.cssText = 'font-size:.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
    var act = document.createElement('div'); act.style.cssText = 'display:flex;gap:8px;flex:none';
    var dl = document.createElement('a'); dl.href = url; dl.download = doc.name || 'document'; dl.textContent = 'Download';
    var cl = document.createElement('button'); cl.type = 'button'; cl.textContent = 'Close';
    [dl, cl].forEach(function(b){ b.style.cssText = 'border:1.5px solid #1A2035;background:#fff;color:#1A2035;border-radius:8px;padding:6px 14px;font-weight:600;font-size:.85rem;cursor:pointer;text-decoration:none'; });
    act.appendChild(dl); act.appendChild(cl); bar.appendChild(ttl); bar.appendChild(act);
    var body = document.createElement('div'); body.style.cssText = 'flex:1;min-height:0;overflow:auto;background:#f2f5f9;display:flex;align-items:center;justify-content:center';
    if(isPdf){
      var fr = document.createElement('iframe'); fr.src = url; fr.title = title || 'PDF document';
      fr.style.cssText = 'border:0;width:100%;height:78vh;background:#fff'; body.appendChild(fr);
    }else{
      var im = document.createElement('img'); im.src = url; im.alt = title || 'Document';
      im.style.cssText = 'max-width:100%;max-height:78vh;object-fit:contain;display:block'; body.appendChild(im);
    }
    box.appendChild(bar); box.appendChild(body); ov.appendChild(box); document.body.appendChild(ov);
    function close(){ ov.remove(); document.removeEventListener('keydown', esc); try{ URL.revokeObjectURL(url); }catch(e){} }
    function esc(e){ if(e.key === 'Escape') close(); }
    cl.addEventListener('click', close);
    ov.addEventListener('click', function(e){ if(e.target === ov) close(); });
    document.addEventListener('keydown', esc);
    cl.focus();
  }

  window.ModivsDocs = { prepare: prepare, save: save, load: load, loadLocal: loadLocal, view: view };
})();
