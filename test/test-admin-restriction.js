/**
 * Test Suite: Admin Restriction & Cleanup for luxmankumar628@gmail.com
 */

const assert = require('assert');

// 1. Test api/auth.js registration rejection
const authHandler = require('../api/auth');

async function testRegistrationBlock() {
  console.log('Testing: Registration rejection for luxmankumar628@gmail.com...');
  
  const mockReq = {
    method: 'POST',
    query: {},
    body: {
      action: 'register',
      email: 'luxmankumar628@gmail.com',
      password: 'password123',
      name: 'Test Student',
      role: 'student'
    },
    headers: { origin: 'http://localhost' }
  };

  let statusCode = 0;
  let responseData = null;

  const mockRes = {
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => {
          responseData = data;
        }
      };
    },
    setHeader: () => {}
  };

  await authHandler(mockReq, mockRes);

  assert.strictEqual(statusCode, 403, 'Should return status 403 Forbidden for admin email registration');
  assert(responseData && responseData.error && responseData.error.includes('reserved'), 'Error message should indicate email is reserved');
  console.log('✓ Successfully blocked student registration for luxmankumar628@gmail.com with 403');
}

async function testFunctionsRegistrationBlock() {
  console.log('Testing: functions/index.js code verification...');
  const fs = require('fs');
  const path = require('path');
  const code = fs.readFileSync(path.join(__dirname, '../functions/index.js'), 'utf8');
  assert(code.includes('MASTER_ADMIN_EMAILS.includes(email)'), 'functions/index.js must check MASTER_ADMIN_EMAILS in registerAccount');
  console.log('✓ functions/index.js registerAccount admin restriction verified');
}

async function runAll() {
  try {
    await testRegistrationBlock();
    await testFunctionsRegistrationBlock();
    console.log('\nAll Admin Restriction tests passed successfully!');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

runAll();
