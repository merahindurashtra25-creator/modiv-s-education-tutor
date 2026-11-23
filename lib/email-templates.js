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

/**
 * Base layout wrapper providing consistent branding, colors, and responsiveness.
 */
function wrapEmailLayout({ preheader, title, badge, contentHtml, ctaText, ctaUrl, footerNote }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased; }
    table { border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; }
    td { font-size: 15px; line-height: 1.6; }
    img { border: 0; outline: none; text-decoration: none; display: block; }
    .btn { display: inline-block; background-color: #0f766e; color: #ffffff !important; font-weight: 700; font-size: 16px; line-height: 1.2; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(15, 118, 110, 0.25); text-align: center; }
    .btn:hover { background-color: #115e59 !important; }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; padding: 12px !important; }
      .content-card { padding: 24px 18px !important; }
      .btn { display: block !important; width: 100% !important; box-sizing: border-box; }
    }
  </style>
</head>
<body style="background-color: #f1f5f9; margin: 0; padding: 24px 0;">
  <!-- Preheader text for inbox preview -->
  <div style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="container" style="max-width: 600px; width: 100%; margin: 0 auto;">
          
          <!-- Header Logo Banner -->
          <tr>
            <td align="center" style="padding: 10px 0 20px 0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <span style="font-size: 24px; font-weight: 800; color: #0b1a30; letter-spacing: -0.5px;">
                      Modiv’s <span style="color: #0f766e;">Education</span>
                    </span>
                    <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-top: 4px;">
                      Verified Home &amp; Online Tutors
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main White Content Card -->
          <tr>
            <td class="content-card" style="background-color: #ffffff; border-radius: 12px; padding: 36px 32px; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06); border: 1px solid #e2e8f0;">
              
              <!-- Category / Stage Badge -->
              ${badge ? `
              <div style="margin-bottom: 16px;">
                <span style="display: inline-block; background-color: #f0fdfa; color: #0f766e; border: 1px solid #ccfbf1; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; border-radius: 20px;">
                  ${escapeHtml(badge)}
                </span>
              </div>` : ''}

              <!-- Title -->
              <h1 style="color: #0b1a30; font-size: 22px; font-weight: 800; line-height: 1.35; margin: 0 0 18px 0;">
                ${escapeHtml(title)}
              </h1>

              <!-- Dynamic Body Content -->
              <div style="color: #334155; font-size: 15px; line-height: 1.65;">
                ${contentHtml}
              </div>

              <!-- Call to Action Button -->
              ${ctaUrl ? `
              <div style="text-align: center; margin: 32px 0 24px 0;">
                <a href="${escapeHtml(ctaUrl)}" class="btn" target="_blank" rel="noopener noreferrer">
                  ${escapeHtml(ctaText || 'Complete Your Profile')} &rarr;
                </a>
              </div>
              <p style="text-align: center; font-size: 12px; color: #64748b; margin: 0 0 16px 0;">
                🔒 Secure, one-click access &bull; Link valid for 7 days
              </p>
              <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #64748b; word-break: break-all; margin-top: 14px;">
                Or copy and paste this link in your browser:<br>
                <a href="${escapeHtml(ctaUrl)}" style="color: #0f766e; text-decoration: underline;">${escapeHtml(ctaUrl)}</a>
              </div>` : ''}

            </td>
          </tr>

          <!-- Footer Information -->
          <tr>
            <td style="padding: 24px 16px 12px 16px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.6;">
              <p style="margin: 0 0 8px 0;">
                ${footerNote || 'You are receiving this reminder because you recently started registering on Modiv’s Education.'}
              </p>
              <p style="margin: 0 0 8px 0;">
                Need help? Contact our team at <a href="mailto:support@modivs.com" style="color: #0f766e; text-decoration: none; font-weight: 600;">support@modivs.com</a> or call <a href="tel:+919896930443" style="color: #0f766e; text-decoration: none; font-weight: 600;">+91 98969 30443</a> / <a href="tel:+918054167008" style="color: #0f766e; text-decoration: none; font-weight: 600;">+91 80541 67008</a>.
              </p>
              <p style="margin: 0; color: #94a3b8;">
                &copy; 2026 Modiv’s Education &bull; Chandigarh, Mohali, Panchkula &bull; India
              </p>
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
      
      <div style="background-color: #f8fafc; border-left: 4px solid #0f766e; padding: 14px 16px; margin: 18px 0; border-radius: 0 6px 6px 0;">
        <h4 style="margin: 0 0 6px 0; color: #0b1a30; font-size: 14px;">Why complete your requirement today?</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569;">
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

      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 14px 18px; margin: 18px 0;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>Quick reminder:</strong> Without your grade and subject preferences, our matching engine cannot dispatch tutor requests to teachers in your vicinity.
        </p>
      </div>

      <p>Click below to pick up right where you left off. No need to start from scratch!</p>
    `,
    ctaText: "Resume &amp; Submit Requirement"
  },
  3: {
    // 48 Hours - Final Notice
    subject: "Final Notice: Complete your student request before it expires",
    preheader: "This is your final reminder. Your profile draft will be closed soon.",
    badge: "Final Notice",
    title: (name) => `Final reminder: Complete your learning request, ${name || 'Student'}`,
    content: (name, displayId) => `
      <p>This is a final reminder regarding your pending student profile and tutor requirement${displayId ? ` (ID: <strong>${displayId}</strong>)` : ''}.</p>
      <p>To keep our active student registry accurate for our tutors, incomplete profiles are automatically closed after 72 hours.</p>
      
      <p>If you still need a verified tutor for yourself or your child, please take a quick minute right now to finalize your subjects and contact details:</p>
      
      <ul style="padding-left: 20px; font-size: 14px; color: #475569; margin: 16px 0;">
        <li>100% verified &amp; background-checked teachers</li>
        <li>Flexible home tuition or interactive online live classes</li>
        <li>Zero advance obligation &bull; direct communication</li>
      </ul>
    `,
    ctaText: "Activate My Tutor Request Now"
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

      <div style="background-color: #f8fafc; border-left: 4px solid #0f766e; padding: 14px 16px; margin: 18px 0; border-radius: 0 6px 6px 0;">
        <h4 style="margin: 0 0 6px 0; color: #0b1a30; font-size: 14px;">3 simple steps to start earning:</h4>
        <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569;">
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

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin: 18px 0;">
        <h4 style="margin: 0 0 6px 0; color: #166534; font-size: 14px;">Benefits of an Approved Tutor Profile:</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #15803d;">
          <li style="margin-bottom: 4px;">Direct student &amp; parent connections without middleman barriers.</li>
          <li style="margin-bottom: 4px;">Teach home tuition locally or conduct online classes pan-India.</li>
          <li>Earn ₹15,000 to ₹60,000+ monthly on your own schedule.</li>
        </ul>
      </div>

      <p>Resume your profile setup with one click below:</p>
    `,
    ctaText: "Finish Profile &amp; Unlock Leads"
  },
  3: {
    // 48 Hours - Final Notice
    subject: "Final Notice: Complete your tutor registration to avoid deactivation",
    preheader: "Your tutor profile setup is pending. Take 2 minutes to submit it today.",
    badge: "Final Registration Notice",
    title: (name) => `Final reminder to complete your tutor profile, ${name || 'Educator'}`,
    content: (name, displayId) => `
      <p>We noticed you haven't yet finished setting up your tutor profile on Modiv’s Education${displayId ? ` (ID: <strong>${displayId}</strong>)` : ''}.</p>
      <p>Incomplete tutor profiles that remain inactive after 72 hours are automatically archived to ensure only active, verified teachers appear in our parent directory.</p>
      
      <p>If you wish to teach with Modiv’s Education, please submit your subjects, preferred locations, and qualifications now:</p>

      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px 18px; margin: 18px 0;">
        <p style="margin: 0; font-size: 13px; color: #991b1b;">
          <strong>Action Required:</strong> Click below to verify your details before this registration window closes.
        </p>
      </div>
    `,
    ctaText: "Complete &amp; Activate Tutor Profile"
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
      <ul style="padding-left: 20px; font-size: 14px; color: #475569; margin: 14px 0;">
        <li style="margin-bottom: 6px;">Connect with verified, top-rated home &amp; online tutors.</li>
        <li style="margin-bottom: 6px;">Access academic guidance, study plans, and video tutorials.</li>
        <li>Receive instant updates on special tuition batches and discounts.</li>
      </ul>
      <p>Pick up right where you left off with our secure continuation link:</p>
    `,
    ctaText: "Resume Account Setup"
  },
  3: {
    // 48 Hours - Final Notice
    subject: "Final Notice: Complete your Modiv’s Education profile",
    preheader: "Your account setup is pending. Click here to complete it before it expires.",
    badge: "Final Notice",
    title: (name) => `Final reminder: Complete your profile, ${name || 'Member'}`,
    content: (name, displayId) => `
      <p>This is a final reminder to complete your profile setup on Modiv’s Education${displayId ? ` (ID: <strong>${displayId}</strong>)` : ''}.</p>
      <p>Incomplete accounts that remain inactive for over 72 hours are moved to inactive status. If you would like to keep your account active and access our learning platform, please finalize your details now.</p>
    `,
    ctaText: "Finalize My Account Now"
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
    subject: "Welcome to Modiv’s Education! Your Student Account is Ready 🎓",
    preheader: "Welcome to Modiv’s Education! Find verified home & online tutors and book demo classes.",
    badge: "Welcome Student / Parent",
    title: (name) => `Welcome to Modiv’s Education, ${name || 'Student'}! 🎓`,
    content: (name, displayId) => `
      <p>Thank you for joining <strong>Modiv’s Education</strong>! Your account has been registered successfully.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: #0b1a30; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Your Account Details</h4>
        <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Role:</strong> Student / Parent</p>
        ${displayId ? `<p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Student ID:</strong> <span style="background-color: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-weight: 700;">${escapeHtml(displayId)}</span></p>` : ''}
      </div>

      <div style="background-color: #f0fdfa; border-left: 4px solid #0f766e; padding: 14px 16px; margin: 18px 0; border-radius: 0 6px 6px 0;">
        <h4 style="margin: 0 0 6px 0; color: #0b1a30; font-size: 14px;">What can you do now?</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569;">
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
    subject: "Welcome to Modiv’s Education – Complete your Tutor Profile 👨‍🏫",
    preheader: "Welcome Teacher! Complete your tutor profile to get verified and start receiving student leads.",
    badge: "Welcome Teacher / Tutor",
    title: (name) => `Welcome to the Modivian Teaching Family, ${name || 'Teacher'}! 👨‍🏫`,
    content: (name, displayId) => `
      <p>Congratulations and welcome to <strong>Modiv’s Education</strong>! We are excited to have you join our verified educator network.</p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: #0b1a30; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Your Tutor Account Details</h4>
        <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Role:</strong> Verified Educator / Tutor</p>
        ${displayId ? `<p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Tutor ID:</strong> <span style="background-color: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: 4px; font-weight: 700;">${escapeHtml(displayId)}</span></p>` : ''}
      </div>

      <div style="background-color: #f0fdfa; border-left: 4px solid #0f766e; padding: 14px 16px; margin: 18px 0; border-radius: 0 6px 6px 0;">
        <h4 style="margin: 0 0 6px 0; color: #0b1a30; font-size: 14px;">Next steps to start teaching:</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569;">
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
    subject: "Welcome to Modiv’s Education! 🎉",
    preheader: "Welcome to Modiv’s Education! Start learning with expert tutors.",
    badge: "Welcome",
    title: (name) => `Welcome to Modiv’s Education, ${name || 'Friend'}! 🎉`,
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
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Hello <strong>${escapeHtml(cleanName)}</strong>,</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
      We noticed that your Modiv's Education profile is still incomplete.
    </p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
      Please complete your profile to access all the relevant platform features and opportunities.
    </p>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #334155; line-height: 1.6;">
      Log in to your account and complete your remaining profile information.
    </p>
    <p style="margin: 24px 0 0 0; font-size: 15px; color: #475569;">
      Thank you,<br>
      <strong>Modiv's Education Team</strong>
    </p>
  `;

  const html = wrapEmailLayout({
    preheader: "Complete your profile to access all platform features and opportunities.",
    title: "Complete Your Profile",
    badge: "Action Required",
    contentHtml,
    ctaText: "Complete Your Profile",
    ctaUrl: url,
    footerNote: "You received this reminder because your profile on modivs.com is pending completion."
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
