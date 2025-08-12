#!/bin/bash

# Deploy Email Forwarder Lambda Function
FUNCTION_NAME="macroscope-email-forwarder"
ROLE_NAME="MacroscopeEmailForwarderRole" 
ACCOUNT_ID="482089411729"
REGION="us-west-2"

echo "Deploying MacroScope email forwarder Lambda function..."

# Create IAM role for the Lambda function
echo "Creating IAM role..."
aws iam create-role --role-name $ROLE_NAME --assume-role-policy-document '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow", 
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}' 2>/dev/null || echo "Role might already exist"

# Attach basic Lambda execution policy
aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Attach SES and S3 permissions
aws iam put-role-policy --role-name $ROLE_NAME --policy-name EmailForwarderPolicy --policy-document '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow", 
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::macroscope-email-storage/*"
    }
  ]
}'

# Wait for role to be available
sleep 10

# Create deployment package
echo "Creating deployment package..."
cp email-forwarder-lambda.py lambda_function.py
zip email-forwarder.zip lambda_function.py
rm lambda_function.py

# Deploy Lambda function
echo "Deploying Lambda function..."
aws lambda create-function \
  --function-name $FUNCTION_NAME \
  --runtime python3.9 \
  --role arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://email-forwarder.zip \
  --timeout 30 \
  --memory-size 128 \
  --description "Forwards MacroScope emails to billie coop email address" \
  2>/dev/null || aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://email-forwarder.zip

# Add S3 trigger permission
aws lambda add-permission \
  --function-name $FUNCTION_NAME \
  --principal s3.amazonaws.com \
  --action lambda:InvokeFunction \
  --statement-id s3-trigger-permission \
  --source-arn arn:aws:s3:::macroscope-email-storage \
  2>/dev/null || echo "Permission might already exist"

# Configure S3 bucket notification
echo "Configuring S3 bucket notification..."
aws s3api put-bucket-notification-configuration \
  --bucket macroscope-email-storage \
  --notification-configuration '{
    "LambdaFigurations": [
      {
        "Id": "EmailForwarderTrigger",
        "LambdaFunctionArn": "arn:aws:lambda:'$REGION':'$ACCOUNT_ID':function:'$FUNCTION_NAME'",
        "Events": ["s3:ObjectCreated:*"],
        "Filter": {
          "Key": {
            "FilterRules": [
              {
                "Name": "prefix",
                "Value": "emails/"
              }
            ]
          }
        }
      }
    ]
  }'

# Clean up
rm email-forwarder.zip

echo "Email forwarder Lambda function deployed successfully!"
echo "Function ARN: arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME"
echo "All emails sent to support@, legal@, and privacy@ macroscope.info will now be forwarded to steve.laughton@billie.coop"