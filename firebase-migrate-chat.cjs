/*
  Trusted migration for legacy localStorage chat exports.

  1. In the browser console, save the old data:
       copy(localStorage.getItem('modivs_chat_conversations') || '[]')
     Save the copied JSON as legacy-chat-export.json.
  2. Run:
       npm install firebase-admin
       set GOOGLE_APPLICATION_CREDENTIALS=C:\path\service-account.json
       node firebase-migrate-chat.cjs legacy-chat-export.json

  The script never deletes localStorage or existing Firestore data. It creates
  deterministic conversation/message IDs, so rerunning it is safe.
*/
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const input = process.argv[2] || 'legacy-chat-export.json';
const legacy = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
if (!Array.isArray(legacy)) throw new Error('The export must be a JSON array.');

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const auth = admin.auth();
const db = admin.firestore();

async function uidFor(email, fallbackId) {
  if (!email) return fallbackId || '';
  try { return (await auth.getUserByEmail(email)).uid; }
  catch (error) {
    if (error.code === 'auth/user-not-found') throw new Error('No Firebase account exists for ' + email);
    throw error;
  }
}

async function migrateConversation(oldConversation) {
  const studentId = await uidFor(oldConversation.student && oldConversation.student.email, oldConversation.student && oldConversation.student.id);
  const tutorId = await uidFor(oldConversation.tutor && oldConversation.tutor.email, oldConversation.tutor && oldConversation.tutor.id);
  if (!studentId || !tutorId || studentId === tutorId) throw new Error('Invalid participants for legacy conversation ' + oldConversation.id);
  const conversationId = studentId + '_' + tutorId;
  const ref = db.collection('conversations').doc(conversationId);

  await ref.set({
    studentId, tutorId, participantIds: [studentId, tutorId],
    student: oldConversation.student || {}, tutor: oldConversation.tutor || {},
    lastMessage: oldConversation.messages && oldConversation.messages.length ? oldConversation.messages[oldConversation.messages.length - 1].text : '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  for (let index = 0; index < (oldConversation.messages || []).length; index += 1) {
    const old = oldConversation.messages[index];
    const senderId = await uidFor(old.senderEmail, old.senderEmail === (oldConversation.student || {}).email ? studentId : tutorId);
    if (senderId !== studentId && senderId !== tutorId) throw new Error('Message sender is not a conversation participant.');
    const createdAt = old.createdAt ? new Date(old.createdAt) : new Date();
    await ref.collection('messages').doc('legacy_' + (old.id || index)).set({
      senderId, senderRole: senderId === studentId ? 'Student / Parent' : 'Tutor',
      text: String(old.text || '').slice(0, 2000),
      createdAt: admin.firestore.Timestamp.fromDate(createdAt),
      readBy: old.readAt ? [senderId] : [],
      messageType: 'text'
    }, { merge: true });
  }
  return conversationId;
}

(async function () {
  const migrated = [];
  for (const conversation of legacy) migrated.push(await migrateConversation(conversation));
  console.log('Migrated without deleting source data:', migrated);

})().catch(error => { console.error(error); process.exitCode = 1; });
