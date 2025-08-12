#!/bin/bash

echo "Investigating Strange Email Rate Limit Issue"
echo "==========================================="

# Check if someone is hitting your website repeatedly
echo "1. Checking recent access to reset-password page..."
echo "   (This requires web server logs - not available locally)"

# Check if there are any automated requests
echo "2. Potential causes:"
echo "   - Bot/crawler hitting reset-password URLs"
echo "   - Someone manually triggering multiple resets"  
echo "   - Bug causing repeated API calls"
echo "   - Third-party service testing your endpoints"

echo "3. To investigate further, check:"
echo "   - CloudFlare/CDN logs for your domain"
echo "   - Any monitoring tools hitting your endpoints"
echo "   - Mobile app users accidentally triggering resets"

echo "4. For new user registration issue:"
echo "   - This SHOULD work independently of password resets"
echo "   - Same rate limit pool affects all email types"
echo "   - Very suspicious that it's blocked"

echo "5. Immediate debugging steps:"
echo "   - Try registration with a completely new email"
echo "   - Check if the error is exactly the same"
echo "   - Monitor Supabase auth logs during registration attempt"

# Suggest checking web traffic
echo ""
echo "To check web traffic to your domain:"
echo "   - Check CloudFlare analytics if using CF"
echo "   - Look for unusual spikes in traffic to reset-password"
echo "   - Check referrer headers in web server logs"

echo ""
echo "The fact that NEW user registration is blocked suggests:"
echo "   - The 30 email/hour limit is shared across ALL email types"  
echo "   - Someone/something has been hammering your password reset"
echo "   - This is not normal behavior - investigate external access"