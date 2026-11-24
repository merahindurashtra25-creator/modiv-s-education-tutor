/**
 * Modiv's Education - Backend Firebase Admin Initialization Singleton
 * 
 * Securely initializes and exposes the Firebase Admin SDK for backend
 * Serverless Functions and Cron tasks.
 * 
 * Credentials are strictly read from backend environment variables:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_CLIENT_EMAIL
 * - FIREBASE_PRIVATE_KEY
 * - FIREBASE_DATABASE_URL
 * - FIREBASE_SERVICE_ACCOUNT_KEY (optional JSON string)
 * 
 * Never exposed to frontend code or client bundles.
 */

const fs = require('fs');
const path = require('path');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Auto-load root or local .env if process.env is not already populated (useful in local dev)
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (m && !process.env[m[1]]) {
        let val = (m[2] || '').trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
        process.env[m[1]] = val;
      }
    });
  }
} catch (e) {}

let app;

function getFirebaseAdminApp() {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0];
    return app;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'modivs-education';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const databaseURL = process.env.FIREBASE_DATABASE_URL || 'https://modivs-education-default-rtdb.asia-southeast1.firebasedatabase.app';
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountJson) {
    try {
      let raw = String(serviceAccountJson).trim();
      if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
        raw = raw.slice(1, -1);
      }
      let sa = null;
      if (raw.startsWith('{')) {
        sa = JSON.parse(raw);
      } else {
        try {
          const decoded = Buffer.from(raw, 'base64').toString('utf8');
          if (decoded.trim().startsWith('{')) {
            sa = JSON.parse(decoded);
          }
        } catch (_) {}
      }
      if (sa && sa.private_key) {
        sa.private_key = String(sa.private_key).replace(/\\n/g, '\n');
      }
      if (sa) {
        app = initializeApp({
          credential: cert(sa),
          databaseURL
        });
        return app;
      }
    } catch (e) {
      console.warn('[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', e.message);
    }
  }

  if (privateKey) {
    privateKey = String(privateKey).trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
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
    // Fallback to Application Default Credentials or Project ID (ideal for GCP/Firebase hosting or emulators)
    app = initializeApp({
      projectId,
      databaseURL
    });
  }

  return app;
}

const adminApp = getFirebaseAdminApp();
const db = getFirestore(adminApp);
const auth = getAuth(adminApp);

// Safe callable function wrapper so both admin.auth() and admin.auth work seamlessly
function authFn() {
  return auth;
}
try {
  Object.assign(authFn, auth);
  // Also attach prototypes/methods if not copied by assign
  ['getUser', 'getUserByEmail', 'getUserByPhoneNumber', 'deleteUser', 'deleteUsers', 'createCustomToken', 'verifyIdToken', 'createSessionCookie', 'verifySessionCookie'].forEach(method => {
    if (typeof auth[method] === 'function') {
      authFn[method] = auth[method].bind(auth);
    }
  });
} catch (e) {}

const hasCredentials = Boolean(
  (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) ||
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY
);

const admin = {
  firestore: {
    FieldValue
  },
  app: adminApp,
  db,
  auth: authFn,
  hasCredentials
};

module.exports = {
  admin,
  db,
  auth: authFn,
  FieldValue,
  hasCredentials,
  getFirebaseAdminApp
};
