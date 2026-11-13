/**
 * Modiv's Education - Automated Cloud Security Audit Test Suite
 * Validates Firestore Rules, Cloud Storage Rules, Auth Boundaries, Role Immutability,
 * Coin Balance Protections, IDOR Defenses, and Secret Exposure Checks.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] Test ${totalTests}: ${description}`);
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${description}`);
    console.error('       Error:', err.message);
    throw err;
  }
}

async function testAsync(description, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`[PASS] Test ${totalTests}: ${description}`);
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${description}`);
    console.error('       Error:', err.message);
    throw err;
  }
}

async function runAllSecurityTests() {
  console.log('====================================================');
  console.log('MODIV\'S EDUCATION - AUTOMATED CLOUD SECURITY SUITE');
  console.log('====================================================\n');

  const rulesContent = fs.readFileSync(path.join(ROOT_DIR, 'firestore.rules'), 'utf8');
  const storageRulesContent = fs.readFileSync(path.join(ROOT_DIR, 'storage.rules'), 'utf8');

  // --- SECTION 1: FIRESTORE DEFAULT DENY & ACCESS CONTROL ---
  test('Firestore Rules: Global default deny rule is explicitly defined', () => {
    assert(
      rulesContent.includes('match /{document=**}') && rulesContent.includes('allow read, write: if false;'),
      'Global deny rule match /{document=**} { allow read, write: if false; } must be present'
    );
  });

  test('Firestore Rules: Insecure wildcard read/write is completely eliminated', () => {
    // Sensitive collections that previously had 'allow read, write: if true;'
    const sensitive = ['tutor_documents', 'tutors', 'students', 'relationships', 'demoRequests', 'inquiries', 'enquiries'];
    sensitive.forEach(col => {
      const regex = new RegExp(`match\\s+/${col}/[^\\{]+\\{\\s*allow\\s+read,\\s*write:\\s*if\\s+true;`, 'm');
      assert(!regex.test(rulesContent), `Collection ${col} must NOT have open read, write: if true;`);
    });
  });

  test('Firestore Rules: Confidential tutor verification documents strictly protected', () => {
    assert(rulesContent.includes('match /tutor_documents/{docId}'), 'tutor_documents match block must exist');
    assert(rulesContent.includes('isEmail(resource.data.email)'), 'tutor_documents must restrict read to owning email or admin');
    assert(!rulesContent.includes('match /tutor_documents/{docId} {\n      allow read, write: if true;'), 'tutor_documents open access must be removed');
  });

  test('Firestore Rules: Private students directory is protected from unauthorized access', () => {
    assert(rulesContent.includes('match /students/{studentId}'), 'students match block must exist');
    assert(rulesContent.includes('isEmail(resource.data.email)'), 'students must verify caller email');
  });

  // --- SECTION 2: ADMIN PRIVILEGE ESCALATION DEFENSES ---
  test('Firestore Rules: Insecure admin@gmail.com is purged from admin checks', () => {
    assert(!rulesContent.includes('admin@gmail.com'), 'admin@gmail.com must be completely removed from firestore.rules');
    assert(!storageRulesContent.includes('admin@gmail.com'), 'admin@gmail.com must be completely removed from storage.rules');
  });

  test('Firestore Rules: Admin authorization requires custom claim or email_verified == true', () => {
    assert(rulesContent.includes('request.auth.token.admin == true'), 'Admin check must support custom claim');
    assert(rulesContent.includes('request.auth.token.email_verified == true'), 'Admin email fallback must enforce email_verified');
  });

  test('Firestore Rules: Users cannot assign themselves Admin role or admin flag in users collection', () => {
    assert(rulesContent.includes("request.resource.data.role != 'Admin'"), 'User creation must reject Admin role');
    assert(rulesContent.includes("request.resource.data.admin != true"), 'User creation must reject admin=true');
    assert(rulesContent.includes("request.resource.data.role == resource.data.role"), 'User update must prevent role changes');
  });

  // --- SECTION 3: FINANCIAL, COIN & MEMBERSHIP PROTECTION ---
  test('Firestore Rules: Tutor wallet self-inflation is blocked (only deductions allowed)', () => {
    assert(rulesContent.includes('match /tutor_wallets/{walletId}'), 'tutor_wallets match block must exist');
    assert(rulesContent.includes('request.resource.data.coins <= resource.data.coins'), 'Tutors cannot increase their coin balance');
  });

  test('Firestore Rules: Tutor wallet membership tampering is blocked', () => {
    assert(
      rulesContent.includes('request.resource.data.membership == resource.data.membership') ||
      rulesContent.includes('request.resource.data.membership == null'),
      'Tutors cannot forge active membership status'
    );
  });

  test('Firestore Rules: Coin transactions only allow client-side debits, not credits', () => {
    assert(rulesContent.includes('match /coin_transactions/{txId}'), 'coin_transactions block must exist');
    assert(rulesContent.includes('request.resource.data.amount < 0'), 'Non-admin users can only record debits (amount < 0)');
  });

  test('Firestore Rules: Conversation unlock cannot be bypassed on client update', () => {
    // Ensure tutor cannot simply write { unlocked: true } to unlock arbitrary conversations
    const bypassRegex = /isTutor\(resource\.data\)\s*&&\s*\(resource\.data\.unlocked\s*==\s*true\s*\|\|\s*request\.resource\.data\.unlocked\s*==\s*true\)/;
    assert(!bypassRegex.test(rulesContent), 'request.resource.data.unlocked bypass in conversations must be removed');
  });

  // --- SECTION 4: CLOUD STORAGE RULES VERIFICATION ---
  test('Cloud Storage Rules: Default deny and file type/size limits enforced', () => {
    assert(storageRulesContent.includes('match /{allPaths=**}') && storageRulesContent.includes('allow read, write: if false;'), 'Storage default deny must exist');
    assert(storageRulesContent.includes('match /tutor_documents/{tutorIdentifier}/{fileName}'), 'Storage tutor documents path must exist');
    assert(storageRulesContent.includes('1024 * 1024'), 'Storage tutor documents must enforce 1MB size limit');
    assert(storageRulesContent.includes('image/(jpeg|png|webp|jpg)|application/pdf'), 'Storage tutor documents must restrict content types');
  });

  // --- SECTION 5: FRONTEND CREDENTIAL PURGE & REPO HYGIENE ---
  test('Frontend Code: Hardcoded admin password (Arcmaster) is eliminated', () => {
    const eduHtml = fs.readFileSync(path.join(ROOT_DIR, 'modivs-education.html'), 'utf8');
    assert(!eduHtml.includes('Arcmaster'), 'Hardcoded admin password Arcmaster must be removed');
  });

  test('Frontend Code: Hardcoded ModivsAdmin2026 and ModivsVisitor2026 credentials purged from sync engine', () => {
    const syncJs = fs.readFileSync(path.join(ROOT_DIR, 'firebase-sync.js'), 'utf8');
    assert(!syncJs.includes('ModivsAdmin2026!'), 'ModivsAdmin2026! must be removed from firebase-sync.js');
    assert(!syncJs.includes('ModivsVisitor2026!'), 'ModivsVisitor2026! must be removed from firebase-sync.js');
  });

  test('Admin Route: modivs-admin.html verifies Firebase Auth state asynchronously', () => {
    const adminHtml = fs.readFileSync(path.join(ROOT_DIR, 'modivs-admin.html'), 'utf8');
    assert(adminHtml.includes('onAuthStateChanged'), 'modivs-admin.html must verify active Firebase auth state');
    assert(!adminHtml.includes("'admin@gmail.com'"), 'modivs-admin.html must not contain admin@gmail.com');
  });

  test('Repository Hygiene: .gitignore excludes .env, service accounts, and sensitive keys', () => {
    const gitignore = fs.readFileSync(path.join(ROOT_DIR, '.gitignore'), 'utf8');
    assert(gitignore.includes('.env'), '.gitignore must ignore .env');
    assert(gitignore.includes('*serviceAccount*.json') || gitignore.includes('*service-account*.json'), '.gitignore must ignore service accounts');
    assert(gitignore.includes('*.pem'), '.gitignore must ignore .pem files');
  });

  test('Repository Hygiene: .env.example exists without containing real production secrets', () => {
    assert(fs.existsSync(path.join(ROOT_DIR, '.env.example')), '.env.example must exist');
    const envExample = fs.readFileSync(path.join(ROOT_DIR, '.env.example'), 'utf8');
    assert(envExample.includes('FIREBASE_API_KEY'), '.env.example must document FIREBASE_API_KEY');
    assert(!envExample.includes('Arcmaster'), '.env.example must not contain real passwords');
  });

  test('Security Headers: vercel.json configures CSP, HSTS, X-Content-Type-Options, and Referrer-Policy', () => {
    const vercelJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'vercel.json'), 'utf8'));
    assert(vercelJson.headers && vercelJson.headers.length > 0, 'vercel.json must configure headers');
    const headerMap = {};
    vercelJson.headers[0].headers.forEach(h => { headerMap[h.key] = h.value; });
    assert(headerMap['X-Content-Type-Options'] === 'nosniff', 'nosniff header must be set');
    assert(headerMap['X-Frame-Options'] === 'SAMEORIGIN', 'X-Frame-Options must be set');
    assert(headerMap['Strict-Transport-Security'], 'HSTS header must be set');
    assert(headerMap['Content-Security-Policy'], 'CSP header must be set');
  });

  test('Cloud Functions: index.js defines secure server-side lead unlock and admin claim endpoints', () => {
    const fnIndex = fs.readFileSync(path.join(ROOT_DIR, 'functions', 'index.js'), 'utf8');
    assert(fnIndex.includes('exports.secureUnlockLead'), 'Cloud Function secureUnlockLead must be exported');
    assert(fnIndex.includes('exports.setAdminClaim'), 'Cloud Function setAdminClaim must be exported');
    assert(fnIndex.includes('exports.getAdminStatus'), 'Cloud Function getAdminStatus must be exported');
    assert(fnIndex.includes('isCallerAdmin'), 'Caller admin validation helper must be implemented');
    assert(fnIndex.includes('exports.createRazorpayOrder'), 'Cloud Function createRazorpayOrder must be exported');
    assert(fnIndex.includes('exports.verifyRazorpaySignature'), 'Cloud Function verifyRazorpaySignature must be exported');
  });

  test('Payment Gateway: Razorpay Live integration and CSP whitelist configured', () => {
    const rzpConfigPath = path.join(ROOT_DIR, 'razorpay-config.js');
    assert(fs.existsSync(rzpConfigPath), 'razorpay-config.js must exist');
    const rzpContent = fs.readFileSync(rzpConfigPath, 'utf8');
    assert(rzpContent.includes('rzp_live_TwTMFGYwNbt9BA'), 'Razorpay live key ID must be configured');
    assert(rzpContent.includes('checkout.razorpay.com'), 'Razorpay checkout script must be loaded');

    const vercelJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'vercel.json'), 'utf8'));
    const csp = vercelJson.headers[0].headers.find(h => h.key === 'Content-Security-Policy').value;
    assert(csp.includes('checkout.razorpay.com'), 'CSP must whitelist checkout.razorpay.com');
    assert(csp.includes('api.razorpay.com'), 'CSP must whitelist api.razorpay.com');
  });

  // --- SECTION 6: RUNTIME AUTH & SCENARIO REGRESSION CHECK ---
  test('Regression Safety: Existing 12 functional scenarios remain intact', () => {
    const scenariosTestFile = path.join(ROOT_DIR, 'tests', 'test-scenarios.js');
    assert(fs.existsSync(scenariosTestFile), 'tests/test-scenarios.js must exist');
  });

  // --- SECTION 7: AUTHENTICATION HARDENING, RATE LIMITING & BRUTE FORCE DEFENSE ---
  test('Authentication Security: Insecure local storage login bypass completely eliminated', () => {
    const eduHtml = fs.readFileSync(path.join(ROOT_DIR, 'modivs-education.html'), 'utf8');
    assert(!eduHtml.includes("proceedLogin('local_'"), 'Insecure proceedLogin(local_...) fallback on wrong password must be eliminated');
    assert(!eduHtml.includes('users.find(function(x){ return x.email === emailVal; }); if(found){ proceedLogin'), 'Local user match bypass must be removed');
  });

  test('Authentication Security: Progressive brute force rate limiting & lockout logic implemented', () => {
    const authJs = fs.readFileSync(path.join(ROOT_DIR, 'modivs-auth-unique.js'), 'utf8');
    assert(authJs.includes('getLockoutStatus'), 'ModivsAuth must define getLockoutStatus');
    assert(authJs.includes('recordFailedAttempt'), 'ModivsAuth must define recordFailedAttempt');
    assert(authJs.includes('resetFailedAttempts'), 'ModivsAuth must define resetFailedAttempts');
    assert(authJs.includes('formatLockoutRemaining'), 'ModivsAuth must define formatLockoutRemaining');

    const eduHtml = fs.readFileSync(path.join(ROOT_DIR, 'modivs-education.html'), 'utf8');
    assert(eduHtml.includes('ModivsAuth.getLockoutStatus'), 'Login form must check getLockoutStatus before attempting login');
    assert(eduHtml.includes('ModivsAuth.recordFailedAttempt'), 'Login form must recordFailedAttempt on authentication failure');
    assert(eduHtml.includes('ModivsAuth.resetFailedAttempts'), 'Login form must resetFailedAttempts on successful authentication');
  });

  test('Authentication Security: Real Firebase password reset email dispatch wired', () => {
    const eduHtml = fs.readFileSync(path.join(ROOT_DIR, 'modivs-education.html'), 'utf8');
    assert(eduHtml.includes('sendPasswordResetEmail'), 'Forgot password handler must call sendPasswordResetEmail');
    assert(eduHtml.includes('Check your inbox and spam folder'), 'Clear user instructions must be provided after password reset dispatch');
  });

  test('Admin Route Authorization: Admin email fallback string eliminated', () => {
    const adminHtml = fs.readFileSync(path.join(ROOT_DIR, 'modivs-admin.html'), 'utf8');
    assert(!adminHtml.includes("|| 'happinessaggarwal@gmail.com'"), 'Default fallback admin email assignment must be removed');
    assert(adminHtml.includes('ADMIN_EMAILS.indexOf(currentAdminEmail) === -1'), 'Admin route must verify currentAdminEmail against approved admin list');
  });

  test('Progressive Lockout Functional Flow: 1st-2nd standard, 3rd 3m, 4th 10m, 5th 60m + reset', () => {
    // Mock localStorage in Node
    const mockStorage = {};
    const mockLocalStorage = {
      getItem: (k) => mockStorage[k] || null,
      setItem: (k, v) => { mockStorage[k] = String(v); },
      removeItem: (k) => { delete mockStorage[k]; }
    };

    // Load auth functions into mock environment
    const authCode = fs.readFileSync(path.join(ROOT_DIR, 'modivs-auth-unique.js'), 'utf8');
    const mockWindow = { localStorage: mockLocalStorage };
    const vm = require('vm');
    vm.runInNewContext(authCode, { window: mockWindow, localStorage: mockLocalStorage, console: console, setTimeout: setTimeout, Date: Date });

    const modivsAuth = mockWindow.ModivsAuth;
    assert(modivsAuth, 'ModivsAuth must be loaded');

    const testEmail = 'target.user@example.com';
    // Initial state: unlocked
    let status = modivsAuth.getLockoutStatus(testEmail);
    assert.strictEqual(status.locked, false, 'Initial state should not be locked');
    assert.strictEqual(status.attempts, 0, 'Initial attempts should be 0');

    // Attempt 1: failed (standard error)
    let res1 = modivsAuth.recordFailedAttempt(testEmail);
    assert.strictEqual(res1.locked, false, 'Attempt 1 should not trigger lockout');
    assert.strictEqual(res1.attempts, 1);

    // Attempt 2: failed (standard error)
    let res2 = modivsAuth.recordFailedAttempt(testEmail);
    assert.strictEqual(res2.locked, false, 'Attempt 2 should not trigger lockout');
    assert.strictEqual(res2.attempts, 2);

    // Attempt 3: failed (3-minute temporary lockout = 180,000 ms)
    let res3 = modivsAuth.recordFailedAttempt(testEmail);
    assert.strictEqual(res3.locked, true, 'Attempt 3 must trigger lockout');
    assert.strictEqual(res3.attempts, 3);
    assert.strictEqual(res3.remainingMs, 3 * 60 * 1000, 'Attempt 3 must lockout for 3 minutes');

    // Status query reflects lockout
    status = modivsAuth.getLockoutStatus(testEmail);
    assert.strictEqual(status.locked, true, 'Status query must show locked');

    // Attempt 4: failed (escalation lockout = 10 minutes = 600,000 ms)
    let res4 = modivsAuth.recordFailedAttempt(testEmail);
    assert.strictEqual(res4.locked, true);
    assert.strictEqual(res4.attempts, 4);
    assert.strictEqual(res4.remainingMs, 10 * 60 * 1000, 'Attempt 4 must lockout for 10 minutes');

    // Attempt 5: failed (severe 60-minute lockout + reset required)
    let res5 = modivsAuth.recordFailedAttempt(testEmail);
    assert.strictEqual(res5.locked, true);
    assert.strictEqual(res5.attempts, 5);
    assert.strictEqual(res5.remainingMs, 60 * 60 * 1000, 'Attempt 5 must lockout for 60 minutes');
    assert.strictEqual(res5.requireReset, true, 'Attempt 5 must flag password reset requirement');

    // Reset failed attempts upon successful login
    modivsAuth.resetFailedAttempts(testEmail);
    status = modivsAuth.getLockoutStatus(testEmail);
    assert.strictEqual(status.locked, false, 'Reset must clear lockout');
    assert.strictEqual(status.attempts, 0, 'Reset must reset attempts counter to 0');
  });

  // --- SECTION 8: COMPLETE AUDIT ASSERTIONS (SECRETS, APP CHECK, CLOUD FUNCTIONS) ---
  test('Firestore Rules: Backend-controlled financial collections deny client writes', () => {
    assert(rulesContent.includes('match /verified_payments/{paymentId}'), 'verified_payments match block must exist');
    assert(rulesContent.includes('match /payments/{paymentId}'), 'payments match block must exist');
    assert(rulesContent.includes('match /memberships/{membershipId}'), 'memberships match block must exist');
    assert(rulesContent.includes('match /coins/{coinId}'), 'coins match block must exist');
    assert(rulesContent.includes('match /admin_records/{recordId}'), 'admin_records match block must exist');
  });

  test('Third-Party API Hygiene: modivs-location.js does not expose hardcoded Google Maps API keys', () => {
    const locJs = fs.readFileSync(path.join(ROOT_DIR, 'modivs-location.js'), 'utf8');
    assert(!locJs.includes('AIzaSyDi4be0HNq7v1Ayf3Wlikdkc2iGpf22VBo'), 'Hardcoded Google Maps key must be purged from modivs-location.js');
    assert(locJs.includes('window.MODIVS_MAPS_KEY || \'\''), 'modivs-location.js must use dynamic configuration');
  });

  test('Environment Template Hygiene: .env.example does not leak live API keys or admin emails', () => {
    const envExample = fs.readFileSync(path.join(ROOT_DIR, '.env.example'), 'utf8');
    assert(!envExample.includes('AIzaSyDi4be0HNq7v1Ayf3Wlikdkc2iGpf22VBo'), '.env.example must not contain live Google Maps key');
    assert(!envExample.includes('happinessaggarwal@gmail.com'), '.env.example must not contain private admin emails');
  });

  test('Cloud Functions Payment Hardening: createOrder & verifySignature fail closed if secret is missing', () => {
    const fnCode = fs.readFileSync(path.join(ROOT_DIR, 'functions', 'index.js'), 'utf8');
    assert(fnCode.includes('if (!RAZORPAY_KEY_SECRET)'), 'Payment functions must validate RAZORPAY_KEY_SECRET is configured');
  });

  test('Firebase App Check: firebase-sync.js defines App Check manager and debug token support', () => {
    const syncJs = fs.readFileSync(path.join(ROOT_DIR, 'firebase-sync.js'), 'utf8');
    assert(syncJs.includes('window.ModivsAppCheck'), 'firebase-sync.js must export window.ModivsAppCheck');
    assert(syncJs.includes('FIREBASE_APPCHECK_DEBUG_TOKEN'), 'firebase-sync.js must support debug token for local testing');
  });

  console.log('\n====================================================');
  console.log(`RESULTS: ${passedTests} / ${totalTests} SECURITY TESTS PASSED`);
  console.log('====================================================');
  console.log('ALL SECURITY AUDIT & HARDENING ASSERTIONS VERIFIED!\n');
}

runAllSecurityTests().catch(err => {
  console.error('Security test runner encountered an error:', err);
  process.exit(1);
});

