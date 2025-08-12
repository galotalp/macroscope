import json
import boto3
import email
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
s3_client = boto3.client('s3')
ses_client = boto3.client('ses')

# Configuration
FORWARD_TO_EMAIL = 'steve.laughton@billie.coop'
FROM_EMAIL = 'noreply@macroscope.info'
BUCKET_NAME = 'macroscope-email-storage'

def lambda_handler(event, context):
    """
    AWS Lambda function to forward emails received via SES to billie coop email.
    Triggered by SES receipt rules that store emails in S3.
    """
    
    try:
        # Parse the SES event
        if 'Records' not in event:
            logger.error("No Records found in event")
            return {'statusCode': 400, 'body': 'No Records in event'}
            
        for record in event['Records']:
            # Handle S3 event (email stored)
            if 'eventSource' in record and record['eventSource'] == 'aws:s3':
                s3_bucket = record['s3']['bucket']['name']
                s3_key = record['s3']['object']['key']
                
                logger.info(f"Processing email from S3: {s3_bucket}/{s3_key}")
                
                # Download email from S3
                response = s3_client.get_object(Bucket=s3_bucket, Key=s3_key)
                raw_email = response['Body'].read().decode('utf-8')
                
                # Parse the original email
                original_email = email.message_from_string(raw_email)
                
                # Extract original email details
                original_subject = original_email.get('Subject', 'No Subject')
                original_from = original_email.get('From', 'Unknown Sender')
                original_to = original_email.get('To', 'Unknown Recipient')
                
                # Get email body
                body = ""
                if original_email.is_multipart():
                    for part in original_email.walk():
                        if part.get_content_type() == "text/plain":
                            body = part.get_payload(decode=True).decode('utf-8')
                            break
                else:
                    body = original_email.get_payload(decode=True).decode('utf-8')
                
                # Create forwarded email
                forward_subject = f"[FORWARDED] {original_subject}"
                forward_body = f"""
--- Forwarded Message ---
From: {original_from}
To: {original_to}
Subject: {original_subject}

{body}

---
This email was automatically forwarded from MacroScope email system.
"""
                
                # Send forwarded email via SES
                response = ses_client.send_email(
                    Source=FROM_EMAIL,
                    Destination={'ToAddresses': [FORWARD_TO_EMAIL]},
                    Message={
                        'Subject': {'Data': forward_subject, 'Charset': 'UTF-8'},
                        'Body': {
                            'Text': {'Data': forward_body, 'Charset': 'UTF-8'}
                        }
                    }
                )
                
                logger.info(f"Email forwarded successfully. MessageId: {response['MessageId']}")
            
            # Handle direct SES event  
            elif 'eventSource' in record and record['eventSource'] == 'aws:ses':
                # Direct SES processing (alternative approach)
                ses_data = record['ses']
                mail = ses_data['mail']
                
                logger.info(f"Processing direct SES email: {mail['messageId']}")
                # Additional processing for direct SES events if needed
                
        return {
            'statusCode': 200,
            'body': json.dumps('Email forwarding completed successfully')
        }
        
    except Exception as e:
        logger.error(f"Error processing email: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }