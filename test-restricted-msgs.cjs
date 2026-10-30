const { webcrypto } = require('crypto');
globalThis.crypto = webcrypto;

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

require('./modivs-chat.js');
const ModivsChat = globalThis.window.ModivsChat;

async function testRestrictions() {
  const tutor = { name: 'Dr. Priya', email: 'priya_tutor@gmail.com', role: 'Tutor' };
  const student = { name: 'Aarav Sharma', email: 'aarav_student@gmail.com', role: 'Student / Parent' };

  const conv = ModivsChat.ensure(student, tutor);

  // 1. Test student trying to send a custom message
  await ModivsChat.sendMessage(conv.id, student, 'Call me on 9876543210 please custom text');
  let fresh = ModivsChat.find(conv.id);
  let studentMsg = fresh.messages[fresh.messages.length - 1];
  console.log('Student Message sent:', studentMsg.text);
  if (studentMsg.text.indexOf('Call me') !== -1) {
    throw new Error('Student custom message was not restricted!');
  }
  if (studentMsg.text !== ModivsChat.DEFAULT_STUDENT_BOOKING_MESSAGE) {
    throw new Error('Student message did not match standardized booking message!');
  }
  console.log('✓ Student arbitrary custom message correctly blocked and replaced with booking regarding message.');

  // 2. Test student sending class booking request regarding demo class
  const bookingRegarding = 'Demo Class Booking Request: I would like to book a free demo class on topic: "Physics" on 2026-11-01. Please confirm availability.';
  await ModivsChat.sendMessage(conv.id, student, bookingRegarding);
  fresh = ModivsChat.find(conv.id);
  studentMsg = fresh.messages[fresh.messages.length - 1];
  if (studentMsg.text !== bookingRegarding) {
    throw new Error('Legitimate booking regarding message was not accepted!');
  }
  console.log('✓ Legitimate booking regarding message accepted.');

  // 3. Test tutor trying to send custom message
  await ModivsChat.sendMessage(conv.id, tutor, 'Hello Aarav, contact me directly at test@tutor.com');
  fresh = ModivsChat.find(conv.id);
  let tutorMsg = fresh.messages[fresh.messages.length - 1];
  console.log('Tutor Message sent:', tutorMsg.text);
  if (tutorMsg.text.indexOf('test@tutor.com') !== -1) {
    throw new Error('Tutor custom message was not restricted!');
  }
  if (tutorMsg.text !== ModivsChat.DEFAULT_DEMO_MESSAGE) {
    throw new Error('Tutor message did not match official demo message!');
  }
  console.log('✓ Tutor arbitrary custom message correctly blocked and restricted strictly to official demo message.');

  console.log('\nALL RESTRICTION TESTS PASSED! ✓');
}

testRestrictions().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});

