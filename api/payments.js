/**
 * Modiv's Education - Payment Processing API (/api/payments)
 * 
 * Handles:
 * - Razorpay order generation for wallet coins & membership packages
 * - Razorpay cryptographic webhook signature verification (HMAC SHA256)
 * - Atomic credit of coins and membership activation to tutor wallets
 */

const https = require('https');
const crypto = require('crypto');
const { admin, db } = require('./_firebase');
const { verifyAuth, checkCsrf } = require('./_auth');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_live_U1yN0O1Ni2s8MB';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'JdIeruGBet4kfiH9c1DYgMob';

module.exports = async function handler(req, res) {
  try {
    if (!checkCsrf(req)) {
      return res.status(403).json({ error: 'CSRF validation failed' });
    }

    const query = req.query || {};
    const body = req.body || {};
    const action = String(query.action || body.action || '').toLowerCase();

  // 1. Create Razorpay Order
  if (req.method === 'POST' && (action === 'create-order' || action === 'createorder')) {
    const user = await verifyAuth(req);
    if (!user) return res.status(401).json({ error: 'Authentication required for payment orders' });
    if (!RAZORPAY_KEY_SECRET) return res.status(500).json({ error: 'Razorpay secret key is not configured on the server' });

    const amount = Number(req.body.amount);
    const currency = String(req.body.currency || 'INR').toUpperCase();
    const receipt = String(req.body.receipt || ('rcpt_' + Date.now().toString(36)));
    const notes = (typeof req.body.notes === 'object' && req.body.notes !== null) ? req.body.notes : {};

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount in paise is required' });
    }

    const postData = JSON.stringify({
      amount: Math.round(amount),
      currency,
      receipt,
      notes
    });

    const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

    return new Promise((resolve) => {
      const orderReq = https.request({
        hostname: 'api.razorpay.com',
        port: 443,
        path: '/v1/orders',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': authHeader
        }
      }, (orderRes) => {
        let body = '';
        orderRes.on('data', chunk => { body += chunk; });
        orderRes.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (orderRes.statusCode >= 200 && orderRes.statusCode < 300) {
              res.status(200).json({
                orderId: parsed.id,
                amount: parsed.amount,
                currency: parsed.currency,
                receipt: parsed.receipt,
                keyId: RAZORPAY_KEY_ID
              });
            } else {
              res.status(orderRes.statusCode).json({ error: (parsed.error && parsed.error.description) || 'Order creation failed' });
            }
          } catch (e) {
            res.status(500).json({ error: 'Invalid response from Razorpay API' });
          }
          resolve();
        });
      });

      orderReq.on('error', (e) => {
        res.status(500).json({ error: e.message });
        resolve();
      });

      orderReq.write(postData);
      orderReq.end();
    });
  }

  // 2. Verify Razorpay Payment Signature
  if (req.method === 'POST' && action === 'verify') {
    if (!RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ error: 'Razorpay secret key is not configured on the server' });
    }

    const orderId = String(req.body.orderId || '').trim();
    const paymentId = String(req.body.paymentId || '').trim();
    const signature = String(req.body.signature || '').trim();

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ error: 'orderId, paymentId, and signature are required' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = expectedSignature === signature;

    if (isValid) {
      const user = await verifyAuth(req);
      await db.collection('verified_payments').doc(paymentId).set({
        paymentId,
        orderId,
        verified: true,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        userEmail: user ? user.email : ''
      }, { merge: true });
    }

    return res.status(200).json({ verified: isValid, paymentId, orderId });
  }

  // Shared helper: verify Razorpay payment record or HMAC signature for non-admin purchases
  async function verifyPaymentProof(orderId, paymentId, signature) {
    if (!paymentId) return false;
    const snap = await db.collection('verified_payments').doc(paymentId).get();
    if (snap.exists && snap.data().verified === true) return true;
    if (orderId && signature && RAZORPAY_KEY_SECRET) {
      const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
      if (expected === signature) {
        await db.collection('verified_payments').doc(paymentId).set({
          paymentId, orderId, verified: true,
          verifiedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return true;
      }
    }
    return false;
  }

  const docKey = (em) => String(em || '').trim().toLowerCase().replace(/[\/\\#?]/g, '_');
  const altDocKey = (em) => String(em || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');

  // 2b. GET Tutor Wallet (for reliable sync even if client Firestore listener is blocked)
  if (req.method === 'GET' && action === 'wallet') {
    const user = await verifyAuth(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const em = (user.isAdmin && query.tutorEmail) ? String(query.tutorEmail).trim().toLowerCase() : user.email;
    if (!em) return res.status(400).json({ error: 'tutorEmail is required' });

    let snap = await db.collection('tutor_wallets').doc(docKey(em)).get();
    if (!snap.exists && altDocKey(em) !== docKey(em)) {
      snap = await db.collection('tutor_wallets').doc(altDocKey(em)).get();
    }
    const d = snap.exists ? (snap.data() || {}) : {};
    return res.status(200).json({
      success: true,
      tutorEmail: em,
      coins: Number(d.coins) || 0,
      membership: d.membership || null
    });
  }

  // 3. Credit Purchased Coins to Tutor Wallet (atomic & idempotent)
  if (req.method === 'POST' && action === 'credit-coins') {
    const user = await verifyAuth(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const em = (user.isAdmin && body.tutorEmail) ? String(body.tutorEmail).trim().toLowerCase() : user.email;
    const coins = Math.round(Number(body.coins) || 0);
    const price = String(body.price || '');
    const orderId = String(body.orderId || '').trim();
    const paymentId = String(body.paymentId || '').trim();
    const signature = String(body.signature || '').trim();

    if (!em || coins <= 0 || coins > 100000) {
      return res.status(400).json({ error: 'Valid tutor email and coin amount (1-100000) are required' });
    }
    if (!user.isAdmin && !(await verifyPaymentProof(orderId, paymentId, signature))) {
      return res.status(403).json({ error: 'Verified Razorpay payment is required to credit coins' });
    }

    const walletRef = db.collection('tutor_wallets').doc(docKey(em));
    const payRef = paymentId ? db.collection('verified_payments').doc(paymentId) : null;

    const result = await db.runTransaction(async (t) => {
      const [ws, ps] = await Promise.all([t.get(walletRef), payRef ? t.get(payRef) : Promise.resolve(null)]);
      const cur = ws.exists ? (Number(ws.data().coins) || 0) : 0;
      if (ps && ps.exists && ps.data().credited === true) {
        return { balance: cur, alreadyCredited: true };
      }
      const next = cur + coins;
      const now = admin.firestore.FieldValue.serverTimestamp();
      t.set(walletRef, { tutorEmail: em, coins: next, updatedAt: now }, { merge: true });
      const txRef = db.collection('coin_transactions').doc();
      t.set(txRef, {
        tutorEmail: em,
        amount: coins,
        balanceAfter: next,
        type: 'purchase',
        description: `Purchased ${coins} coins${price ? ` (${price})` : ''}`,
        price,
        orderId,
        paymentId,
        gateway: 'razorpay',
        createdAt: now
      });
      if (payRef) {
        t.set(payRef, { credited: true, creditedTo: em, creditedCoins: coins, creditedAt: now }, { merge: true });
      }
      return { balance: next, alreadyCredited: false };
    });

    return res.status(200).json({ success: true, ...result });
  }

  // 4. Activate / Extend / Upgrade Tutor Membership (atomic & idempotent)
  if (req.method === 'POST' && action === 'activate-membership') {
    const user = await verifyAuth(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const em = (user.isAdmin && body.tutorEmail) ? String(body.tutorEmail).trim().toLowerCase() : user.email;
    const planName = String(body.planName || '').trim();
    const days = Math.max(1, Math.round(Number(body.days) || 30));
    const price = String(body.price || '');
    const bonusCoins = Math.max(0, Math.round(Number(body.bonusCoins) || 0));
    const orderId = String(body.orderId || '').trim();
    const paymentId = String(body.paymentId || '').trim();
    const signature = String(body.signature || '').trim();
    const status = body.status === 'expired' ? 'expired' : 'active';

    if (!em || !planName) {
      return res.status(400).json({ error: 'Tutor email and planName are required' });
    }
    if (!user.isAdmin && status !== 'expired' && !(await verifyPaymentProof(orderId, paymentId, signature))) {
      return res.status(403).json({ error: 'Verified Razorpay payment is required to activate membership' });
    }

    const walletRef = db.collection('tutor_wallets').doc(docKey(em));
    const payRef = paymentId ? db.collection('verified_payments').doc(paymentId) : null;

    const result = await db.runTransaction(async (t) => {
      const [ws, ps] = await Promise.all([t.get(walletRef), payRef ? t.get(payRef) : Promise.resolve(null)]);
      const d = ws.exists ? (ws.data() || {}) : {};
      const cur = Number(d.coins) || 0;
      const existing = d.membership || null;
      if (ps && ps.exists && ps.data().membershipActivated === true) {
        return { membership: existing, balance: cur, alreadyActivated: true };
      }

      const nowMs = Date.now();
      const existingValid = !!(existing && existing.status === 'active' && existing.validUntil && new Date(existing.validUntil).getTime() > nowMs);
      let mem;
      let txType = 'activated';
      if (status === 'expired') {
        txType = 'expired';
        mem = {
          planName: existing ? existing.planName : 'None',
          status: 'expired',
          startedAt: existing ? existing.startedAt : null,
          validUntil: new Date(nowMs - 1000).toISOString(),
          durationDays: existing ? existing.durationDays : 0
        };
      } else {
        const extend = Boolean(body.extend && existingValid && existing.planName === planName);
        if (extend) txType = 'extended';
        else if (existingValid) txType = 'upgraded';
        else if (existing && existing.planName && existing.planName !== 'None') txType = 'renewed';
        const baseMs = extend ? new Date(existing.validUntil).getTime() : nowMs;
        mem = {
          planName,
          status: 'active',
          startedAt: (extend && existing.startedAt) ? existing.startedAt : new Date(nowMs).toISOString(),
          validUntil: new Date(baseMs + days * 86400000).toISOString(),
          durationDays: days
        };
      }

      const next = cur + bonusCoins;
      const now = admin.firestore.FieldValue.serverTimestamp();
      t.set(walletRef, { tutorEmail: em, coins: next, membership: mem, updatedAt: now }, { merge: true });
      t.set(db.collection('membership_history').doc(), {
        tutorEmail: em, planName: mem.planName, type: txType, durationDays: mem.durationDays,
        price, orderId, paymentId, gateway: body.gateway || 'razorpay', bonusCoins,
        startedAt: mem.startedAt, validUntil: mem.validUntil, createdAt: now
      });
      if (bonusCoins > 0) {
        t.set(db.collection('coin_transactions').doc(), {
          tutorEmail: em, amount: bonusCoins, balanceAfter: next, type: 'membership_bonus',
          description: `Bonus coins for ${mem.planName}${price ? ` (${price})` : ''}`,
          orderId, paymentId, gateway: body.gateway || 'razorpay', createdAt: now
        });
      }
      if (payRef) {
        t.set(payRef, { membershipActivated: true, creditedTo: em, planName: mem.planName, activatedAt: now }, { merge: true });
      }
      return { membership: mem, balance: next, alreadyActivated: false };
    });

    const TIER_OF = { 'Standard Plan': 'Silver', 'Professional Plan': 'Gold', 'Premium Plan': 'Platinum' };
    const mem = result.membership;
    const live = mem && mem.status === 'active' && mem.validUntil && new Date(mem.validUntil).getTime() > Date.now();
    await db.collection('tutors').where('email', '==', em).limit(1).get().then((snap) => {
      if (!snap.empty) {
        return snap.docs[0].ref.set({
          membershipTier: live ? (TIER_OF[mem.planName] || '') : '',
          membershipUntil: live ? mem.validUntil : ''
        }, { merge: true });
      }
    }).catch(() => {});

    return res.status(200).json({ success: true, ...result });
  }

  // 5. Admin Manual Coin Credit / Debit
  if (req.method === 'POST' && action === 'admin-coins') {
    const user = await verifyAuth(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    if (!user.isAdmin) return res.status(403).json({ error: 'Admin privileges required' });

    const em = String(body.tutorEmail || '').trim().toLowerCase();
    const amount = Math.round(Number(body.amount) || 0);
    const description = String(body.description || (amount >= 0 ? 'Admin credit' : 'Admin debit')).trim();

    if (!em || !amount) {
      return res.status(400).json({ error: 'tutorEmail and non-zero amount are required' });
    }

    const walletRef = db.collection('tutor_wallets').doc(docKey(em));
    const result = await db.runTransaction(async (t) => {
      const ws = await t.get(walletRef);
      const cur = ws.exists ? (Number(ws.data().coins) || 0) : 0;
      const next = Math.max(0, cur + amount);
      const now = admin.firestore.FieldValue.serverTimestamp();
      t.set(walletRef, { tutorEmail: em, coins: next, updatedAt: now }, { merge: true });
      t.set(db.collection('coin_transactions').doc(), {
        tutorEmail: em,
        amount,
        balanceAfter: next,
        type: amount >= 0 ? 'admin_credit' : 'admin_debit',
        description,
        adminEmail: user.email,
        createdAt: now
      });
      return { balance: next };
    });

    await Promise.all([
      db.collection('tutors').where('email', '==', em).limit(1).get().then((snap) => {
        if (!snap.empty) return snap.docs[0].ref.set({ coins: result.balance }, { merge: true });
      }).catch(() => {}),
      db.collection('notifications').doc().set({
        recipientEmail: em,
        type: 'coin_update',
        title: amount > 0 ? `+${amount} Coins Credited by Admin` : `${amount} Coins Adjusted by Admin`,
        description: `${description}. New balance: ${result.balance} coins.`,
        actionUrl: '/tutor-dashboard#credits',
        read: false,
        readAt: null,
        senderEmail: user.email,
        senderName: "Modiv's Administration",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }).catch(() => {})
    ]);

    return res.status(200).json({ success: true, ...result });
  }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (fatalErr) {
    console.error('[payments] Fatal error caught:', fatalErr);
    return res.status(500).json({ error: fatalErr.message || 'Internal server error' });
  }
};

