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
    if (f.endsWith('.js') && f !== 'modivs.min.js' && f !== 'firebase-messaging-sw.js') {
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
