#!/bin/bash

# SES Email Forwarding Setup Script
# This script sets up forwarding rules for MacroScope emails to steve.laughton@billie.coop

ACCOUNT_ID="482089411729"
REGION="us-west-2"
BILLIE_EMAIL="steve.laughton@billie.coop"
RULE_SET="macroscope-email-rules"

echo "Setting up email forwarding rules..."

# First, verify the billie coop email is verified
aws ses get-identity-verification-attributes --identities $BILLIE_EMAIL

# Update support email rule to include forwarding
echo "Updating support@macroscope.info rule..."
aws ses update-receipt-rule --rule-set-name $RULE_SET --rule '{
  "Name": "forward-support-emails",
  "Enabled": true,
  "TlsPolicy": "Optional",
  "Recipients": ["support@macroscope.info"],
  "Actions": [
    {
      "S3Action": {
        "BucketName": "macroscope-email-storage",
        "ObjectKeyPrefix": "emails/support/"
      }
    }
  ],
  "ScanEnabled": false
}'

# Create rule for legal emails  
echo "Creating legal@macroscope.info rule..."
aws ses create-receipt-rule --rule-set-name $RULE_SET --rule '{
  "Name": "forward-legal-emails", 
  "Enabled": true,
  "TlsPolicy": "Optional",
  "Recipients": ["legal@macroscope.info"],
  "Actions": [
    {
      "S3Action": {
        "BucketName": "macroscope-email-storage",
        "ObjectKeyPrefix": "emails/legal/"
      }
    }
  ],
  "ScanEnabled": false
}'

# Create rule for privacy emails
echo "Creating privacy@macroscope.info rule..."
aws ses create-receipt-rule --rule-set-name $RULE_SET --rule '{
  "Name": "forward-privacy-emails",
  "Enabled": true, 
  "TlsPolicy": "Optional",
  "Recipients": ["privacy@macroscope.info"],
  "Actions": [
    {
      "S3Action": {
        "BucketName": "macroscope-email-storage",
        "ObjectKeyPrefix": "emails/privacy/"
      }
    }
  ],
  "ScanEnabled": false
}'

echo "Email forwarding rules created!"
echo "Note: For actual forwarding to $BILLIE_EMAIL, you'll need to set up a Lambda function"
echo "or configure SES to send the stored emails to the billie coop address."