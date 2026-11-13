const { admin, db } = require('./_firebase');
const { verifyAuth, checkCsrf } = require('./_auth');

module.exports = async function handler(req, res) {
  if (!checkCsrf(req)) {
    return res.status(403).json({ error: 'CSRF validation failed' });
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

  // 2. POST Mark Notification as Read
  if (req.method === 'POST') {
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
};

