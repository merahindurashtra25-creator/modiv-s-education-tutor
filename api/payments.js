const https = require('https');
const crypto = require('crypto');
const { admin, db } = require('./_firebase');
const { verifyAuth, checkCsrf } = require('./_auth');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_live_TwTMFGYwNbt9BA';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

module.exports = async function handler(req, res) {
  if (!checkCsrf(req)) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }

  const action = String(req.query.action || req.body.action || '').toLowerCase();

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

  return res.status(405).json({ error: 'Method not allowed' });
};

