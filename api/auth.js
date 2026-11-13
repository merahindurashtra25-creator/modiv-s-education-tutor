const https = require('https');
const { admin, db, auth } = require('./_firebase');
const {
  SESSION_EXPIRY_MS,
  normalizeEmail,
  setSessionCookie,
  clearSessionCookie,
  verifyAuth,
  checkCsrf
} = require('./_auth');

const ID_KIND_CONFIG = {
  tut: { prefix: 'TUT', start: 301 },
  stu: { prefix: 'STU', start: 101 },
  ld:  { prefix: 'LD',  start: 201 }
};

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

function verifyPasswordViaRest(email, password) {
  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error('FIREBASE_API_KEY is not configured on the backend.'));
  }
  const postData = JSON.stringify({
    email,
    password,
    returnSecureToken: true
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'identitytoolkit.googleapis.com',
      port: 443,
      path: `/v1/accounts:signInWithPassword?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error((parsed.error && parsed.error.message) || 'Authentication failed'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  if (!checkCsrf(req)) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }

  const action = String(req.query.action || req.body.action || '').toLowerCase();

  // 1. GET Current Authenticated User (Session verification)
  if (req.method === 'GET' || action === 'me') {
    const user = await verifyAuth(req);
    if (!user) {
      return res.status(200).json({ authenticated: false, user: null });
    }

    const accDoc = await db.collection('accounts').doc(user.email).get();
    const accData = accDoc.exists ? accDoc.data() : {};

    return res.status(200).json({
      authenticated: true,
      user: {
        uid: user.uid,
        email: user.email,
        name: accData.name || user.name,
        role: accData.role || (user.isAdmin ? 'Admin' : 'General User'),
        displayId: accData.displayId || accData.tutId || accData.stuId || '',
        isAdmin: user.isAdmin,
        emailVerified: user.emailVerified,
        phone: accData.phone || '',
        location: accData.location || {}
      }
    });
  }

  // 2. POST Session Cookie Exchange (e.g. after Google Sign-in or client token verification)
  if (action === 'session' && req.method === 'POST') {
    const idToken = String(req.body.idToken || '').trim();
    if (!idToken) return res.status(400).json({ error: 'ID token is required' });

    try {
      const decoded = await auth.verifyIdToken(idToken);
      const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_EXPIRY_MS });
      setSessionCookie(res, sessionCookie);

      const email = normalizeEmail(decoded.email);
      const accDoc = await db.collection('accounts').doc(email).get();
      const accData = accDoc.exists ? accDoc.data() : {};

      return res.status(200).json({
        success: true,
        user: {
          uid: decoded.uid,
          email,
          name: accData.name || decoded.name || email.split('@')[0],
          role: accData.role || 'General User',
          displayId: accData.displayId || accData.tutId || accData.stuId || ''
        }
      });
    } catch (err) {
      return res.status(401).json({ error: 'Invalid ID token: ' + err.message });
    }
  }

  // 3. POST Password Login (Backend-controlled authentication)
  if (action === 'login' && req.method === 'POST') {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
      const authResult = await verifyPasswordViaRest(email, password);
      const sessionCookie = await auth.createSessionCookie(authResult.idToken, { expiresIn: SESSION_EXPIRY_MS });
      setSessionCookie(res, sessionCookie);

      const accDoc = await db.collection('accounts').doc(email).get();
      const accData = accDoc.exists ? accDoc.data() : {};

      return res.status(200).json({
        success: true,
        user: {
          uid: authResult.localId,
          email,
          name: accData.name || authResult.displayName || email.split('@')[0],
          role: accData.role || 'General User',
          displayId: accData.displayId || accData.tutId || accData.stuId || ''
        }
      });
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }
  }

  // 4. POST Registration (Atomic unique email + display ID allocation)
  if (action === 'register' && req.method === 'POST') {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const name = String(req.body.name || email.split('@')[0]).trim().slice(0, 100);
    const role = String(req.body.role || 'student').toLowerCase();
    const phone = String(req.body.phone || '').trim().slice(0, 30);
    const location = (typeof req.body.location === 'object' && req.body.location !== null) ? req.body.location : {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }
    if (password && password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const accountRef = db.collection('accounts').doc(email);

    try {
      // 1. Create Firebase Auth user if password provided and doesn't exist
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(email);
      } catch (e) {
        if (password) {
          userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
            phoneNumber: phone ? (phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`) : undefined
          }).catch(() => null);
        }
      }

      // 2. Atomic Registration & Sequential ID allocation
      const regResult = await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(accountRef);
        if (doc.exists) {
          const cur = doc.data();
          if (cur.role && cur.role !== role) {
            throw new Error(`This email is already registered as a ${cur.roleName || cur.role}.`);
          }
          return { exists: true, email, displayId: cur.displayId || cur.tutId || cur.stuId };
        }

        const roleDisplay = role === 'tutor' ? 'Tutor' : (role === 'student' ? 'Student / Parent' : 'General User');
        const idKind = role === 'tutor' ? 'tut' : (role === 'student' ? 'stu' : null);
        let displayId = '';

        if (idKind) {
          displayId = await allocateDisplayIdTx(transaction, idKind, email);
        }

        const accountData = {
          email,
          role,
          roleName: roleDisplay,
          name,
          phone,
          location,
          displayId: displayId || '',
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (role === 'tutor') {
          accountData.tutId = displayId;
          const tutorId = `t_user_${email.replace(/[^a-z0-9]/gi, '_')}`;
          transaction.set(db.collection('tutors').doc(tutorId), {
            id: tutorId,
            email,
            name,
            phone,
            location,
            displayId,
            tutId: displayId,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } else if (role === 'student') {
          accountData.stuId = displayId;
          const studentId = `stu_${email.replace(/[^a-z0-9]/gi, '_')}`;
          transaction.set(db.collection('students').doc(studentId), {
            id: studentId,
            email,
            name,
            phone,
            location,
            displayId,
            stuId: displayId,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }

        transaction.set(accountRef, accountData);
        return { success: true, email, role, displayId };
      });

      return res.status(200).json(regResult);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  // 5. POST Logout
  if (action === 'logout' && req.method === 'POST') {
    clearSessionCookie(res);
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  }

  return res.status(404).json({ error: 'Unknown auth action' });
};

