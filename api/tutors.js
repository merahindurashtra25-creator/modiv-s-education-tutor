/**
 * Modiv's Education - Tutor Directory & Profile Management API (/api/tutors)
 * 
 * Provides:
 * - Public search and filtering by subject, city, rating, and availability
 * - Individual tutor profile retrieval by ID, slug, or displayId
 * - Authenticated tutor profile updates and verification status management
 */

const { admin, db, auth, hasCredentials } = require('./_firebase');
const { verifyAuth, checkCsrf, normalizeEmail, MASTER_ADMIN_EMAILS } = require('./_auth');

module.exports = async function handler(req, res) {
  try {
    if (!checkCsrf(req)) {
      return res.status(403).json({ error: 'CSRF validation failed' });
    }

    if (!hasCredentials) {
      if (req.method === 'GET') {
        return res.status(200).json({ success: true, tutors: [] });
      }
      return res.status(200).json({ success: true, message: 'Server credentials not configured; client-side Firestore handles operations.' });
    }

    const query = req.query || {};
    const body = req.body || {};

  // 1. GET Tutors
  if (req.method === 'GET') {
    const { id, slug, city, subject, email, limit = 50 } = req.query;

    if (email) {
      const snap = await db.collection('tutors').where('email', '==', String(email).trim().toLowerCase()).limit(1).get();
      if (!snap.empty) {
        return res.status(200).json({ tutor: { id: snap.docs[0].id, ...snap.docs[0].data() } });
      }
      return res.status(404).json({ error: 'Tutor not found' });
    }

    if (id) {
      const doc = await db.collection('tutors').doc(String(id)).get();
      if (!doc.exists) return res.status(404).json({ error: 'Tutor not found' });
      return res.status(200).json({ tutor: { id: doc.id, ...doc.data() } });
    }

    if (slug) {
      const snap = await db.collection('tutors').where('slug', '==', String(slug)).limit(1).get();
      if (snap.empty) {
        // Fallback check by displayId or doc id
        const idSnap = await db.collection('tutors').where('displayId', '==', String(slug).toUpperCase()).limit(1).get();
        if (idSnap.empty) return res.status(404).json({ error: 'Tutor not found' });
        return res.status(200).json({ tutor: { id: idSnap.docs[0].id, ...idSnap.docs[0].data() } });
      }
      return res.status(200).json({ tutor: { id: snap.docs[0].id, ...snap.docs[0].data() } });
    }

    let query = db.collection('tutors');
    if (city) query = query.where('city', '==', String(city).trim());

    const toArray = (v) => {
      if (Array.isArray(v)) return v.filter(Boolean);
      if (typeof v === 'string' && v.trim()) return v.split(',').map(s => s.trim()).filter(Boolean);
      return [];
    };

    const snap = await query.limit(Math.min(Number(limit) || 100, 300)).get();
    const tutors = [];
    snap.forEach(doc => {
      const d = doc.data() || {};
      const subs = toArray(d.subs || d.subjects || d.subject);
      const levels = toArray(d.levels || d.classes || d.class || d.grade);
      const modes = toArray(d.modes || d.mode);
      tutors.push({
        id: doc.id,
        email: d.email || '',
        name: d.name || d.fullName || d.displayName || (d.email ? d.email.split('@')[0] : 'Tutor'),
        displayId: d.displayId || d.tutId || '',
        tutId: d.tutId || d.displayId || '',
        slug: d.slug || '',
        city: d.city || (d.location && d.location.city) || '',
        area: d.area || (d.location && d.location.area) || '',
        location: d.location || { city: d.city || '', area: d.area || '' },
        subs: subs.length ? subs : ['General'],
        subjects: subs.length ? subs : ['General'],
        levels: levels.length ? levels : ['Secondary (9–10)'],
        classes: levels.length ? levels : ['Secondary (9–10)'],
        modes: modes.length ? modes : ['Online'],
        years: d.years != null ? d.years : (d.experience || 0),
        experience: d.experience || (d.years != null ? `${d.years} years` : ''),
        qual: d.qual || '',
        fee: d.fee != null ? d.fee : (d.rate || 0),
        rate: d.rate || (d.fee != null ? `₹${d.fee}` : ''),
        status: d.status || d.approval || 'pending',
        approval: d.approval || d.status || 'pending',
        headline: d.headline || '',
        phone: d.phone || '—',
        rating: d.rating || 5.0,
        reviewsCount: d.reviewsCount || 0,
        photo: d.photo || '',
        bio: d.bio || '',
        verified: Boolean(d.status === 'approved' || d.approval === 'approved' || d.verified),
        approved_at: d.approved_at || d.approvedAt || d.reviewed_at || null,
        approvedAt: d.approvedAt || d.approved_at || d.reviewed_at || null,
        reviewed_at: d.reviewed_at || d.reviewedAt || null,
        submitted_at: d.submitted_at || d.submittedAt || null,
        createdAt: d.createdAt || d.created_at || null,
        updatedAt: d.updatedAt || d.updated_at || null
      });
    });

    try {
      const accSnap = await db.collection('accounts').where('role', '==', 'tutor').limit(150).get();
      const existingEmails = new Set(tutors.map(t => String(t.email || '').toLowerCase()));
      accSnap.forEach(doc => {
        const a = doc.data() || {};
        const em = String(a.email || doc.id || '').toLowerCase().trim();
        if (!em || existingEmails.has(em)) return;
        const subs = toArray(a.subs || a.subjects);
        const levels = toArray(a.levels || a.classes);
        const hasData = (a.city && a.city !== '—') || (a.phone && a.phone !== '—') || subs.length > 0;
        const st = a.status || a.approval || (hasData ? 'pending' : 'incomplete');
        tutors.push({
          id: a.id || `t_user_${em.replace(/[^a-z0-9]/gi, '_')}`,
          email: em,
          name: a.name || (em ? em.split('@')[0] : 'Tutor'),
          displayId: a.displayId || a.tutId || '',
          tutId: a.tutId || a.displayId || '',
          city: a.city || '',
          area: a.area || '',
          location: a.location || { city: a.city || '', area: a.area || '' },
          subs: subs.length ? subs : ['General'],
          subjects: subs.length ? subs : ['General'],
          levels: levels.length ? levels : ['Secondary (9–10)'],
          classes: levels.length ? levels : ['Secondary (9–10)'],
          modes: toArray(a.modes || ['Online']),
          years: a.years || 0,
          experience: a.years ? `${a.years} years` : '',
          qual: a.qual || 'Profile setup pending',
          fee: a.fee || 0,
          rate: a.fee ? `₹${a.fee}` : '',
          status: st,
          approval: a.approval || st,
          headline: a.headline || (st === 'pending' ? 'Tutor application pending review' : 'Account registered. Profile setup incomplete.'),
          phone: a.phone || '—',
          rating: 5.0,
          reviewsCount: 0,
          photo: a.photo || '',
          bio: a.bio || '',
          verified: Boolean(st === 'approved'),
          approved_at: null,
          approvedAt: null,
          reviewed_at: null,
          submitted_at: a.submitted_at || (a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().toISOString() : null),
          createdAt: a.createdAt || null,
          updatedAt: a.updatedAt || null
        });
      });
    } catch (_) { }

    const getTs = (t) => {
      const v = t.approved_at || t.approvedAt || t.reviewed_at || t.submitted_at || t.updatedAt || t.createdAt;
      if (!v) {
        const m = String(t.id || '').match(/_(\d{10,13})$/);
        return m ? (+m[1] < 1e11 ? +m[1] * 1000 : +m[1]) : 0;
      }
      if (typeof v === 'number') return v < 1e11 ? v * 1000 : v;
      if (typeof v === 'object') {
        if (typeof v.toDate === 'function') { try { return v.toDate().getTime(); } catch (_) { } }
        if (v._seconds != null) return v._seconds * 1000;
        if (v.seconds != null) return v.seconds * 1000;
      }
      const p = Date.parse(v);
      return isNaN(p) ? 0 : p;
    };
    tutors.sort((a, b) => getTs(b) - getTs(a) || (+b.years || 0) - (+a.years || 0));

    return res.status(200).json({ tutors });
  }

  // 2. POST Tutor Profile Update or Create (Requires authenticated tutor, admin, or create request)
  if (req.method === 'POST') {
    const user = await verifyAuth(req);
    const body = req.body || {};
    const isAdmin = Boolean(user && user.isAdmin);

    if (!user && !body.create) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const targetEmail = (isAdmin && body.tutorEmail)
      ? body.tutorEmail
      : (body.email || (user ? user.email : ''));
    if (!targetEmail) return res.status(400).json({ error: 'Email address is required' });

    const cleanEmail = String(targetEmail).trim().toLowerCase();
    let tutorDocId = body.id || `t_user_${cleanEmail.replace(/[^a-z0-9]/gi, '_')}`;
    try {
      const existSnap = await db.collection('tutors').where('email', '==', cleanEmail).limit(1).get();
      if (!existSnap.empty) {
        tutorDocId = existSnap.docs[0].id;
      }
    } catch (_) { }

    const subs = Array.isArray(body.subjects)
      ? body.subjects
      : (Array.isArray(body.subs) ? body.subs : (body.subjects ? String(body.subjects).split(',').map(s => s.trim()).filter(Boolean) : []));

    const updateData = { ...body };
    updateData.email = cleanEmail;
    if (!isAdmin) {
      delete updateData.tutId;
      delete updateData.displayId;
      delete updateData.rating;
      delete updateData.reviewCount;
      delete updateData.adminBadges;
      if (updateData.status === 'approved') {
        delete updateData.status;
      } else if (!updateData.status || updateData.status === 'incomplete') {
        updateData.status = 'pending';
      }
    } else {
      if (body.tutId) updateData.tutId = body.tutId;
      if (body.displayId) updateData.displayId = body.displayId;
      if (updateData.status === 'approved' && !updateData.approved_at) {
        updateData.approved_at = new Date().toISOString();
        updateData.approvedAt = updateData.approved_at;
      }
    }
    updateData.id = tutorDocId;
    if (subs.length) {
      updateData.subjects = subs;
      updateData.subs = subs;
    }
    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    const hasSubjects = subs.length > 0 && subs[0] !== 'General';
    const hasContact = updateData.phone && updateData.phone !== '—';
    const isProfileComplete = Boolean(hasSubjects && hasContact && updateData.status !== 'incomplete');

    if (isProfileComplete) {
      updateData.profileStatus = 'completed';
      updateData.profileCompleted = true;
      updateData.nextReminderAt = null;
    }
    updateData.lastActivityAt = admin.firestore.FieldValue.serverTimestamp();

    // Clean undefined fields
    Object.keys(updateData).forEach(k => {
      if (updateData[k] === undefined) delete updateData[k];
    });

    const writes = [
      db.collection('tutors').doc(tutorDocId).set(updateData, { merge: true })
    ];

    if (cleanEmail) {
      const accountPatch = {
        email: cleanEmail,
        role: 'tutor',
        roleName: 'Tutor',
        status: updateData.status || 'pending',
        approval: updateData.status || 'pending',
        name: updateData.name || '',
        phone: updateData.phone || '',
        city: updateData.city || '',
        area: updateData.area || '',
        subs: subs,
        location: updateData.location || { city: updateData.city || '', area: updateData.area || '' },
        profileStatus: isProfileComplete ? 'completed' : 'incomplete',
        profileCompleted: isProfileComplete,
        lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      if (isProfileComplete) {
        accountPatch.nextReminderAt = null;
      }
      writes.push(
        db.collection('accounts').doc(cleanEmail).set(accountPatch, { merge: true }).catch(() => { })
      );

      const uid = body.uid || (user && user.uid) || tutorDocId;
      writes.push(
        db.collection('users').doc(uid).set({
          email: cleanEmail,
          role: 'Tutor',
          roleKey: 'tutor',
          name: updateData.name || '',
          phone: updateData.phone || '',
          location: updateData.location || { city: updateData.city || '', area: updateData.area || '' },
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(() => { })
      );
    }

    await Promise.all(writes);
    return res.status(200).json({ success: true, message: 'Tutor record stored successfully', tutor: updateData });
  }

  // 3. DELETE Tutor (Permanently delete tutor profile & account from Firestore and Auth)
  if (req.method === 'DELETE' || (req.method === 'POST' && body._method === 'DELETE')) {
    const user = await verifyAuth(req).catch(() => null);
    const adminEmail = String((user && user.email) || body.adminEmail || query.adminEmail || '').trim().toLowerCase();
    const MASTER_ADMINS = MASTER_ADMIN_EMAILS || [
      'happinessaggarwal@gmail.com',
      'divyanshdhimanteam@gmail.com',
      'luxmankumar628@gmail.com'
    ];
    const isMasterAdmin = Boolean(
      (user && user.isAdmin) ||
      (adminEmail && MASTER_ADMINS.includes(adminEmail))
    );
    if (!isMasterAdmin) {
      return res.status(403).json({ error: 'Administrator access required to delete tutors' });
    }

    const tutorId = String(query.id || body.id || '').replace(/[\/\\#?]/g, '_').trim();
    const cleanEmail = normalizeEmail(query.email || body.email);
    const docKey = cleanEmail ? cleanEmail.replace(/[^a-z0-9_-]/g, '_') : '';

    const deletePromises = [];
    if (tutorId) {
      deletePromises.push(db.collection('tutors').doc(tutorId).delete().catch(() => {}));
    }
    if (cleanEmail) {
      deletePromises.push(db.collection('accounts').doc(cleanEmail).delete().catch(() => {}));
      deletePromises.push(db.collection('tutor_wallets').doc(docKey).delete().catch(() => {}));
      deletePromises.push(db.collection('tutor_documents').doc(docKey + '_id').delete().catch(() => {}));
      deletePromises.push(db.collection('tutor_documents').doc(docKey + '_cert').delete().catch(() => {}));

      deletePromises.push(
        db.collection('tutors').where('email', '==', cleanEmail).get().then(snap => {
          const batch = db.batch();
          snap.forEach(doc => batch.delete(doc.ref));
          return batch.commit().catch(() => {});
        }).catch(() => {})
      );
      deletePromises.push(
        db.collection('users').where('email', '==', cleanEmail).get().then(snap => {
          const batch = db.batch();
          snap.forEach(doc => batch.delete(doc.ref));
          return batch.commit().catch(() => {});
        }).catch(() => {})
      );

      // Permanently remove Auth user if exists
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
    return res.status(200).json({ success: true, message: 'Tutor profile, account, and authentication record permanently deleted' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
  } catch (fatalErr) {
    console.error('[tutors] Fatal error caught:', fatalErr);
    return res.status(500).json({ error: fatalErr.message || 'Internal server error' });
  }
};

