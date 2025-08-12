#!/bin/bash

# Deploy email handler pages (reset-password and verify-email) to S3
# These pages handle Supabase auth flows and deep link back to the app

BUCKET="macroscope-marketing-site"
REGION="us-west-2"

echo "Deploying email handler pages to S3..."

# Upload reset password page
echo "Uploading reset-password.html..."
aws s3 cp marketing-website/reset-password.html s3://$BUCKET/reset-password.html \
  --content-type "text/html" \
  --cache-control "no-cache" \
  --region $REGION

if [ $? -eq 0 ]; then
  echo "✓ reset-password.html uploaded successfully"
else
  echo "✗ Failed to upload reset-password.html"
  exit 1
fi

# Upload email verification page  
echo "Uploading verify-email.html..."
aws s3 cp marketing-website/verify-email.html s3://$BUCKET/verify-email.html \
  --content-type "text/html" \
  --cache-control "no-cache" \
  --region $REGION

if [ $? -eq 0 ]; then
  echo "✓ verify-email.html uploaded successfully"
else
  echo "✗ Failed to upload verify-email.html"
  exit 1
fi

# Also upload these as index.html files in subdirectories for cleaner URLs
echo "Creating clean URL structure..."

# Create reset-password directory
aws s3 cp marketing-website/reset-password.html s3://$BUCKET/reset-password/index.html \
  --content-type "text/html" \
  --cache-control "no-cache" \
  --region $REGION

# Create verify-email directory
aws s3 cp marketing-website/verify-email.html s3://$BUCKET/verify-email/index.html \
  --content-type "text/html" \
  --cache-control "no-cache" \
  --region $REGION

echo ""
echo "Deployment complete! Email handler pages are now available at:"
echo "  - https://macroscope.info/reset-password"
echo "  - https://macroscope.info/verify-email"
echo ""
echo "Next steps:"
echo "1. Configure Supabase SMTP settings to use Amazon SES"
echo "2. Add these URLs to Supabase Auth redirect whitelist"
echo "3. Test the password reset and email verification flows"