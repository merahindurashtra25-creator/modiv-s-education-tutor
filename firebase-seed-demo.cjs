/*
  Trusted setup only. Run locally with:
    npm install firebase-admin
    set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json
    set DEMO_STUDENT_PASSWORD=...
    set DEMO_TUTOR_PASSWORD=...
    set DEMO_ADMIN_PASSWORD=...
    node firebase-seed-demo.cjs
*/
const admin = require('firebase-admin');

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const auth = admin.auth();
const db = admin.firestore();

const accounts = [
  { email: 'demo.student@example.com', displayName: 'Demo Student', role: 'Student / Parent', password: process.env.DEMO_STUDENT_PASSWORD },
  { email: 'demo.tutor@example.com', displayName: 'Demo Tutor', role: 'Tutor', password: process.env.DEMO_TUTOR_PASSWORD },
  { email: 'demo.admin@example.com', displayName: 'Demo Admin', role: 'Admin', password: process.env.DEMO_ADMIN_PASSWORD }
];

async function getOrCreate(account) {
  try { return await auth.getUserByEmail(account.email); }
  catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    if (!account.password) throw new Error('Missing password environment variable for ' + account.email);
    return auth.createUser({ email: account.email, password: account.password, displayName: account.displayName });
  }
}

(async function(){
  const users = {};
  for (const account of accounts) {
    users[account.role] = await getOrCreate(account);
    await db.collection('users').doc(users[account.role].uid).set({
      uid: users[account.role].uid, displayName: account.displayName, role: account.role
    }, { merge: true });
  }
  await auth.setCustomUserClaims(users.Admin.uid, { admin: true });

  const student = users['Student / Parent'];
  const tutor = users.Tutor;
  const id = student.uid + '_' + tutor.uid;
  await db.collection('relationships').doc(id).set({
    studentId: student.uid, tutorId: tutor.uid, type: 'demo', updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  const conversation = db.collection('conversations').doc(id);
  const existing = await conversation.get();
  if (!existing.exists) {
    await conversation.set({
      studentId: student.uid, tutorId: tutor.uid, participantIds: [student.uid, tutor.uid],
      student: { name: student.displayName, email: student.email },
      tutor: { name: tutor.displayName, email: tutor.email },
      lastMessage: '', createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  console.log('Demo accounts, relationship, and conversation are ready:', id);
})().catch(error => { console.error(error); process.exitCode = 1; });
