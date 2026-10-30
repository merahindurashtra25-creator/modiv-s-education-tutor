const { webcrypto } = require('crypto');
globalThis.crypto = webcrypto;

// Set up minimal mock DOM/storage for Node testing
const localStorageMap = {};
globalThis.localStorage = {
  getItem: (k) => localStorageMap[k] || null,
  setItem: (k, v) => { localStorageMap[k] = String(v); },
  removeItem: (k) => { delete localStorageMap[k]; }
};
globalThis.window = {
  crypto: webcrypto,
  addEventListener: () => {},
  EducationBFirebase: null
};

// Load modivs-chat.js
require('./modivs-chat.js');
const ModivsChat = globalThis.window.ModivsChat;

async function runTests() {
  console.log('--- STARTING VERIFICATION TESTS ---');

  // TEST 1: Encryption & Decryption
  console.log('\n[Test 1] Testing AES-GCM Payload Encryption & Decryption...');
  const secretMessage = 'Hello teacher, I need help with Class 10 Trigonometry. My phone is +91 98765 43210.';
  const convId = 'test_student_conv_123';
  const cipher = await ModivsChat.encrypt(secretMessage, convId);
  console.log('Encrypted Ciphertext format:', cipher.slice(0, 40) + '...');
  if (!cipher.startsWith('ENC:AES-GCM:v1:')) {
    throw new Error('Encryption tag missing or invalid format: ' + cipher);
  }

  const decrypted = await ModivsChat.decrypt(cipher, convId);
  if (decrypted !== secretMessage) {
    throw new Error('Decryption mismatch! Expected: ' + secretMessage + ', Got: ' + decrypted);
  }
  console.log('✓ Decrypted message verified perfectly matching original text.');

  // TEST 2: Teacher Membership & Coins verification
  console.log('\n[Test 2] Testing Teacher Membership and Coins verification...');
  const tutorEmail = 'priya_tutor@gmail.com';
  
  // Set expired membership
  ModivsChat.setTutorMembership(tutorEmail, 'Standard Plan', -5, 'expired');
  let mem = ModivsChat.getTutorMembership(tutorEmail);
  console.log('Tutor membership status (expired):', mem.status, 'isValid:', mem.isValid);
  if (mem.isValid) throw new Error('Expected membership to be invalid');

  // Attempt unlock with expired membership
  const conv = ModivsChat.ensure({ name: 'Aarav', email: 'aarav@gmail.com' }, { name: 'Priya', email: tutorEmail });
  let unlockRes = await ModivsChat.unlockInquiry(conv.id, { email: tutorEmail, role: 'Tutor' });
  console.log('Unlock result with expired membership:', unlockRes);
  if (unlockRes.success || unlockRes.reason !== 'membership_invalid') {
    throw new Error('Should have denied unlock due to invalid membership');
  }
  console.log('✓ Access correctly denied when membership is expired/invalid.');

  // Activate membership
  ModivsChat.setTutorMembership(tutorEmail, 'Professional Plan', 90, 'active');
  mem = ModivsChat.getTutorMembership(tutorEmail);
  console.log('Tutor membership status (activated):', mem.planName, 'isValid:', mem.isValid);
  if (!mem.isValid) throw new Error('Expected membership to be valid');

  // Set coin balance to 5 (insufficient, requires 10)
  ModivsChat.addTutorCoins(tutorEmail, -ModivsChat.getTutorCoins(tutorEmail) + 5, 'Reset for test');
  let coins = ModivsChat.getTutorCoins(tutorEmail);
  console.log('Tutor coin balance (insufficient):', coins);
  if (coins !== 5) throw new Error('Expected coins to be 5');

  unlockRes = await ModivsChat.unlockInquiry(conv.id, { email: tutorEmail, role: 'Tutor' });
  console.log('Unlock result with insufficient coins:', unlockRes);
  if (unlockRes.success || unlockRes.reason !== 'insufficient_coins') {
    throw new Error('Should have denied unlock due to insufficient coins');
  }
  console.log('✓ Access correctly denied when coins are insufficient.');

  // Recharge coins to 35
  ModivsChat.addTutorCoins(tutorEmail, 30, 'Recharge 30 coins');
  coins = ModivsChat.getTutorCoins(tutorEmail);
  console.log('Tutor coin balance after recharge:', coins);
  if (coins !== 35) throw new Error('Expected coins to be 35');

  // Unlock inquiry
  unlockRes = await ModivsChat.unlockInquiry(conv.id, { email: tutorEmail, role: 'Tutor' });
  console.log('Unlock result with valid membership and sufficient coins:', unlockRes);
  if (!unlockRes.success) throw new Error('Expected unlock to succeed: ' + JSON.stringify(unlockRes));

  coins = ModivsChat.getTutorCoins(tutorEmail);
  console.log('Tutor coin balance after 10 coins deducted:', coins);
  if (coins !== 25) throw new Error('Expected 25 coins, got ' + coins);
  console.log('✓ Coins deducted exactly once (10 coins).');

  // Second unlock attempt should not deduct coins again
  unlockRes = await ModivsChat.unlockInquiry(conv.id, { email: tutorEmail, role: 'Tutor' });
  coins = ModivsChat.getTutorCoins(tutorEmail);
  if (coins !== 25) throw new Error('Coins were deducted a second time! Balance: ' + coins);
  console.log('✓ Second unlock attempt did not deduct coins again.');

  // TEST 3: Transaction history
  console.log('\n[Test 3] Testing Coin Transaction History...');
  const txs = ModivsChat.getCoinTransactions(tutorEmail);
  console.log('Total transactions recorded for tutor:', txs.length);
  if (txs.length < 2) throw new Error('Expected at least 2 transactions');
  console.log('Most recent transaction:', txs[0]);
  console.log('✓ Transaction audit history correctly recorded.');

  // TEST 4: Student Details Masking
  console.log('\n[Test 4] Testing Student Details Masking for Locked Inquiries...');
  const maskedName = ModivsChat.maskStudentName('Aarav Sharma');
  console.log('Original: "Aarav Sharma" -> Masked:', maskedName);
  if (maskedName !== 'A*** S***') throw new Error('Masking failed: ' + maskedName);
  console.log('✓ Student personal details correctly masked before authorization.');

  console.log('\nALL VERIFICATION TESTS PASSED SUCCESSFULLY! ✓');
}

runTests().catch(err => {
  console.error('TEST RUNNER FAILED:', err);
  process.exit(1);
});

