/**
 * Modiv's Education - Firebase Admin Initialization
 * 
 * Re-exports the unified Firebase Admin SDK singleton from lib/firebase-admin
 * with FCM push notification capabilities for backend functions.
 */

const { admin, db, auth, FieldValue, hasCredentials, getFirebaseAdminApp } = require('../lib/firebase-admin');

const app = getFirebaseAdminApp();

let messaging = null;
try {
  const { getMessaging } = require('firebase-admin/messaging');
  messaging = getMessaging(app);
} catch (e) {}

async function sendPushNotification(recipientEmail, { title, body, actionUrl, tag } = {}) {
  if (!messaging || !recipientEmail) return;
  try {
    const cleanMail = String(recipientEmail).trim().toLowerCase();
    const userDoc = await db.collection('users').doc(cleanMail).get().catch(() => null);
    if (!userDoc || !userDoc.exists) return;
    const userData = userDoc.data() || {};
    const tokens = Array.from(new Set([userData.lastFcmToken, ...(userData.fcmTokens || [])].filter(Boolean)));
    if (!tokens.length) return;
    await messaging.sendEachForMulticast({
      tokens,
      notification: { title: title || "Modiv’s Education Alert", body: body || "You have a new update." },
      data: { url: actionUrl || '/', tag: tag || 'modivs-alert', title: title || '', body: body || '' }
    }).catch(() => {});
  } catch (e) {}
}

module.exports = { admin, db, auth, messaging, sendPushNotification, FieldValue, hasCredentials };
