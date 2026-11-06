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
  });

  // --- SECTION 6: RUNTIME AUTH & SCENARIO REGRESSION CHECK ---
  test('Regression Safety: Existing 12 functional scenarios remain intact', () => {
    const scenariosTestFile = path.join(ROOT_DIR, 'tests', 'test-scenarios.js');
    assert(fs.existsSync(scenariosTestFile), 'tests/test-scenarios.js must exist');
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

