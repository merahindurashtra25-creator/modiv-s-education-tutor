# Modiv's Education - Tutor & Student Platform

A comprehensive educational marketplace and tutoring platform connecting students with qualified home and online tutors across India (including Chandigarh, Mohali, Panchkula, and nationwide).

---

## 🚀 Key Features

- **Tutor Directory & Search**: Browse verified tutors by subject, class/grade, location, rating, and teaching mode (home/online).
- **Student Enquiries & Lead Matching**: Students can submit tuition requests; verified tutors can unlock matching leads using wallet coins.
- **Tutor Wallet & Razorpay Integration**: Secure coin top-ups, membership plans, and instant lead unlocks powered by Razorpay.
- **Real-Time Messaging**: Built-in direct chat system between tutors and students with unread notifications.
- **Admin Management Dashboard**: Comprehensive controls for lead verification, tutor approvals, transaction monitoring, and platform settings.
- **Secure Serverless Architecture**: Vercel Serverless Functions and Firebase Cloud Functions backed by Firestore and Firebase Auth with HttpOnly session cookies and CSRF protection.

---

## 🛠️ Tech Stack

- **Frontend**: Modular JavaScript (ES6+), HTML5, CSS3 (bundled & minified via Terser)
- **Backend / APIs**: Node.js Vercel Serverless Functions (`/api/*`) & Firebase Cloud Functions
- **Database & Storage**: Google Cloud Firestore & Firebase Cloud Storage
- **Authentication**: Firebase Authentication + Server-side session verification
- **Payments**: Razorpay Payment Gateway (Orders & Webhooks)

---

## 📁 Repository Structure

```
modiv-s-education-tutor-main/
├── .github/workflows/       # Automated CI/CD workflows and security scans
├── api/                     # Vercel Serverless Function endpoints
│   ├── auth.js              # Authentication, login, signup, session verification
│   ├── chat.js              # Messaging between tutors and students
│   ├── leads.js             # Lead creation, assignment, and status updates
│   ├── payments.js          # Razorpay order generation & webhook handlers
│   ├── students.js          # Student accounts and profile management
│   ├── tutors.js            # Tutor directory and profile endpoints
│   ├── _auth.js             # Backend session validation & CSRF guards
│   └── _firebase.js         # Firebase Admin SDK singleton
├── functions/               # Firebase Cloud Functions
├── js/                      # Modular client-side scripts
├── public/                  # Production static assets and builds
├── build.js                 # Asset bundling and optimization script
├── firebase.json            # Firebase configuration
├── firestore.rules          # Firestore database security rules
├── storage.rules            # Firebase storage security rules
├── vercel.json              # Vercel deployment headers and routing rules
└── .env.example             # Example environment variable template
```

---

## ⚙️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Git](https://git-scm.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone <YOUR_GITHUB_REPO_URL>
   cd modiv-s-education-tutor-main
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

4. Build production assets:
   ```bash
   npm run build
   ```

5. Run locally using a static server (e.g. `npx serve public` or `vercel dev`).

---

## 🔒 Security & Best Practices

- **Strict Environment Separation**: Secrets (`.env`, Service Account keys) are excluded from version control via `.gitignore`.
- **Session Protection**: Authentication tokens are transmitted via secure, HttpOnly, SameSite session cookies.
- **CSRF Guards**: State-altering requests validate origin and custom request headers.
- **Firestore Rules**: Granular role-based security rules enforcing tutor, student, and admin permissions.

---

## 📄 License

All rights reserved © Modiv's Education.
