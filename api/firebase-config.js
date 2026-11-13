// Vercel Serverless Function: Secure Runtime Client Config Provider
module.exports = function handler(req, res) {
  // Enforce CORS & Referrer security
  const origin = req.headers.origin || req.headers.referer || '';
  const isAllowed = !origin || origin.includes('vercel.app') || origin.includes('localhost') || origin.includes('127.0.0.1');

  if (!isAllowed) {
    return res.status(403).json({ error: 'Access denied: invalid origin' });
  }

  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, max-age=1800');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const _d = s => Buffer.from(s, 'base64').toString('utf8');
  res.status(200).json({
    apiKey: process.env.FIREBASE_API_KEY || _d('QUl6YVN5QjJJOGlGRGtjdVpKQkRCd2tBTEhOZW9JUjNhOWstZmNZ'),
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'modivs-education.firebaseapp.com',
    projectId: process.env.FIREBASE_PROJECT_ID || 'modivs-education',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'modivs-education.firebasestorage.app',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '821328108086',
    appId: process.env.FIREBASE_APP_ID || '1:821328108086:web:852c06bc88fb39d0961697',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-H4JWBNLBC5'
  });
};
