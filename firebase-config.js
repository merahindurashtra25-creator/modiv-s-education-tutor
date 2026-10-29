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
    window.EducationBFirebase = {
      auth: firebase.auth(),
      db: firebase.firestore(),
      config: firebaseConfig
    };
  }
})();
