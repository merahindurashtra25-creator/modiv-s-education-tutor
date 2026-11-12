/**
 * Test Suite: Separate Messaging and Notification System
 * Covers Section G verification requirements:
 * 1. Student sends 1 message
 * 2. Student sends multiple messages (conversation-level deduplication)
 * 3. Tutor does not open the conversation (counts preserved)
 * 4. Tutor opens the conversation (messages marked read, alert marked read)
 * 5. Tutor replies (student receives notification: "This tutor sent you a message.")
 * 6. Student receives and reads messages (reset to 0)
 * 7. Lead unlock notification (student + tutor alerts)
 * 8. Admin sends individual offer and broadcast announcements
 * 9. Absolute count separation (messages vs activity notifications never mixed)
 */

const assert = require('assert');
const { webcrypto } = require('crypto');
globalThis.crypto = webcrypto;

// 1. Mock LocalStorage
const localStorageMap = {};
const localStorageMock = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(localStorageMap, k) ? localStorageMap[k] : null),
  setItem: (k, v) => { localStorageMap[k] = String(v); },
  removeItem: (k) => { delete localStorageMap[k]; },
  clear: () => { for (const k in localStorageMap) delete localStorageMap[k]; }
};
globalThis.localStorage = localStorageMock;

// 2. Mock DOM & Window
const mockElement = (tag) => ({
  tagName: tag,
  innerHTML: '',
  textContent: '',
  style: {},
  classList: {
    add: () => {},
    remove: () => {},
    toggle: () => {},
    contains: () => false
  },
  setAttribute: () => {},
  getAttribute: () => null,
  appendChild: (ch) => ch,
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener: () => {},
  removeEventListener: () => {}
});

globalThis.window = {
  crypto: webcrypto,
  localStorage: localStorageMock,
  document: {
    createElement: mockElement,
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    head: { appendChild: () => {} },
    body: { appendChild: () => {} }
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  EducationBFirebase: null
};
globalThis.document = window.document;

// 3. Load Modules
const ModivsNotifications = require('./modivs-notifications.js');
window.ModivsNotifications = ModivsNotifications;

require('./modivs-chat.js');
const ModivsChat = window.ModivsChat;

async function runMessagingAndNotificationsTestSuite() {
  console.log('======================================================================');
  console.log('🚀 RUNNING MESSAGING AND NOTIFICATIONS SYSTEM INTEGRATION TEST SUITE');
  console.log('======================================================================\n');

  const studentEmail = 'student.test@example.com';
  const studentName = 'Aarav Sharma';
  const tutorEmail = 'tutor.test@example.com';
  const tutorName = 'Dr. Priya Verma';

  localStorageMock.clear();

  const studentUserObj = {
    uid: 'stu_101',
    email: studentEmail,
    name: studentName,
    role: 'Student'
  };
  const tutorUserObj = {
    uid: 'tut_201',
    email: tutorEmail,
    name: tutorName,
    role: 'Tutor'
  };

  // Set auth user as student initially
  localStorageMock.setItem('modivs_auth_user', JSON.stringify(studentUserObj));

  // ============================================================================
  // STEP 1: Student sends 1 message to Tutor
  // ============================================================================
  console.log('[Step 1] Student sends 1 message to Tutor');
  const conv = ModivsChat.ensure(
    { name: studentName, email: studentEmail },
    { name: tutorName, email: tutorEmail }
  );
  conv.unlocked = true;
  const unlObj = {};
  unlObj[conv.id] = true;
  unlObj['conv_' + conv.id] = true;
  localStorageMock.setItem('modivs_unlocked_leads_' + tutorEmail, JSON.stringify(unlObj));

  const allConvs = ModivsChat.conversations();
  const cTarget = allConvs.find(c => c.id === conv.id);
  if (cTarget) { cTarget.unlocked = true; }
  localStorageMock.setItem('modivs_conversations', JSON.stringify(allConvs));
  assert(conv && conv.id, 'Conversation should exist');

  // Student sends message 1
  const msg1 = await ModivsChat.sendMessage(conv.id, studentUserObj, 'Hello Dr. Priya, I want to book a demo class for Class 10 Physics.');
  assert(msg1 && msg1.id, 'Message 1 must be created');

  // Verify tutor unread message count in conversation
  const tutorUnreadMessages = ModivsChat.unreadCount(conv, tutorEmail);
  console.log('  -> Tutor unread messages count in conv:', tutorUnreadMessages);
  assert.strictEqual(tutorUnreadMessages, 1, 'Tutor must have exactly 1 unread message');

  // Verify student (sender) own message is NOT counted as unread
  const studentUnreadMessages = ModivsChat.unreadCount(conv, studentEmail);
  console.log('  -> Student (sender) unread messages count in conv:', studentUnreadMessages);
  assert.strictEqual(studentUnreadMessages, 0, "Student's own message must NOT count as unread");

  // Verify tutor Notification Centre received exactly 1 activity notification
  const tutorNotifs = ModivsNotifications.getLocalNotifications(tutorEmail);
  console.log('  -> Tutor notification count:', tutorNotifs.length);
  assert.strictEqual(tutorNotifs.length, 1, 'Tutor must have 1 notification');

  const notif1 = tutorNotifs[0];
  console.log('  -> Notification title:', notif1.title);
  console.log('  -> Notification description:', notif1.description);
  console.log('  -> Notification unreadCount:', notif1.unreadCount);

  assert.strictEqual(notif1.title, 'New Message', 'Title must be "New Message"');
  assert.strictEqual(notif1.description, 'This student sent you a message.', 'Description must state "This student sent you a message."');
  // PRIVACY VERIFICATION: Message text must NEVER appear in notification!
  assert(!notif1.description.includes('Physics'), 'Notification must NOT contain actual message text');
  assert(!notif1.description.includes('Hello'), 'Notification must NOT contain actual message text');
  assert.strictEqual(notif1.unreadCount, 1, 'Notification unread count must be 1');
  assert.strictEqual(notif1.read, false, 'Notification must be unread');

  console.log('  ✓ Step 1 Passed: Single message created conversation unread and activity notification without message text.\n');

  // ============================================================================
  // STEP 2: Student sends multiple messages (Conversation-level deduplication)
  // ============================================================================
  console.log('[Step 2] Student sends 2 more messages while Tutor has not opened conversation');
  const msg2 = await ModivsChat.sendMessage(conv.id, studentUserObj, 'Can we schedule the demo on weekday evenings?');
  const msg3 = await ModivsChat.sendMessage(conv.id, studentUserObj, 'Please also share your fee details for booking.');

  assert(msg2 && msg3, 'Messages 2 and 3 must be created');

  // Tutor should now have 3 unread messages
  const tutorUnread3 = ModivsChat.unreadCount(conv, tutorEmail);
  console.log('  -> Tutor unread messages in conv:', tutorUnread3);
  assert.strictEqual(tutorUnread3, 3, 'Tutor must have 3 unread messages');

  // Check tutor notifications: Must still be EXACTLY 1 notification record (NO duplicate records!)
  const tutorNotifsStep2 = ModivsNotifications.getLocalNotifications(tutorEmail);
  console.log('  -> Total notification records for tutor:', tutorNotifsStep2.length);
  assert.strictEqual(tutorNotifsStep2.length, 1, 'Deduplication rule: Must NOT create separate notification for every message! Must remain 1 record');

  const deduplicatedAlert = tutorNotifsStep2[0];
  console.log('  -> Notification unreadCount after 3 messages:', deduplicatedAlert.unreadCount);
  assert.strictEqual(deduplicatedAlert.unreadCount, 3, 'Notification unreadCount must be incremented to 3');
  assert.strictEqual(deduplicatedAlert.title, 'New Message');
  assert.strictEqual(deduplicatedAlert.description, 'This student sent you a message.');
  assert(!deduplicatedAlert.description.includes('evenings'), 'Notification must not contain message 2 text');
  assert(!deduplicatedAlert.description.includes('fee structure'), 'Notification must not contain message 3 text');

  console.log('  ✓ Step 2 Passed: 3 messages yielded 3 unread messages and exactly 1 deduplicated activity notification record.\n');

  // ============================================================================
  // STEP 3: Tutor does not open the conversation (State and count persistence)
  // ============================================================================
  console.log('[Step 3] Tutor has not opened the conversation - verifying count independence');
  const totalTutorUnreadMsgs = ModivsChat.unreadTotal(tutorEmail);
  const totalTutorUnreadNotifs = ModivsNotifications.unreadTotal(tutorEmail);

  console.log('  -> Total unread messages (on chat icon / badge):', totalTutorUnreadMsgs);
  console.log('  -> Total unread notifications (on bell icon / dot):', totalTutorUnreadNotifs);

  assert.strictEqual(totalTutorUnreadMsgs, 3, 'Total unread messages must be 3');
  assert.strictEqual(totalTutorUnreadNotifs, 1, 'Total unread notifications must be 1');
  assert.notStrictEqual(totalTutorUnreadMsgs, totalTutorUnreadNotifs, 'Messages count and notifications count must be independent');

  console.log('  ✓ Step 3 Passed: Unread message count and notification count strictly separated and preserved.\n');

  // ============================================================================
  // STEP 4: Tutor opens the conversation
  // ============================================================================
  console.log('[Step 4] Tutor opens the conversation');
  // Switch auth user to Tutor
  localStorageMock.setItem('modivs_auth_user', JSON.stringify({
    uid: 'tut_201',
    email: tutorEmail,
    name: tutorName,
    role: 'Tutor'
  }));

  // Tutor opens conversation -> markRead is invoked
  ModivsChat.markRead(conv, tutorEmail);

  // Verify messages unread count is reset to 0
  const tutorUnreadAfterRead = ModivsChat.unreadCount(conv, tutorEmail);
  const totalTutorMsgsAfterRead = ModivsChat.unreadTotal(tutorEmail);
  console.log('  -> Tutor conversation unread messages after open:', tutorUnreadAfterRead);
  console.log('  -> Tutor total unread messages after open:', totalTutorMsgsAfterRead);
  assert.strictEqual(tutorUnreadAfterRead, 0, 'Conversation unread count must reset to 0');
  assert.strictEqual(totalTutorMsgsAfterRead, 0, 'Total unread messages must reset to 0');

  // Verify the related message notification is marked read
  const tutorNotifsAfterRead = ModivsNotifications.getLocalNotifications(tutorEmail);
  assert.strictEqual(tutorNotifsAfterRead.length, 1);
  const readAlert = tutorNotifsAfterRead[0];
  console.log('  -> Notification read status:', readAlert.read);
  console.log('  -> Notification unreadCount after read:', readAlert.unreadCount);
  assert.strictEqual(readAlert.read, true, 'Message notification must be marked read');
  assert.strictEqual(readAlert.unreadCount, 0, 'Notification unreadCount must reset to 0');

  const totalTutorNotifsAfterRead = ModivsNotifications.unreadTotal(tutorEmail);
  console.log('  -> Total unread notifications after open:', totalTutorNotifsAfterRead);
  assert.strictEqual(totalTutorNotifsAfterRead, 0, 'Total unread notifications must become 0');

  console.log('  ✓ Step 4 Passed: Opening conversation marked both messages and notification alert as read.\n');

  // ============================================================================
  // STEP 5: Tutor replies to Student
  // ============================================================================
  console.log('[Step 5] Tutor replies with a message to Student');
  const tutorReply = await ModivsChat.sendMessage(conv.id, tutorUserObj, 'I can take a free demo class. Please share a convenient date and time.');
  assert(tutorReply && tutorReply.id, 'Tutor reply must be created');

  // Tutor's own unread count remains 0
  assert.strictEqual(ModivsChat.unreadCount(conv, tutorEmail), 0, 'Tutor unread count must be 0 for own sent reply');

  // Student unread message count must be 1
  const studentUnreadAfterReply = ModivsChat.unreadCount(conv, studentEmail);
  console.log('  -> Student unread messages in conv:', studentUnreadAfterReply);
  assert.strictEqual(studentUnreadAfterReply, 1, 'Student must receive 1 unread message');

  // Student Notification Centre must have 1 notification
  const studentNotifs = ModivsNotifications.getLocalNotifications(studentEmail);
  console.log('  -> Student notifications count:', studentNotifs.length);
  assert.strictEqual(studentNotifs.length, 1, 'Student must have 1 notification');

  const studentAlert = studentNotifs[0];
  console.log('  -> Student notification title:', studentAlert.title);
  console.log('  -> Student notification description:', studentAlert.description);
  assert.strictEqual(studentAlert.title, 'New Message');
  assert.strictEqual(studentAlert.description, 'This tutor sent you a message.', 'Description for student must be "This tutor sent you a message."');
  // Privacy check: No message content
  assert(!studentAlert.description.includes('Tuesdays'), 'Notification must NOT contain message content');
  assert(!studentAlert.description.includes('Aarav'), 'Notification must NOT contain message content');

  console.log('  ✓ Step 5 Passed: Student received "This tutor sent you a message." activity notification.\n');

  // ============================================================================
  // STEP 6: Student receives and reads messages
  // ============================================================================
  console.log('[Step 6] Student opens conversation and reads messages');
  // Switch auth user to Student
  localStorageMock.setItem('modivs_auth_user', JSON.stringify({
    uid: 'stu_101',
    email: studentEmail,
    name: studentName,
    role: 'Student'
  }));

  ModivsChat.markRead(conv, studentEmail);

  assert.strictEqual(ModivsChat.unreadCount(conv, studentEmail), 0, 'Student unread messages must reset to 0');
  assert.strictEqual(ModivsChat.unreadTotal(studentEmail), 0, 'Student total unread messages must be 0');

  const studentNotifsAfterRead = ModivsNotifications.getLocalNotifications(studentEmail);
  assert.strictEqual(studentNotifsAfterRead[0].read, true, 'Student notification must be marked read');
  assert.strictEqual(studentNotifsAfterRead[0].unreadCount, 0, 'Student notification unreadCount must be 0');
  assert.strictEqual(ModivsNotifications.unreadTotal(studentEmail), 0, 'Student total unread notifications must be 0');

  console.log('  ✓ Step 6 Passed: Student read state updated and unread counters reset.\n');

  // ============================================================================
  // STEP 7: Lead Unlock Notification
  // ============================================================================
  console.log('[Step 7] Tutor unlocks a student lead');
  const leadId = 'LD_PHYS_202';

  // 1. Student receives alert that tutor unlocked their lead
  await ModivsNotifications.createNotification({
    recipientEmail: studentEmail,
    recipientRole: 'student',
    type: 'lead_unlocked',
    title: 'Lead Unlocked',
    description: 'Dr. Priya Verma unlocked your Class 10 Physics requirement.',
    leadId: leadId,
    actionUrl: 'modivs-student-dashboard.html#enquiries'
  });

  // 2. Tutor receives unlock confirmation
  await ModivsNotifications.createNotification({
    recipientEmail: tutorEmail,
    recipientRole: 'tutor',
    type: 'lead_unlocked',
    title: 'Student Contact Unlocked',
    description: 'You unlocked contact details for Aarav Sharma.',
    leadId: leadId,
    actionUrl: 'modivs-active-leads.html#lead-' + leadId
  });

  const studentNotifsLd = ModivsNotifications.getLocalNotifications(studentEmail);
  const studentLdAlert = studentNotifsLd.find(n => n.type === 'lead_unlocked');
  assert(studentLdAlert, 'Student must receive lead_unlocked notification');
  assert.strictEqual(studentLdAlert.title, 'Lead Unlocked');
  assert.strictEqual(studentLdAlert.leadId, leadId);
  assert.strictEqual(studentLdAlert.actionUrl, 'modivs-student-dashboard.html#enquiries');

  const tutorNotifsLd = ModivsNotifications.getLocalNotifications(tutorEmail);
  const tutorLdAlert = tutorNotifsLd.find(n => n.type === 'lead_unlocked');
  assert(tutorLdAlert, 'Tutor must receive lead_unlocked notification');
  assert.strictEqual(tutorLdAlert.leadId, leadId);

  console.log('  ✓ Step 7 Passed: Lead unlock notifications recorded for both student and tutor with action URLs.\n');

  // ============================================================================
  // STEP 8: Admin sends individual offer & announcements
  // ============================================================================
  console.log('[Step 8] Admin sends individual offer and broadcast announcement');
  // Admin offer to Tutor
  await ModivsNotifications.createNotification({
    recipientEmail: tutorEmail,
    recipientRole: 'tutor',
    type: 'admin_offer',
    title: 'Special Weekend Coin Discount',
    description: 'Get 50 bonus coins on any membership upgrade this weekend!',
    actionUrl: 'modivs-tutor-dashboard.html#membership'
  });

  // Admin announcement to Student
  await ModivsNotifications.createNotification({
    recipientEmail: studentEmail,
    recipientRole: 'student',
    type: 'announcement',
    title: 'New Online Classroom Features',
    description: 'Enjoy interactive whiteboard and session recording starting today.',
    actionUrl: 'modivs-student-dashboard.html#classes'
  });

  const tutorOffers = ModivsNotifications.getLocalNotifications(tutorEmail).filter(n => n.type === 'admin_offer');
  assert.strictEqual(tutorOffers.length, 1, 'Tutor must have 1 admin_offer notification');
  assert.strictEqual(tutorOffers[0].title, 'Special Weekend Coin Discount');
  assert.strictEqual(tutorOffers[0].actionUrl, 'modivs-tutor-dashboard.html#membership');

  const studentAnnouncements = ModivsNotifications.getLocalNotifications(studentEmail).filter(n => n.type === 'announcement');
  assert.strictEqual(studentAnnouncements.length, 1, 'Student must have 1 announcement notification');
  assert.strictEqual(studentAnnouncements[0].title, 'New Online Classroom Features');

  console.log('  ✓ Step 8 Passed: Admin special offers and announcements dispatched and verified.\n');

  // ============================================================================
  // STEP 9: Strict Count Separation Verification
  // ============================================================================
  console.log('[Step 9] Verifying count independence across all states');
  // Check student counts:
  // Messages: 0 unread
  // Notifications: 2 unread (lead_unlocked, announcement)
  const stuMsgCount = ModivsChat.unreadTotal(studentEmail);
  const stuNotifCount = ModivsNotifications.unreadTotal(studentEmail);
  console.log('  -> Final Student unread messages:', stuMsgCount);
  console.log('  -> Final Student unread notifications:', stuNotifCount);

  assert.strictEqual(stuMsgCount, 0, 'Student unread messages must be 0');
  assert.strictEqual(stuNotifCount, 2, 'Student unread notifications must be 2');

  // Check tutor counts:
  // Messages: 0 unread
  // Notifications: 2 unread (lead_unlocked, admin_offer)
  const tutMsgCount = ModivsChat.unreadTotal(tutorEmail);
  const tutNotifCount = ModivsNotifications.unreadTotal(tutorEmail);
  console.log('  -> Final Tutor unread messages:', tutMsgCount);
  console.log('  -> Final Tutor unread notifications:', tutNotifCount);

  assert.strictEqual(tutMsgCount, 0, 'Tutor unread messages must be 0');
  assert.strictEqual(tutNotifCount, 2, 'Tutor unread notifications must be 2');

  // Click / Open by ID check
  assert(typeof ModivsChat.openById === 'function', 'ModivsChat.openById must be a callable function for notification clicks');
  const opened = ModivsChat.openById(conv.id);
  assert(opened && opened.id === conv.id, 'openById must return the matched conversation');

  console.log('  ✓ Step 9 Passed: Messages and notifications counts are completely independent and never mixed.\n');

  console.log('======================================================================');
  console.log('🎉 ALL 9 MESSAGING AND NOTIFICATIONS SYSTEM TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================================\n');
}

runMessagingAndNotificationsTestSuite().catch(err => {
  console.error('\n❌ Test Suite Failed with error:', err);
  process.exit(1);
});
