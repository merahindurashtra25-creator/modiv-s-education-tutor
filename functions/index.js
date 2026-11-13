const functions = require('firebase-functions');
const admin = require('firebase-admin');
const https = require('https');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_live_TwTMFGYwNbt9BA';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

const MASTER_ADMIN_EMAILS = process.env.MASTER_ADMIN_EMAILS
  ? process.env.MASTER_ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase())
  : [
      'happinessaggarwal@gmail.com',
      'divyanshdhimanteam@gmail.com',
      'luxmankumar628@gmail.com'
    ];

const normalizeEmail = email => String(email || '').trim().toLowerCase();

const ID_KIND_CONFIG = {
  tut: { prefix: 'TUT', start: 301 },
  stu: { prefix: 'STU', start: 101 },
  ld:  { prefix: 'LD',  start: 201 }
};

/**
 * Atomically retrieves or allocates the next sequential display ID within a transaction.
 */
async function allocateDisplayIdTx(transaction, kind, key) {
  const cfg = ID_KIND_CONFIG[kind];
  if (!cfg) throw new Error('Invalid ID kind: ' + kind);
  const cleanKey = String(key || '').trim().toLowerCase();
  const mapDocId = `${kind}_${cleanKey.replace(/[\/\\#?\[\]*]/g, '_')}`;
  const mapRef = db.collection('display_ids').doc(mapDocId);
  const counterRef = db.collection('counters').doc('display_ids');

  const [mapSnap, counterSnap] = await Promise.all([
    transaction.get(mapRef),
    transaction.get(counterRef)
  ]);

  if (mapSnap.exists && mapSnap.data().id) {
    return mapSnap.data().id;
  }

  const counterData = counterSnap.exists ? (counterSnap.data() || {}) : {};
  const curNum = Number(counterData[kind]) || (cfg.start - 1);
  const nextNum = Math.max(curNum + 1, cfg.start);
  const displayId = `${cfg.prefix}${nextNum}`;

  transaction.set(counterRef, { [kind]: nextNum }, { merge: true });
  transaction.set(mapRef, {
    id: displayId,
    kind,
    key: cleanKey,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return displayId;
}

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
 * Verifies email uniqueness across all roles and allocates permanent display ID.
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

      let displayId = '';
      if (role === 'tutor') {
        displayId = await allocateDisplayIdTx(transaction, 'tut', email);
        accountData.displayId = displayId;
        accountData.tutId = displayId;
        const tutorId = `t_user_${email.replace(/[^a-z0-9]/gi, '_')}`;
        transaction.set(db.collection('tutors').doc(tutorId), {
          id: tutorId,
          email,
          name,
          phone,
          city: accountData.city,
          area: accountData.area,
          location,
          displayId,
          tutId: displayId,
          uid: (context.auth && context.auth.uid) || '',
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } else if (role === 'student') {
        displayId = await allocateDisplayIdTx(transaction, 'stu', email);
        accountData.displayId = displayId;
        accountData.stuId = displayId;
        const studentId = `stu_${email.replace(/[^a-z0-9]/gi, '_')}`;
        transaction.set(db.collection('students').doc(studentId), {
          id: studentId,
          email,
          name,
          phone,
          city: accountData.city,
          area: accountData.area,
          location,
          displayId,
          stuId: displayId,
          uid: (context.auth && context.auth.uid) || '',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

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
          displayId: displayId || '',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      return { success: true, email, role, displayId };
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

    // Also mark matching conversation and lead unlocked in Firestore
    try {
      const cleanLeadId = leadId.replace(/^conv_/, '');
      const unlockPayload = {
        unlocked: true,
        unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
        unlockedBy: tutorEmail,
        status: 'unlocked'
      };

      const queries = [
        db.collection('conversations').where('enquiry_id', '==', leadId).where('tutorEmail', '==', tutorEmail).get(),
        db.collection('conversations').where('enquiryId', '==', leadId).where('tutorEmail', '==', tutorEmail).get(),
        db.collection('conversations').where('id', '==', cleanLeadId).where('tutorEmail', '==', tutorEmail).get(),
        db.collection('conversations').where('conversation_id', '==', cleanLeadId).where('tutorEmail', '==', tutorEmail).get()
      ];
      if (leadId !== cleanLeadId) {
        queries.push(db.collection('conversations').where('enquiry_id', '==', cleanLeadId).where('tutorEmail', '==', tutorEmail).get());
        queries.push(db.collection('conversations').where('enquiryId', '==', cleanLeadId).where('tutorEmail', '==', tutorEmail).get());
      }

      const snaps = await Promise.all(queries);
      snaps.forEach(snap => {
        snap.forEach(docSnap => {
          transaction.set(docSnap.ref, unlockPayload, { merge: true });
        });
      });

      const convDoc = await db.collection('conversations').doc(cleanLeadId).get();
      if (convDoc.exists) {
        transaction.set(convDoc.ref, unlockPayload, { merge: true });
      }

      const leadDoc = await db.collection('leads').doc(cleanLeadId).get();
      if (leadDoc.exists) {
        const leadData = leadDoc.data() || {};
        transaction.set(leadDoc.ref, {
          unlocked: true,
          unlockedBy: tutorEmail,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Record activity notifications for both student and tutor
        const studentEmail = normalizeEmail(leadData.email || leadData.studentEmail || leadData.owner_email);
        if (studentEmail) {
          const studentNotifRef = db.collection('notifications').doc();
          transaction.set(studentNotifRef, {
            id: studentNotifRef.id,
            recipientEmail: studentEmail,
            recipientRole: 'student',
            type: 'lead_unlock',
            title: 'Lead Unlocked',
            description: 'A tutor has unlocked your tuition enquiry for ' + (leadData.cls || 'tuition') + '.',
            leadId: cleanLeadId,
            targetTab: 'enquiries',
            senderEmail: tutorEmail,
            read: false,
            readAt: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
        const tutorNotifRef = db.collection('notifications').doc();
        transaction.set(tutorNotifRef, {
          id: tutorNotifRef.id,
          recipientEmail: tutorEmail,
          recipientRole: 'tutor',
          type: 'lead_unlock',
          title: 'Lead Unlocked',
          description: 'You unlocked student lead ' + (leadName || cleanLeadId) + '.',
          leadId: cleanLeadId,
          targetTab: 'leads',
          senderEmail: tutorEmail,
          read: false,
          readAt: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (cErr) {
      // Non-fatal if conversation is initialized later
    }

    return { success: true, already: false, balance: next };
  });
});

/**
 * Cloud Function (Callable): createRazorpayOrder
 * Creates an official order with Razorpay Orders API.
 */
exports.createRazorpayOrder = functions.https.onCall(async (data, context) => {
  const amount = Number(data && data.amount); // in paise
  const currency = String(data && data.currency || 'INR').toUpperCase();
  const receipt = String(data && data.receipt || ('rcpt_' + Date.now().toString(36)));
  const notes = (typeof data.notes === 'object' && data.notes !== null) ? data.notes : {};

  if (!amount || amount <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid amount in paise is required.');
  }

  if (!RAZORPAY_KEY_SECRET) {
    throw new functions.https.HttpsError('failed-precondition', 'Payment gateway credentials are not configured on the server.');
  }

  const postData = JSON.stringify({
    amount: Math.round(amount),
    currency,
    receipt,
    notes
  });

  const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.razorpay.com',
      port: 443,
      path: '/v1/orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': authHeader
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              orderId: parsed.id,
              amount: parsed.amount,
              currency: parsed.currency,
              receipt: parsed.receipt,
              keyId: RAZORPAY_KEY_ID
            });
          } else {
            reject(new functions.https.HttpsError('internal', (parsed.error && parsed.error.description) || 'Failed to create Razorpay order'));
          }
        } catch (e) {
          reject(new functions.https.HttpsError('internal', 'Invalid response from Razorpay API'));
        }
      });
    });

    req.on('error', (e) => {
      reject(new functions.https.HttpsError('internal', e.message));
    });

    req.write(postData);
    req.end();
  });
});

/**
 * Cloud Function (Callable): verifyRazorpaySignature
 * Verifies authenticity of Razorpay payment signature using HMAC SHA256.
 */
exports.verifyRazorpaySignature = functions.https.onCall(async (data, context) => {
  const orderId = String(data && data.orderId || '').trim();
  const paymentId = String(data && data.paymentId || '').trim();
  const signature = String(data && data.signature || '').trim();

  if (!orderId || !paymentId || !signature) {
    throw new functions.https.HttpsError('invalid-argument', 'orderId, paymentId, and signature are required.');
  }

  if (!RAZORPAY_KEY_SECRET) {
    throw new functions.https.HttpsError('failed-precondition', 'Payment verification credentials are not configured on the server.');
  }

  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const isValid = expectedSignature === signature;

  if (isValid) {
    await db.collection('verified_payments').doc(paymentId).set({
      paymentId,
      orderId,
      verified: true,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      userEmail: context.auth && context.auth.token ? (context.auth.token.email || '') : ''
    }, { merge: true });
  }

  return { verified: isValid, paymentId, orderId };
});

/**
 * Cloud Function (Callable): getOrAssignDisplayId
 * Atomically retrieves or allocates the next sequential display ID for an account.
 */
exports.getOrAssignDisplayId = functions.https.onCall(async (data, context) => {
  const kind = String(data && data.kind || '').toLowerCase(); // 'tut' | 'stu' | 'ld'
  const key = normalizeEmail(data && data.key || (context.auth && context.auth.token && context.auth.token.email) || '');

  if (!['tut', 'stu', 'ld'].includes(kind)) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid kind (tut, stu, ld) is required.');
  }
  if (!key) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid key is required.');
  }

  return await db.runTransaction(async (transaction) => {
    const id = await allocateDisplayIdTx(transaction, kind, key);
    return { id, kind, key };
  });
});

/**
 * Cloud Function (Callable): adminUpdateDisplayId
 * Allows verified administrators to edit or reassign a Tutor ID or Student ID.
 * Enforces uniqueness, updates display_ids, target collection (tutors/students),
 * accounts, and users.
 */
exports.adminUpdateDisplayId = functions.https.onCall(async (data, context) => {
  if (!isCallerAdmin(context)) {
    throw new functions.https.HttpsError('permission-denied', 'Only verified administrators can edit display IDs.');
  }

  const kind = String(data && data.kind || '').toLowerCase(); // 'tut' | 'stu'
  const key = normalizeEmail(data && data.key || '');
  const newId = String(data && data.newId || '').trim().toUpperCase();
  const docId = String(data && data.docId || '').trim();

  if (!['tut', 'stu'].includes(kind)) {
    throw new functions.https.HttpsError('invalid-argument', 'Kind must be tut or stu.');
  }
  if (!key && !docId) {
    throw new functions.https.HttpsError('invalid-argument', 'Email or docId is required.');
  }
  if (!newId) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid new display ID is required.');
  }

  const expectedPrefix = kind === 'tut' ? 'TUT' : 'STU';
  if (!newId.startsWith(expectedPrefix)) {
    throw new functions.https.HttpsError('invalid-argument', `ID must start with ${expectedPrefix}.`);
  }

  // Check uniqueness across display_ids
  const existingWithId = await db.collection('display_ids').where('id', '==', newId).limit(1).get();
  if (!existingWithId.empty) {
    const existingDoc = existingWithId.docs[0].data();
    if (normalizeEmail(existingDoc.key) !== key) {
      throw new functions.https.HttpsError('already-exists', `ID ${newId} is already assigned to ${existingDoc.key || 'another account'}.`);
    }
  }

  const batch = db.batch();
  const mapKey = `${kind}_${key.replace(/[\/\\#?\[\]*]/g, '_')}`;
  const mapRef = db.collection('display_ids').doc(mapKey);

  batch.set(mapRef, {
    id: newId,
    kind,
    key,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: normalizeEmail(context.auth && context.auth.token ? context.auth.token.email : '')
  }, { merge: true });

  const targetColl = kind === 'tut' ? 'tutors' : 'students';
  const idField = kind === 'tut' ? 'tutId' : 'stuId';

  if (docId) {
    batch.set(db.collection(targetColl).doc(docId), {
      displayId: newId,
      [idField]: newId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  if (key) {
    const canonicalId = kind === 'tut' ? ('t_user_' + key.replace(/[^a-z0-9]/gi, '_')) : ('stu_' + key.replace(/[^a-z0-9]/gi, '_'));
    batch.set(db.collection(targetColl).doc(canonicalId), {
      displayId: newId,
      [idField]: newId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    const targetQuery = await db.collection(targetColl).where('email', '==', key).get();
    targetQuery.forEach(d => {
      batch.set(d.ref, {
        displayId: newId,
        [idField]: newId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    batch.set(db.collection('accounts').doc(key), {
      displayId: newId,
      [idField]: newId
    }, { merge: true });

    const userQuery = await db.collection('users').where('email', '==', key).get();
    userQuery.forEach(u => {
      batch.set(u.ref, {
        displayId: newId,
        [idField]: newId
      }, { merge: true });
    });
  }

  const numMatch = new RegExp(`^${expectedPrefix}(\\d+)$`).exec(newId);
  if (numMatch) {
    const newNum = parseInt(numMatch[1], 10);
    const counterRef = db.collection('counters').doc('display_ids');
    const counterSnap = await counterRef.get();
    const curNum = counterSnap.exists ? (Number(counterSnap.data()[kind]) || 0) : 0;
    if (newNum > curNum) {
      batch.set(counterRef, { [kind]: newNum }, { merge: true });
    }
  }

  await batch.commit();
  return { success: true, id: newId, key, kind };
});

/**
 * Core ID migration engine: audit all existing tutors and students in Firestore.
 * Preserves existing valid unique IDs, assigns sequential permanent IDs to missing ones,
 * updates display_ids, tutors, students, users, accounts, and counters.
 */
async function runDisplayIdMigration() {
  const report = {
    tutors: { total: 0, existingValid: 0, assigned: 0, nextAvailable: 'TUT301', assignedList: [] },
    students: { total: 0, existingValid: 0, assigned: 0, nextAvailable: 'STU101', assignedList: [] },
    conflicts: [],
    errors: []
  };

  const counterRef = db.collection('counters').doc('display_ids');
  const counterSnap = await counterRef.get();
  const counters = counterSnap.exists ? (counterSnap.data() || {}) : {};

  const displayIdsSnap = await db.collection('display_ids').get();
  const existingMap = new Map();
  const assignedIds = new Set();

  displayIdsSnap.forEach(doc => {
    const d = doc.data() || {};
    if (d.id && d.key) {
      existingMap.set(`${d.kind || ''}_${String(d.key).toLowerCase()}`, d.id);
      assignedIds.add(d.id);
    }
  });

  let maxTut = Math.max(300, Number(counters.tut) || 300);
  let maxStu = Math.max(100, Number(counters.stu) || 100);

  assignedIds.forEach(id => {
    const tutMatch = /^TUT(\d+)$/.exec(id);
    if (tutMatch) maxTut = Math.max(maxTut, parseInt(tutMatch[1], 10));
    const stuMatch = /^STU(\d+)$/.exec(id);
    if (stuMatch) maxStu = Math.max(maxStu, parseInt(stuMatch[1], 10));
  });

  // 1. Audit and Migrate Tutors
  const tutorsSnap = await db.collection('tutors').get();
  report.tutors.total = tutorsSnap.size;
  const tutorsList = [];

  tutorsSnap.forEach(doc => {
    const d = doc.data() || {};
    d._docId = doc.id;
    tutorsList.push(d);
  });

  tutorsList.sort((a, b) => {
    const ta = new Date(a.createdAt || a.submitted_at || a.created_at || 0).getTime();
    const tb = new Date(b.createdAt || b.submitted_at || b.created_at || 0).getTime();
    return ta - tb;
  });

  let batch = db.batch();
  let batchOps = 0;
  const commitBatchIfFull = async () => {
    if (batchOps >= 450) {
      await batch.commit();
      batch = db.batch();
      batchOps = 0;
    }
  };

  for (const t of tutorsList) {
    const email = normalizeEmail(t.email || t.id);
    const key = `tut_${email.replace(/[\/\\#?\[\]*]/g, '_')}`;
    let existingId = t.displayId || t.tutId || existingMap.get(key) || '';

    const isValid = /^TUT\d+$/.test(existingId);
    if (isValid) {
      report.tutors.existingValid++;
      maxTut = Math.max(maxTut, parseInt(existingId.replace('TUT', ''), 10));
      if (!t.displayId || !t.tutId) {
        batch.set(db.collection('tutors').doc(t._docId), { displayId: existingId, tutId: existingId }, { merge: true });
        batchOps++;
      }
      if (!existingMap.has(key)) {
        batch.set(db.collection('display_ids').doc(key), { id: existingId, kind: 'tut', key: email, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        existingMap.set(key, existingId);
        batchOps++;
      }
    } else {
      maxTut++;
      while (assignedIds.has(`TUT${maxTut}`)) {
        maxTut++;
      }
      const newId = `TUT${maxTut}`;
      assignedIds.add(newId);
      existingMap.set(key, newId);

      batch.set(db.collection('tutors').doc(t._docId), { displayId: newId, tutId: newId }, { merge: true });
      batch.set(db.collection('display_ids').doc(key), { id: newId, kind: 'tut', key: email, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      if (email) {
        batch.set(db.collection('accounts').doc(email), { displayId: newId, tutId: newId }, { merge: true });
      }
      if (t.uid) {
        batch.set(db.collection('users').doc(t.uid), { displayId: newId }, { merge: true });
      }
      batchOps += 4;

      report.tutors.assigned++;
      report.tutors.assignedList.push({ email, docId: t._docId, id: newId });
    }
    await commitBatchIfFull();
  }

  // 2. Audit and Migrate Students
  const studentsSnap = await db.collection('students').get();
  report.students.total = studentsSnap.size;
  const studentsList = [];

  studentsSnap.forEach(doc => {
    const d = doc.data() || {};
    d._docId = doc.id;
    studentsList.push(d);
  });

  studentsList.sort((a, b) => {
    const ta = new Date(a.createdAt || a.registered_at || a.created_at || 0).getTime();
    const tb = new Date(b.createdAt || b.registered_at || b.created_at || 0).getTime();
    return ta - tb;
  });

  for (const s of studentsList) {
    const email = normalizeEmail(s.email || s.id);
    const key = `stu_${email.replace(/[\/\\#?\[\]*]/g, '_')}`;
    let existingId = s.displayId || s.stuId || existingMap.get(key) || '';

    const isValid = /^STU\d+$/.test(existingId);
    if (isValid) {
      report.students.existingValid++;
      maxStu = Math.max(maxStu, parseInt(existingId.replace('STU', ''), 10));
      if (!s.displayId || !s.stuId) {
        batch.set(db.collection('students').doc(s._docId), { displayId: existingId, stuId: existingId }, { merge: true });
        batchOps++;
      }
      if (!existingMap.has(key)) {
        batch.set(db.collection('display_ids').doc(key), { id: existingId, kind: 'stu', key: email, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        existingMap.set(key, existingId);
        batchOps++;
      }
    } else {
      maxStu++;
      while (assignedIds.has(`STU${maxStu}`)) {
        maxStu++;
      }
      const newId = `STU${maxStu}`;
      assignedIds.add(newId);
      existingMap.set(key, newId);

      batch.set(db.collection('students').doc(s._docId), { displayId: newId, stuId: newId }, { merge: true });
      batch.set(db.collection('display_ids').doc(key), { id: newId, kind: 'stu', key: email, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      if (email) {
        batch.set(db.collection('accounts').doc(email), { displayId: newId, stuId: newId }, { merge: true });
      }
      if (s.uid) {
        batch.set(db.collection('users').doc(s.uid), { displayId: newId }, { merge: true });
      }
      batchOps += 4;

      report.students.assigned++;
      report.students.assignedList.push({ email, docId: s._docId, id: newId });
    }
    await commitBatchIfFull();
  }

  // 3. Update ID Counters
  batch.set(counterRef, { tut: maxTut, stu: maxStu }, { merge: true });
  batchOps++;

  if (batchOps > 0) {
    await batch.commit();
  }

  report.tutors.nextAvailable = `TUT${maxTut + 1}`;
  report.students.nextAvailable = `STU${maxStu + 1}`;
  return report;
}

/**
 * Cloud Function (Callable): migrateDisplayIds
 * Performs complete idempotent audit and migration of all existing Tutors and Students.
 */
exports.migrateDisplayIds = functions.https.onCall(async (data, context) => {
  if (!isCallerAdmin(context)) {
    throw new functions.https.HttpsError('permission-denied', 'Only verified administrators can run ID migration.');
  }
  return await runDisplayIdMigration();
});

exports.runDisplayIdMigration = runDisplayIdMigration;

/**
 * Cloud Function (Callable): adminSendNotification
 * Allows verified administrators to send special offers or announcements
 * to individual users or broadcast to groups (tutors, students, all).
 */
exports.adminSendNotification = functions.https.onCall(async (data, context) => {
  if (!isCallerAdmin(context)) {
    throw new functions.https.HttpsError('permission-denied', 'Only verified administrators can send platform notifications.');
  }

  const type = String(data && data.type || 'admin_offer').trim(); // 'admin_offer' | 'announcement'
  const title = String(data && data.title || '').trim();
  const description = String(data && data.description || '').trim();
  const actionUrl = String(data && data.actionUrl || '').trim();
  const target = String(data && data.target || 'single').trim(); // 'single' | 'tutors' | 'students' | 'all'
  const targetEmail = normalizeEmail(data && data.targetEmail || '');

  if (!title || !description) {
    throw new functions.https.HttpsError('invalid-argument', 'Title and description are required.');
  }

  const adminEmail = normalizeEmail(context.auth && context.auth.token ? context.auth.token.email : '');
  const now = admin.firestore.FieldValue.serverTimestamp();

  if (target === 'single') {
    if (!targetEmail) {
      throw new functions.https.HttpsError('invalid-argument', 'Target email is required for individual notifications.');
    }
    const notifRef = db.collection('notifications').doc();
    await notifRef.set({
      id: notifRef.id,
      recipientEmail: targetEmail,
      type,
      title,
      description,
      actionUrl,
      read: false,
      readAt: null,
      senderEmail: adminEmail,
      senderName: "Modiv's Administration",
      createdAt: now,
      updatedAt: now
    });
    return { success: true, count: 1, type, target: targetEmail };
  }

  // Broadcast
  let emails = new Set();
  if (target === 'tutors' || target === 'all') {
    const tutSnap = await db.collection('tutors').get();
    tutSnap.forEach(d => {
      const em = normalizeEmail((d.data() || {}).email);
      if (em) emails.add(em);
    });
  }
  if (target === 'students' || target === 'all') {
    const stuSnap = await db.collection('students').get();
    stuSnap.forEach(d => {
      const em = normalizeEmail((d.data() || {}).email);
      if (em) emails.add(em);
    });
  }

  const emailList = Array.from(emails);
  const BATCH_SIZE = 450;
  for (let i = 0; i < emailList.length; i += BATCH_SIZE) {
    const chunk = emailList.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    chunk.forEach(em => {
      const ref = db.collection('notifications').doc();
      batch.set(ref, {
        id: ref.id,
        recipientEmail: em,
        type,
        title,
        description,
        actionUrl,
        read: false,
        readAt: null,
        senderEmail: adminEmail,
        senderName: "Modiv's Administration",
        createdAt: now,
        updatedAt: now
      });
    });
    await batch.commit();
  }

  return { success: true, count: emailList.length, type, target };
});

