/**
 * Automated 96-hour (4-day) chat message cleanup script.
 * Scans conversations for messages older than 96 hours and permanently deletes them from Firestore.
 * Idempotent and safe to run periodically as a scheduled job or backend cron.
 */
const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  } catch (err) {
    console.error('Firebase Admin credentials not found. Set GOOGLE_APPLICATION_CREDENTIALS to run standalone.', err.message);
  }
}

async function cleanupExpiredMessages() {
  if (!admin.apps.length) return { success: false, reason: 'Firebase Admin not initialized' };
  const db = admin.firestore();
  const now = new Date();
  console.log(`[${now.toISOString()}] Starting 96-hour chat cleanup...`);

  let deletedCount = 0;
  const conversationsSnap = await db.collection('conversations').get();

  for (const convDoc of conversationsSnap.docs) {
    const convId = convDoc.id;
    const messagesSnap = await db.collection('conversations').doc(convId).collection('messages')
      .where('expiresAt', '<=', now)
      .limit(200)
      .get();

    if (messagesSnap.empty) continue;

    const batch = db.batch();
    messagesSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    await batch.commit();

    // Check if remaining messages exist to refresh lastMessage preview
    const remainingSnap = await db.collection('conversations').doc(convId).collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (remainingSnap.empty) {
      await convDoc.ref.update({
        lastMessage: 'No active messages (chat messages expire after 4 days)',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      const latest = remainingSnap.docs[0].data();
      await convDoc.ref.update({
        lastMessage: latest.text || '',
        lastMessageAt: latest.createdAt || admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }

  console.log(`[${new Date().toISOString()}] Chat cleanup complete. Deleted ${deletedCount} expired message(s).`);
  return { success: true, deletedCount };
}

if (require.main === module) {
  cleanupExpiredMessages()
    .then(res => process.exit(res.success ? 0 : 1))
    .catch(err => {
      console.error('Cleanup failed:', err);
      process.exit(1);
    });
}

module.exports = { cleanupExpiredMessages };
