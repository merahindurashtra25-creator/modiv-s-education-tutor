/**
 * Modiv's Education - Automatic Email Reminder Templates
 * 
 * Provides professional, mobile-responsive HTML and plaintext email templates
 * for:
 * 1. Student / Parent Onboarding
 * 2. Tutor Onboarding
 * 3. General User Onboarding
 * 
 * Covers all 3 reminder intervals:
 * - Stage 1 (30 Minutes after signup)
 * - Stage 2 (24 Hours after signup)
 * - Stage 3 (48 Hours after signup - Final Notice)
 */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const BRAND = {
  navy: '#1A2035',
  yellow: '#EBB92E',
  cream: '#FEF7EA',
  muted: '#555b78',
  line: '#eadfc9',
  card: '#ffffff',
  soft: '#fff9e6',
  chip: '#ecdfc6'
};

/**
 * Base layout wrapper providing consistent website branding, colors, and responsiveness.
 */
function wrapEmailLayout({ title, contentHtml, ctaText, ctaUrl, footerNote }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:24px 12px;background-color:${BRAND.cream};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.navy};">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background-color:${BRAND.card};border:1px solid ${BRAND.line};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:20px 28px;background-color:${BRAND.navy};border-bottom:3px solid ${BRAND.yellow};">
              <div style="font-size:20px;font-weight:800;color:${BRAND.cream};letter-spacing:-0.01em;">Modiv’s <span style="background-color:${BRAND.yellow};color:${BRAND.navy};padding:2px 8px;border-radius:6px;display:inline-block;">Education</span></div>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 28px;font-size:15px;line-height:1.6;color:${BRAND.navy};">
              <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;line-height:1.35;color:${BRAND.navy};">${escapeHtml(title)}</h1>
              ${contentHtml}
              ${ctaUrl ? `
              <div style="margin:24px 0 8px 0;">
                <a href="${escapeHtml(ctaUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:${BRAND.yellow};color:${BRAND.navy};font-weight:700;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:8px;">
                  ${escapeHtml(ctaText || 'Complete Your Profile')}
                </a>
              </div>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 22px 28px;background-color:${BRAND.cream};border-top:1px solid ${BRAND.line};font-size:12px;line-height:1.5;color:${BRAND.muted};">
              <p style="margin:0 0 6px 0;">${footerNote || 'You received this message regarding your account on Modiv’s Education.'}</p>
              <p style="margin:0;">Modiv’s Education &bull; Chandigarh, Mohali, Panchkula &bull; <a href="https://www.modivs.com" style="color:${BRAND.navy};font-weight:700;text-decoration:none;">www.modivs.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 1. STUDENT / PARENT EMAIL TEMPLATES
 */
const STUDENT_TEMPLATES = {
  1: {
    // 30 Minutes
    subject: "Finish your request: Verified home & online tutors are waiting to help",
    preheader: "Complete your student requirement in 2 minutes to get matched with verified tutors.",
    badge: "Step 2 of 2: Requirement Details",
    title: (name) => `Hello ${name || 'Student/Parent'}, your tutor search is almost complete!`,
    content: (name, displayId) => `
      <p>We noticed you recently started your tutor requirement on <strong>Modiv’s Education</strong>${displayId ? ` (Reference ID: <strong>${displayId}</strong>)` : ''}, but didn't finish submitting your subjects and class details.</p>
      
      <div style="background-color: ${BRAND.cream}; border: 1px solid ${BRAND.line}; border-left: 4px solid ${BRAND.yellow}; padding: 14px 16px; margin: 18px 0; border-radius: 0 8px 8px 0;">
        <h4 style="margin: 0 0 6px 0; color: ${BRAND.navy}; font-size: 14px;">Why complete your requirement today?</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: ${BRAND.muted};">
          <li style="margin-bottom: 4px;"><strong>Verified Tutors:</strong> Top qualified home &amp; online tutors in your local area.</li>
          <li style="margin-bottom: 4px;"><strong>Free Demo Class:</strong> Schedule a 1-on-1 trial session before confirming.</li>
          <li><strong>Personalized Attention:</strong> CBSE, ICSE, State Boards, and competitive exams.</li>
        </ul>
      </div>

      <p>It takes less than <strong>2 minutes</strong> to tell us your class, subjects, and preferred class timings so we can connect you with top-rated tutors immediately.</p>
    `,
    ctaText: "Complete Your Tutor Request"
  },
  2: {
    // 24 Hours
    subject: "Tutors are actively reviewing student requests in your area",
    preheader: "Don't miss out on verified teachers near you. Finish your request in 1 minute.",
    badge: "24-Hour Follow Up",
    title: (name) => `Hi ${name || 'there'}, find the perfect home or online tutor today`,
    content: (name, displayId) => `
      <p>It's been 24 hours since you started setting up your student profile on Modiv’s Education${displayId ? ` (ID: <strong>${displayId}</strong>)` : ''}.</p>
      <p>We have hundreds of verified tutors across Chandigarh, Mohali, Panchkula, and all-India online classes ready to help with mathematics, science, languages, and all academic subjects.</p>

      <div style="background-color: ${BRAND.soft}; border: 1px solid ${BRAND.yellow}; border-radius: 8px; padding: 14px 18px; margin: 18px 0;">
        <p style="margin: 0; font-size: 14px; color: ${BRAND.navy};">
          <strong>Quick reminder:</strong> Without your grade and subject preferences, our matching engine cannot dispatch tutor requests to teachers in your vicinity.
        </p>
      </div>

      <p>Click below to pick up right where you left off. No need to start from scratch!</p>
    `,
    ctaText: "Resume &amp; Submit Requirement"
  },
  3: {
    // 48 Hours - Final Reminder
    subject: "Reminder: Complete your student request on Modiv’s Education",
    preheader: "Your student profile draft is still open if you need a tutor.",
    badge: "Profile Reminder",
    title: (name) => `Reminder: Complete your learning request, ${name || 'Student'}`,
    content: (name, displayId) => `
      <p>This is a friendly reminder regarding your pending student profile and tutor requirement${displayId ? ` (ID: <strong>${displayId}</strong>)` : ''}.</p>
      <p>To keep our active student list up to date for our tutors, incomplete drafts are closed after 72 hours.</p>
      
      <p>If you still need a tutor for yourself or your child, please take a quick minute to add your subjects and contact details:</p>
      
      <ul style="padding-left: 20px; font-size: 14px; color: ${BRAND.muted}; margin: 16px 0;">
        <li>Verified and background-checked teachers</li>
        <li>Flexible home tuition or interactive online live classes</li>
        <li>Direct communication with no advance obligation</li>
      </ul>
    `,
    ctaText: "Complete My Tutor Request"
  }
};

/**
 * 2. TUTOR EMAIL TEMPLATES
 */
const TUTOR_TEMPLATES = {
  1: {
    // 30 Minutes
    subject: "Activate your tutor profile: Students are searching in your city",
    preheader: "Complete your teaching subjects and qualifications to start receiving student leads.",
    badge: "Tutor Profile Setup",
    title: (name) => `Welcome to Modiv’s Education, ${name || 'Teacher'}!`,
    content: (name, displayId) => `
      <p>Thank you for registering as an educator on <strong>Modiv’s Education</strong>${displayId ? ` (Tutor ID: <strong>${displayId}</strong>)` : ''}.</p>
      <p>Your account is created, but your tutor profile is currently <strong>incomplete</strong>. Parents and students cannot find your profile or request demo classes until you submit your teaching details.</p>

      <div style="background-color: ${BRAND.cream}; border: 1px solid ${BRAND.line}; border-left: 4px solid ${BRAND.yellow}; padding: 14px 16px; margin: 18px 0; border-radius: 0 8px 8px 0;">
        <h4 style="margin: 0 0 6px 0; color: ${BRAND.navy}; font-size: 14px;">3 simple steps to start earning:</h4>
        <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: ${BRAND.muted};">
          <li style="margin-bottom: 4px;"><strong>Select your subjects &amp; classes:</strong> Let students know what you teach.</li>
          <li style="margin-bottom: 4px;"><strong>Set your tuition fee &amp; city:</strong> Choose your hourly rates and travel preferences.</li>
          <li><strong>Add experience &amp; qualifications:</strong> Build trust with parents to get hired faster.</li>
        </ol>
      </div>

      <p>Click below to complete your profile in just 2 minutes and start receiving verified student leads!</p>
    `,
    ctaText: "Complete Tutor Profile"
  },
  2: {
    // 24 Hours
    subject: "New student tuition leads are waiting for verified tutors",
    preheader: "Students in your area need tutors right now. Finish your profile to apply.",
    badge: "High Student Demand",
    title: (name) => `Don't miss out on local tuition leads, ${name || 'Tutor'}`,
    content: (name, displayId) => `
      <p>Over the last 24 hours, new student inquiries for home and online tuition have been posted on Modiv’s Education${displayId ? ` (Your ID: <strong>${displayId}</strong>)` : ''}.</p>
      <p>Because your tutor profile is still incomplete, you cannot currently view contact details or apply for these active leads.</p>

      <div style="background-color: ${BRAND.cream}; border: 1px solid ${BRAND.line}; border-left: 4px solid ${BRAND.yellow}; border-radius: 0 8px 8px 0; padding: 14px 18px; margin: 18px 0;">
        <h4 style="margin: 0 0 6px 0; color: ${BRAND.navy}; font-size: 14px;">Benefits of an Approved Tutor Profile:</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: ${BRAND.muted};">
          <li style="margin-bottom: 4px;">Direct student &amp; parent connections without middleman barriers.</li>
          <li style="margin-bottom: 4px;">Teach home tuition locally or conduct online classes pan-India.</li>
          <li>Teach on your own preferred schedule and fee rates.</li>
        </ul>
      </div>

      <p>Resume your profile setup with the link below:</p>
    `,
    ctaText: "Complete Tutor Profile"
  },
  3: {
    // 48 Hours - Final Reminder
    subject: "Reminder: Complete your tutor profile on Modiv’s Education",
    preheader: "Your tutor profile setup is still pending.",
    badge: "Profile Reminder",
    title: (name) => `Reminder to complete your tutor profile, ${name || 'Educator'}`,
    content: (name, displayId) => `
      <p>We noticed you have not yet finished setting up your tutor profile on Modiv’s Education${displayId ? ` (ID: <strong>${displayId}</strong>)` : ''}.</p>
      <p>Incomplete tutor profiles that remain inactive after 72 hours are archived to keep our directory accurate for parents and students.</p>
      
      <p>If you wish to teach with Modiv’s Education, please submit your subjects, preferred locations, and qualifications using the button below:</p>
    `,
    ctaText: "Complete Tutor Profile"
  }
};

/**
 * 3. GENERAL USER EMAIL TEMPLATES
 */
const USER_TEMPLATES = {
  1: {
    // 30 Minutes
    subject: "Complete your account setup on Modiv’s Education",
    preheader: "Finish setting up your profile to explore verified tutors, study materials, and courses.",
    badge: "Account Setup",
    title: (name) => `Welcome to Modiv’s Education, ${name || 'Member'}!`,
    content: (name, displayId) => `
      <p>Thank you for creating an account on <strong>Modiv’s Education</strong>${displayId ? ` (Account ID: <strong>${displayId}</strong>)` : ''}.</p>
      <p>To get the most out of your experience, please take a moment to complete your profile preferences. Whether you are looking for a verified home tutor, online classes, or exploring educational guidance, having your profile ready unlocks all features.</p>
      <p>Click the button below to resume and finalize your account setup:</p>
    `,
    ctaText: "Complete Account Setup"
  },
  2: {
    // 24 Hours
    subject: "Explore verified tutors and learning resources on Modiv’s Education",
    preheader: "Finish setting up your account preferences to unlock full platform access.",
    badge: "Account Follow Up",
    title: (name) => `Your learning journey is waiting, ${name || 'there'}`,
    content: (name, displayId) => `
      <p>We noticed you started creating your account on Modiv’s Education yesterday${displayId ? ` (ID: <strong>${displayId}</strong>)` : ''}.</p>
      <p>With an active profile, you can:</p>
      <ul style="padding-left: 20px; font-size: 14px; color: ${BRAND.muted}; margin: 14px 0;">
        <li style="margin-bottom: 6px;">Connect with verified, top-rated home &amp; online tutors.</li>
        <li style="margin-bottom: 6px;">Access academic guidance, study plans, and video tutorials.</li>
        <li>Stay updated on study resources and tuition batch schedules.</li>
      </ul>
      <p>Pick up right where you left off using the link below:</p>
    `,
    ctaText: "Resume Account Setup"
  },
  3: {
    // 48 Hours - Final Reminder
    subject: "Reminder: Complete your Modiv’s Education profile",
    preheader: "Your account setup is still pending.",
    badge: "Profile Reminder",
    title: (name) => `Reminder: Complete your profile, ${name || 'Member'}`,
    content: (name, displayId) => `
      <p>This is a friendly reminder to complete your profile setup on Modiv’s Education${displayId ? ` (ID: <strong>${displayId}</strong>)` : ''}.</p>
      <p>Incomplete accounts that remain inactive for over 72 hours are moved to inactive status. If you would like to keep your account active, please finalize your details.</p>
    `,
    ctaText: "Complete My Account"
  }
};

/**
 * Returns subject, HTML string, and plain text string for given role & reminder index (1, 2, or 3).
 */
function getEmailTemplate({ role = 'student', reminderIndex = 1, recipientName = '', continuationUrl = '', displayId = '', email = '' }) {
  const normalizedRole = String(role || '').toLowerCase();
  const index = Math.min(Math.max(Number(reminderIndex) || 1, 1), 3);

  let roleMap = STUDENT_TEMPLATES;
  if (normalizedRole === 'tutor') {
    roleMap = TUTOR_TEMPLATES;
  } else if (normalizedRole === 'user') {
    roleMap = USER_TEMPLATES;
  }

  const tpl = roleMap[index] || roleMap[1];
  const name = recipientName || (email ? email.split('@')[0] : '');

  const title = typeof tpl.title === 'function' ? tpl.title(name) : tpl.title;
  const contentHtml = typeof tpl.content === 'function' ? tpl.content(name, displayId) : tpl.content;

  const html = wrapEmailLayout({
    preheader: tpl.preheader,
    title,
    badge: tpl.badge,
    contentHtml,
    ctaText: tpl.ctaText,
    ctaUrl: continuationUrl,
    footerNote: `This is an automated reminder regarding your registration on Modiv’s Education (${normalizedRole} account).`
  });

  const text = `${title}

${tpl.preheader}

Please complete your profile using the link below:
${continuationUrl}

(Note: This link is secure and valid for 7 days.)

Need assistance? Contact support@modivs.com or call +91 98969 30443 / +91 80541 67008.
© 2026 Modiv’s Education. All rights reserved.`;

  return {
    subject: tpl.subject,
    html,
    text
  };
}

/**
 * WELCOME EMAIL TEMPLATES
 * Sent immediately after a student, tutor, or general user registers.
 */
const WELCOME_TEMPLATES = {
  student: {
    subject: "Welcome to Modiv’s Education - Student Account Ready",
    preheader: "Your student account on Modiv's Education is ready.",
    badge: "Student / Parent",
    title: (name) => `Welcome to Modiv’s Education, ${name || 'Student'}`,
    content: (name, displayId) => `
      <p>Thank you for joining <strong>Modiv’s Education</strong>! Your account has been registered successfully.</p>
      
      <div style="background-color: ${BRAND.cream}; border: 1px solid ${BRAND.line}; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: ${BRAND.navy}; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Your Account Details</h4>
        <p style="margin: 4px 0; font-size: 14px; color: ${BRAND.navy};"><strong>Role:</strong> Student / Parent</p>
        ${displayId ? `<p style="margin: 4px 0; font-size: 14px; color: ${BRAND.navy};"><strong>Student ID:</strong> <span style="background-color: ${BRAND.yellow}; color: ${BRAND.navy}; padding: 2px 8px; border-radius: 4px; font-weight: 700;">${escapeHtml(displayId)}</span></p>` : ''}
      </div>

      <div style="background-color: ${BRAND.soft}; border: 1px solid ${BRAND.line}; border-left: 4px solid ${BRAND.yellow}; padding: 14px 16px; margin: 18px 0; border-radius: 0 8px 8px 0;">
        <h4 style="margin: 0 0 6px 0; color: ${BRAND.navy}; font-size: 14px;">What can you do now?</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: ${BRAND.muted};">
          <li style="margin-bottom: 4px;"><strong>Find Tutors:</strong> Browse verified home and online tutors in your city.</li>
          <li style="margin-bottom: 4px;"><strong>Book Free Demo:</strong> Request trial classes with expert tutors before committing.</li>
          <li style="margin-bottom: 4px;"><strong>Direct Chat:</strong> Discuss syllabus, fees, and timings directly with tutors.</li>
          <li><strong>Student Dashboard:</strong> Track your tuition requests and schedule in real time.</li>
        </ul>
      </div>

      <p>Click below to open your Student Dashboard and explore matching tutors:</p>
    `,
    ctaText: "Open Student Dashboard",
    defaultPath: "/student-dashboard"
  },
  tutor: {
    subject: "Welcome to Modiv’s Education - Complete Your Tutor Profile",
    preheader: "Complete your tutor profile to appear in search results.",
    badge: "Tutor Profile",
    title: (name) => `Welcome to Modiv’s Education, ${name || 'Teacher'}`,
    content: (name, displayId) => `
      <p>Congratulations and welcome to <strong>Modiv’s Education</strong>! We are excited to have you join our verified educator network.</p>

      <div style="background-color: ${BRAND.cream}; border: 1px solid ${BRAND.line}; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: ${BRAND.navy}; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Your Tutor Account Details</h4>
        <p style="margin: 4px 0; font-size: 14px; color: ${BRAND.navy};"><strong>Role:</strong> Verified Educator / Tutor</p>
        ${displayId ? `<p style="margin: 4px 0; font-size: 14px; color: ${BRAND.navy};"><strong>Tutor ID:</strong> <span style="background-color: ${BRAND.yellow}; color: ${BRAND.navy}; padding: 2px 8px; border-radius: 4px; font-weight: 700;">${escapeHtml(displayId)}</span></p>` : ''}
      </div>

      <div style="background-color: ${BRAND.soft}; border: 1px solid ${BRAND.line}; border-left: 4px solid ${BRAND.yellow}; padding: 14px 16px; margin: 18px 0; border-radius: 0 8px 8px 0;">
        <h4 style="margin: 0 0 6px 0; color: ${BRAND.navy}; font-size: 14px;">Next steps to start teaching:</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: ${BRAND.muted};">
          <li style="margin-bottom: 4px;"><strong>Complete Profile:</strong> Add your subjects, qualifications, hourly fees, and preferred localities.</li>
          <li style="margin-bottom: 4px;"><strong>Get Verified:</strong> Upload verification details to receive the blue Verified Badge that parents trust.</li>
          <li><strong>Apply for Leads:</strong> View active student requirements in your area and connect with parents directly.</li>
        </ul>
      </div>

      <p>Open your Tutor Dashboard now to complete your profile setup:</p>
    `,
    ctaText: "Open Tutor Dashboard",
    defaultPath: "/tutor-dashboard"
  },
  user: {
    subject: "Welcome to Modiv’s Education",
    preheader: "Your account on Modiv's Education is active.",
    badge: "Welcome",
    title: (name) => `Welcome to Modiv’s Education, ${name || 'Member'}`,
    content: (name, displayId) => `
      <p>Thank you for creating an account on <strong>Modiv’s Education</strong>! Your account is active and ready to use.</p>
      <p>Explore verified tutors, free study materials, and learning resources anytime.</p>
    `,
    ctaText: "Explore Modiv’s Education",
    defaultPath: "/"
  }
};

/**
 * Returns subject, HTML string, and plain text string for a welcome email.
 */
function getWelcomeEmailTemplate({ role = 'student', recipientName = '', displayId = '', email = '', originUrl = '' }) {
  const normalizedRole = String(role || '').toLowerCase();
  let tpl = WELCOME_TEMPLATES.student;
  if (normalizedRole === 'tutor') {
    tpl = WELCOME_TEMPLATES.tutor;
  } else if (normalizedRole === 'user') {
    tpl = WELCOME_TEMPLATES.user;
  }

  const name = recipientName || (email ? email.split('@')[0] : '');
  const title = typeof tpl.title === 'function' ? tpl.title(name) : tpl.title;
  const contentHtml = typeof tpl.content === 'function' ? tpl.content(name, displayId) : tpl.content;
  const targetUrl = originUrl ? `${originUrl.replace(/\/$/, '')}${tpl.defaultPath}` : `https://www.modivs.com${tpl.defaultPath}`;

  const html = wrapEmailLayout({
    preheader: tpl.preheader,
    title,
    badge: tpl.badge,
    contentHtml,
    ctaText: tpl.ctaText,
    ctaUrl: targetUrl,
    footerNote: `Welcome to Modiv’s Education! You are receiving this email because you registered on modivs.com.`
  });

  const text = `${title}

${tpl.preheader}

Access your dashboard here:
${targetUrl}

Need assistance? Contact support@modivs.com or call +91 98969 30443 / +91 80541 67008.
© 2026 Modiv’s Education. All rights reserved.`;

  return {
    subject: tpl.subject,
    html,
    text
  };
}

/**
 * Returns Admin Bulk Reminder email template matching user requirements
 */
function getAdminBulkReminderTemplate(userName, userType, targetUrl) {
  const cleanName = (userName && userName.trim()) ? userName.trim() : 'User';
  const url = targetUrl || 'https://www.modivs.com/login.html';
  const subject = "Complete Your Modiv's Education Profile";

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 16px; color: ${BRAND.navy};">Hello <strong>${escapeHtml(cleanName)}</strong>,</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: ${BRAND.navy}; line-height: 1.6;">
      We noticed that your Modiv's Education profile is still incomplete.
    </p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: ${BRAND.navy}; line-height: 1.6;">
      Please complete your profile to access all the relevant platform features and opportunities.
    </p>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: ${BRAND.navy}; line-height: 1.6;">
      Log in to your account and complete your remaining profile information.
    </p>
    <p style="margin: 24px 0 0 0; font-size: 15px; color: ${BRAND.muted};">
      Thank you,<br>
      <strong style="color: ${BRAND.navy};">Modiv's Education Team</strong>
    </p>
  `;

  const html = wrapEmailLayout({
    title: "Complete Your Modiv's Education Profile",
    contentHtml,
    ctaText: "Complete Your Profile",
    ctaUrl: url,
    footerNote: "You received this reminder because your profile on Modiv's Education is pending completion."
  });

  const text = `Hello ${cleanName},

We noticed that your Modiv's Education profile is still incomplete.
Please complete your profile to access all the relevant platform features and opportunities.
Log in to your account and complete your remaining profile information.

Complete your profile: ${url}

Thank you,
Modiv's Education Team`;

  return { subject, html, text };
}

module.exports = {
  getEmailTemplate,
  getWelcomeEmailTemplate,
  getAdminBulkReminderTemplate,
  WELCOME_TEMPLATES,
  STUDENT_TEMPLATES,
  TUTOR_TEMPLATES,
  USER_TEMPLATES,
  wrapEmailLayout
};
