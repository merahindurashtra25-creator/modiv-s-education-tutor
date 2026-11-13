const { admin, db } = require('./_firebase');
const { verifyAuth, checkCsrf, normalizeEmail } = require('./_auth');

module.exports = async function handler(req, res) {
  if (!checkCsrf(req)) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }

  // 1. GET Leads
  if (req.method === 'GET') {
    const { id, limit = 50 } = req.query;
    if (id) {
      const doc = await db.collection('leads').doc(String(id)).get();
      if (!doc.exists) return res.status(404).json({ error: 'Lead not found' });
      return res.status(200).json({ lead: { id: doc.id, ...doc.data() } });
    }

    const snap = await db.collection('leads').orderBy('createdAt', 'desc').limit(Math.min(Number(limit) || 50, 100)).get();
    const leads = [];
    snap.forEach(doc => {
      leads.push({ id: doc.id, ...doc.data() });
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
    const cost = Number(req.body.cost) || 10;

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
    const leadRef = db.collection('leads').doc();

    const leadData = {
      id: leadRef.id,
      name: body.name || (user ? user.name : 'Anonymous'),
      phone: body.phone || '',
      email: user ? user.email : (body.email || ''),
      city: body.city || '',
      area: body.area || '',
      class: body.class || body.cls || '',
      subjects: body.subjects || [],
      budget: body.budget || '',
      mode: body.mode || 'home',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await leadRef.set(leadData);
    return res.status(200).json({ success: true, lead: leadData });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

