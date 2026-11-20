/*
  Trusted migration of the existing EducationB browser data.

  Export one browser's data without passwords:
    copy(JSON.stringify({
      users: JSON.parse(localStorage.getItem('modivs_users') || '[]'),
      tutors: JSON.parse(localStorage.getItem('modivs_tutors_db') || '[]'),
      students: JSON.parse(localStorage.getItem('modivs_students_db') || '[]'),
      enquiries: JSON.parse(localStorage.getItem('modivs_student_enquiries') || '[]'),
      leads: JSON.parse(localStorage.getItem('modivs_active_leads') || '[]')
    }))
  Save as educationb-export.json.

  Run with a trusted service-account:
    npm install firebase-admin
    $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\service-account.json"
    node firebase-migrate-accounts.cjs educationb-export.json

  Existing Firestore documents are merged, never deleted. Password fields are
  deliberately excluded; Firebase Authentication accounts must already exist.
*/
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const source = JSON.parse(fs.readFileSync(path.resolve(process.argv[2] || 'educationb-export.json'), 'utf8'));
const list = value => Array.isArray(value) ? value : [];
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const auth = admin.auth();
const db = admin.firestore();

const email = value => String(value || '').trim().toLowerCase();
const withoutSecrets = value => {
  const copy = Object.assign({}, value);
  ['pass', 'password', 'token', 'secret'].forEach(key => delete copy[key]);
  return copy;
};
async function authUser(account) {
  if (!account || !email(account.email)) return null;
  try { return await auth.getUserByEmail(email(account.email)); }
  catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.warn('Skipped account without Firebase Auth identity:', account.email);
      return null;
    }
    throw error;
  }
}

(async function(){
  const tutors = list(source.tutors);
  const students = list(source.students);
  const users = list(source.users);
  const tutorById = new Map(), tutorByEmail = new Map(), studentByEmail = new Map();
  tutors.forEach(t => { if(t.id) tutorById.set(String(t.id), t); if(email(t.email)) tutorByEmail.set(email(t.email), t); });
  students.forEach(s => { if(email(s.email)) studentByEmail.set(email(s.email), s); });
  users.forEach(u => {
    if(u.role === 'Tutor' && email(u.email) && !tutorByEmail.has(email(u.email))) tutorByEmail.set(email(u.email), u);
    if(u.role === 'Student / Parent' && email(u.email) && !studentByEmail.has(email(u.email))) studentByEmail.set(email(u.email), u);
  });

  const uidByEmail = new Map();
  async function writeAccount(account, role) {
    const identity = await authUser(account);
    if(!identity) return null;
    uidByEmail.set(email(account.email), identity.uid);
    await db.collection('users').doc(identity.uid).set(Object.assign(withoutSecrets(account), {
      uid: identity.uid,
      email: identity.email,
      displayName: identity.displayName || account.name || account.displayName || '',
      role,
      migratedAt: admin.firestore.FieldValue.serverTimestamp()
    }), { merge: true });
    return identity.uid;
  }

  for (const tutor of tutors) await writeAccount(tutor, 'Tutor');
  for (const student of students) await writeAccount(student, 'Student / Parent');
  for (const account of users) {
    if(account.role === 'Tutor') await writeAccount(tutorByEmail.get(email(account.email)) || account, 'Tutor');
    if(account.role === 'Student / Parent') await writeAccount(studentByEmail.get(email(account.email)) || account, 'Student / Parent');
  }

  const relationships = new Map();
  function addRelationship(student, tutor, sourceType) {
    if(!student || !tutor) return;
    const studentUid = uidByEmail.get(email(student.email)), tutorUid = uidByEmail.get(email(tutor.email));
    if(!studentUid || !tutorUid || studentUid === tutorUid) return;
    relationships.set(studentUid + '_' + tutorUid, {studentId:studentUid, tutorId:tutorUid, type:sourceType});
  }
  list(source.enquiries).forEach(request => {
    const student = studentByEmail.get(email(request.studentEmail || request.email));
    const tutor = tutorById.get(String(request.tutorId || '')) || tutorByEmail.get(email(request.tutorEmail));
    addRelationship(student, tutor, 'enquiry');
  });
  list(source.leads).forEach(lead => {
    const student = studentByEmail.get(email(lead.studentEmail || lead.email));
    const tutor = tutorById.get(String(lead.tutorId || '')) || tutorByEmail.get(email(lead.tutorEmail));
    addRelationship(student, tutor, 'lead');
  });

  for (const [id, relationship] of relationships) {
    await db.collection('relationships').doc(id).set(Object.assign(relationship, {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }), { merge: true });
    const student = students.find(item => uidByEmail.get(email(item.email)) === relationship.studentId) || {};
    const tutor = tutors.find(item => uidByEmail.get(email(item.email)) === relationship.tutorId) || {};
    await db.collection('conversations').doc(id).set({
      studentId: relationship.studentId,
      tutorId: relationship.tutorId,
      participantIds: [relationship.studentId, relationship.tutorId],
      student: { name: student.name || 'Student', email: email(student.email) },
      tutor: { name: tutor.name || 'Tutor', email: email(tutor.email) },
      lastMessage: '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
  console.log('Migrated account profiles:', uidByEmail.size);
  console.log('Migrated authorized relationships:', relationships.size);
  console.log('No passwords were copied and no existing documents were deleted.');
})().catch(error => { console.error(error); process.exitCode = 1; });
