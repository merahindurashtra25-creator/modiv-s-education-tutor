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

const dns = require('dns');
const nodemailer = require('nodemailer');
const { admin, db, FieldValue, hasCredentials, restFetchCollection, restFetchDocument } = require('./_firebase');
const { getEmailTemplate, getWelcomeEmailTemplate, getAdminBulkReminderTemplate } = require('../lib/email-templates');
const {
  generateContinuationToken,
  consumeContinuationToken,
  isSafeRedirectUrl,
  ALLOWED_HOSTS
} = require('../lib/token-manager');
const { verifyAuth, MASTER_ADMIN_EMAILS } = require('./_auth');

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

// Global safety handlers to prevent Vercel node process termination on unhandled rejections or uncaught exceptions
if (!global.__unhandledRejectionSilencerInstalled) {
  global.__unhandledRejectionSilencerInstalled = true;
  process.on('unhandledRejection', (reason) => {
    console.warn('[send-reminder] Unhandled rejection intercepted:', (reason && reason.message) || reason);
  });
  process.on('uncaughtException', (err) => {
    console.warn('[send-reminder] Uncaught exception intercepted:', (err && err.message) || err);
  });
}

/**
 * Fast DNS pre-resolver using OS getaddrinfo (via dns.lookup) to bypass
 * Nodemailer c-ares DNS resolution timeouts in serverless/cloud environments.
 */
async function resolveHostIp(host) {
  if (!host || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return host;
  try {
    return await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(host), 2500);
      dns.lookup(host, { family: 4 }, (err, address) => {
        clearTimeout(timer);
        if (address) return resolve(address);
        dns.lookup(host, (err2, address2) => resolve(address2 || host));
      });
    });
  } catch (_) {
    return host;
  }
}

/**
 * Configure Nodemailer transporter with robust serverless timeouts,
 * explicit port configuration (465 SSL / 587 STARTTLS), and SNI support.
 */
function createSmtpTransporter(opts = {}) {
  const host = opts.host || process.env.SMTP_HOST || 'smtp.gmail.com';
  let port = Number(opts.port || process.env.SMTP_PORT) || 465;
  let user = opts.user || process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER || 'merahindurashtra25@gmail.com';
  let pass = opts.pass || process.env.SMTP_PASS || process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null; // Signals missing credentials if not configured
  }

  user = String(user).trim().replace(/^["']|["']$/g, '');
  pass = String(pass).trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');

  const isSecure = (port === 465) || (String(process.env.SMTP_SECURE).toLowerCase() === 'true' && port !== 587);

  const transportConfig = {
    host: opts.resolvedIp || host,
    port,
    secure: isSecure,
    requireTLS: !isSecure,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
    dnsTimeout: 8000,
    tls: {
      servername: host,
      rejectUnauthorized: false
    }
  };

  return {
    transporter: nodemailer.createTransport(transportConfig),
    user,
    configured: true,
    port,
    host
  };
}

/**
 * Resolve clean ASCII From/Reply-To aligned with the authenticated SMTP account
 * so Gmail/SPF/DKIM never flag a cross-domain sender mismatch as spam.
 */
function resolveFromAddress(smtp) {
  const authUser = (smtp && smtp.user) || 'merahindurashtra25@gmail.com';
  const rawFrom = String(process.env.SMTP_FROM || '').trim().replace(/^["']|["']$/g, '');
  const match = rawFrom.match(/<([^>]+)>/);
  const configuredEmail = (match ? match[1] : (rawFrom.includes('@') ? rawFrom : '')).trim().toLowerCase();
  const isGmailSmtp = !smtp || !smtp.host || smtp.host.includes('gmail');
  if (isGmailSmtp || !configuredEmail || configuredEmail === authUser.toLowerCase()) {
    return `"Modiv's Education" <${authUser}>`;
  }
  return rawFrom;
}

/**
 * Send email with automatic DNS resolution & port fallback (465 <-> 587)
 */
async function sendMailWithFallback(smtp, mailOptions) {
  if (!smtp || !smtp.configured) {
    return { simulated: true, messageId: 'simulated_' + Date.now() };
  }

  const host = smtp.host || 'smtp.gmail.com';
  const resolvedIp = await resolveHostIp(host);
  const primaryTransporter = (resolvedIp && resolvedIp !== host)
    ? createSmtpTransporter({ host, port: smtp.port, resolvedIp })
    : smtp;

  try {
    const info = await primaryTransporter.transporter.sendMail(mailOptions);
    return info;
  } catch (primaryErr) {
    console.warn(`[send-reminder] Primary SMTP port ${primaryTransporter.port} failed: ${primaryErr.message}. Attempting fallback port...`);
    try {
      const fallbackPort = primaryTransporter.port === 465 ? 587 : 465;
      const fallbackSmtp = createSmtpTransporter({ host, port: fallbackPort, resolvedIp });
      if (fallbackSmtp) {
        const info = await fallbackSmtp.transporter.sendMail(mailOptions);
        return info;
      }
    } catch (fallbackErr) {
      console.warn(`[send-reminder] Fallback SMTP failed: ${fallbackErr.message}`);
    }
    throw primaryErr;
  }
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

  // 2. Resolve canonical Base URL (avoid preview subdomains or redirect chains in emails)
  const canonicalBase = (originUrl && /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(originUrl))
    ? originUrl
    : (process.env.APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.modivs.com');

  // 3. Generate secure continuation link with SHA-256 token hashing
  let continuationUrl = `${canonicalBase}/login`;
  try {
    continuationUrl = await generateContinuationToken({
      email: cleanEmail,
      role: userRole,
      baseUrl: canonicalBase,
      expiryDays: 7,
      db: database,
      FieldValue
    });
  } catch (tokErr) {
    console.warn('[send-reminder] Token generation notice, falling back to direct URL:', tokErr.message);
    continuationUrl = `${canonicalBase}/${userRole === 'tutor' ? 'tutor-dashboard' : 'student-dashboard'}`;
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
  let fromAddress = resolveFromAddress(smtp);

  if (smtp && smtp.configured) {
    try {
      const mailOptions = {
        from: fromAddress,
        replyTo: fromAddress,
        to: cleanEmail,
        subject,
        html,
        text
      };
      const info = await sendMailWithFallback(smtp, mailOptions);
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

      if (hasCredentials && database) {
        await database.collection('accounts').doc(cleanEmail).set({
          reminderHistory: existingHistory,
          lastActivityAt: FieldValue ? FieldValue.serverTimestamp() : new Date().toISOString()
        }, { merge: true }).catch(() => { });
      }

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
    const fromAddress = resolveFromAddress(smtp);
    const mailOptions = {
      from: fromAddress,
      replyTo: fromAddress,
      to: cleanEmail,
      subject,
      text,
      html
    };

    const info = await sendMailWithFallback(smtp, mailOptions);
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
  const startTime = Date.now();
  const MAX_TIME_MS = 45000; // 45s execution limit for serverless batch processing

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
      if (Date.now() - startTime > MAX_TIME_MS) {
        console.warn(`[AdminBulk] Approaching deadline (${Date.now() - startTime}ms). Returning completed batch.`);
        break;
      }
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
      let messageId = null;

      try {
        if (!transporterObj) {
          errorMessage = 'SMTP credentials (SMTP_USER / SMTP_PASS) are missing in Vercel Environment Variables.';
        } else {
          const canonicalBase = (originUrl && /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(originUrl))
            ? originUrl
            : (process.env.APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.modivs.com');
          const loginUrl = `${canonicalBase.replace(/\/+$/, '')}/login`;
          const { subject, html, text } = getAdminBulkReminderTemplate(item.name, item.role, loginUrl);
          const fromAddress = resolveFromAddress(transporterObj);

          const mailOptions = {
            from: fromAddress,
            replyTo: fromAddress,
            to: item.email,
            subject,
            html,
            text
          };

          const info = await sendMailWithFallback(transporterObj, mailOptions);
          if (info && (info.messageId || (info.accepted && info.accepted.length > 0) || info.simulated)) {
            mailSuccess = true;
            messageId = info.messageId || null;
          } else {
            errorMessage = 'SMTP did not accept recipient address.';
          }
        }
      } catch (err) {
        errorMessage = err.message || 'SMTP transmission error';
        console.error(`[AdminBulk] Failed to send to ${item.email}:`, err.message);
      }

      const outcomeStatus = mailSuccess ? 'sent' : 'failed';
      if (mailSuccess) sentCount++; else failedCount++;

      if (hasCredentials && db) {
        try {
          await Promise.allSettled([
            db.collection('email_reminders').doc(idempotencyKey).set({
              state: outcomeStatus,
              errorMessage: errorMessage || null,
              sentAt: FieldValue && FieldValue.serverTimestamp ? FieldValue.serverTimestamp() : new Date().toISOString()
            }, { merge: true }),
            db.collection('accounts').doc(item.email).set({
              lastReminderSentAt: new Date().toISOString(),
              reminderCount: FieldValue && FieldValue.increment ? FieldValue.increment(mailSuccess ? 1 : 0) : (mailSuccess ? 1 : 0),
              lastEmailStatus: outcomeStatus
            }, { merge: true }),
            db.collection('admin_email_history').add({
              recipientEmail: item.email,
              recipientUid: item.uid || '',
              userType: item.role || 'student',
              subject: "Complete Your Modiv's Education Profile",
              reminderType: 'admin_bulk',
              sentAt: new Date().toISOString(),
              status: outcomeStatus,
              errorMessage: errorMessage || null,
              adminEmail: senderAdminEmail,
              campaignId,
              campaignName
            })
          ]);
        } catch (e) { }
      }

      results.push({ email: item.email, status: outcomeStatus, messageId, error: errorMessage });

      // Polite delay between outbound SMTP calls to prevent throttling
      await new Promise(r => setTimeout(r, 100));
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

    if (typeof req.body === 'string') {
      try { req.body = JSON.parse(req.body); } catch (_) { req.body = {}; }
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
  if (['admin-fetch-users', 'admin-bulk-send', 'admin-fetch-history', 'admin-single-send', 'admin-verify-smtp'].includes(actionParam)) {
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

    if (actionParam === 'admin-verify-smtp') {
      const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
      const ip = await resolveHostIp(smtpHost);
      const smtp = createSmtpTransporter({ resolvedIp: ip });
      if (!smtp || !smtp.configured) {
        return res.status(200).json({ success: false, configured: false, error: 'SMTP credentials not configured in environment.' });
      }
      try {
        const verified = await smtp.transporter.verify();
        return res.status(200).json({ success: true, verified: Boolean(verified), host: smtp.host, port: smtp.port, user: smtp.user });
      } catch (err) {
        try {
          const fallbackPort = smtp.port === 465 ? 587 : 465;
          const fb = createSmtpTransporter({ host: smtp.host, port: fallbackPort, resolvedIp: ip });
          const verifiedFb = fb && await fb.transporter.verify();
          return res.status(200).json({ success: true, verified: Boolean(verifiedFb), host: fb.host, port: fb.port, user: fb.user, fallbackUsed: true });
        } catch (fbErr) {
          return res.status(200).json({ success: false, error: err.message, code: err.code || 'ESMTP', fallbackError: fbErr.message });
        }
      }
    }

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
module.exports.sendMailWithFallback = sendMailWithFallback;
module.exports.MILESTONES = MILESTONES;
module.exports.maxDuration = 60;
module.exports.config = { maxDuration: 60 };
