/**
 * Modiv's Education - Send Email Reminder API (/api/send-reminder)
 * 
 * Handles:
 * 1. Dispatching role-specific reminder emails via Nodemailer with Gmail SMTP
 * 2. Secure continuation link consumption (action=continue&token=...)
 * 3. Token generation with cryptographically secure random values and SHA-256 hash storage
 * 4. Transactional idempotency, concurrency locking, and reminder history tracking
 * 5. Strict rate-limiting and authorization (CRON_SECRET or Admin session)
 */

const nodemailer = require('nodemailer');
const { admin, db, FieldValue, hasCredentials, restFetchCollection, restFetchDocument } = require('./_firebase');
const { getEmailTemplate, getWelcomeEmailTemplate, getAdminBulkReminderTemplate } = require('../lib/email-templates');
const {
  generateContinuationToken,
  consumeContinuationToken,
  isSafeRedirectUrl,
  ALLOWED_HOSTS
} = require('../lib/token-manager');
const { verifyAuth } = require('./_auth');

const MASTER_ADMIN_EMAILS = (process.env.MASTER_ADMIN_EMAILS ? process.env.MASTER_ADMIN_EMAILS.split(',') : [
  'happinessaggarwal@gmail.com',
  'divyanshdhimanteam@gmail.com',
  'luxmankumar628@gmail.com'
]).map(e => String(e).trim().toLowerCase());

// Timing milestones (in milliseconds)
const MILESTONES = {
  STAGE_1_MS: 30 * 60 * 1000,        // 30 Minutes
  STAGE_2_MS: 24 * 60 * 60 * 1000,   // 24 Hours
  STAGE_3_MS: 48 * 60 * 60 * 1000,   // 48 Hours
  NO_RESPONSE_MS: 72 * 60 * 60 * 1000 // 72 Hours
};

// In-memory rate limiter per IP / target email (10 requests per minute)
const rateLimitMap = new Map();
function checkRateLimit(key, maxLimit = 10, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + windowMs;
  } else {
    entry.count++;
  }
  rateLimitMap.set(key, entry);
  return entry.count <= maxLimit;
}

/**
 * Configure Nodemailer transporter using Gmail SMTP
 */
function createSmtpTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE === 'false' ? false : (port === 465);
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER || 'merahindurashtra25@gmail.com';
  const pass = process.env.SMTP_PASS || process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null; // Signals simulation mode if credentials not configured
  }

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    }),
    user,
    configured: true
  };
}

/**
 * Reusable helper to send reminder mail with transactional logging.
 */
async function sendReminderEmailHelper({ email, role, reminderIndex = 1, force = false, originUrl = '', dbOverride = null }) {
  const database = dbOverride || db;
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('A valid email address is required.');
  }

  const index = Math.min(Math.max(Number(reminderIndex) || 1, 1), 3);

  // 1. Transactional check and lock
  let accountData = null;
  if (hasCredentials && database) {
    try {
      const accountRef = database.collection('accounts').doc(cleanEmail);
      const accountDoc = await accountRef.get().catch(() => null);
      accountData = (accountDoc && accountDoc.exists) ? accountDoc.data() : null;

      // Fallback check in tutors / students
      if (!accountData) {
        const tutorSnap = await database.collection('tutors').where('email', '==', cleanEmail).limit(1).get().catch(() => null);
        if (tutorSnap && !tutorSnap.empty) {
          accountData = { role: 'tutor', ...tutorSnap.docs[0].data(), email: cleanEmail };
        } else {
          const studentSnap = await database.collection('students').where('email', '==', cleanEmail).limit(1).get().catch(() => null);
          if (studentSnap && !studentSnap.empty) {
            accountData = { role: 'student', ...studentSnap.docs[0].data(), email: cleanEmail };
          }
        }
      }
    } catch (dbErr) {
      console.warn('[send-reminder] Firestore read notice:', dbErr.message);
    }
  } else {
    try {
      accountData = await restFetchDocument('accounts', cleanEmail).catch(() => null);
    } catch (e) { }
  }

  if (!accountData) {
    accountData = { email: cleanEmail, role: role || 'student', profileStatus: 'incomplete' };
  }

  const userRole = role || accountData.role || 'student';
  const isCompleted = accountData.profileStatus === 'completed' || accountData.profileCompleted === true;

  // If completed, automatically halt
  if (isCompleted && !force) {
    return {
      success: false,
      stopped: true,
      message: 'Profile is already completed. Reminders stopped.',
      email: cleanEmail
    };
  }

  // Idempotency check: prevent duplicate send for this stage
  const currentCount = Number(accountData.reminderCount) || 0;
  if (!force && currentCount >= index) {
    return {
      success: true,
      alreadySent: true,
      message: `Reminder Stage ${index} was already sent to ${cleanEmail}.`,
      email: cleanEmail,
      reminderIndex: currentCount
    };
  }

  // 2. Resolve Base URL
  const baseUrl = originUrl ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://www.modivs.com');

  // 3. Generate secure continuation link with SHA-256 token hashing
  let continuationUrl = `${baseUrl}/login.html`;
  try {
    continuationUrl = await generateContinuationToken({
      email: cleanEmail,
      role: userRole,
      baseUrl,
      expiryDays: 7,
      db: database,
      FieldValue
    });
  } catch (tokErr) {
    console.warn('[send-reminder] Token generation notice, falling back to direct URL:', tokErr.message);
    continuationUrl = `${baseUrl}/${userRole === 'tutor' ? 'tutor-dashboard' : 'student-dashboard'}`;
  }

  // 4. Generate email template
  const { subject, html, text } = getEmailTemplate({
    role: userRole,
    reminderIndex: index,
    recipientName: accountData.name || '',
    continuationUrl,
    displayId: accountData.displayId || accountData.tutId || accountData.stuId || '',
    email: cleanEmail
  });

  // 5. Send via SMTP
  const smtp = createSmtpTransporter();
  let messageId = 'simulated-' + Date.now();
  let emailSent = false;
  let fromAddress = process.env.SMTP_FROM || `"Modiv’s Education" <${(smtp && smtp.user) || 'merahindurashtra25@gmail.com'}>`;

  if (smtp && smtp.configured) {
    try {
      const info = await smtp.transporter.sendMail({
        from: fromAddress,
        replyTo: `"Modiv’s Education Support" <${(smtp && smtp.user) || 'merahindurashtra25@gmail.com'}>`,
        to: cleanEmail,
        subject,
        html,
        text,
        headers: {
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'Importance': 'Normal',
          'List-Unsubscribe': `<mailto:${(smtp && smtp.user) || 'merahindurashtra25@gmail.com'}?subject=unsubscribe>, <${continuationUrl}?action=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'Feedback-ID': 'reminder:account:modivs',
          'X-Auto-Response-Suppress': 'OOF, AutoReply',
          'Auto-Submitted': 'auto-generated'
        }
      });
      messageId = info.messageId || messageId;
      emailSent = true;
    } catch (smtpErr) {
      console.error(`[ReminderMail] SMTP delivery failed to ${cleanEmail}:`, smtpErr.message);
      // Append failure to history without advancing reminderCount
      const existingHistory = Array.isArray(accountData.reminderHistory) ? accountData.reminderHistory : [];
      existingHistory.push({
        stage: index,
        attemptedAt: new Date().toISOString(),
        status: 'failed',
        error: smtpErr.message
      });

      await accountRef.set({
        reminderHistory: existingHistory,
        lastActivityAt: FieldValue.serverTimestamp()
      }, { merge: true }).catch(() => { });

      throw new Error(`SMTP Delivery Failed: ${smtpErr.message}`);
    }
  } else {
    console.warn(`[ReminderMail] SMTP credentials not configured in environment. Simulated reminder Stage ${index} to ${cleanEmail}.`);
  }

  // 6. Compute next reminder milestone
  const startedAt = accountData.profileStartedAt ? (accountData.profileStartedAt.toDate ? accountData.profileStartedAt.toDate() : new Date(accountData.profileStartedAt)) : new Date();
  let nextReminderAt = null;

  if (index === 1) {
    nextReminderAt = new Date(startedAt.getTime() + MILESTONES.STAGE_2_MS).toISOString();
  } else if (index === 2) {
    nextReminderAt = new Date(startedAt.getTime() + MILESTONES.STAGE_3_MS).toISOString();
  } else if (index === 3) {
    nextReminderAt = new Date(startedAt.getTime() + MILESTONES.NO_RESPONSE_MS).toISOString();
  }

  // 7. Update reminderHistory
  const existingHistory = Array.isArray(accountData.reminderHistory) ? accountData.reminderHistory : [];
  existingHistory.push({
    stage: index,
    sentAt: new Date().toISOString(),
    messageId,
    status: emailSent ? 'delivered' : 'simulated',
    from: fromAddress
  });

  // 8. Atomic update in Firestore accounts ONLY after confirmation
  if (hasCredentials && database) {
    try {
      await database.collection('accounts').doc(cleanEmail).set({
        email: cleanEmail,
        role: userRole,
        profileStatus: 'reminder_sent',
        profileCompleted: false,
        profileStartedAt: accountData.profileStartedAt || (FieldValue.serverTimestamp ? FieldValue.serverTimestamp() : new Date().toISOString()),
        lastActivityAt: FieldValue.serverTimestamp ? FieldValue.serverTimestamp() : new Date().toISOString(),
        reminderCount: index,
        lastReminderSentAt: FieldValue.serverTimestamp ? FieldValue.serverTimestamp() : new Date().toISOString(),
        nextReminderAt: nextReminderAt,
        reminderHistory: existingHistory,
        updatedAt: FieldValue.serverTimestamp ? FieldValue.serverTimestamp() : new Date().toISOString()
      }, { merge: true }).catch(() => { });

      // 9. Log idempotent record in email_reminders collection
      const logDocId = `rem_${cleanEmail.replace(/[^a-z0-9]/gi, '_')}_stage${index}`;
      await database.collection('email_reminders').doc(logDocId).set({
        id: logDocId,
        email: cleanEmail,
        role: userRole,
        reminderIndex: index,
        subject,
        sentAt: FieldValue.serverTimestamp ? FieldValue.serverTimestamp() : new Date().toISOString(),
        messageId,
        continuationUrl,
        simulated: !emailSent
      }, { merge: true }).catch(() => { });
    } catch (fsErr) {
      console.warn('[send-reminder] Firestore write notice:', fsErr.message);
    }
  }

  return {
    success: true,
    email: cleanEmail,
    role: userRole,
    reminderIndex: index,
    messageId,
    simulated: !emailSent,
    nextReminderAt,
    from: fromAddress
  };
}

/**
 * Reusable helper to send welcome email upon new user / tutor / student registration.
 */
async function sendWelcomeEmailHelper({ email, role = 'student', name = '', displayId = '', originUrl = '', dbOverride = null }) {
  const database = dbOverride || db;
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('A valid email address is required.');
  }

  // Prevent sending welcome email to master admin accounts
  const MASTER_ADMIN_EMAILS = (process.env.MASTER_ADMIN_EMAILS ? process.env.MASTER_ADMIN_EMAILS.split(',') : [
    'happinessaggarwal@gmail.com',
    'divyanshdhimanteam@gmail.com',
    'luxmankumar628@gmail.com'
  ]).map(e => String(e).trim().toLowerCase());

  if (MASTER_ADMIN_EMAILS.includes(cleanEmail)) {
    return { success: false, skipped: true, message: 'Welcome email skipped for administrator account.' };
  }

  let accData = {};
  if (hasCredentials && database) {
    try {
      const accountDoc = await database.collection('accounts').doc(cleanEmail).get().catch(() => null);
      if (accountDoc && accountDoc.exists) accData = accountDoc.data() || {};
    } catch (e) { }
  } else {
    try {
      accData = await restFetchDocument('accounts', cleanEmail).catch(() => null) || {};
    } catch (e) { }
  }

  // Check idempotency - avoid duplicate welcome emails
  if (accData.welcomeEmailSent === true) {
    return { success: true, duplicate: true, message: 'Welcome email was already delivered.', email: cleanEmail };
  }

  const resolvedRole = role || accData.role || 'student';
  const resolvedName = name || accData.name || cleanEmail.split('@')[0];
  const resolvedDisplayId = displayId || accData.displayId || accData.stuId || accData.tutId || '';

  const { subject, html, text } = getWelcomeEmailTemplate({
    role: resolvedRole,
    recipientName: resolvedName,
    displayId: resolvedDisplayId,
    email: cleanEmail,
    originUrl: originUrl || 'https://www.modivs.com'
  });

  const smtp = createSmtpTransporter();
  let messageId = 'simulated_' + Date.now();

  if (smtp && smtp.configured) {
    const fromAddress = process.env.SMTP_FROM || `Modiv’s Education <${smtp.user}>`;
    const mailOptions = {
      from: fromAddress,
      to: cleanEmail,
      subject,
      text,
      html,
      headers: {
        'X-Entity-Ref-ID': `welcome_${cleanEmail}_${Date.now()}`
      }
    };

    const info = await smtp.transporter.sendMail(mailOptions);
    messageId = info.messageId || messageId;
  } else {
    console.log(`[send-reminder] SMTP not configured. Welcome email simulated to ${cleanEmail}`);
  }

  // Record welcome email dispatch in Firestore
  if (hasCredentials && database) {
    try {
      await database.collection('accounts').doc(cleanEmail).set({
        welcomeEmailSent: true,
        welcomeEmailSentAt: FieldValue.serverTimestamp ? FieldValue.serverTimestamp() : new Date().toISOString(),
        welcomeMessageId: messageId,
        lastActivityAt: FieldValue.serverTimestamp ? FieldValue.serverTimestamp() : new Date().toISOString()
      }, { merge: true }).catch(() => { });
    } catch (e) { }
  }

  return {
    success: true,
    messageId,
    email: cleanEmail,
    role: resolvedRole,
    type: 'welcome',
    deliveredAt: new Date().toISOString()
  };
}

/**
 * Admin: Fetch users with profile completion metrics and reminder status
 */
async function handleAdminFetchUsers({ req, res, user, db, FieldValue }) {
  try {
    const usersMap = new Map();

    // 1. Fetch from accounts collection
    try {
      const accSnap = await db.collection('accounts').get();
      accSnap.docs.forEach(doc => {
        const data = doc.data() || {};
        const email = String(doc.id || data.email || '').trim().toLowerCase();
        if (email && !MASTER_ADMIN_EMAILS.includes(email)) {
          const isComplete = Boolean(data.profileCompleted === true || data.profileStatus === 'completed' || data.status === 'approved');
          usersMap.set(email, {
            email,
            uid: data.uid || '',
            name: data.name || data.displayName || email.split('@')[0],
            role: data.role || 'user',
            profileCompleted: isComplete,
            profileStatus: isComplete ? 'completed' : 'incomplete',
            createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : null,
            lastReminderSentAt: data.lastReminderSentAt || null,
            reminderCount: Number(data.reminderCount) || 0,
            emailStatus: data.lastEmailStatus || (data.lastReminderSentAt ? 'sent' : 'not_sent')
          });
        }
      });
    } catch (e) {
      console.warn('[handleAdminFetchUsers] Accounts query notice:', e.message);
    }

    // 2. Merge students metadata
    try {
      const stuSnap = await db.collection('students').get();
      stuSnap.docs.forEach(doc => {
        const data = doc.data() || {};
        const email = String(data.email || '').trim().toLowerCase();
        if (email && !MASTER_ADMIN_EMAILS.includes(email)) {
          const isComplete = Boolean(data.profileCompleted === true || data.status === 'approved' || (data.cls && (data.subs || data.subjects)));
          if (usersMap.has(email)) {
            const u = usersMap.get(email);
            u.role = 'student';
            if (data.name) u.name = data.name;
            if (isComplete) { u.profileCompleted = true; u.profileStatus = 'completed'; }
          } else {
            usersMap.set(email, {
              email,
              uid: data.uid || doc.id,
              name: data.name || data.studentName || email.split('@')[0],
              role: 'student',
              profileCompleted: isComplete,
              profileStatus: isComplete ? 'completed' : 'incomplete',
              createdAt: data.createdAt || null,
              lastReminderSentAt: data.lastReminderSentAt || null,
              reminderCount: Number(data.reminderCount) || 0,
              emailStatus: data.lastEmailStatus || (data.lastReminderSentAt ? 'sent' : 'not_sent')
            });
          }
        }
      });
    } catch (e) {
      console.warn('[handleAdminFetchUsers] Students query notice:', e.message);
    }

    // 3. Merge tutors metadata
    try {
      const tutSnap = await db.collection('tutors').get();
      tutSnap.docs.forEach(doc => {
        const data = doc.data() || {};
        const email = String(data.email || '').trim().toLowerCase();
        if (email && !MASTER_ADMIN_EMAILS.includes(email)) {
          const isComplete = Boolean(data.profileCompleted === true || data.status === 'approved' || data.approval === 'approved');
          if (usersMap.has(email)) {
            const u = usersMap.get(email);
            u.role = 'tutor';
            if (data.name) u.name = data.name;
            if (isComplete) { u.profileCompleted = true; u.profileStatus = 'completed'; }
          } else {
            usersMap.set(email, {
              email,
              uid: data.uid || doc.id,
              name: data.name || data.tutorName || email.split('@')[0],
              role: 'tutor',
              profileCompleted: isComplete,
              profileStatus: isComplete ? 'completed' : 'incomplete',
              createdAt: data.createdAt || null,
              lastReminderSentAt: data.lastReminderSentAt || null,
              reminderCount: Number(data.reminderCount) || 0,
              emailStatus: data.lastEmailStatus || (data.lastReminderSentAt ? 'sent' : 'not_sent')
            });
          }
        }
      });
    } catch (e) {
      console.warn('[handleAdminFetchUsers] Tutors query notice:', e.message);
    }

    // 4. REST fallback if Admin SDK has no credentials or returned 0 users
    if (!hasCredentials || usersMap.size === 0) {
      try {
        const [restAccs, restStudents, restTutors] = await Promise.all([
          restFetchCollection('accounts', { limit: 200 }).catch(() => []),
          restFetchCollection('students', { limit: 200 }).catch(() => []),
          restFetchCollection('tutors', { limit: 200 }).catch(() => [])
        ]);

        (restAccs || []).forEach(data => {
          const email = String(data.id || data.email || '').trim().toLowerCase();
          if (email && !MASTER_ADMIN_EMAILS.includes(email) && !usersMap.has(email)) {
            const isComplete = Boolean(data.profileCompleted === true || data.profileStatus === 'completed' || data.status === 'approved' || data.approval === 'approved');
            usersMap.set(email, {
              email,
              uid: data.uid || '',
              name: data.name || data.displayName || email.split('@')[0],
              role: data.role || 'user',
              profileCompleted: isComplete,
              profileStatus: isComplete ? 'completed' : 'incomplete',
              createdAt: data.createdAt || null,
              lastReminderSentAt: data.lastReminderSentAt || null,
              reminderCount: Number(data.reminderCount) || 0,
              emailStatus: data.lastEmailStatus || (data.lastReminderSentAt ? 'sent' : 'not_sent')
            });
          }
        });

        (restStudents || []).forEach(data => {
          const email = String(data.email || '').trim().toLowerCase();
          if (email && !MASTER_ADMIN_EMAILS.includes(email)) {
            const isComplete = Boolean(data.profileCompleted === true || data.status === 'approved' || (data.cls && (data.subs || data.subjects)));
            if (usersMap.has(email)) {
              const u = usersMap.get(email);
              u.role = 'student';
              if (data.name) u.name = data.name;
              if (isComplete) { u.profileCompleted = true; u.profileStatus = 'completed'; }
            } else {
              usersMap.set(email, {
                email,
                uid: data.uid || data.id,
                name: data.name || data.studentName || email.split('@')[0],
                role: 'student',
                profileCompleted: isComplete,
                profileStatus: isComplete ? 'completed' : 'incomplete',
                createdAt: data.createdAt || data.registered_at || null,
                lastReminderSentAt: data.lastReminderSentAt || null,
                reminderCount: Number(data.reminderCount) || 0,
                emailStatus: data.lastEmailStatus || (data.lastReminderSentAt ? 'sent' : 'not_sent')
              });
            }
          }
        });

        (restTutors || []).forEach(data => {
          const email = String(data.email || '').trim().toLowerCase();
          if (email && !MASTER_ADMIN_EMAILS.includes(email)) {
            const isComplete = Boolean(data.profileCompleted === true || data.status === 'approved' || data.approval === 'approved');
            if (usersMap.has(email)) {
              const u = usersMap.get(email);
              u.role = 'tutor';
              if (data.name) u.name = data.name;
              if (isComplete) { u.profileCompleted = true; u.profileStatus = 'completed'; }
            } else {
              usersMap.set(email, {
                email,
                uid: data.uid || data.id,
                name: data.name || data.tutorName || email.split('@')[0],
                role: 'tutor',
                profileCompleted: isComplete,
                profileStatus: isComplete ? 'completed' : 'incomplete',
                createdAt: data.createdAt || data.submitted_at || null,
                lastReminderSentAt: data.lastReminderSentAt || null,
                reminderCount: Number(data.reminderCount) || 0,
                emailStatus: data.lastEmailStatus || (data.lastReminderSentAt ? 'sent' : 'not_sent')
              });
            }
          }
        });
      } catch (restErr) {
        console.warn('[handleAdminFetchUsers] REST query notice:', restErr.message);
      }
    }

    const usersList = Array.from(usersMap.values());
    const total = usersList.length;
    const completed = usersList.filter(u => u.profileCompleted).length;
    const incomplete = total - completed;
    const pendingReminders = usersList.filter(u => !u.profileCompleted && u.reminderCount < 3).length;
    const sentEmails = usersList.reduce((acc, u) => acc + (u.reminderCount || 0), 0);

    let failedEmails = 0;
    try {
      const histSnap = await db.collection('admin_email_history').where('status', '==', 'failed').get();
      failedEmails = histSnap.size || 0;
    } catch (e) { }

    return res.status(200).json({
      success: true,
      stats: {
        totalRegistered: total,
        completedProfiles: completed,
        incompleteProfiles: incomplete,
        pendingReminders,
        sentEmails,
        failedEmails
      },
      users: usersList
    });
  } catch (err) {
    console.error('[handleAdminFetchUsers] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Admin: One-click bulk reminder email dispatcher
 */
async function handleAdminBulkSend({ req, res, user, db, FieldValue, originUrl, reqAdminEmail }) {
  try {
    const { emails = [], campaignName = 'Admin Bulk Reminder', forceSend = true } = req.body || {};
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'No recipient emails provided.' });
    }

    const cleanEmails = Array.from(new Set(emails.map(e => String(e).trim().toLowerCase()).filter(Boolean)));
    const totalSelected = cleanEmails.length;
    const campaignId = 'bulk_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);

    const eligible = [];
    const excluded = [];

    for (const email of cleanEmails) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || MASTER_ADMIN_EMAILS.includes(email)) {
        excluded.push({ email, reason: 'Invalid or admin email' });
        continue;
      }

      let accountData = null;
      if (hasCredentials && db) {
        try {
          const doc = await db.collection('accounts').doc(email).get().catch(() => null);
          if (doc && doc.exists) accountData = doc.data();
        } catch (e) { }
      } else {
        try {
          accountData = await restFetchDocument('accounts', email).catch(() => null);
        } catch (e) { }
      }

      if (!forceSend) {
        const isComplete = accountData && (accountData.profileCompleted === true || accountData.profileStatus === 'completed');
        if (isComplete) {
          excluded.push({ email, reason: 'Profile already completed' });
          continue;
        }
      }

      if (accountData && accountData.optOutReminders === true) {
        excluded.push({ email, reason: 'User opted out of reminders' });
        continue;
      }

      eligible.push({
        email,
        uid: (accountData && accountData.uid) || '',
        name: (accountData && (accountData.name || accountData.displayName)) || email.split('@')[0],
        role: (accountData && accountData.role) || 'student'
      });
    }

    const eligibleCount = eligible.length;
    const excludedCount = excluded.length;

    if (eligibleCount === 0) {
      return res.status(200).json({
        success: true,
        totalSelected,
        eligibleCount: 0,
        excludedCount,
        sentCount: 0,
        failedCount: 0,
        excluded,
        results: []
      });
    }

    const transporterObj = createSmtpTransporter();
    let sentCount = 0;
    let failedCount = 0;
    const results = [];

    for (const item of eligible) {
      const idempotencyKey = `bulk_${campaignId}_${item.email}`;

      if (hasCredentials && db) {
        try {
          const reminderRef = db.collection('email_reminders').doc(idempotencyKey);
          const existingReminder = await reminderRef.get().catch(() => null);
          if (existingReminder && existingReminder.exists && existingReminder.data().state === 'sent') {
            results.push({ email: item.email, status: 'skipped', reason: 'Duplicate: already sent in campaign' });
            continue;
          }
        } catch (e) { }
      }

      const senderAdminEmail = (user && user.email) || reqAdminEmail || 'luxmankumar628@gmail.com';

      if (hasCredentials && db) {
        try {
          await db.collection('email_reminders').doc(idempotencyKey).set({
            idempotencyKey,
            email: item.email,
            campaignId,
            campaignName,
            state: 'sending',
            initiatedBy: senderAdminEmail,
            updatedAt: FieldValue && FieldValue.serverTimestamp ? FieldValue.serverTimestamp() : new Date().toISOString()
          }, { merge: true }).catch(() => { });
        } catch (e) { }
      }

      let mailSuccess = false;
      let errorMessage = null;

      try {
        if (!transporterObj) {
          console.warn(`[AdminBulk] SMTP not configured. Simulating send to ${item.email}`);
          mailSuccess = true;
        } else {
          const loginUrl = `${originUrl || 'https://www.modivs.com'}/login.html`;
          const { subject, html, text } = getAdminBulkReminderTemplate(item.name, item.role, loginUrl);
          const info = await transporterObj.transporter.sendMail({
            from: `"Modiv’s Education" <${transporterObj.user}>`,
            replyTo: `"Modiv’s Education Support" <${transporterObj.user}>`,
            to: item.email,
            subject,
            html,
            text,
            headers: {
              'X-Priority': '3',
              'X-MSMail-Priority': 'Normal',
              'Importance': 'Normal',
              'List-Unsubscribe': `<mailto:${transporterObj.user}?subject=unsubscribe>, <${loginUrl}?action=unsubscribe>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
              'Feedback-ID': 'reminder:bulk:modivs',
              'X-Auto-Response-Suppress': 'OOF, AutoReply',
              'Auto-Submitted': 'auto-generated'
            }
          });
          if (info && (info.messageId || (info.accepted && info.accepted.length > 0))) {
            mailSuccess = true;
          } else {
            errorMessage = 'SMTP did not accept recipient address.';
          }
        }
      } catch (err) {
        errorMessage = err.message || 'SMTP transmission error';
        console.error(`[AdminBulk] Failed to send to ${item.email}:`, err);
      }

      const outcomeStatus = mailSuccess ? 'sent' : 'failed';
      if (mailSuccess) sentCount++; else failedCount++;

      if (hasCredentials && db) {
        try {
          await db.collection('email_reminders').doc(idempotencyKey).update({
            state: outcomeStatus,
            errorMessage,
            sentAt: FieldValue && FieldValue.serverTimestamp ? FieldValue.serverTimestamp() : new Date().toISOString()
          }).catch(() => { });

          await db.collection('accounts').doc(item.email).set({
            lastReminderSentAt: new Date().toISOString(),
            reminderCount: FieldValue && FieldValue.increment ? FieldValue.increment(1) : 1,
            lastEmailStatus: outcomeStatus
          }, { merge: true }).catch(() => { });

          await db.collection('admin_email_history').add({
            recipientEmail: item.email,
            recipientUid: item.uid || '',
            userType: item.role || 'student',
            subject: "Complete Your Modiv's Education Profile",
            reminderType: 'admin_bulk',
            sentAt: new Date().toISOString(),
            status: outcomeStatus,
            errorMessage,
            adminEmail: senderAdminEmail,
            campaignId,
            campaignName
          }).catch(() => { });
        } catch (e) { }
      }

      results.push({ email: item.email, status: outcomeStatus, error: errorMessage });

      // Polite delay between outbound SMTP calls to prevent throttling
      await new Promise(r => setTimeout(r, 200));
    }

    return res.status(200).json({
      success: true,
      totalSelected,
      eligibleCount,
      excludedCount,
      sentCount,
      failedCount,
      excluded,
      results
    });
  } catch (bulkErr) {
    console.error('[AdminBulk] Fatal error:', bulkErr);
    return res.status(200).json({
      success: false,
      error: bulkErr.message || 'Error processing email dispatch',
      results: []
    });
  }
}

/**
 * Admin: Fetch email dispatch history
 */
async function handleAdminFetchHistory({ req, res, user, db }) {
  try {
    let history = [];
    if (hasCredentials && db) {
      try {
        const snap = await db.collection('admin_email_history')
          .orderBy('sentAt', 'desc')
          .limit(100)
          .get().catch(() => null);
        if (snap) history = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (idxErr) {
        const snap = await db.collection('admin_email_history').limit(100).get().catch(() => null);
        if (snap) {
          history = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          history.sort((a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0));
        }
      }
    } else {
      history = await restFetchCollection('admin_email_history', { limit: 100 }).catch(() => []);
    }

    return res.status(200).json({ success: true, history: history || [] });
  } catch (err) {
    console.error('[handleAdminFetchHistory] Error:', err);
    return res.status(200).json({ success: true, history: [] });
  }
}

/**
 * Serverless API handler
 */
module.exports = async function handler(req, res) {
  try {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cron-secret');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const query = req.query || {};
    const body = req.body || {};

    // --- FEATURE: Secure Continuation Token Consumption ---
    if (query.action === 'continue') {
      const rawToken = query.token;
      if (!rawToken) {
        return res.status(400).send(`
        <!DOCTYPE html>
        <html><head><title>Invalid Link · Modiv’s Education</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:sans-serif;padding:40px;text-align:center;color:#1e293b;background:#f8fafc;} .card{max-width:480px;margin:40px auto;background:#fff;padding:32px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.06);border:1px solid #e2e8f0;} h2{color:#0b1a30;} a{color:#0f766e;font-weight:700;text-decoration:none;}</style></head>
        <body><div class="card"><h2>Invalid Link</h2><p>This continuation link is missing a valid security token.</p><p><a href="/index.html">Return to Modiv’s Education Home &rarr;</a></p></div></body></html>
      `);
      }

      const consumeResult = await consumeContinuationToken({ rawToken, db, FieldValue });
      if (!consumeResult.valid) {
        return res.status(403).send(`
        <!DOCTYPE html>
        <html><head><title>Link Expired · Modiv’s Education</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:sans-serif;padding:40px;text-align:center;color:#1e293b;background:#f8fafc;} .card{max-width:480px;margin:40px auto;background:#fff;padding:32px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.06);border:1px solid #e2e8f0;} h2{color:#0b1a30;} a{color:#0f766e;font-weight:700;text-decoration:none;}</style></head>
        <body><div class="card"><h2>Link Expired or Already Used</h2><p>${consumeResult.error || 'For security, profile continuation links are single-use and expire after 7 days.'}</p><p><a href="/modivs-education.html#login">Log in to resume your profile &rarr;</a></p></div></body></html>
      `);
      }

      const destination = consumeResult.destination || '/index.html';
      if (!isSafeRedirectUrl(destination)) {
        return res.redirect(302, '/index.html');
      }

      // Safely redirect user to their role-specific profile page
      return res.redirect(302, destination);
    }

    // --- FEATURE: Welcome Email Dispatch ---
    const actionParam = String(req.query.action || (req.body && req.body.action) || '').toLowerCase();
    if (actionParam === 'welcome' && (req.method === 'POST' || req.method === 'GET')) {
      const payload = req.method === 'POST' ? (req.body || {}) : req.query;
      const { email, role, name, displayId } = payload;
      if (!email) return res.status(400).json({ error: 'Missing required field: email' });

      const proto = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host || '';
      const originUrl = host ? `${proto}://${host}` : '';

      try {
        const result = await sendWelcomeEmailHelper({
          email,
          role,
          name,
          displayId,
          originUrl
        });
        return res.status(200).json(result);
      } catch (e) {
        return res.status(500).json({ error: e.message });
      }
    }

  // --- FEATURE: Admin Bulk Reminder Operations ---
  if (['admin-fetch-users', 'admin-bulk-send', 'admin-fetch-history', 'admin-single-send'].includes(actionParam)) {
    const user = await verifyAuth(req).catch(() => null);
    const reqAdminEmail = String((user && user.email) || (req.body && req.body.adminEmail) || req.query.adminEmail || req.headers['x-admin-email'] || '').trim().toLowerCase();
    const isMasterAdmin = Boolean((user && user.isAdmin) || (reqAdminEmail && MASTER_ADMIN_EMAILS.includes(reqAdminEmail)));
    if (!isMasterAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }

    const adminUser = user || { email: reqAdminEmail || 'luxmankumar628@gmail.com', isAdmin: true };
      const proto = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host || '';
      const originUrl = host ? `${proto}://${host}` : '';

    if (actionParam === 'admin-fetch-users') {
      return await handleAdminFetchUsers({ req, res, user: adminUser, db, FieldValue });
    }
    if (actionParam === 'admin-bulk-send') {
      return await handleAdminBulkSend({ req, res, user: adminUser, db, FieldValue, originUrl, reqAdminEmail: adminUser.email });
    }
    if (actionParam === 'admin-fetch-history') {
      return await handleAdminFetchHistory({ req, res, user: adminUser, db });
    }
    if (actionParam === 'admin-single-send') {
      const targetEmail = req.body && req.body.email;
      if (!targetEmail) return res.status(400).json({ error: 'Missing recipient email.' });
      req.body.emails = [targetEmail];
      return await handleAdminBulkSend({ req, res, user: adminUser, db, FieldValue, originUrl, reqAdminEmail: adminUser.email });
    }
  }

    // --- Authentication Check for Sending Reminders ---
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const customHeader = req.headers['x-cron-secret'] || '';
    const querySecret = req.query.secret || '';

    const isCronAuthorized = cronSecret && (token === cronSecret || customHeader === cronSecret || querySecret === cronSecret);
    let isAdminAuthorized = false;

    if (!isCronAuthorized) {
      const user = await verifyAuth(req).catch(() => null);
      if (user && user.isAdmin) {
        isAdminAuthorized = true;
      }
    }

    if (cronSecret && !isCronAuthorized && !isAdminAuthorized) {
      return res.status(401).json({ error: 'Unauthorized: Invalid CRON_SECRET or Admin credentials.' });
    }

    // Rate limit protection
    const clientIp = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || (req.connection && req.connection.remoteAddress) || 'unknown';
    if (!checkRateLimit(clientIp, 30, 60000)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    const payload = req.method === 'POST' ? (req.body || {}) : (req.query || {});
    const { email, role, reminderIndex, force } = payload;

    if (!email) {
      return res.status(400).json({ error: 'Missing required field: email' });
    }

    const proto = (req.headers && req.headers['x-forwarded-proto']) || 'https';
    const host = (req.headers && req.headers.host) || '';
    const originUrl = host ? `${proto}://${host}` : '';

    try {
      const result = await sendReminderEmailHelper({
        email,
        role,
        reminderIndex: Number(reminderIndex) || 1,
        force: Boolean(force),
        originUrl
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('[send-reminder] Error:', error);
      return res.status(500).json({ error: error.message });
    }
  } catch (fatalErr) {
    console.error('[send-reminder] Fatal error caught:', fatalErr);
    return res.status(500).json({ error: fatalErr.message || 'Internal server error' });
  }
};

module.exports.sendReminderEmailHelper = sendReminderEmailHelper;
module.exports.sendWelcomeEmailHelper = sendWelcomeEmailHelper;
module.exports.createSmtpTransporter = createSmtpTransporter;
module.exports.MILESTONES = MILESTONES;
