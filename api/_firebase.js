const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

let app;
if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'modivs-education';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

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
      databaseURL: `https://${projectId}.firebaseio.com`
    });
  } else {
    app = initializeApp({
      projectId,
      databaseURL: `https://${projectId}.firebaseio.com`
    });
  }
} else {
  app = getApps()[0];
}

const db = getFirestore(app);
const auth = getAuth(app);

const admin = {
  firestore: {
    FieldValue
  }
};

module.exports = { admin, db, auth, FieldValue };
