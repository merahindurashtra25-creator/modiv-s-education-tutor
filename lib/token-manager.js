/**
 * Modiv's Education - Secure Continuation Token Manager
 * 
 * Implements Phase 7 security requirements:
 * 1. Cryptographically secure random tokens (crypto.randomBytes(32))
 * 2. Stores ONLY one-way SHA-256 token hashes in Firestore
 * 3. Enforces token expiry (default 7 days)
 * 4. Strictly one-time token consumption via atomic Firestore transactions
 * 5. Role-specific redirection to existing profile pages without URL exposure
 *    of Firebase UIDs, passwords, or personal details
 * 6. Whitelist-based domain validation preventing open redirect attacks
 */

const crypto = require('crypto');

// Whitelisted origins for continuation redirects
const ALLOWED_HOSTS = new Set([
  'modivs.com',
  'www.modivs.com',
  'modivs-education.vercel.app',
  'localhost',
  '127.0.0.1'
]);

/**
 * Generates a secure random token, stores its SHA-256 hash in Firestore,
 * and returns the one-time continuation URL.
 */
async function generateContinuationToken({ email, role, baseUrl, expiryDays = 7, db, FieldValue }) {
  if (!email) throw new Error('Email is required to generate continuation token');
  if (!db) throw new Error('Firestore database instance is required');

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanRole = String(role || 'student').trim().toLowerCase();

  // 1. Generate 32-byte cryptographically secure random token (64 hex characters)
  const rawToken = crypto.randomBytes(32).toString('hex');

  // 2. Compute one-way SHA-256 hash (only the hash is stored in Firestore)
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  // 3. Store hash in Firestore collection continuation_tokens
  await db.collection('continuation_tokens').doc(tokenHash).set({
    tokenHash,
    email: cleanEmail,
    role: cleanRole,
    expiresAt,
    consumed: false,
    consumedAt: null,
    createdAt: FieldValue ? FieldValue.serverTimestamp() : new Date()
  });

  const cleanBase = (baseUrl || 'https://www.modivs.com').replace(/\/+$/, '');
  
  // URL contains ONLY the raw token string — zero personal details or UIDs exposed
  return `${cleanBase}/api/send-reminder?action=continue&token=${rawToken}`;
}

/**
 * Validates and atomically consumes a one-time continuation token.
 * Guarantees single-use semantics via Firestore transaction.
 */
async function consumeContinuationToken({ rawToken, db, FieldValue }) {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 32) {
    return { valid: false, error: 'Invalid or missing continuation token' };
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
  const tokenRef = db.collection('continuation_tokens').doc(tokenHash);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(tokenRef);
      if (!doc.exists) {
        return { valid: false, error: 'Continuation link is invalid or does not exist.' };
      }

      const data = doc.data();

      // Check if already consumed (One-time use enforcement)
      if (data.consumed === true) {
        return { valid: false, error: 'This profile continuation link has already been used.' };
      }

      // Check expiration
      const expDate = data.expiresAt && data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
      if (!expDate || expDate.getTime() < Date.now()) {
        return { valid: false, error: 'This profile continuation link has expired.' };
      }

      // Atomically mark token as consumed
      transaction.update(tokenRef, {
        consumed: true,
        consumedAt: FieldValue ? FieldValue.serverTimestamp() : new Date()
      });

      return {
        valid: true,
        email: data.email,
        role: data.role,
        consumedAt: new Date()
      };
    });

    if (result.valid) {
      result.destination = resolveProfilePage(result.role);
    }
    return result;
  } catch (err) {
    console.error('[TokenManager] Error consuming continuation token:', err.message);
    return { valid: false, error: 'Failed to verify token: ' + err.message };
  }
}

/**
 * Maps user role to existing profile completion page.
 */
function resolveProfilePage(role) {
  const r = String(role || '').toLowerCase();
  if (r === 'tutor') {
    return '/modivs-tutor-edit-profile.html?resumed=1';
  }
  if (r === 'user') {
    return '/modivs-user-signup.html?resumed=1';
  }
  // Default to student / parent
  return '/modivs-student-registration.html?resumed=1';
}

/**
 * Validates redirect destination preventing open redirect vulnerabilities.
 */
function isSafeRedirectUrl(targetUrl) {
  if (!targetUrl || typeof targetUrl !== 'string') return false;
  
  // Safe relative paths starting with /
  if (targetUrl.startsWith('/') && !targetUrl.startsWith('//') && !targetUrl.includes('\\')) {
    return true;
  }

  try {
    const parsed = new URL(targetUrl);
    const hostname = parsed.hostname.toLowerCase();
    for (const allowed of ALLOWED_HOSTS) {
      if (hostname === allowed || hostname.endsWith('.' + allowed)) {
        return true;
      }
    }
    return false;
  } catch (e) {
    return false;
  }
}

module.exports = {
  generateContinuationToken,
  consumeContinuationToken,
  resolveProfilePage,
  isSafeRedirectUrl,
  ALLOWED_HOSTS
};
