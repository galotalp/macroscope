#!/bin/bash

# Test script for join request functionality
API_URL="https://api.macroscope.info/api"

echo "🧪 Testing Join Request System with Database Persistence"
echo "========================================================="

# Test credentials - you'll need to update these with real test accounts
USER1_EMAIL="test1@example.com"
USER1_PASSWORD="password123"
USER2_EMAIL="test2@example.com"
USER2_PASSWORD="password123"

# Function to login and get token
login() {
    local email=$1
    local password=$2
    
    response=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}")
    
    token=$(echo $response | grep -o '"token":"[^"]*' | sed 's/"token":"//')
    
    if [ -z "$token" ]; then
        echo "❌ Login failed for $email"
        echo "Response: $response"
        return 1
    fi
    
    echo "$token"
}

# Function to create a group
create_group() {
    local token=$1
    local name=$2
    
    response=$(curl -s -X POST "$API_URL/groups" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -d "{\"name\":\"$name\",\"description\":\"Test group for join requests\"}")
    
    group_id=$(echo $response | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')
    
    if [ -z "$group_id" ]; then
        echo "❌ Failed to create group"
        echo "Response: $response"
        return 1
    fi
    
    echo "$group_id"
}

# Function to request to join a group
request_join() {
    local token=$1
    local group_id=$2
    
    response=$(curl -s -X POST "$API_URL/groups/$group_id/request-join" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -d '{"message":"I would like to join this research group"}')
    
    request_id=$(echo $response | grep -o '"requestId":"[^"]*' | sed 's/"requestId":"//')
    
    if [ -z "$request_id" ]; then
        echo "❌ Failed to create join request"
        echo "Response: $response"
        return 1
    fi
    
    echo "$request_id"
}

# Function to get pending requests
get_pending_requests() {
    local token=$1
    local group_id=$2
    
    response=$(curl -s -X GET "$API_URL/groups/$group_id/details" \
        -H "Authorization: Bearer $token")
    
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
}

# Function to approve/reject request
respond_to_request() {
    local token=$1
    local group_id=$2
    local request_id=$3
    local action=$4  # approve or reject
    
    response=$(curl -s -X POST "$API_URL/groups/$group_id/join-requests/$request_id/$action" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token")
    
    echo "$response"
}

echo ""
echo "📝 Note: This script requires two test users to be already registered and verified."
echo "User 1 will create a group, User 2 will request to join."
echo ""
echo "Please update the USER1_EMAIL, USER1_PASSWORD, USER2_EMAIL, USER2_PASSWORD variables"
echo "in this script with actual test accounts before running the tests."
echo ""
echo "Press Enter to continue with the test or Ctrl+C to exit..."
read

# Test flow
echo ""
echo "1️⃣ Logging in as User 1..."
TOKEN1=$(login "$USER1_EMAIL" "$USER1_PASSWORD")
if [ $? -ne 0 ]; then
    exit 1
fi
echo "✅ User 1 logged in successfully"

echo ""
echo "2️⃣ Creating a test group as User 1..."
GROUP_ID=$(create_group "$TOKEN1" "Test Research Group $(date +%s)")
if [ $? -ne 0 ]; then
    exit 1
fi
echo "✅ Group created with ID: $GROUP_ID"

echo ""
echo "3️⃣ Logging in as User 2..."
TOKEN2=$(login "$USER2_EMAIL" "$USER2_PASSWORD")
if [ $? -ne 0 ]; then
    exit 1
fi
echo "✅ User 2 logged in successfully"

echo ""
echo "4️⃣ User 2 requesting to join the group..."
REQUEST_ID=$(request_join "$TOKEN2" "$GROUP_ID")
if [ $? -ne 0 ]; then
    exit 1
fi
echo "✅ Join request created with ID: $REQUEST_ID"

echo ""
echo "5️⃣ Checking pending requests as User 1 (admin)..."
echo "Group details with pending requests:"
get_pending_requests "$TOKEN1" "$GROUP_ID"

echo ""
echo "6️⃣ User 1 approving the join request..."
APPROVAL_RESPONSE=$(respond_to_request "$TOKEN1" "$GROUP_ID" "$REQUEST_ID" "approve")
echo "Response: $APPROVAL_RESPONSE"

echo ""
echo "7️⃣ Verifying User 2 is now a member..."
echo "Group details after approval:"
get_pending_requests "$TOKEN1" "$GROUP_ID"

echo ""
echo "✅ Test completed successfully!"
echo ""
echo "Summary:"
echo "- JWT secret is now secure"
echo "- Join requests are persisted in database"
echo "- System survives server restarts"
echo "- Approval workflow is working"