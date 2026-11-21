/**
 * Modiv's Education - Client Environment Bridge (modivs-env.js)
 * Exposes non-sensitive public client environment variables to browser scripts.
 * Generated automatically from .env during build.
 */
(function(window){
  'use strict';
  window.__MODIVS_BUILD__ = {
  "version": "mwqalzif-d3m6h",
  "buildTime": "2026-11-21T10:56:27.397Z",
  "timestamp": 1795258587399
};
  window.__ENV__ = window.__ENV__ || {
  "FIREBASE_API_KEY": "AIzaSyB2I8iFDkcUZJBDBwkALHNeoIR3a9k-fcY",
  "FIREBASE_AUTH_DOMAIN": "modivs-education.firebaseapp.com",
  "FIREBASE_DATABASE_URL": "https://modivs-education-default-rtdb.asia-southeast1.firebasedatabase.app",
  "FIREBASE_PROJECT_ID": "modivs-education",
  "FIREBASE_STORAGE_BUCKET": "modivs-education.firebasestorage.app",
  "FIREBASE_MESSAGING_SENDER_ID": "821328108086",
  "FIREBASE_APP_ID": "1:821328108086:web:852c06bc88fb39d0961697",
  "FIREBASE_MEASUREMENT_ID": "G-H4JWBNLBC5",
  "FIREBASE_VAPID_KEY": "BNaz3v2Ga9IfiZXftbOpKu3oGWnNx0rRb7g3yJs84xVaJ9x2EWqy5yleIcVPWIFhQecnzjBFAx6jn91jBnA5TEs",
  "GOOGLE_MAPS_API_KEY": "",
  "RAZORPAY_KEY_ID": "rzp_live_U1yN0O1Ni2s8MB",
  "MASTER_ADMIN_EMAILS": "happinessaggarwal@gmail.com,divyanshdhimanteam@gmail.com,luxmankumar628@gmail.com"
};
  var cfg = {
    apiKey: "AIzaSyB2I8iFDkcUZJBDBwkALHNeoIR3a9k-fcY",
    authDomain: "modivs-education.firebaseapp.com",
    databaseURL: "https://modivs-education-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "modivs-education",
    storageBucket: "modivs-education.firebasestorage.app",
    messagingSenderId: "821328108086",
    appId: "1:821328108086:web:852c06bc88fb39d0961697",
    measurementId: "G-H4JWBNLBC5",
    vapidKey: "BNaz3v2Ga9IfiZXftbOpKu3oGWnNx0rRb7g3yJs84xVaJ9x2EWqy5yleIcVPWIFhQecnzjBFAx6jn91jBnA5TEs"
  };
  function isBad(k) { return !k || typeof k !== 'string' || !k.trim() || k.indexOf('your_') === 0; }
  if (!window.__MODIVS_CONFIG__ || isBad(window.__MODIVS_CONFIG__.apiKey)) {
    window.__MODIVS_CONFIG__ = cfg;
  }
  // Immediate URL cleanup: prevent showing 'modiv' or '.html' in browser address bar
  try {
    if (window.location && window.history && window.history.replaceState && window.location.protocol !== 'file:') {
      var _p = window.location.pathname || '';
      if (_p.indexOf('modiv') !== -1 || _p.indexOf('.html') !== -1 || _p.indexOf('.htm') !== -1) {
        var _clean = _p.replace(//+/g, '/').split('/').pop().toLowerCase().replace(/^modivs?-?/i, '').replace(/.html?$/i, '');
        var _map = {
          '': '', 'index': '', 'home': '', 'modivs-home': '',
          'active-leads': 'active-leads', 'leads': 'active-leads',
          'admin': 'admin', 'admindashboard': 'admin', 'admin-dashboard': 'admin',
          'become-tutor': 'become-tutor', 'teach': 'become-tutor',
          'social-vision': 'our-vision', 'vision': 'our-vision', 'ourvision': 'our-vision', 'our-vision': 'our-vision',
          'tuition': 'tuition', 'tuitions': 'tuition',
          'blogs': 'blogs', 'blog': 'blogs',
          'contact': 'contact', 'contact-us': 'contact',
          'education': 'login', 'signin': 'login', 'sign-in': 'login', 'login': 'login', 'portal': 'login',
          'find-tutor': 'find-tutor', 'find': 'find-tutor',
          'guide': 'guide', 'how-to-use': 'guide',
          'notes': 'notes',
          'org-dashboard': 'org-dashboard',
          'parent-dashboard': 'parent-dashboard',
          'parent-registration': 'parent-registration',
          'parent-signup': 'parent-signup',
          'post-requirement': 'post-requirement', 'post': 'post-requirement',
          'privacy-policy': 'privacy-policy', 'privacy': 'privacy-policy',
          'refund-policy': 'refund-policy', 'refunds': 'refund-policy',
          'shop': 'shop', 'store': 'shop',
          'signup': 'signup',
          'sitemap': 'sitemap',
          'student-dashboard': 'student-dashboard',
          'student-registration': 'student-registration',
          'student-signup': 'student-signup', 'demo': 'student-signup',
          'students-corner': 'students-corner',
          'terms': 'terms', 'terms-and-conditions': 'terms',
          'tutor-dashboard': 'tutor-dashboard',
          'tutor-edit-profile': 'tutor-edit-profile',
          'tutor-profile': 'tutor-profile',
          'tutors-chandigarh': 'chandigarh', 'chandigarh': 'chandigarh',
          'tutors-mohali': 'mohali', 'mohali': 'mohali',
          'tutors-panchkula': 'panchkula', 'panchkula': 'panchkula',
          'tutors': 'tutors', 'browse-tutors': 'tutors',
          'user-signup': 'user-signup',
          'videos': 'videos'
        };
        var _target = _map.hasOwnProperty(_clean) ? _map[_clean] : _clean;
        var _newPath = _target ? ('/' + _target) : '/';
        if (_p !== _newPath && _p !== (_newPath + '/')) {
          window.history.replaceState(null, document.title || '', _newPath + (window.location.search || '') + (window.location.hash || ''));
        }
      }
    }
  } catch(e) {}
})(typeof window !== 'undefined' ? window : globalThis);
