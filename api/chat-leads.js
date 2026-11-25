/**
 * Modiv's Education - Chat Leads API (/api/chat-leads)
 *
 * Stores the guided website chat (role, name, mobile number, issue, answers and
 * transcript) in Firestore collection `chat_leads`.
 *
 * - POST { sessionId, token, ...record }  -> creates or updates the session document.
 *   An existing document can only be updated by the browser that holds its secret `token`.
 * - GET / DELETE are admin only.
 */

const { db, FieldValue, hasCredentials } = require('./_firebase');
const { verifyAuth, checkCsrf, normalizeEmail, MASTER_ADMIN_EMAILS } = require('./_auth');

const COLLECTION = 'chat_leads';
const ID_RE = /^[a-z0-9]{12,48}$/;

function str(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

function cleanPhone(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : '';
}

function cleanRecord(b) {
  const issues = (Array.isArray(b.issues) ? b.issues : []).slice(0, 20).map(function (i) {
    const answers = {};
    Object.keys((i && i.answers) || {}).slice(0, 12).forEach(function (k) {
      answers[str(k, 40)] = str(i.answers[k], 200);
    });
    return { issue: str(i && i.issue, 120), answers: answers, details: str(i && i.details, 1000), at: str(i && i.at, 40) };
  });
  const transcript = (Array.isArray(b.transcript) ? b.transcript : []).slice(-120).map(function (m) {
    return { from: m && m.from === 'user' ? 'user' : 'bot', text: str(m && m.text, 600), t: str(m && m.t, 40) };
  });
  return {
    role: ['student', 'tutor'].includes(b.role) ? b.role : '',
    name: str(b.name, 80),
    phone: cleanPhone(b.phone),
    email: normalizeEmail(b.email || ''),
    uid: str(b.uid, 128),
    loggedIn: b.loggedIn === true,
    agent: str(b.agent, 40),
    page: str(b.page, 200),
    status: ['new', 'closed'].includes(b.status) ? b.status : 'new',
    issues: issues,
    transcript: transcript,
    closedAt: str(b.closedAt, 40)
  };
}

module.exports = async function handler(req, res) {
  try {
    if (!checkCsrf(req)) return res.status(403).json({ error: 'CSRF validation failed' });

    // ---- POST: save / update a chat session -------------------------------------------------
    if (req.method === 'POST') {
      const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) || {};
      const sessionId = str(body.sessionId, 48).toLowerCase();
      const token = str(body.token, 64);
      if (!ID_RE.test(sessionId) || token.length < 16) return res.status(400).json({ error: 'Invalid session' });
      if (!hasCredentials) return res.status(200).json({ stored: false, reason: 'no-server-credentials' });

      const rec = cleanRecord(body);
      const ref = db.collection(COLLECTION).doc(sessionId);
      const snap = await ref.get();
      if (snap.exists) {
        if (snap.data().token !== token) return res.status(403).json({ error: 'Session mismatch' });
        await ref.set(Object.assign({}, rec, { updatedAt: FieldValue.serverTimestamp() }), { merge: true });
      } else {
        await ref.set(Object.assign({}, rec, {
          sessionId: sessionId,
          token: token,
          source: 'website-chat',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        }));
      }
      return res.status(200).json({ stored: true });
    }

    // ---- GET / DELETE: admin only -----------------------------------------------------------
    const user = await verifyAuth(req).catch(function () { return null; });
    const adminEmail = String((user && user.email) || '').trim().toLowerCase();
    const isAdmin = Boolean((user && user.isAdmin) || (adminEmail && MASTER_ADMIN_EMAILS.includes(adminEmail)));
    if (!isAdmin) return res.status(403).json({ error: 'Administrator access required' });
    if (!hasCredentials) return res.status(200).json({ chats: [] });

    if (req.method === 'GET') {
      const snap = await db.collection(COLLECTION).orderBy('updatedAt', 'desc').limit(Math.min(Number((req.query || {}).limit) || 100, 300)).get();
      const chats = snap.docs.map(function (d) {
        const x = d.data();
        delete x.token;
        return Object.assign({ id: d.id }, x);
      });
      return res.status(200).json({ chats: chats });
    }

    if (req.method === 'DELETE') {
      const id = str((req.query || {}).id || (req.body || {}).id, 48).toLowerCase();
      if (!ID_RE.test(id)) return res.status(400).json({ error: 'Invalid id' });
      await db.collection(COLLECTION).doc(id).delete();
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'Could not save chat' });
  }
};
