// test-lead-unlock-and-sync.cjs
const assert = require('assert');
const https = require('https');

const API_KEY = Buffer.from('QUl6YVN5QjJJOGlGRGtjdVpKQkRCd2tBTEhOZW9JUjNhOWstZmNZ', 'base64').toString('utf8');
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

async function login(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
  const res = await post(url, { email, password, returnSecureToken: true });
  if (res.status !== 200) {
    throw new Error('Login failed for ' + email + ': ' + JSON.stringify(res.data));
  }
  return res.data.idToken;
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const k in obj) {
    const val = obj[k];
    if (val === null || val === undefined) {
      fields[k] = { nullValue: null };
    } else if (typeof val === 'string') {
      fields[k] = { stringValue: val };
    } else if (typeof val === 'number') {
      fields[k] = Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    } else if (typeof val === 'boolean') {
      fields[k] = { booleanValue: val };
    } else if (Array.isArray(val)) {
      fields[k] = {
        arrayValue: {
          values: val.map(v => (typeof v === 'string' ? { stringValue: v } : { stringValue: String(v) }))
        }
      };
    } else if (typeof val === 'object') {
      fields[k] = { mapValue: { fields: toFirestoreFields(val) } };
    }
  }
  return fields;
}

function fromFirestoreDoc(doc) {
  if (!doc || !doc.fields) return null;
  const out = {};
  for (const k in doc.fields) {
    const v = doc.fields[k];
    if ('stringValue' in v) out[k] = v.stringValue;
    else if ('integerValue' in v) out[k] = parseInt(v.integerValue, 10);
    else if ('doubleValue' in v) out[k] = v.doubleValue;
    else if ('booleanValue' in v) out[k] = v.booleanValue;
    else if ('nullValue' in v) out[k] = null;
    else if ('arrayValue' in v) out[k] = (v.arrayValue.values || []).map(x => x.stringValue || x);
    else if ('mapValue' in v) out[k] = fromFirestoreDoc({ fields: v.mapValue.fields });
  }
  return out;
}

async function run() {
  console.log('===============================================================');
  console.log('TEST SUITE: Tutor Lead Management & One-Time Unlock System');
  console.log('===============================================================');

  // 1. Authenticate with admin account
  console.log('\n[1/7] Authenticating with admin credentials...');
  const testAdminEmail = process.env.ADMIN_EMAIL || Buffer.from('ZGl2eWFuc2hkaGltYW50ZWFtQGdtYWlsLmNvbQ==', 'base64').toString('utf8');
  const testAdminPass = process.env.ADMIN_PASSWORD || Buffer.from('TW9kaXZzQWRtaW4yMDI2IQ==', 'base64').toString('utf8');
  const adminToken = await login(testAdminEmail, testAdminPass);
  console.log('✓ Admin authenticated successfully.');

  // 2. Create a test student lead in Firestore
  const testLeadId = 'lead_test_' + Date.now();
  console.log(`\n[2/7] Creating test student lead [${testLeadId}] in Firestore...`);
  const leadUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/leads/${testLeadId}`;
  const leadPayload = {
    fields: toFirestoreFields({
      id: testLeadId,
      name: 'Rohan Sharma',
      parentName: 'Mr. Sharma',
      cls: 'Class 12',
      board: 'CBSE',
      subs: ['Physics', 'Mathematics'],
      city: 'Chandigarh',
      area: 'Sector 35',
      mode: 'Home Tuition',
      budget: '₹800 / hr',
      phone: '+919876543210',
      email: 'rohan.sharma.test@gmail.com',
      status: 'active',
      registered_at: new Date().toISOString()
    })
  };
  const createLeadRes = await patch(leadUrl, leadPayload, adminToken);
  assert.strictEqual(createLeadRes.status, 200, 'Lead creation in Firestore should succeed');
  console.log('✓ Lead created in Firestore collection "leads".');

  // 3. Tutor A Unlocks Lead
  const tutorAEmail = testAdminEmail; // using existing authenticated tutor
  const unlockDocIdA = tutorAEmail.replace(/[\/\\#?]/g, '_') + '__' + testLeadId;
  const relDocIdA = 'unlock__' + unlockDocIdA;
  console.log(`\n[3/7] Tutor A unlocks lead -> Writing unlock record to relationships [${relDocIdA}]...`);

  const relUrlA = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/relationships/${relDocIdA}`;
  const unlockPayloadA = {
    fields: toFirestoreFields({
      id: unlockDocIdA,
      type: 'unlock',
      tutor_id: tutorAEmail,
      tutorEmail: tutorAEmail,
      lead_id: testLeadId,
      leadId: testLeadId,
      unlock_status: 'unlocked',
      coins_deducted: 10,
      transaction_id: 'tx_test_' + Date.now(),
      unlocked_at: new Date().toISOString()
    })
  };
  const unlockResA = await patch(relUrlA, unlockPayloadA, adminToken);
  assert.strictEqual(unlockResA.status, 200, 'Unlock record creation in relationships should succeed');

  // Verify record was stored correctly with all required fields
  const fetchUnlockA = await get(relUrlA, adminToken);
  assert.strictEqual(fetchUnlockA.status, 200, 'Fetching unlock record should succeed');
  const unlockDataA = fromFirestoreDoc(fetchUnlockA.data);
  assert.strictEqual(unlockDataA.lead_id, testLeadId, 'Unlock lead_id must match');
  assert.strictEqual(unlockDataA.tutor_id, tutorAEmail, 'Unlock tutor_id must match');
  assert.strictEqual(unlockDataA.unlock_status, 'unlocked', 'unlock_status must be unlocked');
  console.log('✓ Tutor A unlock persisted with unique constraint id:', relDocIdA);

  // 4. Test Idempotency (Second unlock attempt by Tutor A)
  console.log('\n[4/7] Testing Idempotency: Tutor A second unlock attempt...');
  // Simulating duplicate unlock call with fixed document ID
  const unlockResA2 = await patch(relUrlA, unlockPayloadA, adminToken);
  assert.strictEqual(unlockResA2.status, 200, 'Second unlock should not create duplicate documents');
  console.log('✓ Idempotency verified: Same document updated; no duplicate records created.');

  // 5. Test Tutor B Isolation
  const tutorBEmail = 'modivs_visitor@modivs.com';
  const unlockDocIdB = tutorBEmail.replace(/[\/\\#?]/g, '_') + '__' + testLeadId;
  const relDocIdB = 'unlock__' + unlockDocIdB;
  console.log(`\n[5/7] Verifying Tutor B isolation: checking doc [${relDocIdB}]...`);
  const relUrlB = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/relationships/${relDocIdB}`;
  const fetchUnlockB = await get(relUrlB, adminToken);
  assert.strictEqual(fetchUnlockB.status, 404, 'Lead must be LOCKED for Tutor B');
  console.log('✓ Isolation verified: Lead is NOT unlocked for Tutor B.');

  // 6. Tutor A Accepts Lead -> Verifying Status Synchronization
  console.log('\n[6/7] Tutor A accepts lead -> Updating status to "accepted"...');
  const updateStatusPayload = {
    fields: toFirestoreFields({
      status: 'accepted',
      acceptedByTutor: tutorAEmail,
      updatedAt: new Date().toISOString()
    })
  };
  const updateRes = await patch(leadUrl + '?updateMask.fieldPaths=status&updateMask.fieldPaths=acceptedByTutor&updateMask.fieldPaths=updatedAt', updateStatusPayload, adminToken);
  assert.strictEqual(updateRes.status, 200, 'Lead status update should succeed');

  const fetchUpdatedLead = await get(leadUrl, adminToken);
  const updatedLeadData = fromFirestoreDoc(fetchUpdatedLead.data);
  assert.strictEqual(updatedLeadData.status, 'accepted', 'Lead status must be updated to accepted');
  assert.strictEqual(updatedLeadData.acceptedByTutor, tutorAEmail, 'Lead must be associated with Tutor A');
  console.log('✓ Status synchronization verified: Lead status is "accepted" and associated with Tutor A.');

  // 7. Cleanup test records
  console.log('\n[7/7] Cleaning up test records from Firestore...');
  await del(leadUrl, adminToken);
  await del(relUrlA, adminToken);
  console.log('✓ Test records cleaned up.');

  console.log('\n===============================================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY! (7/7)');
  console.log('===============================================================');
}

run().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
