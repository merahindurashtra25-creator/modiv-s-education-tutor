/**
 * Modiv's Education - Firebase Client Configuration
 * Complete web app configuration for Firebase SDK & Services.
 */
(function(window){
  'use strict';

  var firebaseConfig = {
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

  function isBadKey(k) {
    return !k || typeof k !== 'string' || !k.trim() || k.indexOf('your_') === 0;
  }

  if (!window.__MODIVS_CONFIG__ || isBadKey(window.__MODIVS_CONFIG__.apiKey)) {
    window.__MODIVS_CONFIG__ = firebaseConfig;
  }

  // Initialize compat SDK if loaded (or retry once scripts finish loading)
  function initFirebase() {
    if (typeof window === 'undefined' || typeof window.firebase === 'undefined') return false;
    try {
      if (!window.firebase.apps || !window.firebase.apps.length) {
        window.firebase.initializeApp(firebaseConfig);
      } else {
        var currentApp = window.firebase.app();
        if (!currentApp.options || isBadKey(currentApp.options.apiKey)) {
          if (typeof currentApp.delete === 'function') {
            currentApp.delete().then(function(){
              try { window.firebase.initializeApp(firebaseConfig); } catch(e){}
            }).catch(function(){
              currentApp.options.apiKey = firebaseConfig.apiKey;
            });
          } else {
            currentApp.options.apiKey = firebaseConfig.apiKey;
          }
        }
      }
      window.EducationBFirebase = window.EducationBFirebase || {};
      if (!window.EducationBFirebase.auth && typeof window.firebase.auth === 'function') {
        window.EducationBFirebase.auth = window.firebase.auth();
      }
      if (!window.EducationBFirebase.db && typeof window.firebase.firestore === 'function') {
        window.EducationBFirebase.db = window.firebase.firestore();
      }
      if (!window.EducationBFirebase.messaging && typeof window.firebase.messaging === 'function') {
        try {
          if (typeof window.firebase.messaging.isSupported !== 'function' || window.firebase.messaging.isSupported()) {
            window.EducationBFirebase.messaging = window.firebase.messaging();
          }
        } catch(e){}
      }
      if (typeof window.firebase.analytics === 'function') {
        window.EducationBAnalytics = window.firebase.analytics();
      }
      return true;
    } catch (e) {
      console.warn('Firebase config initialization notice:', e);
      return false;
    }
  }

  initFirebase();

  if (typeof window !== 'undefined') {
    window.initFirebaseConfig = initFirebase;
    if (typeof document !== 'undefined' && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initFirebase);
    }
    var retries = 0;
    var timer = setInterval(function(){
      retries++;
      if (initFirebase() || retries > 30) clearInterval(timer);
    }, 100);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = firebaseConfig;
  }
})(typeof window !== 'undefined' ? window : globalThis);
