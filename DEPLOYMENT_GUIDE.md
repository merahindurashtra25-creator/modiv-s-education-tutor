# Modiv's Education Platform - Production Deployment & Security Architecture Guide

**Platform:** Modiv's Education (Student-Tutor Matchmaking & Online Education)  
**Hosting & CDN:** Vercel  
**Database, Auth & Cloud Functions:** Google Firebase (Firestore, Authentication, Storage, Cloud Functions)  
**Payment Gateway:** Razorpay Live Checkout & Orders API  
**Last Updated:** November 2026

---

## 1. Executive Summary & Architecture Overview

The Modiv's Education platform follows a **zero-trust, server-enforced security model**:

1. **Client Boundary:** Static web frontend (HTML5, modern CSS3, modular JavaScript, `modivs.min.js`) served securely via Vercel edge nodes with strict security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
2. **Public Identifiers vs. Private Secrets:**
   - **Public Client Identifiers:** Firebase Web API Key (`AIzaSyB2I8...`), Project ID (`modivs-education`), Auth Domain, and Razorpay Key ID (`rzp_live_TwTMFGYwNbt9BA`). These are routing coordinates required by browser SDKs and are protected by Firestore Security Rules, Storage Security Rules, and App Check.
   - **Private Secrets:** `RAZORPAY_KEY_SECRET`, Firebase Admin Service Account credentials, and SMTP credentials. These **NEVER** enter client-side code, frontend bundles, or Git repositories. They are stored strictly in Google Cloud Secret Manager / Firebase Cloud Functions environment.
3. **Authorization Layer:**
   - Client-side navigation checks provide smooth UX but are **never trusted** for data access.
   - Cloud Firestore Security Rules enforce document-level read/write permissions, role verification (`request.auth.token.admin == true` or `email_verified == true`), and wallet integrity (client cannot inflate coins or fake memberships).
   - Sensitive financial and administrative operations (order creation, HMAC signature verification, lead unlocking, sequential ID allocation, push notifications) are executed exclusively through authenticated Firebase Cloud Functions (`functions/index.js`).

---

## 2. Environment Variable Inventory & Classification

| Variable Name | Classification | Target Environment | Purpose & Description |
| :--- | :--- | :--- | :--- |
| `RAZORPAY_KEY_ID` | **Public Client Key** | Vercel & Client Config | Razorpay public key ID used by `checkout.js` in browser (`rzp_live_TwTMFGYwNbt9BA`). |
| `RAZORPAY_KEY_SECRET` | **Private Backend Secret** | Firebase Functions / Secret Manager | Razorpay private secret key used for server-side HMAC-SHA256 signature verification and Orders API. **Never expose to client.** |
| `GOOGLE_MAPS_API_KEY` | **Restricted Client Key** | Vercel & Client Config | Google Places Autocomplete API key (`modivs-location.js`). Must be restricted by HTTP Referrer in Google Cloud Console. |
| `APPCHECK_RECAPTCHA_KEY` | **Public Client Key** | Vercel & Client Config | Google reCAPTCHA v3 or Enterprise Site Key for Firebase App Check bot prevention. |
| `FIREBASE_API_KEY` | **Public Client Identifier** | `firebase-config.js` | Firebase project Web API routing key (`AIzaSyB2I8...`). |
| `FIREBASE_PROJECT_ID` | **Public Identifier** | `firebase-config.js` | `modivs-education` |
| `FIREBASE_AUTH_DOMAIN` | **Public Identifier** | `firebase-config.js` | `modivs-education.firebaseapp.com` |
| `FIREBASE_STORAGE_BUCKET`| **Public Identifier** | `firebase-config.js` | `modivs-education.firebasestorage.app` |
| `FIREBASE_MESSAGING_SENDER_ID`| **Public Identifier** | `firebase-config.js` | `821328108086` |
| `FIREBASE_APP_ID` | **Public Identifier** | `firebase-config.js` | `1:821328108086:web:852c06bc88fb39d0961697` |
| `GOOGLE_APPLICATION_CREDENTIALS` | **Private Server Secret** | Local Dev / CI only | Path to service account key file. **Not needed in Cloud Functions** (Cloud Functions automatically use IAM service account credentials). |
| `MASTER_ADMIN_EMAILS` | **Server Configuration** | `functions/index.js` / Environment | Comma-delimited list of verified administrator emails (`happinessaggarwal@gmail.com`, `divyanshdhimanteam@gmail.com`, `luxmankumar628@gmail.com`). |

---

## 3. Secret Management & Backend Configuration

### A. Firebase Cloud Functions Secrets
Configure `RAZORPAY_KEY_SECRET` in Firebase Cloud Functions using Google Cloud Secret Manager or Firebase Functions Config:

```bash
# Option 1: Firebase Secret Manager (Recommended for modern functions v2 / secure runtime)
firebase functions:secrets:set RAZORPAY_KEY_SECRET

# Option 2: Firebase Functions Environment Config
firebase functions:config:set razorpay.key_id="rzp_live_TwTMFGYwNbt9BA" razorpay.key_secret="YOUR_ACTUAL_RAZORPAY_SECRET"
```

In `functions/index.js`, secrets are accessed via `process.env.RAZORPAY_KEY_SECRET`. The runtime guarantees:
- If `RAZORPAY_KEY_SECRET` is missing, order creation and signature verification fail with `failed-precondition` rather than evaluating with an empty string.
- HMAC signatures are validated cryptographically:
  $$\text{HMAC-SHA256}(\text{orderId} \parallel "|" \parallel \text{paymentId}, \text{secret}) = \text{signature}$$

### B. Vercel Environment Variables
In your Vercel Project Dashboard (`Settings` -> `Environment Variables`):
- For public client variables, you may set:
  - `NEXT_PUBLIC_RAZORPAY_KEY_ID` or inject into build if using custom templates.
  - No private backend secrets should ever be set with client prefixes.

---

## 4. Google Cloud Console API Key Restrictions

Google Maps API keys and Firebase client keys must have API and HTTP Referrer restrictions configured in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. **Google Maps Places API Key (`GOOGLE_MAPS_API_KEY`):**
   - Navigate to **APIs & Services** -> **Credentials**.
   - Select the API key used in `modivs-location.js`.
   - **Application Restrictions:** Select **Websites (HTTP referrers)**.
   - **Website Restrictions (Add these URLs):**
     - `https://www.modivians.com/*`
     - `https://modivians.com/*`
     - `https://*.vercel.app/*`
     - `http://localhost:*` *(only in development)*
   - **API Restrictions:** Select **Restrict key** and choose only:
     - *Places API (New)* / *Places API*
     - *Geocoding API*
     - *Maps JavaScript API*
   - Click **Save**.

2. **Firebase Web API Key (`firebase-config.js`):**
   - In Google Cloud Console, locate the `Browser key (auto created by Firebase)`.
   - Ensure API restrictions include only Firebase Authentication, Cloud Firestore, Cloud Storage, and Token Service APIs.

---

## 5. Firebase App Check Activation (Bot & Abuse Prevention)

Firebase App Check verifies that incoming requests originate from your authentic website and not from scripts, emulators, or malicious scrapers.

### Step 1: Register reCAPTCHA v3 or Enterprise
1. Go to Google [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin).
2. Register a new site with type **reCAPTCHA v3**.
3. Add your domains: `modivians.com`, `www.modivians.com`, `modivs-education.vercel.app`, and `localhost`.
4. Copy the **Site Key** and **Secret Key**.

### Step 2: Enable App Check in Firebase Console
1. Open the [Firebase Console](https://console.firebase.google.com/) -> Select `modivs-education`.
2. In the left navigation, click **App Check**.
3. Under the **Apps** tab, select your Web App.
4. Click **reCAPTCHA v3**, paste your **Secret Key**, and save.

### Step 3: Client-Side Activation
`firebase-config.js` already includes native App Check activation logic:
```javascript
var appCheck = firebase.appCheck();
appCheck.activate(
  new firebase.appCheck.ReCaptchaV3Provider('YOUR_RECAPTCHA_SITE_KEY'),
  true // automatic token refresh
);
```
To enable in production, add `window.APPCHECK_RECAPTCHA_KEY = 'YOUR_RECAPTCHA_SITE_KEY';` or pass it via your environment.

### Step 4: Enforce App Check
1. In Firebase Console -> App Check -> **APIs**, monitor incoming request metrics for 2-3 days.
2. Once verified that legitimate traffic has valid tokens, click **Enforce** for Cloud Firestore, Cloud Storage, and Cloud Functions.

---

## 6. Build Pipeline & Asset Minification

The project includes an automated, non-destructive build script (`build.js`) powered by `terser`:

```bash
# Run production build
npm run build
```

### Build Characteristics:
- **Zero Public Source Maps:** Production source maps are completely disabled (`sourceMap: false`).
- **Debugger Stripping:** Any lingering `debugger;` statements are stripped (`drop_debugger: true`).
- **Two-Pass Compression:** Code is compressed with dead-code removal and variable optimization.
- **Symbol Safety:** Global functions, Firebase callbacks, and cross-file dependencies retain their identifiers (`mangle: false`), preventing runtime breakage across pages.
- **Output:** Generates production bundle `modivs.min.js` (~330 KB).

---

## 7. Vercel Deployment Guide

### Deploying via Git (Recommended)
1. Commit all audited and verified changes to the repository:
   ```bash
   git add .
   git commit -m "chore(security): implement production security architecture and deployment hardening"
   git push origin main
   ```
2. Vercel automatically detects the push, runs `npm run build`, and deploys to the edge network.

### Verifying Security Headers
Verify active HTTP response headers using `curl` or browser DevTools:
```bash
curl -I https://www.modivians.com
```

Expected headers in response:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- `Content-Security-Policy: default-src 'self' ...`

---

## 8. Firebase Cloud Functions & Security Rules Deployment

Deploy updated security rules and Cloud Functions using the Firebase CLI:

```bash
# 1. Login to Firebase CLI
firebase login

# 2. Deploy Firestore Rules
firebase deploy --only firestore:rules

# 3. Deploy Storage Rules
firebase deploy --only storage

# 4. Deploy Cloud Functions (from functions directory)
cd functions
npm install
cd ..
firebase deploy --only functions
```

---

## 9. Ongoing Security & Maintenance Checklist

Perform these routine checks quarterly:

- [ ] **Dependency Audit:** Run `npm audit` in both the root repository and `functions/` directory.
- [ ] **Admin Email Verification:** Confirm that all entries in `MASTER_ADMIN_EMAILS` have `email_verified: true` in Firebase Authentication.
- [ ] **App Check Metrics:** Review Firebase App Check dashboard for any unverified request spikes.
- [ ] **Firestore Rules Testing:** Run `node tests/test-security-suite.cjs` before every production deployment.
- [ ] **Razorpay Webhooks:** Ensure Razorpay webhook signatures are validated against `RAZORPAY_KEY_SECRET`.
- [ ] **Google Cloud API Key Restrictions:** Confirm HTTP referrer restrictions remain intact and unrestricted keys are flagged in Cloud Console Security Advisor.

