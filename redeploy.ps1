# redeploy.ps1

# Exit on first error
$ErrorActionPreference = "Stop"

Write-Host "=== Starting ODMS Full Redeploy ===" -ForegroundColor Cyan

# 1️⃣ Install/update dependencies
Write-Host "`nInstalling npm dependencies..." -ForegroundColor Yellow
npm install

# 2️⃣ Build Vite frontend
Write-Host "`nBuilding frontend with Vite..." -ForegroundColor Yellow
npm run build

# 3️⃣ Deploy Firestore rules
Write-Host "`nDeploying Firestore rules..." -ForegroundColor Yellow
firebase deploy --only "firestore:rules"

# 4️⃣ Deploy Hosting + Functions + DataConnect
Write-Host "`nDeploying Hosting, Functions, and DataConnect..." -ForegroundColor Yellow
firebase deploy --only "hosting,functions,dataconnect"

Write-Host "`n✅ Full redeploy complete!" -ForegroundColor Green
Write-Host "You can view your project at: https://console.firebase.google.com/project/organ-donor-management-system/overview"
Write-Host "Local emulators can be started with: firebase emulators:start"
