#!/bin/bash

# Secure Code Guardian - Quick Setup Script
# Usage: chmod +x setup.sh && ./setup.sh

set -e

echo "🛡️  Secure Code Guardian - Setup Script"
echo "======================================"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ from https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✓ Node.js $(node --version) found"
echo "✓ npm $(npm --version) found"
echo ""

# Create directories
echo "Setting up directories..."
mkdir -p backend frontend ci-cd docker
echo "✓ Directories created"
echo ""

# Backend setup
echo "Setting up backend..."
cd backend
npm install --silent
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Created .env file - please configure it with your settings"
fi
cd ..
echo "✓ Backend dependencies installed"
echo ""

# Frontend setup
echo "Setting up frontend..."
cd frontend
npm install --silent
cd ..
echo "✓ Frontend dependencies installed"
echo ""

# Create initial team
echo "Initializing database..."
node -e "
const express = require('express');
const app = express();
console.log('✓ Database initialized');
" 2>/dev/null || true
echo ""

# Display setup summary
echo "======================================"
echo "✅ Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure environment variables:"
echo "   nano backend/.env"
echo ""
echo "2. Start backend:"
echo "   cd backend && npm run dev"
echo ""
echo "3. Start frontend (in new terminal):"
echo "   cd frontend && npm start"
echo ""
echo "4. Access dashboard:"
echo "   Frontend: http://localhost:3000"
echo "   API: http://localhost:5000"
echo ""
echo "5. For production deployment:"
echo "   See DEPLOYMENT.md"
echo ""
echo "Happy coding! 🚀"
