(function(){
  'use strict';

  function initFirebase(){
    var env = (typeof window !== 'undefined' && window.__ENV__) || (typeof process !== 'undefined' && process.env) || {};
    var firebaseConfig = {
      apiKey: env.FIREBASE_API_KEY || '',
      authDomain: env.FIREBASE_AUTH_DOMAIN || '',
      projectId: env.FIREBASE_PROJECT_ID || '',
      storageBucket: env.FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || '',
      appId: env.FIREBASE_APP_ID || '',
      measurementId: env.FIREBASE_MEASUREMENT_ID || ''
    };

    if(window.firebase && firebaseConfig.apiKey){
      if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);

      // Initialize App Check gracefully when supported and configured
      var appCheck = null;
      if(typeof firebase.appCheck === 'function'){
        try {
          var siteKey = env.APPCHECK_RECAPTCHA_KEY || window.MODIVS_RECAPTCHA_KEY || window.APPCHECK_RECAPTCHA_KEY;
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
  }

  if(typeof window !== 'undefined' && !window.__ENV__ && typeof document !== 'undefined'){
    var script = document.createElement('script');
    script.src = 'modivs-env.js';
    script.onload = initFirebase;
    script.onerror = initFirebase;
    document.head.appendChild(script);
  } else {
    initFirebase();
  }
})();
