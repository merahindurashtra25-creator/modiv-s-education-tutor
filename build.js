const fs = require('fs');
const path = require('path');
const terser = require('terser');

const allScripts = [
  'firebase-sync.js',
  'modivs-slug.js',
  'modivs-select.js',
  'modivs-country.js',
  'modivs-subjects.js',
  'modivs-places.js',
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
  'modivs-social.js',
  'modivs-dropdown.js',
  'modivs-ids.js',
  'modivs-lead-status.js',
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

  // Only expose safe public variables from .env / process.env to client window.__ENV__
  const publicEnv = {
    FIREBASE_API_KEY: envVars.FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '',
    FIREBASE_AUTH_DOMAIN: envVars.FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || '',
    FIREBASE_PROJECT_ID: envVars.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '',
    FIREBASE_STORAGE_BUCKET: envVars.FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || '',
    FIREBASE_MESSAGING_SENDER_ID: envVars.FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    FIREBASE_APP_ID: envVars.FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || '',
    FIREBASE_MEASUREMENT_ID: envVars.FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID || '',
    GOOGLE_MAPS_API_KEY: envVars.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
    APPCHECK_RECAPTCHA_KEY: envVars.APPCHECK_RECAPTCHA_KEY || process.env.APPCHECK_RECAPTCHA_KEY || '',
    MASTER_ADMIN_EMAILS: envVars.MASTER_ADMIN_EMAILS || process.env.MASTER_ADMIN_EMAILS || '',
    RAZORPAY_KEY_ID: envVars.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || ''
  };

  const content = `/**
 * Modiv's Education - Client Environment Bridge (modivs-env.js)
 * Exposes non-sensitive public client environment variables to browser scripts.
 * Generated automatically from .env during build.
 */
(function(window){
  'use strict';
  window.__ENV__ = window.__ENV__ || ${JSON.stringify(publicEnv, null, 2)};
})(typeof window !== 'undefined' ? window : globalThis);
`;
  fs.writeFileSync(path.join(__dirname, 'modivs-env.js'), content, 'utf8');
}

async function runBuild() {
  syncEnvBridge();
  console.log('Building production bundle modivs.min.js...');
  const validScripts = allScripts.filter(f => fs.existsSync(f));

  const codeMap = {};
  for (const f of validScripts) {
    codeMap[f] = fs.readFileSync(f, 'utf8');
  }

  const result = await terser.minify(codeMap, {
    compress: {
      drop_debugger: true,
      passes: 2
    },
    mangle: false, // Keep global and function names intact for inter-script compatibility
    sourceMap: false
  });

  if (result.error) throw result.error;

  fs.writeFileSync('modivs.min.js', result.code, 'utf8');
  const minSize = fs.statSync('modivs.min.js').size;
  console.log(`✓ modivs.min.js generated successfully (${Math.round(minSize / 1024)} KB)`);
  console.log('✓ Production build complete. Source maps disabled, debugger statements stripped.');
}

runBuild().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});

