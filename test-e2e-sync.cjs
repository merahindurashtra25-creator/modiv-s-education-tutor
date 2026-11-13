// test-e2e-sync.cjs
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = Buffer.from('QUl6YVN5QjJJOGlGRGtjVVpKQkRCd2tBTEhOZW9JUjNhOWstZmNZ', 'base64').toString('utf8');
const PROJECT_ID = 'modivs-education';

function post(url, data, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const req = https.request(u, { method: 'POST', headers }, res => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(chunks) });
        } catch (e) {
          resolve({ status: res.statusCode, data: chunks });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const req = https.request(u, { method: 'GET', headers }, res => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(chunks) });
        } catch (e) {
          resolve({ status: res.statusCode, data: chunks });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function del(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const req = https.request(u, { method: 'DELETE', headers }, res => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => {
        resolve({ status: res.statusCode });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function patch(url, data, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const req = https.request(u, { method: 'PATCH', headers }, res => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(chunks) });
        } catch (e) {
          resolve({ status: res.statusCode, data: chunks });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  console.log('====================================================');
  console.log('FIRESTORE REAL-TIME SYNCHRONIZATION E2E TEST');
  console.log('====================================================\n');

  // Step 1: Authenticate admin and background visitor
  console.log('[Step 1] Authenticating Admin and background visitor...');
  const adminAuthRes = await post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      email: process.env.ADMIN_EMAIL || Buffer.from('ZGl2eWFuc2hkaGltYW50ZWFtQGdtYWlsLmNvbQ==', 'base64').toString('utf8'),
      password: process.env.ADMIN_PASSWORD || Buffer.from('TW9kaXZzQWRtaW4yMDI2IQ==', 'base64').toString('utf8'),
      returnSecureToken: true
    }
  );
  if (adminAuthRes.status !== 200 || !adminAuthRes.data.idToken) {
    throw new Error('Failed to sign in admin: ' + JSON.stringify(adminAuthRes.data));
  }
  const adminToken = adminAuthRes.data.idToken;
  console.log('✓ Admin authenticated successfully.');

  const visitorAuthRes = await post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      email: 'modivs_visitor@modivs.com',
      password: 'ModivsVisitor2026!',
      returnSecureToken: true
    }
  );
  if (visitorAuthRes.status !== 200 || !visitorAuthRes.data.idToken) {
    throw new Error('Failed to sign in visitor: ' + JSON.stringify(visitorAuthRes.data));
  }
  const visitorToken = visitorAuthRes.data.idToken;
  console.log('✓ Visitor authenticated successfully.\n');

  // Step 2: Admin adds a new Tutor
  const testTutorId = 't_e2e_' + Date.now();
  console.log(`[Step 2] Admin adds new Tutor record to Firestore: ${testTutorId}...`);
  const tutorData = {
    fields: {
      id: { stringValue: testTutorId },
      name: { stringValue: 'Dr. E2E Verification Tutor' },
      email: { stringValue: `e2e_tutor_${Date.now()}@modivs.test` },
      city: { stringValue: 'Chandigarh' },
      headline: { stringValue: 'Expert Physics & Mathematics Specialist' },
      fee: { integerValue: '600' },
      status: { stringValue: 'approved' },
      submitted_at: { stringValue: new Date().toISOString() }
    }
  };
  const createTutorRes = await patch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/tutors/${testTutorId}`,
    tutorData,
    adminToken
  );
  if (createTutorRes.status !== 200) {
    throw new Error('Failed to create tutor in Firestore: ' + JSON.stringify(createTutorRes.data));
  }
  console.log('✓ Tutor successfully saved in Firestore.\n');

  // Step 3: Different Laptop / Mobile fetches approved tutors from Firestore
  console.log('[Step 3] Cross-Device Simulation: Clean Mobile/Laptop queries approved tutors via runQuery...');
  const queryApprovedRes = await post(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    {
      structuredQuery: {
        from: [{ collectionId: 'tutors' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'status' },
            op: 'EQUAL',
            value: { stringValue: 'approved' }
          }
        }
      }
    },
    null // Public query - works without login
  );
  if (queryApprovedRes.status !== 200) {
    throw new Error('Public query for approved tutors failed: ' + JSON.stringify(queryApprovedRes.data));
  }
  const foundTutor = queryApprovedRes.data.find(d => d.document && d.document.name.endsWith('/' + testTutorId));
  if (!foundTutor) {
    throw new Error('Newly created approved tutor was not found in public query!');
  }
  console.log('✓ Verified: Cross-device query retrieved newly added tutor successfully from Firestore.\n');

  // Step 4: Admin adds a new Student Lead
  const testLeadId = 'lead_e2e_' + Date.now();
  console.log(`[Step 4] Admin adds new Student Inquiry / Lead: ${testLeadId}...`);
  const leadData = {
    fields: {
      id: { stringValue: testLeadId },
      name: { stringValue: 'E2E Test Student' },
      phone: { stringValue: '9876543210' },
      city: { stringValue: 'Mohali' },
      cls: { stringValue: 'Class 10' },
      subs: { arrayValue: { values: [{ stringValue: 'Mathematics' }] } },
      status: { stringValue: 'active' },
      registered_at: { stringValue: new Date().toISOString() }
    }
  };
  const createLeadRes = await patch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/leads/${testLeadId}`,
    leadData,
    adminToken
  );
  if (createLeadRes.status !== 200) {
    throw new Error('Failed to create lead in Firestore: ' + JSON.stringify(createLeadRes.data));
  }
  console.log('✓ Lead successfully saved in Firestore.\n');

  // Step 5: Clean device fetches Active Leads
  console.log('[Step 5] Cross-Device Simulation: Clean Mobile/Laptop fetches Active Leads from Firestore...');
  const fetchLeadRes = await get(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/leads/${testLeadId}`,
    visitorToken
  );
  if (fetchLeadRes.status !== 200 || !fetchLeadRes.data.fields) {
    throw new Error('Failed to fetch lead across device: ' + JSON.stringify(fetchLeadRes.data));
  }
  console.log('✓ Verified: Cross-device client successfully fetched Active Lead from Firestore.\n');

  // Step 6: Cleanup test documents
  console.log('[Step 6] Cleaning up test records from Firestore...');
  await del(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/tutors/${testTutorId}`,
    adminToken
  );
  await del(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/leads/${testLeadId}`,
    adminToken
  );
  console.log('✓ Test records cleaned up.\n');

  // Step 7: Check frontend HTML integration
  console.log('[Step 7] Checking frontend HTML pages for firebase-sync.js inclusion...');
  const htmlFiles = [
    'index.html',
    'modivs-home.html',
    'modivs-tutors.html',
    'modivs-active-leads.html',
    'modivs-admin.html',
    'modivs-tutor-dashboard.html',
    'modivs-student-dashboard.html',
    'modivs-post-requirement.html',
    'modivs-student-signup.html',
    'modivs-student-registration.html'
  ];

  let missing = [];
  for (const f of htmlFiles) {
    const fullPath = path.join(__dirname, f);
    if (!fs.existsSync(fullPath)) {
      missing.push(`${f} (FILE NOT FOUND)`);
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    if (!content.includes('firebase-sync.js')) {
      missing.push(`${f} (missing firebase-sync.js script tag)`);
    }
  }

  if (missing.length > 0) {
    throw new Error('HTML check failed: ' + missing.join(', '));
  }
  console.log('✓ Verified: All 10 frontend pages include firebase-sync.js for real-time synchronization!\n');

  console.log('====================================================');
  console.log('ALL E2E SYNCHRONIZATION TESTS PASSED SUCCESSFULLY! ✓');
  console.log('====================================================');
}

run().catch(err => {
  console.error('\n❌ E2E TEST FAILED:', err.message);
  process.exit(1);
});
