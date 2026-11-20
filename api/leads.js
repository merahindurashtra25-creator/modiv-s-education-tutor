/**
 * Modiv's Education - Leads Management API Endpoint (/api/leads)
 * 
 * Endpoints:
 * - GET: Fetch leads by ID, student email, or user UID
 * - POST: Create new lead enquiries with automatic display ID allocation
 * - PUT / PATCH: Update lead details, assign tutor, or update status
 * - DELETE: Remove or archive lead records
 */

const { admin, db } = require('./_firebase');
const { verifyAuth, checkCsrf, normalizeEmail } = require('./_auth');

// Per-inquiry unlock rate set by the admin on the lead itself (leads/{id}.unlockCost). Falls back to the global rate.
async function leadCostOverride(leadId) {
  const ids = [String(leadId || '').replace(/^conv_/, '')].filter(Boolean);
  for (const col of ['leads', 'students']) {
    for (const id of ids) {
      try {
        const d = await db.collection(col).doc(id).get();
        if (d.exists) {
          const v = Math.round(Number(d.data().unlockCost));
          if (isFinite(v) && v >= 1 && v <= 100000) return v;
        }
      } catch (e) { /* ignore */ }
    }
  }
  return 0;
}

module.exports = async function handler(req, res) {
  if (!checkCsrf(req)) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }

  // 1. GET Leads



  if (req.method === 'GET') {
    const { id, email, uid, limit = 100 } = req.query;
    if (id) {
      let doc = await db.collection('leads').doc(String(id)).get();
      if (!doc.exists) {
        doc = await db.collection('students').doc(String(id)).get();
      }
      if (!doc.exists) return res.status(404).json({ error: 'Lead not found' });
      return res.status(200).json({ lead: { id: doc.id, ...doc.data() } });
    }

    if (email || uid) {
      const cleanEmail = email ? normalizeEmail(email) : '';
      const cleanUid = uid ? String(uid).trim() : '';
      const leads = [];
      const seenIds = new Set();

      const queries = [];
      if (cleanEmail) {
        queries.push(db.collection('leads').where('email', '==', cleanEmail).limit(20).get());
        queries.push(db.collection('students').where('email', '==', cleanEmail).limit(20).get());
      }
      if (cleanUid) {
        queries.push(db.collection('leads').where('studentUid', '==', cleanUid).limit(20).get());
        queries.push(db.collection('leads').where('uid', '==', cleanUid).limit(20).get());
        queries.push(db.collection('students').where('studentUid', '==', cleanUid).limit(20).get());
        queries.push(db.collection('students').where('uid', '==', cleanUid).limit(20).get());
      }

      const snaps = await Promise.all(queries);
      snaps.forEach(snap => {
        snap.forEach(doc => {
          if (!seenIds.has(doc.id)) {
            seenIds.add(doc.id);
            leads.push({ id: doc.id, ...doc.data() });
          }
        });
      });

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

      const finalLeads = leads.filter(l => {
        if (!l || !l.id) return false;
        if (delSet.has(String(l.id))) return false;
        const lem = String(l.email || '').toLowerCase();
        if (lem && delSet.has(lem)) return false;
        return true;
      });

      finalLeads.sort((a, b) => {
        const da = new Date(a.createdAt || a.registered_at || a.submitted_at || a.updatedAt || 0).getTime();
        const dbDate = new Date(b.createdAt || b.registered_at || b.submitted_at || b.updatedAt || 0).getTime();
        return dbDate - da;
      });
      return res.status(200).json({ leads: finalLeads });
    }

    const colName = req.query.collection === 'students' ? 'students' : 'leads';
    const snap = await db.collection(colName).limit(Math.min(Number(limit) || 100, 300)).get();
    const leads = [];
    const seenIds = new Set();
    snap.forEach(doc => {
      seenIds.add(doc.id);
      leads.push({ id: doc.id, ...doc.data() });
    });

    if (!req.query.collection || req.query.collection === 'leads') {
      try {
        const studentSnap = await db.collection('students').limit(100).get();
        studentSnap.forEach(doc => {
          if (!seenIds.has(doc.id)) {
            const sd = doc.data() || {};
            seenIds.add(doc.id);
            leads.push({ id: doc.id, ...sd });
          }
        });
      } catch (err) { }
    }

    leads.sort((a, b) => {
      const da = new Date(a.createdAt || a.registered_at || a.submitted_at || a.updatedAt || 0).getTime();
      const dbDate = new Date(b.createdAt || b.registered_at || b.submitted_at || b.updatedAt || 0).getTime();
      return dbDate - da;
    });
    return res.status(200).json({ leads });
  }

  // 2. POST Unlock Lead (Server-side atomic coin deduction)
  if (req.method === 'POST' && (req.query.action === 'unlock' || req.body.action === 'unlock')) {
    const user = await verifyAuth(req);
    if (!user) return res.status(401).json({ error: 'Authentication required to unlock leads' });

    const tutorEmail = user.email;
    const leadId = String(req.body.leadId || '').replace(/[\/\\#?]/g, '_').trim();
    const leadName = String(req.body.leadName || '').trim().slice(0, 100);
    // Coins per unlock are set by the admin (Firestore site_content/pricing); the client's number is never trusted
    let cost = 10;
    try {
      const pr = await db.collection('site_content').doc('pricing').get();
      const pv = pr.exists ? Math.round(Number(pr.data().unlockCost)) : 0;
      if (pv >= 1) cost = pv;
    } catch (e) { /* keep default */ }
    // the admin can set a different rate for one specific inquiry; it wins over the global rate
    const perLead = await leadCostOverride(String(req.body.costLeadId || leadId));
    if (perLead >= 1) cost = perLead;

    if (!leadId) return res.status(400).json({ error: 'leadId is required' });

    const docKey = tutorEmail.replace(/[^a-z0-9_-]/g, '_');
    const walletRef = db.collection('tutor_wallets').doc(docKey);
    const unlockRef = db.collection('unlocks').doc(`${docKey}__${leadId}`);
    const txRef = db.collection('coin_transactions').doc();

    try {
      const result = await db.runTransaction(async (transaction) => {
        const [walletDoc, unlockDoc] = await Promise.all([
          transaction.get(walletRef),
          transaction.get(unlockRef)
        ]);

        if (unlockDoc.exists) {
          const curCoins = walletDoc.exists ? (Number(walletDoc.data().coins) || 0) : 0;
          return { already: true, balance: curCoins };
        }

        const walletData = walletDoc.exists ? walletDoc.data() : {};
        const mem = walletData.membership;
        const isMemValid = Boolean(
          mem &&
          mem.status === 'active' &&
          mem.validUntil &&
          new Date(mem.validUntil).getTime() > Date.now()
        );

        if (!isMemValid) {
          throw new Error('An active membership plan is required to unlock leads.');
        }

        const cur = Number(walletData.coins) || 0;
        if (cur < cost) {
          throw new Error(`Insufficient coins. You have ${cur}, need ${cost}.`);
        }

        const next = cur - cost;
        transaction.set(walletRef, { tutorEmail, coins: next, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        transaction.set(txRef, {
          tutorEmail,
          amount: -cost,
          balanceAfter: next,
          type: 'unlock',
          leadId,
          description: `Unlocked lead ${leadName || leadId}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        transaction.set(unlockRef, {
          id: `${docKey}__${leadId}`,
          type: 'unlock',
          tutorEmail,
          leadId,
          leadName,
          unlock_status: 'unlocked',
          coinsDeducted: cost,
          transaction_id: txRef.id,
          unlockedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, already: false, balance: next };
      });

      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  // 3. POST New Lead
  if (req.method === 'POST') {
    const user = await verifyAuth(req);
    const body = req.body || {};
    const leadId = String(body.id || body.leadId || '').replace(/[\/\\#?]/g, '_').trim() || db.collection('leads').doc().id;
    const leadRef = db.collection('leads').doc(leadId);
    const studentRef = db.collection('students').doc(leadId);

    const cleanSubs = (Array.isArray(body.subjects)
      ? body.subjects.flat(Infinity)
      : (Array.isArray(body.subs) ? body.subs.flat(Infinity) : (body.subjects ? String(body.subjects).split(',').map(s => s.trim()).filter(Boolean) : []))).filter(Boolean);

    const cleanModes = (Array.isArray(body.modes)
      ? body.modes.flat(Infinity)
      : (Array.isArray(body.mode) ? body.mode.flat(Infinity) : (body.mode ? [body.mode] : ['home']))).map(m => String(m).trim()).filter(Boolean);
    const cleanMode = typeof body.mode === 'string' ? body.mode : (cleanModes.join(', ') || 'home');

    const leadData = {
      id: leadId,
      requirementId: body.requirementId || leadId,
      studentUid: body.studentUid || body.uid || (user ? user.uid : ''),
      studentId: body.studentId || body.studentUid || body.uid || (user ? user.uid : '') || leadId,
      name: body.name || (user ? user.name : 'Anonymous'),
      studentName: body.studentName || body.name || (user ? user.name : 'Anonymous'),
      parentName: body.parentName || body.name || (user ? user.name : ''),
      phone: body.phone || '',
      email: body.email || (user ? user.email : ''),
      city: body.city || '',
      area: body.area || '',
      location: body.location || { city: body.city || '', area: body.area || '' },
      class: body.class || body.cls || '',
      cls: body.cls || body.class || '',
      board: body.board || 'CBSE',
      subject: cleanSubs.join(', ') || (typeof body.subject === 'string' ? body.subject : ''),
      subjects: cleanSubs,
      subs: cleanSubs,
      budget: body.budget || '',
      description: body.description || body.notes || '',
      notes: body.notes || body.description || '',
      preferredSchedule: body.preferredSchedule || body.timeSlot || body.preferred_schedule || '',
      preferred_schedule: body.preferredSchedule || body.timeSlot || body.preferred_schedule || '',
      mode: cleanMode,
      modes: cleanModes.length ? cleanModes : ['home'],
      status: (user && user.isAdmin) ? (body.status || 'active') : 'pending',
      approval: (user && user.isAdmin) ? (body.approval || 'approved') : 'pending',
      free: Boolean(body.free),
      leadBadge: body.leadBadge || (body.free ? 'Free Lead' : ''),
      displayId: body.displayId || '',
      stuId: body.stuId || '',
      leadId: leadId,
      sent: body.sent || 'Admin Entry',
      registered_at: body.registered_at || new Date().toISOString(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    ['formats', 'languages', 'teachingLanguages', 'timeSlots', 'goals'].forEach(k => {
      if (Array.isArray(body[k])) leadData[k] = body[k].flat(Infinity).filter(Boolean);
    });

    // Only an admin can set or clear the per-inquiry unlock rate (blank = use the global rate)
    if (user && user.isAdmin && Object.prototype.hasOwnProperty.call(body, 'unlockCost')) {
      const uc = Math.round(Number(body.unlockCost));
      if (body.unlockCost === null || body.unlockCost === '' || !isFinite(uc) || uc < 1) leadData.unlockCost = admin.firestore.FieldValue.delete();
      else leadData.unlockCost = Math.min(uc, 100000);
    }

    // Clean undefined fields
    Object.keys(leadData).forEach(k => {
      if (leadData[k] === undefined) delete leadData[k];
    });

    await Promise.all([
      leadRef.set(leadData, { merge: true }),
      studentRef.set(leadData, { merge: true })
    ]);

    if (leadData.email) {
      const em = String(leadData.email).toLowerCase();
      await db.collection('accounts').doc(em).set({
        email: em,
        name: leadData.name,
        phone: leadData.phone,
        role: 'student',
        roleName: 'Student / Parent',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(() => { });

      const leadUid = body.uid || (user && user.uid) || `s_user_${em.replace(/[^a-z0-9]/gi, '_')}`;
      await db.collection('users').doc(leadUid).set({
        uid: leadUid,
        email: em,
        name: leadData.name,
        phone: leadData.phone,
        role: 'Student / Parent',
        roleKey: 'student',
        location: leadData.location,
        city: leadData.city || '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(() => { });
    }

    return res.status(200).json({ success: true, lead: leadData });
  }

  // 3. DELETE Lead (Permanently delete lead & student records from Firestore)
  if (req.method === 'DELETE' || (req.method === 'POST' && req.body && req.body._method === 'DELETE')) {
    const user = await verifyAuth(req);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Administrator access required to delete leads' });
    }

    const leadId = String(req.query.id || (req.body && req.body.id) || '').replace(/[\/\\#?]/g, '_').trim();
    const cleanEmail = normalizeEmail(req.query.email || (req.body && req.body.email));

    const deletePromises = [];
    if (leadId) {
      deletePromises.push(db.collection('leads').doc(leadId).delete().catch(() => { }));
      deletePromises.push(db.collection('students').doc(leadId).delete().catch(() => { }));
      deletePromises.push(db.collection('demoRequests').doc(leadId).delete().catch(() => { }));
      deletePromises.push(db.collection('deleted_leads').doc(leadId).set({
        id: leadId,
        email: cleanEmail || '',
        deletedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(() => { }));
    }
    if (cleanEmail) {
      deletePromises.push(
        db.collection('deleted_leads').doc('em_' + cleanEmail.replace(/[^a-z0-9]/gi, '_')).set({
          id: leadId || '',
          email: cleanEmail,
          deletedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(() => { })
      );
      deletePromises.push(
        db.collection('leads').where('email', '==', cleanEmail).get().then(snap => {
          const batch = db.batch();
          snap.forEach(doc => batch.delete(doc.ref));
          return batch.commit().catch(() => { });
        }).catch(() => { })
      );
      deletePromises.push(
        db.collection('students').where('email', '==', cleanEmail).get().then(snap => {
          const batch = db.batch();
          snap.forEach(doc => batch.delete(doc.ref));
          return batch.commit().catch(() => { });
        }).catch(() => { })
      );
      deletePromises.push(
        db.collection('demoRequests').where('email', '==', cleanEmail).get().then(snap => {
          const batch = db.batch();
          snap.forEach(doc => batch.delete(doc.ref));
          return batch.commit().catch(() => { });
        }).catch(() => { })
      );
      if (req.query.deleteAccount === 'true' || (req.body && req.body.deleteAccount)) {
        deletePromises.push(db.collection('accounts').doc(cleanEmail).delete().catch(() => { }));
        deletePromises.push(
          db.collection('users').where('email', '==', cleanEmail).get().then(snap => {
            const batch = db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            return batch.commit().catch(() => { });
          }).catch(() => { })
        );
      }
    }

    await Promise.all(deletePromises);
    return res.status(200).json({ success: true, message: 'Lead and associated student records permanently deleted from Firestore' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

