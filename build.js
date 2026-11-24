/**
 * Modiv's Education - Asset Bundling & Optimization Build Pipeline
 * 
 * Responsibilities:
 * - Concatenates and minifies modular frontend scripts into modivs.min.js via Terser
 * - Synchronizes environment variables and builds cache-busted HTML pages
 * - Outputs production-ready static assets to public/ for Vercel/Firebase hosting
 */

const fs = require('fs');
const path = require('path');
let terser;
try {
  terser = require('terser');
} catch (e) {
  terser = null;
}

const allScripts = [
  'modivs-inspect-guard.js',
  'modivs-env.js',
  'firebase-config.js',
  'modivs-api.js',
  'firebase-sync.js',
  'modivs-slug.js',
  'modivs-select.js',
  'modivs-country.js',
  'modivs-subjects.js',
  'modivs-places.js',
  'location-autocomplete.js',
  'modivs-map.js',
  'modivs-location.js',
  'modivs-loc-search.js',
  'modivs-avatars.js',
  'modivs-reviews.js',
  'modivs-blogs.js',
  'modivs-stories.js',
  'modivs-import-data.js',
  'modivs-menu.js',
  'modivs-session-ui.js',
  'modivs-auto-update.js',
  'modivs-social.js',
  'modivs-dropdown.js',
  'modivs-lang.js',
  'modivs-vision-fx.js',
  'modivs-ids.js',
  'modivs-lead-status.js',
  'modivs-city-lead.js',
  'modivs-notifications.js',
  'modivs-chat.js',
  'firebase-chat.js',
  'modivs-auth-unique.js',
  'modivs-pass-eye.js',
  'modivs-wallet.js',
  'modivs-org.js',
  'modivs-docs.js',
  'modivs-avail.js',
  'modivs-shop-data.js',
  'modivs-dashboard.js',
  'razorpay-config.js'
];

const BUILD_TIME = new Date().toISOString();
const BUILD_ID = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
const BUILD_INFO = {
  version: BUILD_ID,
  buildTime: BUILD_TIME,
  timestamp: Date.now()
};

function syncEnvBridge() {
  const envPath = path.join(__dirname, '.env');
  const envVars = {};
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (m) {
        let val = (m[2] || '').trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        envVars[m[1]] = val;
      }
    });
  }

  function isCleanKey(k) {
    return k && typeof k === 'string' && k.trim() && k.indexOf('your_') !== 0;
  }

  // Only expose client-needed public variables from .env / process.env to client window.__ENV__
  const DEFAULT_ADMIN_EMAILS = 'happinessaggarwal@gmail.com,divyanshdhimanteam@gmail.com,luxmankumar628@gmail.com';
  const publicEnv = {
    FIREBASE_API_KEY: isCleanKey(envVars.FIREBASE_API_KEY) ? envVars.FIREBASE_API_KEY : (isCleanKey(process.env.FIREBASE_API_KEY) ? process.env.FIREBASE_API_KEY : 'AIzaSyB2I8iFDkcUZJBDBwkALHNeoIR3a9k-fcY'),
    FIREBASE_AUTH_DOMAIN: envVars.FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || 'modivs-education.firebaseapp.com',
    FIREBASE_DATABASE_URL: envVars.FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL || 'https://modivs-education-default-rtdb.asia-southeast1.firebasedatabase.app',
    FIREBASE_PROJECT_ID: envVars.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'modivs-education',
    FIREBASE_STORAGE_BUCKET: envVars.FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || 'modivs-education.firebasestorage.app',
    FIREBASE_MESSAGING_SENDER_ID: envVars.FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || '821328108086',
    FIREBASE_APP_ID: envVars.FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || '1:821328108086:web:852c06bc88fb39d0961697',
    FIREBASE_MEASUREMENT_ID: envVars.FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID || 'G-H4JWBNLBC5',
    FIREBASE_VAPID_KEY: envVars.FIREBASE_VAPID_KEY || process.env.FIREBASE_VAPID_KEY || 'BNaz3v2Ga9IfiZXftbOpKu3oGWnNx0rRb7g3yJs84xVaJ9x2EWqy5yleIcVPWIFhQecnzjBFAx6jn91jBnA5TEs',
    GOOGLE_MAPS_API_KEY: envVars.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
    RAZORPAY_KEY_ID: envVars.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || 'rzp_live_U1yN0O1Ni2s8MB',
    MASTER_ADMIN_EMAILS: envVars.MASTER_ADMIN_EMAILS || process.env.MASTER_ADMIN_EMAILS || DEFAULT_ADMIN_EMAILS
  };

  const content = `/**
 * Modiv's Education - Client Environment Bridge (modivs-env.js)
 * Exposes non-sensitive public client environment variables to browser scripts.
 * Generated automatically from .env during build.
 */
(function(window){
  'use strict';
  window.__MODIVS_BUILD__ = ${JSON.stringify(BUILD_INFO, null, 2)};
  window.__ENV__ = window.__ENV__ || ${JSON.stringify(publicEnv, null, 2)};
  var cfg = {
    apiKey: "${publicEnv.FIREBASE_API_KEY}",
    authDomain: "${publicEnv.FIREBASE_AUTH_DOMAIN}",
    databaseURL: "${publicEnv.FIREBASE_DATABASE_URL}",
    projectId: "${publicEnv.FIREBASE_PROJECT_ID}",
    storageBucket: "${publicEnv.FIREBASE_STORAGE_BUCKET}",
    messagingSenderId: "${publicEnv.FIREBASE_MESSAGING_SENDER_ID}",
    appId: "${publicEnv.FIREBASE_APP_ID}",
    measurementId: "${publicEnv.FIREBASE_MEASUREMENT_ID}",
    vapidKey: "${publicEnv.FIREBASE_VAPID_KEY}"
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
        var _file = decodeURIComponent(_parts.pop() || '').toLowerCase().replace(/[\\s_+]+/g, '-');
        var _clean = _file.replace(/^modivs?-?/i, '').replace(/\\.html?$/i, '');
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
`;
  fs.writeFileSync(path.join(__dirname, 'modivs-env.js'), content, 'utf8');
  const pubDir = path.join(__dirname, 'public');
  if (fs.existsSync(pubDir)) {
    fs.writeFileSync(path.join(pubDir, 'modivs-env.js'), content, 'utf8');
  }
}

function copyToPublic() {
  const publicDir = path.join(__dirname, 'public');
  fs.mkdirSync(publicDir, { recursive: true });

  // Clean up any raw individual JS files from previous builds so source files are never exposed (keep service worker)
  const existingFiles = fs.readdirSync(publicDir);
  for (const f of existingFiles) {
    if (f.endsWith('.js') && f !== 'modivs.min.js' && f !== 'firebase-messaging-sw.js' && f !== 'chat-widget.js') {
      try { fs.unlinkSync(path.join(publicDir, f)); } catch (e) { }
    }
  }

  // Raw source .js files are intentionally excluded: only modivs.min.js is served
  const allowedExts = new Set([
    '.html', '.css', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.txt', '.xml', '.webmanifest'
  ]);

  const excludedPrefixes = ['test-', 'firebase-migrate-', 'migrate-'];
  const excludedFiles = new Set([
    'build.js',
    'package.json',
    'package-lock.json',
    'vercel.json',
    'firebase.json',
    'firestore.indexes.json'
  ]);

  const bundledSet = new Set(allScripts);
  const files = fs.readdirSync(__dirname);
  let count = 0;

  for (const file of files) {
    if (file === 'public' || file === 'node_modules' || file === 'api' || file === 'functions' || file === 'tests' || file === '.git' || file === '.github') {
      continue;
    }

    const fullPath = path.join(__dirname, file);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) continue;

    const ext = path.extname(file).toLowerCase();
    if (!allowedExts.has(ext)) continue;
    if (excludedFiles.has(file)) continue;
    if (excludedPrefixes.some(p => file.startsWith(p))) continue;
    if (file.includes('serviceAccount') || file.includes('credential')) continue;

    if (ext === '.html') {
      let html = fs.readFileSync(fullPath, 'utf8');
      // Find end position of any external CDN scripts so bundle is placed after them
      const extScriptRegex = /<script\s+[^>]*src=["'](?:https?:|\/\/)[^"']*["'][^>]*><\/script>/gi;
      let lastExtEnd = -1;
      let extMatch;
      while ((extMatch = extScriptRegex.exec(html)) !== null) {
        lastExtEnd = extMatch.index + extMatch[0].length;
      }

      let replacedFirstScript = false;

      // Replace all individual source script tags with the single secure minified bundle
      html = html.replace(/<script\s+[^>]*src=["'](?!https?:|\/\/|data:)([^"'#?]+\.js)(?:\?[^"'#?]*)?["'][^>]*><\/script>/gi, (match, scriptName, offset) => {
        if (bundledSet.has(scriptName)) {
          if (lastExtEnd !== -1 && offset < lastExtEnd) {
            return '';
          }
          if (!replacedFirstScript) {
            replacedFirstScript = true;
            return '<script src="modivs.min.js?v=' + BUILD_ID + '"' + (/\sdefer[\s>=]/i.test(match) ? ' defer' : '') + '></script>';
          }
          return '';
        }
        return match;
      });

      if (!replacedFirstScript && lastExtEnd !== -1) {
        html = html.slice(0, lastExtEnd) + '\n<script src="modivs.min.js?v=' + BUILD_ID + '"></script>' + html.slice(lastExtEnd);
      }

      // Version local CSS stylesheets
      html = html.replace(/(href=["'])(?!https?:|\/\/|data:)([^"'#?]+\.css)(?:\?[^"']*)?(["'])/g, '$1$2?v=' + BUILD_ID + '$3');

      fs.writeFileSync(path.join(publicDir, file), html, 'utf8');
    } else {
      fs.copyFileSync(fullPath, path.join(publicDir, file));
    }
    count++;
  }

  // Copy bundled minified script to public
  if (fs.existsSync('modivs.min.js')) {
    fs.copyFileSync('modivs.min.js', path.join(publicDir, 'modivs.min.js'));
    count++;
  }

  // Copy the chat assistant widget (loaded by a <script src="chat-widget.js"> tag, not part of the bundle)
  if (fs.existsSync('chat-widget.js')) {
    fs.copyFileSync('chat-widget.js', path.join(publicDir, 'chat-widget.js'));
    count++;
  }

  // Copy Firebase Web Push service worker
  if (fs.existsSync('firebase-messaging-sw.js')) {
    fs.copyFileSync('firebase-messaging-sw.js', path.join(publicDir, 'firebase-messaging-sw.js'));
    count++;
  }

  // Copy standalone location autocomplete module to public for direct inclusions
  const pubJsDir = path.join(publicDir, 'js');
  fs.mkdirSync(pubJsDir, { recursive: true });
  if (fs.existsSync(path.join(__dirname, 'js', 'location-autocomplete.js'))) {
    fs.copyFileSync(path.join(__dirname, 'js', 'location-autocomplete.js'), path.join(pubJsDir, 'location-autocomplete.js'));
  }
  if (fs.existsSync(path.join(__dirname, 'location-autocomplete.js'))) {
    fs.copyFileSync(path.join(__dirname, 'location-autocomplete.js'), path.join(publicDir, 'location-autocomplete.js'));
  }

  // Generate clean slug HTML aliases so static servers and direct links resolve cleanly
  const aliases = {
    'tutors.html': 'modivs-tutors.html',
    'active-leads.html': 'modivs-active-leads.html',
    'tuition.html': 'modivs-tuition.html',
    'our-vision.html': 'modivs-social-vision.html',
    'social-vision.html': 'modivs-social-vision.html',
    'become-tutor.html': 'modivs-become-tutor.html',
    'login.html': 'modivs-education.html',
    'education.html': 'modivs-education.html',
    'signup.html': 'modivs-signup.html',
    'guide.html': 'modivs-guide.html',
    'shop.html': 'modivs-shop.html',
    'blogs.html': 'modivs-blogs.html',
    'contact.html': 'modivs-contact.html',
    'videos.html': 'modivs-videos.html',
    'students-corner.html': 'modivs-students-corner.html',
    'find-tutor.html': 'modivs-find-tutor.html',
    'post-requirement.html': 'modivs-post-requirement.html',
    'chandigarh.html': 'modivs-tutors-chandigarh.html',
    'mohali.html': 'modivs-tutors-mohali.html',
    'panchkula.html': 'modivs-tutors-panchkula.html',
    'student-dashboard.html': 'modivs-student-dashboard.html',
    'tutor-dashboard.html': 'modivs-tutor-dashboard.html',
    'tutor-edit-profile.html': 'modivs-tutor-edit-profile.html',
    'tutor-profile.html': 'modivs-tutor-profile.html',
    'admin.html': 'modivs-admin.html',
    'org-dashboard.html': 'modivs-org-dashboard.html',
    'student-signup.html': 'modivs-student-signup.html',
    'student-registration.html': 'modivs-student-registration.html',
    'user-signup.html': 'modivs-user-signup.html',
    'privacy.html': 'modivs-privacy-policy.html',
    'privacy-policy.html': 'modivs-privacy-policy.html',
    'terms.html': 'modivs-terms.html',
    'refunds.html': 'modivs-refund-policy.html',
    'refund-policy.html': 'modivs-refund-policy.html',
    'sitemap.html': 'modivs-sitemap.html'
  };

  for (const [alias, src] of Object.entries(aliases)) {
    const pubSrc = path.join(publicDir, src);
    if (fs.existsSync(pubSrc)) {
      fs.copyFileSync(pubSrc, path.join(publicDir, alias));
      count++;
    }
    const rootSrc = path.join(__dirname, src);
    if (fs.existsSync(rootSrc)) {
      try { fs.copyFileSync(rootSrc, path.join(__dirname, alias)); } catch(e){}
    }
  }

  // Write deployment version manifest
  fs.writeFileSync(path.join(__dirname, 'version.json'), JSON.stringify(BUILD_INFO, null, 2), 'utf8');
  fs.writeFileSync(path.join(publicDir, 'version.json'), JSON.stringify(BUILD_INFO, null, 2), 'utf8');

  console.log(`✓ Copied & versioned ${count} production files into ${publicDir} (raw source files protected)`);
}

async function runBuild() {
  syncEnvBridge();
  console.log('Building production bundle modivs.min.js...');
  const validScripts = allScripts.filter(f => fs.existsSync(f));

  if (!terser) {
    console.log('Concatenating scripts into modivs.min.js bundle...');
    const concatenated = validScripts.map(f => fs.readFileSync(f, 'utf8')).join(';\n');
    fs.writeFileSync('modivs.min.js', concatenated, 'utf8');
    copyToPublic();
    console.log('✓ modivs.min.js bundle generated and public files copied.');
    return;
  }

  const codeMap = {};
  for (const f of validScripts) {
    codeMap[f] = fs.readFileSync(f, 'utf8');
  }

  const result = await terser.minify(codeMap, {
    compress: {
      drop_debugger: true,
      passes: 2
    },
    format: {
      comments: false // Strip all comments to protect internal logic and credentials
    },
    mangle: false, // Keep global and function names intact for inter-script compatibility
    sourceMap: false
  });

  if (result.error) throw result.error;

  fs.writeFileSync('modivs.min.js', result.code, 'utf8');
  const minSize = fs.statSync('modivs.min.js').size;
  console.log(`✓ modivs.min.js generated successfully (${Math.round(minSize / 1024)} KB)`);

  copyToPublic();

  console.log('✓ Production build complete. Source maps disabled, comments stripped, raw files secured.');
}

runBuild().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
