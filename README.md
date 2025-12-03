# Organ Donor Management System (ODMS) - Frontend + Functions stub

## Quick start

1. Unzip and change to project folder:
   - `cd odms_project`
2. Frontend:
   - Paste your Firebase config into `src/firebase.js`
   - Install: `npm install`
   - Run: `npm run dev`
3. Functions (optional):
   - `cd functions`
   - `npm install`
   - Deploy using Firebase CLI: `firebase deploy --only functions` (requires firebase-tools and login)

## What is included
- React + Vite frontend
- Tailwind + glassy UI utilities
- Tabbed Login/Signup with role toggle
- AdminPanel with filters + Export to Excel/PDF
- Cloud Functions stub (`functions/index.js`) with a naive match-runner

