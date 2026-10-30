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
  var MAX_PDF = 650 * 1024;          // bytes (Firestore documents are capped at 1 MB once base64-encoded)
  var MAX_IMG_OUT = 380 * 1024;      // bytes after compression
  var MAX_RAW = 25 * 1024 * 1024;

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
    if(file.size > MAX_RAW) return Promise.reject(fail('That file is too large. Please choose a smaller one.'));
    var isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    var isImg = /^image\/(jpeg|png|webp)$/.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
    if(!isPdf && !isImg) return Promise.reject(fail('Upload a JPG, PNG or PDF file.'));
    if(isPdf){
      if(file.size > MAX_PDF) return Promise.reject(fail('This PDF is over 650 KB. Upload a photo (JPG/PNG) of the document, or a smaller PDF.'));
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
    var ok = true;
    try{
      var all = rd(), k = String(email).toLowerCase();
      all[k] = all[k] || {};
      all[k][kind] = { name: doc.name, type: doc.type, size: doc.size, dataUrl: doc.dataUrl, savedAt: new Date().toISOString() };
      localStorage.setItem(KEY, JSON.stringify(all));
    }catch(e){ ok = false; }
    try{
      var db = fs();
      if(db){
        db.collection('tutor_documents').doc(ek(email) + '_' + kind).set({
          email: String(email).toLowerCase(), kind: kind, name: doc.name, type: doc.type, size: doc.size,
          dataUrl: doc.dataUrl, updatedAt: new Date().toISOString()
        }).catch(function(){});
      }
    }catch(e){}
    return ok;
  }

  function loadLocal(email){ return rd()[String(email || '').toLowerCase()] || {}; }

  function load(email){
    var have = loadLocal(email);
    var db = fs();
    if(!db || !email || (have.id && have.cert)) return Promise.resolve(have);
    var need = ['id', 'cert'].filter(function(k){ return !have[k]; });
    return Promise.all(need.map(function(k){
      return db.collection('tutor_documents').doc(ek(email) + '_' + k).get().then(function(s){
        return s && s.exists ? { k: k, d: s.data() } : null;
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
