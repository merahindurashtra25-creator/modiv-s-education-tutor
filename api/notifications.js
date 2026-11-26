const { admin, db, hasCredentials } = require('./_firebase');
const { verifyAuth, checkCsrf } = require('./_auth');

module.exports = async function handler(req, res) {
  try {
    if (!checkCsrf(req)) {
      return res.status(403).json({ error: 'CSRF validation failed' });
    }

    if (!hasCredentials) {
      return res.status(200).json({ success: true, notifications: [], unreadCount: 0 });
    }

    const user = await verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

  const callerEmail = user.email;

  // 1. GET Notifications
  if (req.method === 'GET') {
    const snap = await db.collection('notifications')
      .where('recipientEmail', '==', callerEmail)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const notifications = [];
    let unreadCount = 0;

    snap.forEach(doc => {
      const d = doc.data();
      if (!d.read) unreadCount++;
      notifications.push({ id: doc.id, ...d });
    });

    return res.status(200).json({ notifications, unreadCount });
  }

  // 2. POST Send Notification (Admin) or Mark Notification as Read
  if (req.method === 'POST') {
    const action = String((req.body && req.body.action) || (req.query && req.query.action) || '').toLowerCase();

    if (action === 'send') {
      if (!user.isAdmin) {
        return res.status(403).json({ error: 'Admin privileges required' });
      }
      const b = req.body || {};
      const type = String(b.type || 'admin_offer').trim();
      const title = String(b.title || '').trim();
      const description = String(b.description || '').trim();
      const actionUrl = String(b.actionUrl || '').trim();
      const target = String(b.target || 'single').trim();
      const targetEmail = String(b.targetEmail || '').trim().toLowerCase();

      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
      }

      const emails = new Set();
      if (target === 'single') {
        if (!targetEmail) return res.status(400).json({ error: 'Target email is required' });
        emails.add(targetEmail);
      } else {
        if (target === 'tutors' || target === 'all') {
          const tutSnap = await db.collection('tutors').get();
          tutSnap.forEach(d => {
            const em = String((d.data() || {}).email || '').trim().toLowerCase();
            if (em) emails.add(em);
          });
        }
        if (target === 'students' || target === 'all') {
          const stuSnap = await db.collection('students').get();
          stuSnap.forEach(d => {
            const em = String((d.data() || {}).email || '').trim().toLowerCase();
            if (em) emails.add(em);
          });
        }
      }

      const emailList = Array.from(emails);
      const now = admin.firestore.FieldValue.serverTimestamp();
      for (let i = 0; i < emailList.length; i += 450) {
        const chunk = emailList.slice(i, i + 450);
        const batch = db.batch();
        chunk.forEach(em => {
          const ref = db.collection('notifications').doc();
          batch.set(ref, {
            id: ref.id,
            recipientEmail: em,
            type,
            title,
            description,
            actionUrl,
            read: false,
            readAt: null,
            senderEmail: callerEmail,
            senderName: "Modiv's Administration",
            createdAt: now,
            updatedAt: now
          });
        });
        await batch.commit();
      }
      return res.status(200).json({ success: true, count: emailList.length, type, target });
    }

    const notifId = String(req.body.id || req.query.id || '').trim();
    const markAll = Boolean(req.body.all || req.query.all);

    if (markAll) {
      const snap = await db.collection('notifications')
        .where('recipientEmail', '==', callerEmail)
        .where('read', '==', false)
        .get();

      const batch = db.batch();
      snap.forEach(doc => {
        batch.set(doc.ref, { read: true, readAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      });
      await batch.commit();
      return res.status(200).json({ success: true, count: snap.size });
    }

    if (notifId) {
      const notifRef = db.collection('notifications').doc(notifId);
      const notifDoc = await notifRef.get();
      if (notifDoc.exists && notifDoc.data().recipientEmail === callerEmail) {
        await notifRef.set({ read: true, readAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      }
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'id or all=true is required' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (fatalErr) {
    console.error('[notifications] Fatal error caught:', fatalErr);
    return res.status(500).json({ error: fatalErr.message || 'Internal server error' });
  }
};

