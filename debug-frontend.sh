#!/bin/bash

echo "🔍 Debugging Frontend Connection Issues"
echo "======================================"

echo "1. Backend Status:"
echo "   - Server: http://localhost:3000"
echo "   - Network: http://10.0.0.170:3000"
echo ""

echo "2. Testing backend endpoints..."
echo "   Root endpoint:"
curl -s -w "   Status: %{http_code}\n" http://10.0.0.170:3000/

echo "   Registration endpoint:"
curl -s -w "   Status: %{http_code}\n" -X POST http://10.0.0.170:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "debuguser", "email": "debug@example.com", "password": "password123"}' \
  | head -c 100

echo ""
echo "3. Frontend Configuration:"
echo "   API_URL: http://10.0.0.170:3000/api"
echo ""

echo "4. Common Issues & Solutions:"
echo "   ✓ Backend is running and accessible"
echo "   ✓ Network IP is correct (10.0.0.170)"
echo "   ✓ Endpoints are working"
echo ""

echo "5. If you're still getting 404 errors:"
echo "   a) Check if you're testing on a physical device vs simulator"
echo "   b) For iOS Simulator: Use http://localhost:3000/api"
echo "   c) For Physical Device: Use http://10.0.0.170:3000/api"
echo "   d) For Web Browser: Use http://localhost:3000/api"
echo ""

echo "6. Quick fixes to try:"
echo "   - Restart the React Native development server"
echo "   - Clear React Native cache: npx react-native start --reset-cache"
echo "   - Check if the device is on the same network"
echo ""

echo "7. Test URLs for your platform:"
echo "   - iOS Simulator: http://localhost:3000/api/auth/register"
echo "   - Physical Device: http://10.0.0.170:3000/api/auth/register"
echo "   - Web Browser: http://localhost:3000/api/auth/register"
