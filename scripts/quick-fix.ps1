# Quick fix script for Windows PowerShell
Set-Location "$PSScriptRoot\.."
Write-Host "🔧 Applying quick fixes..." -ForegroundColor Yellow

# Navigate to backend
Set-Location backend

# Install dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Green
npm install

# Try to start backend
Write-Host "🚀 Starting backend..." -ForegroundColor Green
Write-Host "If you see TypeScript errors, that's okay - the server should still start!" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop and then run frontend in another terminal" -ForegroundColor Cyan

npm run start:dev