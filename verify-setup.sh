#!/bin/bash

echo "🔧 Testing Research Coordinator Backend with Supabase..."

# Test server status
echo "1. Testing server status..."
curl -s http://localhost:3000/ | jq '.'

echo -e "\n2. Testing user registration..."
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }' | jq '.'

echo -e "\n3. Testing user login..."
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq '.'

echo -e "\n4. Testing with invalid credentials..."
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "wrongpassword"
  }' | jq '.'

echo -e "\n✅ Backend test completed!"
