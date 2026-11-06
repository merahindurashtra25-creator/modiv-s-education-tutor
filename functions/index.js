const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

const MASTER_ADMIN_EMAILS = [
  'happinessaggarwal@gmail.com',
  'divyanshdhimanteam@gmail.com'
];

const normalizeEmail = email => String(email || '').trim().toLowerCase();

/**
 * Validates whether context caller is a verified admin
 */
function isCallerAdmin(context) {
  if (!context.auth) return false;
  if (context.auth.token && context.auth.token.admin === true) return true;
  const callerEmail = normalizeEmail(context.auth.token.email);
  return Boolean(
    context.auth.token.email_verified &&
    MASTER_ADMIN_EMAILS.includes(callerEmail)
  );
}

/**
 * Cloud Function (Callable): registerAccount
 * Performs secure atomic transaction on `accounts/{email}`.
 * Verifies email uniqueness across all roles.
 */
exports.registerAccount = functions.https.onCall(async (data, context) => {
  const email = normalizeEmail(data.email);
  const role = String(data.role || '').toLowerCase(); // 'student' | 'tutor' | 'user'
  const name = String(data.name || email.split('@')[0]).trim().slice(0, 100);
  const phone = String(data.phone || '').trim().slice(0, 30);
  const location = (typeof data.location === 'object' && data.location !== null) ? data.location : {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid email address is required.');
  }

  if (!['student', 'tutor', 'user'].includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Role must be student, tutor, or user.');
  }

  const accountRef = db.collection('accounts').doc(email);

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(accountRef);
      if (doc.exists) {
        const existingData = doc.data() || {};
        const existingRole = existingData.role || 'user';
        const roleNames = { student: 'Student', tutor: 'Tutor', user: 'General User' };
        throw new functions.https.HttpsError(
          'already-exists',
          `This email address is already registered as a ${roleNames[existingRole] || existingRole}. Please log in using your existing account.`,
          { existingRole, existingRoleName: roleNames[existingRole] || existingRole }
        );
      }

      const roleDisplay = role === 'student' ? 'Student / Parent' : (role === 'tutor' ? 'Tutor' : 'General User');
      const accountData = {
        email,
        role,
        roleName: roleDisplay,
        name,
        phone,
        location,
        city: location.city ? String(location.city).slice(0, 80) : '',
        area: location.area ? String(location.area).slice(0, 80) : '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      transaction.set(accountRef, accountData);

      if (context.auth && context.auth.uid) {
        const userRef = db.collection('users').doc(context.auth.uid);
        transaction.set(userRef, {
          email,
          role: roleDisplay,
          roleKey: role,
          name,
          phone,
          location,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      return { success: true, email, role };
    });
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Cloud Function (Callable): checkEmailUniqueness
 * Checks if email is registered under accounts, users, tutors, or students.
 */
exports.checkEmailUniqueness = functions.https.onCall(async (data) => {
  const email = normalizeEmail(data && data.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { exists: false };
  }

  const accDoc = await db.collection('accounts').doc(email).get();
  if (accDoc.exists) {
    const d = accDoc.data();
    return { exists: true, email, role: d.role, roleName: d.roleName };
  }

  const userQuery = await db.collection('users').where('email', '==', email).limit(1).get();
  if (!userQuery.empty) {
    const ud = userQuery.docs[0].data();
    const roleKey = ud.roleKey || (ud.role && ud.role.toLowerCase().includes('tutor') ? 'tutor' : 'student');
    return { exists: true, email, role: roleKey, roleName: ud.role };
  }

  return { exists: false, email };
});

/**
 * Cloud Function (Callable): setAdminClaim
 * Sets Firebase Auth custom claim { admin: true } on designated admin accounts.
 * Restricts invocation to existing authenticated verified administrators.
 */
exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  if (!isCallerAdmin(context)) {
    throw new functions.https.HttpsError('permission-denied', 'Only verified administrators can assign admin claims.');
  }

  const targetEmail = normalizeEmail(data && data.email);
  if (!targetEmail || !MASTER_ADMIN_EMAILS.includes(targetEmail)) {
    throw new functions.https.HttpsError('invalid-argument', 'Target email is not an authorized administrator.');
  }

  try {
    const userRecord = await auth.getUserByEmail(targetEmail);
    await auth.setCustomUserClaims(userRecord.uid, { admin: true });
    return { success: true, message: `Admin claim set for ${targetEmail}` };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Cloud Function (Callable): getAdminStatus
 * Cryptographically verifies caller's token and returns whether they possess admin rights.
 */
exports.getAdminStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    return { isAdmin: false, reason: 'unauthenticated' };
  }
  const callerEmail = normalizeEmail(context.auth.token.email);
  const isAdmin = isCallerAdmin(context);
  return {
    isAdmin,
    email: callerEmail,
    emailVerified: Boolean(context.auth.token.email_verified)
  };
});

/**
 * Cloud Function (Callable): secureUnlockLead
 * Handles server-side validation and atomic deduction for lead unlocking.
 */
exports.secureUnlockLead = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to unlock leads.');
  }

  const tutorEmail = normalizeEmail(context.auth.token.email);
  if (!tutorEmail) {
    throw new functions.https.HttpsError('failed-precondition', 'Authenticated user has no verified email.');
  }

  const leadId = String(data && data.leadId || '').replace(/[\/\\#?]/g, '_').trim();
  const leadName = String(data && data.leadName || '').trim().slice(0, 100);
  const cost = Number(data && data.cost) || 10;

  if (!leadId) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid leadId is required.');
  }

  const docKey = tutorEmail.replace(/[^a-z0-9_-]/g, '_');
  const walletRef = db.collection('tutor_wallets').doc(docKey);
  const unlockRef = db.collection('unlocks').doc(`${docKey}__${leadId}`);
  const txRef = db.collection('coin_transactions').doc();

  return await db.runTransaction(async (transaction) => {
    const [walletDoc, unlockDoc] = await Promise.all([
      transaction.get(walletRef),
      transaction.get(unlockRef)
    ]);

    if (unlockDoc.exists) {
      const curCoins = walletDoc.exists ? (Number(walletDoc.data().coins) || 0) : 0;
      return { already: true, balance: curCoins };
    }

    const walletData = walletDoc.exists ? walletDoc.data() : {};
    const mem = walletData.membership;
    const isMemValid = Boolean(
      mem &&
      mem.status === 'active' &&
      mem.validUntil &&
      new Date(mem.validUntil).getTime() > Date.now()
    );

    if (!isMemValid) {
      throw new functions.https.HttpsError('failed-precondition', 'An active membership plan is required to unlock leads.');
    }

    const cur = Number(walletData.coins) || 0;
    if (cur < cost) {
      throw new functions.https.HttpsError('failed-precondition', `Insufficient coins. You have ${cur}, need ${cost}.`);
    }

    const next = cur - cost;
    transaction.set(walletRef, { tutorEmail, coins: next, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(txRef, {
      tutorEmail,
      amount: -cost,
      balanceAfter: next,
      type: 'unlock',
      leadId,
      description: `Unlocked lead ${leadName || leadId}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    transaction.set(unlockRef, {
      id: `${docKey}__${leadId}`,
      type: 'unlock',
      tutorEmail,
      tutor_id: tutorEmail,
      leadId,
      lead_id: leadId,
      leadName: leadName || '',
      unlock_status: 'unlocked',
      coinsDeducted: cost,
      coins_deducted: cost,
      transaction_id: txRef.id,
      unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
      unlocked_at: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, already: false, balance: next };
  });
});
