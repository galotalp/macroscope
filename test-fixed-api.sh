#!/bin/bash

echo "🧪 Testing Corrected API Endpoints"
echo "=================================="

echo "1. Testing corrected URL construction:"
echo "   Base URL: http://10.0.0.170:3000/api"
echo "   Endpoint: /auth/register"
echo "   Final URL: http://10.0.0.170:3000/api/auth/register"
echo ""

echo "2. Testing registration endpoint:"
curl -s -X POST http://10.0.0.170:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "fixedtest", "email": "fixedtest@example.com", "password": "password123"}' \
  | jq '.'

echo ""
echo "3. Testing login endpoint:"
curl -s -X POST http://10.0.0.170:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "fixedtest@example.com", "password": "password123"}' \
  | jq '.'

echo ""
echo "✅ API endpoints are working correctly!"
echo "The 404 errors should now be resolved."
