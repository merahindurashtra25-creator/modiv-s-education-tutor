/**
 * Modiv's Education - Set Master Admin Claims & Permissions Script
 *
 * Sets Firebase Auth custom claim { admin: true }, verifies email,
 * and initializes Firestore records for designated administrators.
 *
 * Usage:
 *   node set-admin-claims.cjs
 *
 * With custom service account:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = "path/to/serviceAccountKey.json"
 *   node set-admin-claims.cjs
 */
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m) {
      let val = (m[2] || '').trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[m[1]] = val;
    }
  });
}

const MASTER_ADMIN_EMAILS = (process.env.MASTER_ADMIN_EMAILS ? process.env.MASTER_ADMIN_EMAILS.split(',') : [
  'happinessaggarwal@gmail.com',
  'divyanshdhimanteam@gmail.com',
  'luxmankumar628@gmail.com'
]).map(e => String(e).trim().toLowerCase()).filter(Boolean);

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
      credential: cert({ projectId, clientEmail, privateKey }),
      databaseURL
    });
  } else {
    try {
      app = initializeApp({
        projectId,
        databaseURL
      });
    } catch (e) {
      console.warn('Initializing default Firebase app:', e.message);
    }
  }
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app);

async function setupAdmins() {
  console.log('========================================================');
  console.log("MODIV'S EDUCATION - ADMIN ACCESS & PERMISSIONS PROVISION");
  console.log('========================================================');
  console.log(`Target Administrators (${MASTER_ADMIN_EMAILS.length}):`);
  MASTER_ADMIN_EMAILS.forEach(em => console.log(` - ${em}`));
  console.log('--------------------------------------------------------');

  for (const email of MASTER_ADMIN_EMAILS) {
    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(email);
        console.log(`\n[FOUND] User in Firebase Auth: ${email} (UID: ${userRecord.uid})`);
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          console.log(`\n[CREATE] Admin user not found in Auth. Creating account for: ${email}`);
          userRecord = await auth.createUser({
            email,
            emailVerified: true,
            displayName: email.split('@')[0] + ' (Admin)'
          });
          console.log(`  ✓ Created user with UID: ${userRecord.uid}`);
        } else {
          throw err;
        }
      }

      // 1. Ensure emailVerified == true
      if (!userRecord.emailVerified) {
        await auth.updateUser(userRecord.uid, { emailVerified: true });
        console.log(`  ✓ Set emailVerified = true for ${email}`);
      } else {
        console.log(`  ✓ emailVerified is already true`);
      }

      // 2. Set custom claim { admin: true }
      await auth.setCustomUserClaims(userRecord.uid, { admin: true });
      console.log(`  ✓ Set custom claim { admin: true } on Auth token for UID: ${userRecord.uid}`);

      // 3. Ensure Firestore accounts doc exists with role: 'admin'
      const accRef = db.collection('accounts').doc(email);
      await accRef.set({
        email,
        name: userRecord.displayName || 'Admin',
        role: 'admin',
        roleName: 'Administrator',
        uid: userRecord.uid,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      console.log(`  ✓ Updated Firestore accounts/${email} with role: admin`);

      // 4. Ensure Firestore users doc exists
      const userRef = db.collection('users').doc(userRecord.uid);
      await userRef.set({
        email,
        name: userRecord.displayName || 'Admin',
        role: 'Admin',
        admin: true,
        uid: userRecord.uid,
        lastLogin: FieldValue.serverTimestamp()
      }, { merge: true });
      console.log(`  ✓ Updated Firestore users/${userRecord.uid} with admin status`);

    } catch (err) {
      console.error(`  ✗ Error setting up admin ${email}:`, err.message);
    }
  }

  console.log('\n========================================================');
  console.log('ADMIN ACCESS PROVISIONING COMPLETE');
  console.log('========================================================');
}

if (require.main === module) {
  setupAdmins().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Fatal admin provisioning error:', err);
    process.exit(1);
  });
}

module.exports = { setupAdmins };
