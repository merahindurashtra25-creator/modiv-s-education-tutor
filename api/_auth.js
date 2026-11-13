const cookie = require('cookie');
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
  return cookie.parse(req.headers.cookie || '');
}

function setSessionCookie(res, sessionCookie) {
  const isProd = process.env.NODE_ENV === 'production';
  const serialized = cookie.serialize(SESSION_COOKIE_NAME, sessionCookie, {
    maxAge: SESSION_EXPIRY_MS / 1000,
    httpOnly: true,
    secure: isProd,
    path: '/',
    sameSite: 'lax'
  });
  res.setHeader('Set-Cookie', serialized);
}

function clearSessionCookie(res) {
  const isProd = process.env.NODE_ENV === 'production';
  const serialized = cookie.serialize(SESSION_COOKIE_NAME, '', {
    maxAge: 0,
    httpOnly: true,
    secure: isProd,
    path: '/',
    sameSite: 'lax'
  });
  res.setHeader('Set-Cookie', serialized);
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

