const { admin, db, auth } = require('./_firebase');

const SESSION_COOKIE_NAME = 'modivs_session';
const SESSION_EXPIRY_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

const MASTER_ADMIN_EMAILS = (process.env.MASTER_ADMIN_EMAILS ? process.env.MASTER_ADMIN_EMAILS.split(',') : [
  'happinessaggarwal@gmail.com',
  'divyanshdhimanteam@gmail.com',
  'luxmankumar628@gmail.com'
]).map(e => String(e).trim().toLowerCase());

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function parseCookies(req) {
  const list = {};
  const rc = req && req.headers && req.headers.cookie;
  if (!rc) return list;
  rc.split(';').forEach(c => {
    const parts = c.split('=');
    const key = parts.shift().trim();
    if (key) {
      try {
        list[key] = decodeURIComponent(parts.join('=').trim());
      } catch (e) {
        list[key] = parts.join('=').trim();
      }
    }
  });
  return list;
}

function setSessionCookie(res, sessionCookie) {
  const isProd = process.env.NODE_ENV === 'production';
  const maxAge = Math.floor(SESSION_EXPIRY_MS / 1000);
  const cookieStr = `${SESSION_COOKIE_NAME}=${sessionCookie}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`;
  res.setHeader('Set-Cookie', cookieStr);
}

function clearSessionCookie(res) {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieStr = `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`;
  res.setHeader('Set-Cookie', cookieStr);
}

async function verifyAuth(req) {
  const cookies = parseCookies(req);
  const sessionCookie = cookies[SESSION_COOKIE_NAME];
  let authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) authHeader = authHeader.slice(7).trim();

  const tokenToVerify = sessionCookie || authHeader;
  if (!tokenToVerify) return null;

  try {
    let decoded;
    if (sessionCookie) {
      decoded = await auth.verifySessionCookie(sessionCookie, true).catch(() => null);
    }
    if (!decoded && authHeader) {
      decoded = await auth.verifyIdToken(authHeader).catch(() => null);
    }
    if (!decoded) return null;

    const email = normalizeEmail(decoded.email);
    const isAdmin = Boolean(
      decoded.admin === true ||
      (decoded.email_verified && MASTER_ADMIN_EMAILS.includes(email))
    );

    return {
      uid: decoded.uid,
      email,
      name: decoded.name || email.split('@')[0],
      emailVerified: Boolean(decoded.email_verified),
      isAdmin,
      claims: decoded
    };
  } catch (err) {
    return null;
  }
}

function checkCsrf(req) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
  const origin = req.headers.origin || req.headers.referer;
  if (!origin) return true; // Direct non-browser or emulator calls
  try {
    const url = new URL(origin);
    const host = req.headers.host;
    return url.host === host || url.hostname.endsWith('vercel.app') || url.hostname.endsWith('modivians.com') || url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch (e) {
    return false;
  }
}

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_EXPIRY_MS,
  MASTER_ADMIN_EMAILS,
  normalizeEmail,
  parseCookies,
  setSessionCookie,
  clearSessionCookie,
  verifyAuth,
  checkCsrf
};
