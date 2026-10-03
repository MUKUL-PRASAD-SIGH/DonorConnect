@echo off
cd /d "%~dp0\.."
echo 🩸 Starting Blood Donor & Alert System...

REM Check if MongoDB container exists and start it
docker ps -a | findstr mongodb >nul
if errorlevel 1 (
    echo 📦 Starting MongoDB...
    docker run -d -p 27017:27017 --name mongodb mongo:7
    timeout /t 5 >nul
) else (
    docker start mongodb >nul 2>&1
)

echo 🔧 Installing dependencies...

REM Install backend dependencies
cd backend
call npm install

REM Install frontend dependencies  
cd ..\frontend
call npm install

cd ..

echo ✅ Setup complete!
echo.
echo 🚀 To start the system:
echo Terminal 1: cd backend ^&^& npm run start:dev
echo Terminal 2: cd frontend ^&^& npm run dev
echo.
echo Then visit: http://localhost:3000