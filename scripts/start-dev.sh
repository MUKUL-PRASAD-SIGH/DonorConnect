#!/bin/bash

# Ensure we are in the project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

echo "🩸 Starting Blood Donor & Alert System..."

# Check if MongoDB is running
if ! docker ps | grep -q mongodb; then
    echo "📦 Starting MongoDB..."
    docker run -d -p 27017:27017 --name mongodb mongo:7
    sleep 5
fi

echo "🔧 Installing dependencies..."

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies  
cd ../frontend
npm install

echo "✅ Setup complete!"
echo ""
echo "🚀 To start the system:"
echo "Terminal 1: cd backend && npm run start:dev"
echo "Terminal 2: cd frontend && npm run dev"
echo ""
echo "Then visit: http://localhost:3000"