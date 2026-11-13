const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

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

console.log('Building production bundle modivs.min.js...');
const validScripts = allScripts.filter(f => fs.existsSync(f));

const combined = validScripts.map(f => {
  const code = fs.readFileSync(f, 'utf8');
  return `/* --- ${f} --- */\n` + code + '\n;';
}).join('\n');

const tempCombined = path.join(__dirname, '.temp_bundle.js');
fs.writeFileSync(tempCombined, combined, 'utf8');

try {
  execSync(`npx --yes terser "${tempCombined}" -c -m -o modivs.min.js`, { stdio: 'inherit' });
  const minSize = fs.statSync('modivs.min.js').size;
  console.log(`✓ modivs.min.js created successfully (${Math.round(minSize / 1024)} KB)`);
} finally {
  if (fs.existsSync(tempCombined)) fs.unlinkSync(tempCombined);
}

