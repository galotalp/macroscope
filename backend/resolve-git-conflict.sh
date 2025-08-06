#\!/bin/bash
echo "🔄 Resolving git conflicts on production server..."

# Stash any local changes to compiled files
echo "Stashing local changes..."
git stash push -m "Stashing compiled files before pull"

# Pull the latest changes
echo "Pulling latest changes from main..."
git pull origin main

# Rebuild the application
echo "Building application..."
cd backend
npm run build

echo "✅ Production server updated successfully\!"
