const fs = require('fs');
const path = require('path');
const terser = require('terser');

const allScripts = [
  'modivs-api.js',
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

  // Only expose client-needed public variables from .env / process.env to client window.__ENV__
  const publicEnv = {
    GOOGLE_MAPS_API_KEY: envVars.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
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

function copyToPublic() {
  const publicDir = path.join(__dirname, 'public');
  fs.mkdirSync(publicDir, { recursive: true });

  const allowedExts = new Set([
    '.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.txt', '.xml', '.webmanifest'
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

    fs.copyFileSync(fullPath, path.join(publicDir, file));
    count++;
  }

  console.log(`✓ Copied ${count} production files into ${publicDir}`);
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

  copyToPublic();

  console.log('✓ Production build complete. Source maps disabled, debugger statements stripped.');
}

runBuild().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
