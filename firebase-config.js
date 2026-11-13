(function(){
  'use strict';

  function _d(s){
    if(typeof atob === 'function') return atob(s);
    if(typeof Buffer !== 'undefined') return Buffer.from(s, 'base64').toString('utf8');
    return s;
  }

  var firebaseConfig = window.__MODIVS_CONFIG__ || {
    apiKey: _d('QUl6YVN5QjJJOGlGRGtjdVpKQkRCd2tBTEhOZW9JUjNhOWstZmNZ'),
    authDomain: _d('bW9kaXZzLWVkdWNhdGlvbi5maXJlYmFzZWFwcC5jb20='),
    projectId: _d('bW9kaXZzLWVkdWNhdGlvbg=='),
    storageBucket: _d('bW9kaXZzLWVkdWNhdGlvbi5maXJlYmFzZXN0b3JhZ2UuYXBw'),
    messagingSenderId: _d('ODIxMzI4MTA4MDg2'),
    appId: _d('MTo4MjEzMjgxMDgwODY6d2ViOjg1MmMwNmJjODhmYjM5ZDA5NjE2OTc='),
    measurementId: _d('Ry1INEpXQk5MQkM1')
  };
  if(window.firebase){
    if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);

    // Initialize App Check gracefully when supported and configured
    var appCheck = null;
    function initAppCheck(customSiteKey){
      var siteKey = customSiteKey || window.MODIVS_RECAPTCHA_KEY || window.APPCHECK_RECAPTCHA_KEY;
      var isLocal = typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
      if(isLocal && typeof self !== 'undefined' && self.FIREBASE_APPCHECK_DEBUG_TOKEN === undefined){
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      if(typeof firebase.appCheck === 'function' && siteKey && firebase.appCheck.ReCaptchaV3Provider){
        try {
          var ac = firebase.appCheck();
          ac.activate(new firebase.appCheck.ReCaptchaV3Provider(siteKey), isLocal ? false : true);
          if(window.EducationBFirebase) window.EducationBFirebase.appCheck = ac;
          return ac;
        } catch(appCheckErr){
          console.warn('Firebase App Check notice:', appCheckErr && appCheckErr.message);
        }
      }
      return null;
    }

    appCheck = initAppCheck();

    window.EducationBFirebase = {
      auth: firebase.auth(),
      db: firebase.firestore(),
      storage: (typeof firebase.storage === 'function') ? firebase.storage() : null,
      appCheck: appCheck,
      config: firebaseConfig
    };
    window.ModivsAppCheck = {
      init: initAppCheck
    };
  }
})();
