(function(){
  'use strict';
  var firebaseConfig = {
    apiKey: 'AIzaSyB2I8iFDkcUZJBDBwkALHNeoIR3a9k-fcY',
    authDomain: 'modivs-education.firebaseapp.com',
    projectId: 'modivs-education',
    storageBucket: 'modivs-education.firebasestorage.app',
    messagingSenderId: '821328108086',
    appId: '1:821328108086:web:852c06bc88fb39d0961697',
    measurementId: 'G-H4JWBNLBC5'
  };
  if(window.firebase){
    if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);

    // Initialize App Check gracefully when supported and configured
    var appCheck = null;
    if(typeof firebase.appCheck === 'function'){
      try {
        var siteKey = window.MODIVS_RECAPTCHA_KEY || window.APPCHECK_RECAPTCHA_KEY;
        var isLocal = typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
        if(isLocal && typeof self !== 'undefined' && self.FIREBASE_APPCHECK_DEBUG_TOKEN === undefined){
          self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        }
        if(siteKey && firebase.appCheck.ReCaptchaV3Provider){
          appCheck = firebase.appCheck();
          appCheck.activate(new firebase.appCheck.ReCaptchaV3Provider(siteKey), isLocal ? false : true);
        }
      } catch(appCheckErr){
        console.warn('Firebase App Check notice:', appCheckErr && appCheckErr.message);
      }
    }

    window.EducationBFirebase = {
      auth: firebase.auth(),
      db: firebase.firestore(),
      storage: (typeof firebase.storage === 'function') ? firebase.storage() : null,
      appCheck: appCheck,
      config: firebaseConfig
    };
  }
})();
