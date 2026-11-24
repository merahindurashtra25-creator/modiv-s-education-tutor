/**
 * Modiv's Education - Student Account & Enquiries API (/api/students)
 * 
 * Provides:
 * - Student profile fetching and enquiries history
 * - Student onboarding and enquiry creation
 * - Student dashboard preference and contact info management
 */

const { admin, db, auth, hasCredentials, restFetchCollection, restFetchDocument } = require('./_firebase');
const { verifyAuth, checkCsrf, normalizeEmail, MASTER_ADMIN_EMAILS } = require('./_auth');

module.exports = async function handler(req, res) {
  try {
    if (!checkCsrf(req)) {
      return res.status(403).json({ error: 'CSRF validation failed' });
    }

    if (!hasCredentials) {
      if (req.method === 'GET') {
        const { id, email, uid, limit = 100 } = req.query || {};
        if (id) {
          let student = await restFetchDocument('students', id);
          if (!student) student = await restFetchDocument('leads', id);
          if (student) return res.status(200).json({ student });
          return res.status(404).json({ error: 'Student not found' });
        }
        let list = await restFetchCollection('students', { limit: Number(limit) || 100 });
        if (email) {
          const em = String(email).trim().toLowerCase();
          list = list.filter(s => String(s.email || s.studentEmail || '').toLowerCase() === em);
        }
        if (uid) {
          const u = String(uid).trim();
          list = list.filter(s => String(s.uid || s.studentUid || '').trim() === u);
        }
        return res.status(200).json({ success: true, students: list });
      }
      return res.status(200).json({ success: true, message: 'Server credentials not configured; client-side Firestore handles operations.' });
    }

    const query = req.query || {};
    const body = req.body || {};

  // 1. GET Students
  if (req.method === 'GET') {
    const { id, email, uid, limit = 100 } = req.query;

    if (id) {
      let doc = await db.collection('students').doc(String(id)).get();
      if (!doc.exists) {
        doc = await db.collection('leads').doc(String(id)).get();
      }
      if (!doc.exists) return res.status(404).json({ error: 'Student not found' });
      return res.status(200).json({ student: { id: doc.id, ...doc.data() } });
    }

    if (email || uid) {
      const cleanEmail = email ? normalizeEmail(email) : '';
      const cleanUid = uid ? String(uid).trim() : '';
      const students = [];
      const seenIds = new Set();
      const queries = [];

      if (cleanEmail) {
        queries.push(db.collection('students').where('email', '==', cleanEmail).limit(20).get());
        queries.push(db.collection('leads').where('email', '==', cleanEmail).limit(20).get());
      }
      if (cleanUid) {
        queries.push(db.collection('students').where('studentUid', '==', cleanUid).limit(20).get());
        queries.push(db.collection('students').where('uid', '==', cleanUid).limit(20).get());
        queries.push(db.collection('leads').where('studentUid', '==', cleanUid).limit(20).get());
        queries.push(db.collection('leads').where('uid', '==', cleanUid).limit(20).get());
      }

      const snaps = await Promise.all(queries);
      snaps.forEach(snap => {
        snap.forEach(doc => {
          if (!seenIds.has(doc.id)) {
            seenIds.add(doc.id);
            students.push({ id: doc.id, ...doc.data() });
          }
        });
      });

      students.sort((a, b) => {
        const da = new Date(a.registered_at || a.submitted_at || a.createdAt || a.updatedAt || 0).getTime();
        const dbDate = new Date(b.registered_at || b.submitted_at || b.createdAt || b.updatedAt || 0).getTime();
        return dbDate - da;
      });

      return res.status(200).json({ students });
    }

    let query = db.collection('students');
    const snap = await query.limit(Math.min(Number(limit) || 100, 300)).get();
    const students = [];
    const seenIds = new Set();
    snap.forEach(doc => {
      seenIds.add(doc.id);
      const d = doc.data() || {};
      const subs = Array.isArray(d.subs) ? d.subs : (Array.isArray(d.subjects) ? d.subjects : (d.subjects ? [d.subjects] : []));
      students.push({
        id: doc.id,
        requirementId: d.requirementId || doc.id,
        studentUid: d.studentUid || d.uid || '',
        studentId: d.studentId || d.displayId || d.stuId || doc.id,
        name: d.name || d.studentName || d.parentName || d.by || (d.email ? d.email.split('@')[0] : 'Student'),
        studentName: d.studentName || d.name || (d.email ? d.email.split('@')[0] : 'Student'),
        parentName: d.parentName || d.by || d.name || '',
        by: d.by || d.parentName || 'Parent',
        email: d.email || d.studentEmail || '',
        phone: d.phone || d.mobile || '—',
        city: d.city || (d.location && d.location.city) || '',
        area: d.area || (d.location && d.location.area) || '',
        location: d.location || { city: d.city || '', area: d.area || '' },
        cls: d.cls || d.class || 'Class 10',
        class: d.class || d.cls || 'Class 10',
        board: d.board || 'CBSE',
        subs: subs,
        subjects: subs,
        subject: Array.isArray(subs) ? subs.join(', ') : (d.subject || ''),
        budget: d.budget || '₹500–700 / hr',
        description: d.description || d.notes || '',
        notes: d.notes || d.description || '',
        preferredSchedule: d.preferredSchedule || d.timeSlot || d.preferred_schedule || '',
        preferred_schedule: d.preferredSchedule || d.timeSlot || d.preferred_schedule || '',
        mode: d.mode || 'Offline (At student’s home)',
        modes: Array.isArray(d.modes) ? d.modes : [d.mode || 'Offline (At student’s home)'],
        status: d.status || 'pending',
        approval: d.approval || (d.status === 'active' ? 'approved' : 'pending'),
        free: Boolean(d.free),
        leadBadge: d.leadBadge || (d.free ? 'Free Lead' : ''),
        displayId: d.displayId || d.stuId || '',
        stuId: d.stuId || d.displayId || '',
        leadId: d.leadId || doc.id,
        sent: d.sent || 'Registered student',
        registered_at: d.registered_at || d.submitted_at || (d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString()),
        submitted_at: d.submitted_at || d.registered_at || new Date().toISOString()
      });
    });

    try {
      const leadsSnap = await db.collection('leads').limit(Math.min(Number(limit) || 100, 300)).get();
      leadsSnap.forEach(doc => {
        if (!seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          const d = doc.data() || {};
          const subs = Array.isArray(d.subs) ? d.subs : (Array.isArray(d.subjects) ? d.subjects : (d.subjects ? [d.subjects] : []));
          students.push({
            id: doc.id,
            requirementId: d.requirementId || doc.id,
            studentUid: d.studentUid || d.uid || '',
            studentId: d.studentId || d.displayId || d.stuId || doc.id,
            name: d.name || d.studentName || d.parentName || d.by || (d.email ? d.email.split('@')[0] : 'Student'),
            studentName: d.studentName || d.name || (d.email ? d.email.split('@')[0] : 'Student'),
            parentName: d.parentName || d.by || d.name || '',
            by: d.by || d.parentName || 'Parent',
            email: d.email || d.studentEmail || '',
            phone: d.phone || d.mobile || '—',
            city: d.city || (d.location && d.location.city) || '',
            area: d.area || (d.location && d.location.area) || '',
            location: d.location || { city: d.city || '', area: d.area || '' },
            cls: d.cls || d.class || 'Class 10',
            class: d.class || d.cls || 'Class 10',
            board: d.board || 'CBSE',
            subs: subs,
            subjects: subs,
            subject: Array.isArray(subs) ? subs.join(', ') : (d.subject || ''),
            budget: d.budget || '₹500–700 / hr',
            description: d.description || d.notes || '',
            notes: d.notes || d.description || '',
            preferredSchedule: d.preferredSchedule || d.timeSlot || d.preferred_schedule || '',
            preferred_schedule: d.preferredSchedule || d.timeSlot || d.preferred_schedule || '',
            mode: d.mode || 'Offline (At student’s home)',
            modes: Array.isArray(d.modes) ? d.modes : [d.mode || 'Offline (At student’s home)'],
            status: d.status || 'pending',
            approval: d.approval || (d.status === 'active' ? 'approved' : 'pending'),
            free: Boolean(d.free),
            leadBadge: d.leadBadge || (d.free ? 'Free Lead' : ''),
            displayId: d.displayId || d.stuId || '',
            stuId: d.stuId || d.displayId || '',
            leadId: d.leadId || doc.id,
            sent: d.sent || 'Registered student',
            registered_at: d.registered_at || d.submitted_at || (d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString()),
            submitted_at: d.submitted_at || d.registered_at || new Date().toISOString()
          });
        }
      });
    } catch (e) { }

    let delSet = new Set();
    try {
      const delSnap = await db.collection('deleted_leads').limit(500).get();
      delSnap.forEach(d => {
        const data = d.data() || {};
        if (d.id) delSet.add(d.id);
        if (data.id) delSet.add(String(data.id));
        if (data.email) delSet.add(String(data.email).toLowerCase());
      });
    } catch (e) { }

    const finalStudents = students.filter(s => {
      if (!s || !s.id) return false;
      if (delSet.has(String(s.id))) return false;
      const sem = String(s.email || '').toLowerCase();
      if (sem && delSet.has(sem)) return false;
      return true;
    });

    finalStudents.sort((a, b) => {
      const da = new Date(a.registered_at || a.submitted_at || 0).getTime();
      const dbDate = new Date(b.registered_at || b.submitted_at || 0).getTime();
      return dbDate - da;
    });

    return res.status(200).json({ students: finalStudents });
  }

  // 2. POST Student Create or Update
  if (req.method === 'POST') {
    const user = await verifyAuth(req);
    const body = req.body || {};
    const isAdmin = Boolean(user && user.isAdmin);

    const studentId = String(body.id || body.leadId || body.stuId || '').replace(/[\/\\#?]/g, '_').trim() || db.collection('students').doc().id;
    const cleanEmail = normalizeEmail(body.email || (user ? user.email : ''));

    const cleanSubs = (Array.isArray(body.subs)
      ? body.subs.flat(Infinity)
      : (Array.isArray(body.subjects) ? body.subjects.flat(Infinity) : (body.subjects ? String(body.subjects).split(',').map(s => s.trim()).filter(Boolean) : []))).filter(Boolean);

    const cleanModes = (Array.isArray(body.modes)
      ? body.modes.flat(Infinity)
      : (Array.isArray(body.mode) ? body.mode.flat(Infinity) : (body.mode ? [body.mode] : ['Offline (At student’s home)']))).map(m => String(m).trim()).filter(Boolean);
    const cleanMode = typeof body.mode === 'string' ? body.mode : (cleanModes.join(', ') || 'Offline (At student’s home)');

    const studentData = {
      id: studentId,
      requirementId: body.requirementId || studentId,
      studentUid: body.studentUid || body.uid || (user ? user.uid : ''),
      studentId: body.studentId || body.studentUid || body.uid || (user ? user.uid : '') || studentId,
      name: body.name || body.studentName || body.parentName || (user ? user.name : 'Student'),
      studentName: body.studentName || body.name || (user ? user.name : 'Student'),
      parentName: body.parentName || body.by || body.name || '',
      by: body.by || body.parentName || (user ? user.name : 'Parent'),
      email: cleanEmail,
      phone: body.phone || '—',
      city: body.city || '',
      area: body.area || '',
      location: body.location || { city: body.city || '', area: body.area || '' },
      cls: body.cls || body.class || 'Class 10',
      class: body.class || body.cls || 'Class 10',
      board: body.board || 'CBSE',
      subject: cleanSubs.join(', ') || (typeof body.subject === 'string' ? body.subject : ''),
      subs: cleanSubs,
      subjects: cleanSubs,
      budget: body.budget || '₹500–700 / hr',
      description: body.description || body.notes || '',
      notes: body.notes || body.description || '',
      preferredSchedule: body.preferredSchedule || body.timeSlot || body.preferred_schedule || '',
      preferred_schedule: body.preferredSchedule || body.timeSlot || body.preferred_schedule || '',
      mode: cleanMode,
      modes: cleanModes.length ? cleanModes : ['Offline (At student’s home)'],
      status: isAdmin ? (body.status || 'active') : 'pending',
      approval: isAdmin ? (body.approval || 'approved') : 'pending',
      free: Boolean(body.free),
      leadBadge: body.leadBadge || (body.free ? 'Free Lead' : ''),
      displayId: body.displayId || body.stuId || '',
      stuId: body.stuId || body.displayId || '',
      leadId: body.leadId || studentId,
      sent: body.sent || (isAdmin ? 'Added by admin' : 'Registered student'),
      registered_at: body.registered_at || body.submitted_at || new Date().toISOString(),
      submitted_at: body.submitted_at || body.registered_at || new Date().toISOString(),
      createdAt: body.createdAt || body.registered_at || new Date().toISOString(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    ['formats', 'languages', 'teachingLanguages', 'timeSlots', 'goals'].forEach(k => {
      if (Array.isArray(body[k])) studentData[k] = body[k].flat(Infinity).filter(Boolean);
    });

    const isProfileComplete = Boolean(studentData.cls && studentData.subs && studentData.subs.length > 0);
    studentData.profileStatus = isProfileComplete ? 'completed' : 'incomplete';
    studentData.profileCompleted = isProfileComplete;
    studentData.lastActivityAt = admin.firestore.FieldValue.serverTimestamp();
    if (isProfileComplete) {
      studentData.nextReminderAt = null;
    }

    // Clean undefined fields
    Object.keys(studentData).forEach(k => {
      if (studentData[k] === undefined) delete studentData[k];
    });

    const writes = [
      db.collection('students').doc(studentId).set(studentData, { merge: true }),
      db.collection('leads').doc(studentId).set(studentData, { merge: true })
    ];

    if (cleanEmail) {
      const studentAccountPatch = {
        email: cleanEmail,
        name: studentData.name,
        phone: studentData.phone,
        role: 'student',
        roleName: 'Student / Parent',
        profileStatus: isProfileComplete ? 'completed' : 'incomplete',
        profileCompleted: isProfileComplete,
        lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      if (isProfileComplete) {
        studentAccountPatch.nextReminderAt = null;
      }
      writes.push(
        db.collection('accounts').doc(cleanEmail).set(studentAccountPatch, { merge: true }).catch(() => {})
      );

      const studentUid = body.uid || (user && user.uid) || `s_user_${cleanEmail.replace(/[^a-z0-9]/gi, '_')}`;
      writes.push(
        db.collection('users').doc(studentUid).set({
          uid: studentUid,
          email: cleanEmail,
          name: studentData.name,
          phone: studentData.phone,
          role: 'Student / Parent',
          roleKey: 'student',
          location: studentData.location,
          city: studentData.city || '',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(() => {})
      );
    }

    await Promise.all(writes);
    return res.status(200).json({ success: true, student: studentData });
  }

  // 3. DELETE Student
  if (req.method === 'DELETE') {
    const user = await verifyAuth(req).catch(() => null);
    const adminEmail = String((user && user.email) || body.adminEmail || query.adminEmail || '').trim().toLowerCase();
    const isMasterAdmin = Boolean(
      (user && user.isAdmin) ||
      (adminEmail && MASTER_ADMIN_EMAILS.includes(adminEmail))
    );
    if (!isMasterAdmin) {
      return res.status(403).json({ error: 'Administrator access required to delete students' });
    }

    const studentId = String(query.id || body.id || '').trim();
    const cleanEmail = normalizeEmail(query.email || body.email);

    const deletePromises = [];
    if (studentId) {
      deletePromises.push(db.collection('students').doc(studentId).delete().catch(() => {}));
      deletePromises.push(db.collection('leads').doc(studentId).delete().catch(() => {}));
      deletePromises.push(db.collection('demoRequests').doc(studentId).delete().catch(() => {}));
      deletePromises.push(db.collection('deleted_leads').doc(studentId).set({
        id: studentId,
        email: cleanEmail || '',
        deletedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(() => {}));
    }
    if (cleanEmail) {
      // Clean up any email-level tombstone so user can re-register as a fresh new account
      deletePromises.push(
        db.collection('deleted_leads').doc('em_' + cleanEmail.replace(/[^a-z0-9]/gi, '_')).delete().catch(() => {})
      );
      deletePromises.push(
        db.collection('students').where('email', '==', cleanEmail).get().then(snap => {
          const batch = db.batch();
          snap.forEach(doc => batch.delete(doc.ref));
          return batch.commit().catch(() => {});
        }).catch(() => {})
      );
      deletePromises.push(
        db.collection('leads').where('email', '==', cleanEmail).get().then(snap => {
          const batch = db.batch();
          snap.forEach(doc => batch.delete(doc.ref));
          return batch.commit().catch(() => {});
        }).catch(() => {})
      );
      deletePromises.push(
        db.collection('demoRequests').where('email', '==', cleanEmail).get().then(snap => {
          const batch = db.batch();
          snap.forEach(doc => batch.delete(doc.ref));
          return batch.commit().catch(() => {});
        }).catch(() => {})
      );
      // Always delete account and users documents completely
      deletePromises.push(db.collection('accounts').doc(cleanEmail).delete().catch(() => {}));
      deletePromises.push(
        db.collection('users').where('email', '==', cleanEmail).get().then(snap => {
          const batch = db.batch();
          snap.forEach(doc => batch.delete(doc.ref));
          return batch.commit().catch(() => {});
        }).catch(() => {})
      );

      // Permanently remove Firebase Auth user so user can sign up fresh
      const authClient = auth || (admin && (typeof admin.auth === 'function' ? admin.auth() : admin.auth));
      if (authClient && typeof authClient.getUserByEmail === 'function') {
        deletePromises.push(
          authClient.getUserByEmail(cleanEmail).then(authU => {
            if (authU && authU.uid) return authClient.deleteUser(authU.uid).catch(() => {});
          }).catch(() => {})
        );
      }
    }

    await Promise.all(deletePromises);
    return res.status(200).json({ success: true, message: 'Student, account and associated records permanently deleted from database and auth' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
  } catch (fatalErr) {
    console.error('[students] Fatal error caught:', fatalErr);
    return res.status(500).json({ error: fatalErr.message || 'Internal server error' });
  }
};
