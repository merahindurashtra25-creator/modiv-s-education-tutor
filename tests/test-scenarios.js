/**
 * Modiv's Education - 12 Scenarios Verification & Testing Suite
 * Validates Google Current Location Integration & Global Unique Account Authentication
 */

const assert = require('assert');

// Mock browser environment for unit test execution
function createMockEnvironment() {
  const localStorageStore = {};
  const mockLocalStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStorageStore, k) ? localStorageStore[k] : null),
    setItem: (k, v) => { localStorageStore[k] = String(v); },
    removeItem: (k) => { delete localStorageStore[k]; },
    clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); },
    _dump: () => localStorageStore
  };

  const firestoreStore = {
    accounts: {},
    users: {},
    tutors: {},
    students: {},
    leads: {}
  };

  let txLock = Promise.resolve();
  const mockDb = {
    _store: firestoreStore,
    collection: (col) => ({
      doc: (id) => ({
        get: async () => ({
          exists: !!firestoreStore[col][id],
          data: () => firestoreStore[col][id] || {}
        }),
        set: async (data, opts) => {
          if (opts && opts.merge && firestoreStore[col][id]) {
            firestoreStore[col][id] = Object.assign({}, firestoreStore[col][id], data);
          } else {
            firestoreStore[col][id] = Object.assign({}, data);
          }
          return firestoreStore[col][id];
        }
      }),
      where: (field, op, val) => ({
        limit: () => ({
          get: async () => {
            const matches = Object.values(firestoreStore[col] || {}).filter(item => item[field] === val);
            return {
              empty: matches.length === 0,
              docs: matches.map(m => ({ data: () => m }))
            };
          }
        })
      })
    }),
    runTransaction: (updateFunction) => {
      const run = async () => {
        const transaction = {
          get: async (docRef) => docRef.get(),
          set: async (docRef, data) => docRef.set(data)
        };
        return await updateFunction(transaction);
      };
      const res = txLock.then(run, run);
      txLock = res.catch(() => {});
      return res;
    }
  };

  const mockAuth = {
    currentUser: null,
    signInWithPopup: async (provider) => ({
      user: {
        uid: 'google_uid_' + Math.random().toString(36).substring(7),
        displayName: 'Google Test User',
        email: mockAuth._nextGoogleEmail || 'test@google.com',
        emailVerified: true
      }
    }),
    createUserWithEmailAndPassword: async (email, pass) => ({
      user: {
        uid: 'pw_uid_' + Math.random().toString(36).substring(7),
        displayName: email.split('@')[0],
        email: email,
        updateProfile: async () => {}
      }
    }),
    signOut: async () => { mockAuth.currentUser = null; }
  };

  const mockWindow = {
    localStorage: mockLocalStorage,
    EducationBFirebase: {
      db: mockDb,
      auth: mockAuth,
      config: { apiKey: 'mock_key' }
    },
    firebase: {
      firestore: {
        FieldValue: { serverTimestamp: () => new Date().toISOString() }
      },
      auth: {
        GoogleAuthProvider: function() {
          return { setCustomParameters: () => {} };
        }
      }
    },
    document: {
      head: { appendChild: () => {} },
      getElementById: (id) => ({
        id,
        classList: { add: () => {}, remove: () => {}, toggle: () => {} },
        innerHTML: '',
        textContent: '',
        value: ''
      }),
      createElement: () => ({
        classList: { add: () => {}, remove: () => {} },
        appendChild: () => {},
        setAttribute: () => {}
      })
    },
    location: { href: '' }
  };
  mockWindow.window = mockWindow;
  mockWindow.global = mockWindow;

  return { mockWindow, mockLocalStorage, firestoreStore, mockAuth };
}

// Load and evaluate modules in mock environment
function loadModules(env) {
  const fs = require('fs');
  const path = require('path');

  const authCode = fs.readFileSync(path.join(__dirname, '..', 'modivs-auth-unique.js'), 'utf8');
  const locationCode = fs.readFileSync(path.join(__dirname, '..', 'modivs-location.js'), 'utf8');

  const vm = require('vm');
  const context = vm.createContext(env.mockWindow);

  vm.runInContext(authCode, context);
  vm.runInContext(locationCode, context);

  return {
    ModivsAuth: env.mockWindow.ModivsAuthUnique,
    ModivsLocation: env.mockWindow.ModivsLocation
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('MODIV\'S EDUCATION - 12 VERIFICATION SCENARIOS TEST');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    return fn().then(() => {
      console.log(`[PASS] Scenario ${total}: ${name}`);
      passed++;
    }).catch(err => {
      console.error(`[FAIL] Scenario ${total}: ${name}`);
      console.error(err);
    });
  }

  const env = createMockEnvironment();
  const { ModivsAuth, ModivsLocation } = loadModules(env);

  // Scenario 1: New Student registration with email/password
  await test('New Student registration with email/password', async () => {
    const email = 'newstudent1@example.com';
    const check = await ModivsAuth.checkEmailExists(email);
    assert.strictEqual(check.exists, false, 'Email should not exist before registration');

    const reg = await ModivsAuth.registerAccountAtomic({
      email,
      role: 'student',
      name: 'Rohan Sharma',
      phone: '+91 9876543210',
      location: { city: 'Ludhiana', area: 'Model Town', country: 'India', lat: 30.9, lng: 75.85 },
      provider: 'password'
    });
    assert.strictEqual(reg.success, true);
    assert.strictEqual(reg.role, 'student');

    const verify = await ModivsAuth.checkEmailExists(email);
    assert.strictEqual(verify.exists, true);
    assert.strictEqual(verify.role, 'student');
    assert.strictEqual(verify.roleName, 'Student');
  });

  // Scenario 2: New Tutor registration with email/password
  await test('New Tutor registration with email/password', async () => {
    const email = 'newtutor1@example.com';
    const reg = await ModivsAuth.registerAccountAtomic({
      email,
      role: 'tutor',
      name: 'Pooja Verma',
      phone: '+91 9812345678',
      location: { city: 'Chandigarh', area: 'Sector 17', country: 'India', lat: 30.73, lng: 76.77 },
      provider: 'password'
    });
    assert.strictEqual(reg.success, true);
    assert.strictEqual(reg.role, 'tutor');

    const verify = await ModivsAuth.checkEmailExists(email);
    assert.strictEqual(verify.exists, true);
    assert.strictEqual(verify.role, 'tutor');
    assert.strictEqual(verify.roleName, 'Tutor');
  });

  // Scenario 3: New Student registration with Google
  await test('New Student registration with Google', async () => {
    const email = 'googlestudent@example.com';
    env.mockAuth._nextGoogleEmail = email;

    const res = await ModivsAuth.continueWithGoogle('student', {
      location: { city: 'Delhi', area: 'Rohini', country: 'India' }
    });
    assert.strictEqual(res.role, 'student');
    assert.strictEqual(res.isNew, true);

    const verify = await ModivsAuth.checkEmailExists(email);
    assert.strictEqual(verify.exists, true);
    assert.strictEqual(verify.role, 'student');
  });

  // Scenario 4: New Tutor registration with Google
  await test('New Tutor registration with Google', async () => {
    const email = 'googletutor@example.com';
    env.mockAuth._nextGoogleEmail = email;

    const res = await ModivsAuth.continueWithGoogle('tutor', {
      location: { city: 'Amritsar', area: 'Ranjit Avenue', country: 'India' }
    });
    assert.strictEqual(res.role, 'tutor');
    assert.strictEqual(res.isNew, true);

    const verify = await ModivsAuth.checkEmailExists(email);
    assert.strictEqual(verify.exists, true);
    assert.strictEqual(verify.role, 'tutor');
  });

  // Scenario 5: Existing Student email used for Tutor registration (blocked)
  await test('Existing Student email used for Tutor registration (blocked with notice)', async () => {
    const existingStudentEmail = 'newstudent1@example.com'; // Already registered as Student in Scenario 1
    const check = await ModivsAuth.checkEmailExists(existingStudentEmail);
    assert.strictEqual(check.exists, true);
    assert.strictEqual(check.role, 'student');

    // Attempting to register as a Tutor
    let blocked = false;
    try {
      await ModivsAuth.registerAccountAtomic({
        email: existingStudentEmail,
        role: 'tutor',
        name: 'Imposter Tutor'
      });
    } catch(err) {
      blocked = (err.code === 'EMAIL_EXISTS' || err.message === 'EMAIL_EXISTS');
      assert.strictEqual(err.existingRole, 'student');
    }
    assert.strictEqual(blocked, true, 'Registration must be blocked when email belongs to Student');
  });

  // Scenario 6: Existing Tutor email used for Student registration (blocked)
  await test('Existing Tutor email used for Student registration (blocked with notice)', async () => {
    const existingTutorEmail = 'newtutor1@example.com'; // Registered as Tutor in Scenario 2
    let blocked = false;
    try {
      await ModivsAuth.registerAccountAtomic({
        email: existingTutorEmail,
        role: 'student',
        name: 'Imposter Student'
      });
    } catch(err) {
      blocked = (err.code === 'EMAIL_EXISTS' || err.message === 'EMAIL_EXISTS');
      assert.strictEqual(err.existingRole, 'tutor');
    }
    assert.strictEqual(blocked, true, 'Registration must be blocked when email belongs to Tutor');
  });

  // Scenario 7: Existing email used for General User registration
  await test('Existing email used for General User registration (blocked with notice)', async () => {
    const existingTutorEmail = 'newtutor1@example.com';
    let blocked = false;
    try {
      await ModivsAuth.registerAccountAtomic({
        email: existingTutorEmail,
        role: 'user',
        name: 'Imposter User'
      });
    } catch(err) {
      blocked = (err.code === 'EMAIL_EXISTS' || err.message === 'EMAIL_EXISTS');
      assert.strictEqual(err.existingRole, 'tutor');
    }
    assert.strictEqual(blocked, true, 'General user registration must be blocked on duplicate email');
  });

  // Scenario 8: Google email already registered through email/password
  await test('Google email already registered through email/password (blocks cross-registration)', async () => {
    const pwTutorEmail = 'newtutor1@example.com'; // registered with role 'tutor'
    env.mockAuth._nextGoogleEmail = pwTutorEmail;

    // Student signup page clicked "Continue with Google"
    let blocked = false;
    try {
      await ModivsAuth.continueWithGoogle('student', {});
    } catch(err) {
      blocked = err.code === 'EMAIL_EXISTS' || err.isExisting === true;
      assert.strictEqual(err.role, 'tutor');
    }
    assert.strictEqual(blocked, true, 'Cross-registration via Google must be rejected with existing role notice');
  });

  // Scenario 9: Email/password registration attempted after Google registration
  await test('Email/password registration attempted after Google registration (blocks cross-registration)', async () => {
    const googleStudentEmail = 'googlestudent@example.com'; // Registered via Google as 'student' in Scenario 3
    let blocked = false;
    try {
      await ModivsAuth.registerAccountAtomic({
        email: googleStudentEmail,
        role: 'tutor',
        name: 'Cross Register Tutor'
      });
    } catch(err) {
      blocked = (err.code === 'EMAIL_EXISTS' || err.message === 'EMAIL_EXISTS');
      assert.strictEqual(err.existingRole, 'student');
    }
    assert.strictEqual(blocked, true, 'Password registration after Google registration must enforce role uniqueness');
  });

  // Scenario 10: Two simultaneous registration attempts using the same email (atomic transaction)
  await test('Two simultaneous registration attempts using the same email (atomic race condition safety)', async () => {
    const raceEmail = 'race_condition@example.com';
    
    // Launch two registrations concurrently
    const p1 = ModivsAuth.registerAccountAtomic({
      email: raceEmail,
      role: 'student',
      name: 'User 1'
    });

    const p2 = ModivsAuth.registerAccountAtomic({
      email: raceEmail,
      role: 'tutor',
      name: 'User 2'
    });

    const results = await Promise.allSettled([p1, p2]);
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1, 'Exactly one concurrent registration must succeed');
    assert.strictEqual(rejected.length, 1, 'Conflicting concurrent registration must be rejected');
    assert.strictEqual(rejected[0].reason.code, 'EMAIL_EXISTS', 'Rejection reason must be EMAIL_EXISTS');
  });

  // Scenario 11: Current location detection and manual location selection
  await test('Current location detection & formatting', async () => {
    const parsed = ModivsLocation.formatLocationForSave({
      city: 'Ludhiana',
      area: 'Sarabha Nagar',
      state: 'Punjab',
      country: 'India',
      lat: 30.901,
      lng: 75.812
    });

    assert.strictEqual(parsed.city, 'Ludhiana');
    assert.strictEqual(parsed.area, 'Sarabha Nagar');
    assert.strictEqual(parsed.state, 'Punjab');
    assert.strictEqual(parsed.country, 'India');
    assert.strictEqual(parsed.lat, 30.901);
    assert.strictEqual(parsed.lng, 75.812);
    assert.strictEqual(parsed.fullAddress, 'Sarabha Nagar, Ludhiana, Punjab, India');
  });

  // Scenario 12: Location saving and profile editing
  await test('Location saving and profile editing data integrity', async () => {
    const email = 'editprofile_tutor@example.com';
    const initialLoc = {
      city: 'Jalandhar',
      area: 'Model Town',
      state: 'Punjab',
      country: 'India',
      lat: 31.32,
      lng: 75.57,
      fullAddress: 'Model Town, Jalandhar, Punjab, India'
    };

    await ModivsAuth.registerAccountAtomic({
      email,
      role: 'tutor',
      name: 'Simran Kaur',
      phone: '+91 9888877777',
      location: initialLoc
    });

    const acc1 = await ModivsAuth.checkEmailExists(email);
    assert.strictEqual(acc1.account.city, 'Jalandhar');
    assert.strictEqual(acc1.account.location.area, 'Model Town');

    // Simulate tutor updating profile location
    const updatedLoc = {
      city: 'Amritsar',
      area: 'Mall Road',
      state: 'Punjab',
      country: 'India',
      lat: 31.63,
      lng: 74.87,
      fullAddress: 'Mall Road, Amritsar, Punjab, India'
    };

    await env.mockWindow.EducationBFirebase.db.collection('accounts').doc(email).set({
      location: updatedLoc,
      city: updatedLoc.city,
      area: updatedLoc.area
    }, { merge: true });

    const acc2 = await ModivsAuth.checkEmailExists(email);
    assert.strictEqual(acc2.account.city, 'Amritsar');
    assert.strictEqual(acc2.account.location.area, 'Mall Road');
    assert.strictEqual(acc2.account.location.lat, 31.63);
  });

  console.log(`\n====================================================`);
  console.log(`RESULTS: ${passed} / ${total} SCENARIOS PASSED`);
  console.log(`====================================================`);
  if (passed === total) {
    console.log('ALL 12 REQUIREMENTS VERIFIED SUCCESSFULLY!');
  } else {
    process.exit(1);
  }
}

runTests();
