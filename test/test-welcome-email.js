/**
 * Test Suite: Welcome Email System for New Students & Tutors
 */

const assert = require('assert');
const { getWelcomeEmailTemplate } = require('../lib/email-templates');
const { sendWelcomeEmailHelper } = require('../api/send-reminder');

function testWelcomeEmailTemplates() {
  console.log('Testing: Welcome email template generation...');

  // 1. Student Template
  const studentTpl = getWelcomeEmailTemplate({
    role: 'student',
    recipientName: 'Rahul Sharma',
    displayId: 'STU105',
    email: 'rahul.test@example.com',
    originUrl: 'https://www.modivs.com'
  });

  assert(studentTpl.subject.includes('Welcome to Modiv’s Education'), 'Student subject must include Welcome');
  assert(studentTpl.html.includes('STU105'), 'Student template must display student ID');
  assert(studentTpl.html.includes('Student / Parent'), 'Student template must specify Student / Parent role');
  assert(studentTpl.html.includes('student-dashboard'), 'Student template must link to student dashboard');
  console.log('✓ Student welcome email template verified');

  // 2. Tutor Template
  const tutorTpl = getWelcomeEmailTemplate({
    role: 'tutor',
    recipientName: 'Anita Verma',
    displayId: 'MOD-TUT305',
    email: 'anita.test@example.com',
    originUrl: 'https://www.modivs.com'
  });

  assert(tutorTpl.subject.includes('Tutor Profile'), 'Tutor subject must mention Tutor Profile');
  assert(tutorTpl.html.includes('MOD-TUT305'), 'Tutor template must display tutor ID');
  assert(tutorTpl.html.includes('tutor-dashboard'), 'Tutor template must link to tutor dashboard');
  console.log('✓ Tutor welcome email template verified');
}

async function testWelcomeHelperWithMockDb() {
  console.log('Testing: sendWelcomeEmailHelper execution...');

  const mockStore = new Map();
  const mockDb = {
    collection: (col) => ({
      doc: (id) => ({
        get: async () => ({
          exists: mockStore.has(`${col}/${id}`),
          data: () => mockStore.get(`${col}/${id}`) || {}
        }),
        set: async (data, opts) => {
          const prev = mockStore.get(`${col}/${id}`) || {};
          mockStore.set(`${col}/${id}`, opts && opts.merge ? { ...prev, ...data } : data);
        }
      })
    })
  };

  // Test admin skip
  const adminRes = await sendWelcomeEmailHelper({
    email: 'luxmankumar628@gmail.com',
    role: 'student',
    dbOverride: mockDb
  });
  assert.strictEqual(adminRes.skipped, true, 'Admin emails must be skipped from welcome email');
  console.log('✓ Admin emails correctly skipped');

  // Test student welcome email dispatch (simulation mode)
  const studentRes = await sendWelcomeEmailHelper({
    email: 'newstudent@example.com',
    role: 'student',
    name: 'New Student',
    displayId: 'STU999',
    dbOverride: mockDb
  });

  assert.strictEqual(studentRes.success, true, 'Welcome email helper should succeed');
  assert.strictEqual(studentRes.type, 'welcome');
  assert(mockStore.get('accounts/newstudent@example.com').welcomeEmailSent === true, 'Firestore accounts doc must record welcomeEmailSent: true');
  console.log('✓ Student welcome email dispatched and recorded in mock DB');

  // Test idempotency / duplicate prevention
  const dupRes = await sendWelcomeEmailHelper({
    email: 'newstudent@example.com',
    role: 'student',
    dbOverride: mockDb
  });
  assert.strictEqual(dupRes.duplicate, true, 'Should detect duplicate welcome email and prevent sending twice');
  console.log('✓ Welcome email idempotency verified (prevents duplicate sending)');
}

async function run() {
  try {
    testWelcomeEmailTemplates();
    await testWelcomeHelperWithMockDb();
    console.log('\nAll Welcome Email tests passed successfully!');
  } catch (e) {
    console.error('Welcome email test failed:', e);
    process.exit(1);
  }
}

run();
