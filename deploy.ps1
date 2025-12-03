# deploy.ps1 - ODMS Full Deployment Script

# Stop on any error
$ErrorActionPreference = "Stop"

Write-Host "=== ODMS Deployment Script ===" -ForegroundColor Cyan

# Step 1: Install dependencies
Write-Host "`n[1/4] Installing npm dependencies..." -ForegroundColor Yellow
npm install

# Step 2: Build frontend (Vite)
Write-Host "`n[2/4] Building frontend..." -ForegroundColor Yellow
npm run build

# Step 3: Deploy Firestore rules
Write-Host "`n[3/4] Deploying Firestore rules..." -ForegroundColor Yellow
firebase deploy --only firestore:rules

# Step 4: Deploy functions, hosting, and dataconnect
Write-Host "`n[4/4] Deploying functions, hosting, and dataconnect..." -ForegroundColor Yellow
firebase deploy --only functions,hosting,dataconnect

Write-Host "`n✅ Deployment complete! Check your Firebase console for updates." -ForegroundColor Green
