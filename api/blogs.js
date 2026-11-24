const { admin, db, hasCredentials } = require('./_firebase');
const { verifyAuth, checkCsrf } = require('./_auth');

function toSlug(t) {
  return String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function makeExcerpt(body) {
  const t = String(body || '').replace(/^#+\s*/gm, '').replace(/^[-*]\s+/gm, '').replace(/\s+/g, ' ').trim();
  return t.length > 170 ? t.slice(0, 167).replace(/\s+\S*$/, '') + '…' : t;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!hasCredentials) {
    if (req.method === 'GET') {
      return res.status(200).json({ success: true, blogs: [] });
    }
    return res.status(200).json({ success: true, message: 'Server credentials not configured' });
  }

  // GET: Public or author blog listing
  if (req.method === 'GET') {
    try {
      const authorUid = req.query.authorUid ? String(req.query.authorUid).trim() : '';
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 60));

      let query = db.collection('blogs').orderBy('createdAt', 'desc');
      if (authorUid) {
        query = db.collection('blogs').where('authorUid', '==', authorUid);
      }

      const snap = await query.limit(limit).get();
      const blogs = [];
      snap.forEach(doc => {
        const d = doc.data() || {};
        blogs.push({
          id: doc.id,
          slug: d.slug || toSlug(d.title || ''),
          title: d.title || '',
          category: d.category || '',
          excerpt: d.excerpt || '',
          body: d.body || '',
          authorName: d.authorName || 'Tutor',
          authorUid: d.authorUid || '',
          read: d.read || 1,
          date: d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : (d.createdAt || new Date().toISOString())
        });
      });
      return res.status(200).json({ success: true, blogs });
    } catch (err) {
      console.error('API blogs GET error:', err);
      return res.status(500).json({ error: 'Could not fetch blogs' });
    }
  }

  // POST: Publish blog (tutor or admin) without requiring password prompt
  if (req.method === 'POST') {
    if (!checkCsrf(req)) {
      return res.status(403).json({ error: 'CSRF validation failed' });
    }

    const user = await verifyAuth(req);
    const bodyData = req.body || {};
    const title = String(bodyData.title || '').trim();
    const body = String(bodyData.body || '').trim();
    const category = String(bodyData.category || '').trim();
    const authorName = String(bodyData.authorName || (user && user.name) || 'Tutor').trim().slice(0, 80);
    const authorUid = (user && user.uid) || String(bodyData.authorUid || bodyData.authorEmail || (user && user.email) || 'tutor').toLowerCase();

    if (title.length < 5 || title.length > 150) {
      return res.status(400).json({ error: 'Title must be between 5 and 150 characters.' });
    }
    if (body.length < 100 || body.length > 20000) {
      return res.status(400).json({ error: 'Body must be between 100 and 20,000 characters.' });
    }
    if (!category) {
      return res.status(400).json({ error: 'Category is required.' });
    }

    try {
      const now = new Date();
      const y = now.getUTCFullYear();
      const m = now.getUTCMonth() + 1;
      const qid = `${authorUid}_${y}_${m}`;
      const slug = toSlug(title);
      const words = body.split(/\s+/).length;
      const readMinutes = Math.max(1, Math.round(words / 200));

      const quotaRef = db.collection('blog_quota').doc(qid);
      const quotaDoc = await quotaRef.get();
      const currentCount = quotaDoc.exists ? (Number(quotaDoc.data().count) || 0) : 0;
      const nextCount = currentCount + 1;
      const blogId = `${qid}_${nextCount}`;

      const batch = db.batch();
      batch.set(quotaRef, { uid: authorUid, count: nextCount, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      batch.set(db.collection('blogs').doc(blogId), {
        authorUid,
        authorName,
        title,
        category,
        excerpt: makeExcerpt(body),
        body,
        slug,
        read: readMinutes,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      await batch.commit();
      return res.status(200).json({ success: true, blogId, slug });
    } catch (err) {
      console.error('API blogs POST error:', err);
      return res.status(500).json({ error: err.message || 'Could not publish blog' });
    }
  }

  // DELETE: Delete blog
  if (req.method === 'DELETE' || (req.method === 'POST' && req.body && req.body._method === 'DELETE')) {
    const id = String(req.query.id || (req.body && req.body.id) || '').trim();
    if (!id) return res.status(400).json({ error: 'Blog ID is required.' });

    try {
      await db.collection('blogs').doc(id).delete();
      return res.status(200).json({ success: true, id });
    } catch (err) {
      console.error('API blogs DELETE error:', err);
      return res.status(500).json({ error: 'Could not delete blog' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
