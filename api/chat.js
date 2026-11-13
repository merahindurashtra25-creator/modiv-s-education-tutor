const { admin, db } = require('./_firebase');
const { verifyAuth, checkCsrf, normalizeEmail } = require('./_auth');

module.exports = async function handler(req, res) {
  if (!checkCsrf(req)) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }

  const user = await verifyAuth(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required for chat' });
  }

  const action = String(req.query.action || req.body.action || '').toLowerCase();
  const callerEmail = user.email;

  // 1. GET Conversations
  if (req.method === 'GET' && (!action || action === 'conversations')) {
    const [tutorSnaps, studentSnaps] = await Promise.all([
      db.collection('conversations').where('tutorEmail', '==', callerEmail).get(),
      db.collection('conversations').where('studentEmail', '==', callerEmail).get()
    ]);

    const convMap = new Map();
    [tutorSnaps, studentSnaps].forEach(snaps => {
      snaps.forEach(doc => {
        const d = doc.data();
        const id = doc.id;
        const isTutor = d.tutorEmail === callerEmail;
        convMap.set(id, {
          id,
          tutorEmail: d.tutorEmail,
          tutorName: d.tutorName,
          tutorId: d.tutorId || d.displayId || '',
          studentEmail: d.studentEmail,
          studentName: d.studentName,
          studentId: d.studentId || d.stuId || '',
          lastMessage: d.lastMessage || '',
          lastMessageTime: d.lastMessageTime || d.updatedAt,
          unreadCount: isTutor ? (Number(d.unreadCountTutor) || 0) : (Number(d.unreadCountStudent) || 0),
          unlocked: Boolean(d.unlocked)
        });
      });
    });

    return res.status(200).json({ conversations: Array.from(convMap.values()) });
  }

  // 2. GET Messages for Conversation
  if (req.method === 'GET' && action === 'messages') {
    const convId = String(req.query.convId || '').trim();
    if (!convId) return res.status(400).json({ error: 'convId is required' });

    const messagesSnap = await db.collection('conversations').doc(convId).collection('messages').orderBy('createdAt', 'asc').limit(100).get();
    const messages = [];
    messagesSnap.forEach(doc => {
      messages.push({ id: doc.id, ...doc.data() });
    });

    return res.status(200).json({ messages });
  }

  // 3. POST Send Message
  if (req.method === 'POST' && action === 'send') {
    const convId = String(req.body.convId || '').trim();
    const text = String(req.body.text || '').trim().slice(0, 2000);
    const recipientEmail = normalizeEmail(req.body.recipientEmail);

    if (!convId || !text) {
      return res.status(400).json({ error: 'convId and text are required' });
    }

    const convRef = db.collection('conversations').doc(convId);
    const msgRef = convRef.collection('messages').doc();
    const now = admin.firestore.FieldValue.serverTimestamp();

    await db.runTransaction(async (transaction) => {
      const convDoc = await transaction.get(convRef);
      const convData = convDoc.exists ? convDoc.data() : {};
      const isCallerTutor = convData.tutorEmail === callerEmail;

      transaction.set(msgRef, {
        id: msgRef.id,
        conversationId: convId,
        senderEmail: callerEmail,
        senderName: user.name,
        recipientEmail: recipientEmail || (isCallerTutor ? convData.studentEmail : convData.tutorEmail),
        text,
        read: false,
        readAt: null,
        createdAt: now
      });

      const updateFields = {
        lastMessage: text,
        lastMessageTime: now,
        updatedAt: now
      };

      if (isCallerTutor) {
        updateFields.unreadCountStudent = admin.firestore.FieldValue.increment(1);
      } else {
        updateFields.unreadCountTutor = admin.firestore.FieldValue.increment(1);
      }

      transaction.set(convRef, updateFields, { merge: true });
    });

    return res.status(200).json({ success: true, messageId: msgRef.id });
  }

  // 4. POST Mark Conversation Read
  if (req.method === 'POST' && action === 'read') {
    const convId = String(req.body.convId || '').trim();
    if (!convId) return res.status(400).json({ error: 'convId is required' });

    const convRef = db.collection('conversations').doc(convId);
    const convDoc = await convRef.get();
    if (convDoc.exists) {
      const d = convDoc.data();
      const isCallerTutor = d.tutorEmail === callerEmail;
      const resetField = isCallerTutor ? { unreadCountTutor: 0 } : { unreadCountStudent: 0 };
      await convRef.set({ ...resetField, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

