/**
 * Modiv's Education - Client Environment Bridge (modivs-env.js)
 * Exposes non-sensitive public client environment variables to browser scripts.
 * Generated automatically from .env during build.
 */
(function(window){
  'use strict';
  window.__MODIVS_BUILD__ = {
  "version": "mwpxs6nj-h5qub",
  "buildTime": "2026-11-21T04:57:21.582Z",
  "timestamp": 1795237041583
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
    measurementId: "G-H4JWBNLBC5"
  };
  function isBad(k) { return !k || typeof k !== 'string' || !k.trim() || k.indexOf('your_') === 0; }
  if (!window.__MODIVS_CONFIG__ || isBad(window.__MODIVS_CONFIG__.apiKey)) {
    window.__MODIVS_CONFIG__ = cfg;
  }
})(typeof window !== 'undefined' ? window : globalThis);
