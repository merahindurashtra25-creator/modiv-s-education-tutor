const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

const normalizeEmail = email => String(email || '').trim().toLowerCase();

/**
 * Cloud Function (Callable): registerAccount
 * Performs secure atomic transaction on `accounts/{email}`.
 * Verifies email uniqueness across all roles.
 */
exports.registerAccount = functions.https.onCall(async (data, context) => {
  const email = normalizeEmail(data.email);
  const role = String(data.role || '').toLowerCase(); // 'student' | 'tutor' | 'user'
  const name = data.name || email.split('@')[0];
  const phone = data.phone || '';
  const location = data.location || {};

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
        city: location.city || '',
        area: location.area || '',
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
  const email = normalizeEmail(data.email);
  if (!email) return { exists: false };

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

