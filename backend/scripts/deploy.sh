#\!/bin/bash

# EC2 Deployment Script for MacroScope Backend

echo "🚀 Starting deployment..."

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Build TypeScript
echo "🔨 Building application..."
npm run build

# Run database migrations if needed
# echo "🗄️  Running migrations..."
# npm run migrate

# Restart PM2
echo "♻️  Restarting application..."
pm2 reload ecosystem.config.js --env production

echo "✅ Deployment complete\!"
echo "🔍 Check logs with: pm2 logs"
EOF < /dev/null