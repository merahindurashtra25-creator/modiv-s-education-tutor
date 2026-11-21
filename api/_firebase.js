/**
 * Modiv's Education - Firebase Admin Initialization
 * 
 * Configures and initializes the Firebase Admin SDK singleton for
 * Firestore and Firebase Auth using environment service account credentials.
 */

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

let app;
if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'modivs-education';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const databaseURL = process.env.FIREBASE_DATABASE_URL || 'https://modivs-education-default-rtdb.asia-southeast1.firebasedatabase.app';

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (clientEmail && privateKey) {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey
      }),
      databaseURL
    });
  } else {
    app = initializeApp({
      projectId,
      databaseURL
    });
  }
} else {
  app = getApps()[0];
}

const db = getFirestore(app);
const auth = getAuth(app);

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

const admin = {
  firestore: {
    FieldValue
  }
};

module.exports = { admin, db, auth, messaging, sendPushNotification, FieldValue };
