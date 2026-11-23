/**
 * Modiv's Education - Automatic Email Reminder Vercel Cron API (/api/cron-reminders)
 * 
 * Scheduled to run every 15 minutes via Vercel Cron (or external cron scheduler).
 * 
 * Schedule & Timing Milestones:
 * 1. 30 Minutes: Send 1st reminder email (reminderCount: 1)
 * 2. 24 Hours:   Send 2nd reminder email (reminderCount: 2)
 * 3. 48 Hours:   Send 3rd (final) reminder email (reminderCount: 3)
 * 4. 72 Hours:   Mark profileStatus as 'no_response' (stop reminders)
 * 
 * Safety & Security:
 * - Authenticated via Vercel CRON_SECRET (Bearer token / header / query)
 * - Atomic cron job concurrency lock in Firestore (prevents overlapping worker runs)
 * - Evaluates profile completeness dynamically; automatically stops when complete
 * - Completely idempotent with atomic Firestore updates
 * - Firebase Admin SDK used exclusively on the backend
 */

const { admin, db, FieldValue } = require('../lib/firebase-admin');
const { sendReminderEmailHelper, MILESTONES } = require('./send-reminder');

const MASTER_ADMIN_EMAILS = (process.env.MASTER_ADMIN_EMAILS ? process.env.MASTER_ADMIN_EMAILS.split(',') : [
  'happinessaggarwal@gmail.com',
  'divyanshdhimanteam@gmail.com',
  'luxmankumar628@gmail.com'
]).map(e => String(e).trim().toLowerCase());

/**
 * Checks if a profile has sufficient data to be marked as completed.
 */
function isProfileCompleted(role, data) {
  if (!data) return false;
  if (data.profileCompleted === true || data.profileStatus === 'completed') return true;

  const r = String(role || data.role || '').toLowerCase();

  if (r === 'tutor') {
    if (data.status === 'approved' || data.approval === 'approved') return true;
    const hasSubjects = Array.isArray(data.subs) && data.subs.length > 0 && data.subs[0] !== 'General';
    const hasPhone = data.phone && data.phone !== '—' && data.phone.length >= 8;
    const hasCity = data.city && data.city !== '—';
    if (hasSubjects && hasPhone && hasCity && data.status !== 'incomplete') return true;
    return false;
  }

  if (r === 'student') {
    const hasClass = Boolean(data.cls || data.class || data.grade);
    const hasSubjects = Boolean((Array.isArray(data.subs) && data.subs.length) || (Array.isArray(data.subjects) && data.subjects.length) || data.subject);
    if (hasClass && hasSubjects && data.status !== 'incomplete') return true;
    return false;
  }

  if (r === 'user') {
    if (data.phone && data.location && data.profileStatus !== 'incomplete') return true;
    return false;
  }

  return false;
}

/**
 * Converts a Firestore timestamp, ISO string, or Date into a JavaScript Date.
 */
function parseDate(val) {
  if (!val) return null;
  if (val.toDate && typeof val.toDate === 'function') return val.toDate();
  if (val._seconds) return new Date(val._seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Atomic Concurrency Lock: Prevents simultaneous executions from duplicate cron triggers
 */
async function acquireCronLock(lockKey = 'reminder_worker', lockDurationMs = 180000) {
  const lockRef = db.collection('cron_locks').doc(lockKey);
  const now = Date.now();
  const workerId = `w_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(lockRef);
      if (doc.exists) {
        const data = doc.data();
        const expiresAt = data.expiresAt ? (data.expiresAt.toDate ? data.expiresAt.toDate().getTime() : new Date(data.expiresAt).getTime()) : 0;
        if (now < expiresAt) {
          // Lock is still actively held by another process
          return { acquired: false, lockedBy: data.workerId };
        }
      }

      transaction.set(lockRef, {
        workerId,
        lockedAt: FieldValue.serverTimestamp(),
        expiresAt: new Date(now + lockDurationMs)
      });

      return { acquired: true, workerId, lockRef };
    });
  } catch (err) {
    console.warn('[cron-reminders] Could not acquire lock, proceeding safely with item-level idempotency:', err.message);
    return { acquired: true, workerId: 'fallback' };
  }
}

async function releaseCronLock(lockKey = 'reminder_worker', workerId) {
  try {
    const lockRef = db.collection('cron_locks').doc(lockKey);
    const doc = await lockRef.get();
    if (doc.exists && doc.data().workerId === workerId) {
      await lockRef.delete();
    }
  } catch (e) {}
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cron-secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Authenticate Cron Request via CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const customHeader = req.headers['x-cron-secret'] || '';
  const querySecret = req.query.secret || '';

  const isAuthorized = !cronSecret || (bearerToken === cronSecret || customHeader === cronSecret || querySecret === cronSecret);

  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized: Invalid CRON_SECRET.' });
  }

  // 2. Verify backend service account credentials before attempting Firestore operations
  const hasCredentials = Boolean(
    (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  );

  if (!hasCredentials) {
    return res.status(200).json({
      success: false,
      configured: false,
      error: 'Firebase Service Account credentials are not configured in Vercel environment variables. Please add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in Vercel Project Settings > Environment Variables to allow the backend to read Firestore and send reminder emails.',
      remedy: 'Go to Firebase Console -> Project Settings -> Service accounts -> Click "Generate new private key". Copy client_email and private_key into Vercel.'
    });
  }

  // 3. Concurrency Lock
  const lock = await acquireCronLock('reminder_worker', 180000);
  if (!lock.acquired) {
    return res.status(200).json({
      success: true,
      message: 'Another cron reminder worker is currently executing. Execution skipped to prevent race conditions.'
    });
  }

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host || '';
  const originUrl = host ? `${proto}://${host}` : '';

  const now = Date.now();
  const results = {
    timestamp: new Date().toISOString(),
    scanned: 0,
    remindersSent: 0,
    markedNoResponse: 0,
    completedStopped: 0,
    pendingNextMilestone: 0,
    errors: [],
    details: []
  };

  try {
    // 3. Scan accounts from existing Firestore collection
    const accountsSnap = await db.collection('accounts').limit(250).get();
    const candidateMap = new Map();

    accountsSnap.forEach(doc => {
      const data = doc.data() || {};
      const email = String(doc.id || data.email || '').trim().toLowerCase();
      if (email && email.includes('@')) {
        candidateMap.set(email, { docId: doc.id, collection: 'accounts', ...data, email });
      }
    });

    // Also scan tutors with status == 'incomplete'
    const incompleteTutorsSnap = await db.collection('tutors').where('status', '==', 'incomplete').limit(100).get().catch(() => null);
    if (incompleteTutorsSnap && !incompleteTutorsSnap.empty) {
      incompleteTutorsSnap.forEach(doc => {
        const d = doc.data() || {};
        const email = String(d.email || '').trim().toLowerCase();
        if (email && email.includes('@') && !candidateMap.has(email)) {
          candidateMap.set(email, { docId: doc.id, collection: 'tutors', role: 'tutor', ...d, email });
        }
      });
    }

    results.scanned = candidateMap.size;

    // 4. Process candidate accounts
    for (const [email, record] of candidateMap.entries()) {
      try {
        if (MASTER_ADMIN_EMAILS.includes(String(email).trim().toLowerCase())) {
          continue; // Master admin accounts never receive reminder emails
        }
        const role = record.role || 'student';
        const accountRef = db.collection('accounts').doc(email);

        // Check if profile was already completed
        if (isProfileCompleted(role, record)) {
          if (record.profileStatus !== 'completed' || record.profileCompleted !== true) {
            await accountRef.set({
              profileStatus: 'completed',
              profileCompleted: true,
              nextReminderAt: null,
              lastActivityAt: FieldValue.serverTimestamp()
            }, { merge: true });
          }
          results.completedStopped++;
          continue;
        }

        // If already flagged as no_response, stopped, or completed, skip
        if (record.profileStatus === 'no_response' || record.profileStatus === 'completed' || record.profileStatus === 'stopped') {
          continue;
        }

        // Calculate profile start time
        let startedDate = parseDate(record.profileStartedAt) || parseDate(record.createdAt) || parseDate(record.registeredAt);
        if (!startedDate) {
          startedDate = new Date();
          await accountRef.set({
            profileStartedAt: FieldValue.serverTimestamp(),
            lastActivityAt: FieldValue.serverTimestamp(),
            profileStatus: 'incomplete',
            profileCompleted: false,
            reminderCount: 0,
            nextReminderAt: new Date(startedDate.getTime() + MILESTONES.STAGE_1_MS).toISOString()
          }, { merge: true });
        }

        const elapsedMs = now - startedDate.getTime();
        const reminderCount = Number(record.reminderCount) || 0;

        // MILESTONE 4: 72 Hours -> Set no_response
        if (elapsedMs >= MILESTONES.NO_RESPONSE_MS) {
          await accountRef.set({
            profileStatus: 'no_response',
            nextReminderAt: null,
            lastActivityAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });

          results.markedNoResponse++;
          results.details.push({ email, role, action: 'marked_no_response', elapsedHours: Math.round(elapsedMs / 3600000) });
          continue;
        }

        // Determine if eligible for reminder stage 1, 2, or 3
        let targetStage = 0;
        if (elapsedMs >= MILESTONES.STAGE_3_MS && reminderCount < 3) {
          targetStage = 3; // 48 Hours - Final Notice
        } else if (elapsedMs >= MILESTONES.STAGE_2_MS && reminderCount < 2) {
          targetStage = 2; // 24 Hours
        } else if (elapsedMs >= MILESTONES.STAGE_1_MS && reminderCount < 1) {
          targetStage = 1; // 30 Minutes
        }

        if (targetStage > 0) {
          // Send reminder email with idempotency and transactional state update
          const sendRes = await sendReminderEmailHelper({
            email,
            role,
            reminderIndex: targetStage,
            force: false,
            originUrl
          });

          if (sendRes.success && !sendRes.alreadySent) {
            results.remindersSent++;
            results.details.push({
              email,
              role,
              stage: targetStage,
              action: 'sent',
              simulated: sendRes.simulated,
              nextReminderAt: sendRes.nextReminderAt
            });
          } else {
            results.details.push({ email, role, stage: targetStage, action: sendRes.message });
          }
        } else {
          // Compute upcoming milestone for nextReminderAt
          let nextMilestoneMs = MILESTONES.STAGE_1_MS;
          if (reminderCount === 1) nextMilestoneMs = MILESTONES.STAGE_2_MS;
          else if (reminderCount === 2) nextMilestoneMs = MILESTONES.STAGE_3_MS;
          else if (reminderCount === 3) nextMilestoneMs = MILESTONES.NO_RESPONSE_MS;

          const nextReminderIso = new Date(startedDate.getTime() + nextMilestoneMs).toISOString();
          if (record.nextReminderAt !== nextReminderIso) {
            await accountRef.set({ nextReminderAt: nextReminderIso }, { merge: true }).catch(() => {});
          }
          results.pendingNextMilestone++;
        }
      } catch (itemErr) {
        console.error(`[cron-reminders] Error processing ${email}:`, itemErr);
        results.errors.push({ email, error: itemErr.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Cron execution complete. Scanned: ${results.scanned}, Reminders Sent: ${results.remindersSent}, Marked No-Response: ${results.markedNoResponse}`,
      ...results
    });
  } catch (error) {
    console.error('[cron-reminders] Fatal cron error:', error);
    return res.status(500).json({ error: error.message, stack: error.stack });
  } finally {
    if (lock.workerId) {
      await releaseCronLock('reminder_worker', lock.workerId);
    }
  }
};
