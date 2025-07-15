#!/bin/bash

# Research Coordinator App Setup Script

echo "🚀 Setting up Research Coordinator App..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Setup Backend
echo "📦 Setting up backend..."
cd backend

# Install backend dependencies
npm install

# Copy environment file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Please update the .env file with your Supabase credentials"
fi

# Build backend
npm run build

echo "✅ Backend setup complete"

# Setup Frontend
echo "📱 Setting up React Native frontend..."
cd ../ResearchCoordinatorApp

# Install frontend dependencies
npm install

echo "✅ Frontend setup complete"

# Go back to root directory
cd ..

echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set up your Supabase project and get your credentials"
echo "2. Update backend/.env with your Supabase URL and anon key"
echo "3. Run the SQL schema from database_schema.sql in your Supabase project"
echo "4. Start the backend server: cd backend && npm run dev"
echo "5. Start the React Native app: cd ResearchCoordinatorApp && npx expo start"
echo ""
echo "📖 For more details, see the README.md file"
