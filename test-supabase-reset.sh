#!/bin/bash

# Test Supabase password reset directly via API

EMAIL="$1"
if [ -z "$EMAIL" ]; then
    echo "Usage: ./test-supabase-reset.sh <email>"
    exit 1
fi

SUPABASE_URL="https://ipaquntaeftocyvxoawo.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwYXF1bnRhZWZ0b2N5dnhvYXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDgwODMsImV4cCI6MjA2NzkyNDA4M30.Yh4Xgulb_jo3BXbNMjxJ-4aF6oWJImGu3hQ6Pysx460"

echo "Testing password reset for: $EMAIL"
echo "================================"

# Test 1: Without redirect URL
echo -e "\nTest 1: Without redirect URL"
echo "-----------------------------"
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/auth/v1/recover" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\"}")

echo "Response: $RESPONSE"

# Test 2: With redirect URL
echo -e "\nTest 2: With redirect URL"
echo "-------------------------"
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/auth/v1/recover" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"redirectTo\":\"https://macroscope.info/reset-password\"}")

echo "Response: $RESPONSE"

# Test 3: With different redirect URL format
echo -e "\nTest 3: With app deep link"
echo "--------------------------"
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/auth/v1/recover" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"redirectTo\":\"macroscope://reset-password\"}")

echo "Response: $RESPONSE"

echo -e "\n================================"
echo "Check your email and AWS SES statistics"
echo "Run: aws ses get-send-statistics --region us-east-1 | tail -20"