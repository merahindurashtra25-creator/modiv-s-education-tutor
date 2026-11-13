# Modiv's Education Platform - Production Deployment & Security Architecture Guide

**Platform:** Modiv's Education (Student-Tutor Matchmaking & Online Education)  
**Hosting & CDN:** Vercel  
**Database, Auth & Cloud Functions:** Google Firebase (Firestore, Authentication, Storage, Cloud Functions)  
**Backend Architecture:** Vercel Serverless Functions (`api/`) & Firebase Admin SDK  
**Payment Gateway:** Razorpay Live Checkout & Orders API  
**Last Updated:** November 2026

---

## 1. Executive Summary & Architecture Overview

The Modiv's Education platform follows a **zero-trust, server-enforced security model**:

1. **Client Boundary:** Static web frontend (HTML5, modern CSS3, modular JavaScript, `modivs.min.js`) served securely via Vercel edge nodes with strict security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
2. **Complete Removal of Firebase Config from Browser:**
   - Direct Firebase Web SDK initialization (`firebase.initializeApp`) has been removed from all browser-accessible files.
   - All Firebase operations are mediated through secure Vercel backend endpoints (`api/*`) using the Firebase Admin SDK.
   - Session authentication is managed via secure `HttpOnly; Secure; SameSite=Lax` cookies (`modivs_session`).
3. **Private Secrets:** `RAZORPAY_KEY_SECRET`, Firebase Admin Service Account credentials, and SMTP credentials. These **NEVER** enter client-side code, frontend bundles, or Git repositories. They are stored strictly in Google Cloud Secret Manager / Vercel Serverless Environment.

---

## 2. Environment Variable Inventory & Classification

| Variable Name | Classification | Target Environment | Purpose & Description |
| :--- | :--- | :--- | :--- |
| `RAZORPAY_KEY_ID` | **Client Key** | Vercel & Client Config | Razorpay public key ID used by `checkout.js` in browser (`rzp_live_TwTMFGYwNbt9BA`). |
| `RAZORPAY_KEY_SECRET` | **Private Backend Secret** | Vercel / Cloud Functions / Secret Manager | Razorpay private secret key used for server-side HMAC-SHA256 signature verification and Orders API. **Never expose to client.** |
| `GOOGLE_MAPS_API_KEY` | **Restricted Client Key** | Vercel & Client Config | Google Places Autocomplete API key (`modivs-location.js`). Must be restricted by HTTP Referrer in Google Cloud Console. |
| `FIREBASE_PROJECT_ID` | **Server Environment** | Vercel Serverless / Functions | `modivs-education` |
| `FIREBASE_CLIENT_EMAIL` | **Private Server Secret** | Vercel Serverless / Functions | Service account client email for Firebase Admin SDK. |
| `FIREBASE_PRIVATE_KEY` | **Private Server Secret** | Vercel Serverless / Functions | Service account private key for Firebase Admin SDK. |
| `MASTER_ADMIN_EMAILS` | **Server Configuration** | `functions/index.js` / Environment | Comma-delimited list of verified administrator emails (`happinessaggarwal@gmail.com`, `divyanshdhimanteam@gmail.com`, `luxmankumar628@gmail.com`). |

---

## 3. Secret Management & Backend Configuration

### A. Vercel Serverless Environment Variables
In your Vercel Project Dashboard (`Settings` -> `Environment Variables`):
- `FIREBASE_PROJECT_ID`: `modivs-education`
- `FIREBASE_CLIENT_EMAIL`: Your service account email
- `FIREBASE_PRIVATE_KEY`: Your service account private key
- `RAZORPAY_KEY_ID`: `rzp_live_TwTMFGYwNbt9BA`
- `RAZORPAY_KEY_SECRET`: Your live Razorpay secret key
- `MASTER_ADMIN_EMAILS`: `happinessaggarwal@gmail.com,divyanshdhimanteam@gmail.com,luxmankumar628@gmail.com`

---

## 4. Build Pipeline & Asset Minification

The project includes an automated build script (`build.js`) powered by `terser`:

```bash
# Run production build
npm run build
```

### Build Characteristics:
- **Zero Public Source Maps:** Production source maps are completely disabled (`sourceMap: false`).
- **Debugger Stripping:** Any lingering `debugger;` statements are stripped (`drop_debugger: true`).
- **Backend API Integration:** `modivs-api.js` is bundled into `modivs.min.js`.
- **Output:** Generates production bundle `modivs.min.js` (~335 KB).

