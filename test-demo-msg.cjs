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

async function runDemoMessageTest() {
  const tutorEmail = 'tutor_demo@gmail.com';
  const studentEmail = 'student_test@gmail.com';

  const conv = ModivsChat.ensure(
    { name: 'Rohan Sharma', email: studentEmail },
    { name: 'Dr. Priya', email: tutorEmail }
  );

  console.log('Conv id:', conv.id, 'docId:', conv.docId);
  console.log('Conversations in store:', ModivsChat.conversations().length);

  const expectedMsg = "we'll provide u a demo class shortly. for further queries, contact:+919896930443\n+918054167008";
  const count = ModivsChat.onTutorMembershipPurchased(tutorEmail);
  console.log('Count:', count);

  // Wait for any promise
  await new Promise(r => setTimeout(r, 100));

  const updatedConv = ModivsChat.find(conv.id);
  console.log('Updated conv messages length:', updatedConv.messages.length);
  const lastMsg = updatedConv.messages[updatedConv.messages.length - 1];
  console.log('Last message:', lastMsg);

  if (lastMsg.text !== expectedMsg) {
    throw new Error('Message text mismatch! Got: ' + (lastMsg && lastMsg.text));
  }
  console.log('✓ Official demo message verified!');
}

runDemoMessageTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
