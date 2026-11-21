/**
 * Modiv's Education - Client Environment Bridge (modivs-env.js)
 * Exposes non-sensitive public client environment variables to browser scripts.
 * Generated automatically from .env during build.
 */
(function(window){
  'use strict';
  window.__MODIVS_BUILD__ = {
  "version": "mwqpgib6-1rm54",
  "buildTime": "2026-11-21T17:52:06.065Z",
  "timestamp": 1795283526066
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
  // Immediate URL cleanup: prevent showing 'modiv' or '.html' in browser address bar (production only)
  try {
    var _isLocal = !window.location || window.location.protocol === 'file:' || 
                   window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' || 
                   window.location.hostname === '[::1]' || 
                   window.location.hostname.indexOf('192.168.') === 0 || 
                   window.location.hostname.indexOf('10.') === 0 || 
                   (window.location.port !== '' && window.location.port !== '80' && window.location.port !== '443');
    if (window.location && window.history && window.history.replaceState && !_isLocal) {
      var _p = window.location.pathname || '';
      if (_p.indexOf('modiv') !== -1 || _p.indexOf('.html') !== -1 || _p.indexOf('.htm') !== -1 || _p.indexOf('%20') !== -1 || _p.indexOf(' ') !== -1 || _p.indexOf('_') !== -1) {
        var _parts = _p.split('?')[0].split('#')[0].split('/').filter(Boolean);
        var _file = decodeURIComponent(_parts.pop() || '').toLowerCase().replace(/[\s_+]+/g, '-');
        var _clean = _file.replace(/^modivs?-?/i, '').replace(/\.html?$/i, '');
        var _map = {
          '': '', 'index': '', 'home': '', 'modivs-home': '', 'home-page': '', 'homepage': '',
          'active-leads': 'active-leads', 'leads': 'active-leads', 'activeleads': 'active-leads',
          'admin': 'admin', 'admindashboard': 'admin', 'admin-dashboard': 'admin',
          'become-tutor': 'become-tutor', 'teach': 'become-tutor', 'becometutor': 'become-tutor', 'become-a-tutor': 'become-tutor',
          'social-vision': 'our-vision', 'vision': 'our-vision', 'ourvision': 'our-vision', 'our-vision': 'our-vision', 'our-social-vision': 'our-vision',
          'tuition': 'tuition', 'tuitions': 'tuition',
          'blogs': 'blogs', 'blog': 'blogs', 'articles': 'blogs',
          'contact': 'contact', 'contact-us': 'contact', 'contactus': 'contact', 'support': 'contact',
          'education': 'login', 'signin': 'login', 'sign-in': 'login', 'login': 'login', 'portal': 'login',
          'find-tutor': 'find-tutor', 'find': 'find-tutor', 'findtutor': 'find-tutor', 'find-a-tutor': 'find-tutor',
          'guide': 'guide', 'how-to-use': 'guide', 'howtouse': 'guide',
          'notes': 'notes', 'free-notes': 'notes', 'study-notes': 'notes',
          'org-dashboard': 'org-dashboard', 'orgdashboard': 'org-dashboard', 'organization-dashboard': 'org-dashboard',
          'parent-dashboard': 'parent-dashboard', 'parentdashboard': 'parent-dashboard',
          'parent-registration': 'parent-registration', 'parentregistration': 'parent-registration',
          'parent-signup': 'parent-signup', 'parentsignup': 'parent-signup',
          'post-requirement': 'post-requirement', 'post': 'post-requirement', 'postrequirement': 'post-requirement', 'post-a-requirement': 'post-requirement',
          'privacy-policy': 'privacy-policy', 'privacy': 'privacy-policy', 'privacypolicy': 'privacy-policy',
          'refund-policy': 'refund-policy', 'refunds': 'refund-policy', 'refundpolicy': 'refund-policy',
          'shop': 'shop', 'store': 'shop',
          'signup': 'signup', 'sign-up': 'signup', 'register': 'signup',
          'sitemap': 'sitemap', 'site-map': 'sitemap',
          'student-dashboard': 'student-dashboard', 'studentdashboard': 'student-dashboard',
          'student-registration': 'student-registration', 'studentregistration': 'student-registration',
          'student-signup': 'student-signup', 'studentsignup': 'student-signup', 'demo': 'student-signup',
          'students-corner': 'students-corner', 'studentscorner': 'students-corner',
          'terms': 'terms', 'terms-and-conditions': 'terms', 'termsandconditions': 'terms',
          'tutor-dashboard': 'tutor-dashboard', 'tutordashboard': 'tutor-dashboard',
          'tutor-edit-profile': 'tutor-edit-profile', 'tutoreditprofile': 'tutor-edit-profile',
          'tutor-profile': 'tutor-profile', 'tutorprofile': 'tutor-profile',
          'tutors-chandigarh': 'chandigarh', 'chandigarh': 'chandigarh', 'chandigarh-tutors': 'chandigarh',
          'tutors-mohali': 'mohali', 'mohali': 'mohali', 'mohali-tutors': 'mohali',
          'tutors-panchkula': 'panchkula', 'panchkula': 'panchkula', 'panchkula-tutors': 'panchkula',
          'tutors': 'tutors', 'browse-tutors': 'tutors', 'tutor': 'tutors',
          'user-signup': 'user-signup', 'usersignup': 'user-signup',
          'videos': 'videos', 'video-lectures': 'videos'
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
