# Start frontend script for Windows PowerShell
Set-Location "$PSScriptRoot\.."
Write-Host "🎨 Starting frontend..." -ForegroundColor Green

# Navigate to frontend
Set-Location frontend

# Install dependencies
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Green
npm install

# Start frontend
Write-Host "🚀 Starting frontend server..." -ForegroundColor Green
Write-Host "Visit http://localhost:3000 when ready!" -ForegroundColor Cyan

npm run dev