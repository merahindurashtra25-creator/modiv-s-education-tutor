const admin = require('firebase-admin');

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'modivs-education';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      }),
      databaseURL: `https://${projectId}.firebaseio.com`
    });
  } else {
    // Falls back to Application Default Credentials or default emulator config
    admin.initializeApp({
      projectId,
      databaseURL: `https://${projectId}.firebaseio.com`
    });
  }
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };

