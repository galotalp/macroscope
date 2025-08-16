import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { SESClient, SendEmailCommand } from 'https://esm.sh/@aws-sdk/client-ses@3.485.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  invitationId: string
  recipientEmail: string
  groupName: string
  inviterName: string
  message?: string
  invitationToken: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('SES Email Function called')
    
    // Log environment variables (without exposing sensitive data)
    console.log('Environment check:', {
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasAwsKey: !!Deno.env.get('AWS_ACCESS_KEY_ID'),
      hasAwsSecret: !!Deno.env.get('AWS_SECRET_ACCESS_KEY'),
      awsRegion: Deno.env.get('AWS_REGION'),
      senderEmail: Deno.env.get('SES_SENDER_EMAIL')
    })
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get request data
    const { invitationId, recipientEmail, groupName, inviterName, message, invitationToken } = await req.json() as EmailRequest
    
    console.log('Processing invitation for:', recipientEmail)

    // Get AWS credentials from environment
    const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')
    const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')
    const awsRegion = Deno.env.get('AWS_REGION') || 'us-east-1'
    
    if (!awsAccessKeyId || !awsSecretAccessKey) {
      throw new Error('AWS credentials are not configured')
    }
    
    // Initialize AWS SES client with explicit credentials
    // This prevents the SDK from trying to read config files
    const sesClient = new SESClient({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
      // Disable credential file loading
      maxAttempts: 3,
    })

    // Create the invitation URL
    const baseUrl = 'https://macroscope.info'
    const invitationUrl = `${baseUrl}/join?token=${invitationToken}&email=${encodeURIComponent(recipientEmail)}`

    // Create HTML email content
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Join ${groupName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: white;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #6fa172;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #6fa172;
      margin: 0;
      font-size: 28px;
    }
    .content {
      padding: 20px 0;
    }
    .message-box {
      background-color: #f0f4f0;
      border-left: 4px solid #6fa172;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .cta-button {
      display: inline-block;
      padding: 14px 30px;
      background-color: #6fa172;
      color: white !important;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      font-size: 16px;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://macroscope.info/assets/macroscope-icon.png" alt="MacroScope" style="width: 60px; height: 60px; margin-bottom: 10px;">
      <h1>MacroScope</h1>
      <p style="margin: 0; color: #666; font-size: 16px;">Research Coordination Platform</p>
    </div>
    
    <div class="content">
      <h2>Hello!</h2>
      
      <p><strong>${inviterName}</strong> has invited you to join the research group <strong>"${groupName}"</strong> on MacroScope.</p>
      
      ${message ? `
      <div class="message-box">
        <p><strong>Personal message from ${inviterName}:</strong></p>
        <p>${message}</p>
      </div>
      ` : ''}
      
      <p>MacroScope is a collaborative platform for managing research projects, sharing files, and coordinating tasks with your team.</p>
      
      <div class="button-container">
        <a href="${invitationUrl}" class="cta-button">Accept Invitation & Sign Up</a>
      </div>
      
    </div>
    
    <div class="footer">
      <p>This invitation will expire in 30 days.</p>
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      <p>&copy; 2024 MacroScope. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `

    // Plain text version
    const textContent = `
You're Invited to Join ${groupName}!

Hello!

${inviterName} has invited you to join the research group "${groupName}" on MacroScope.

${message ? `Personal message from ${inviterName}:\n${message}\n\n` : ''}

MacroScope is a collaborative platform for managing research projects, sharing files, and coordinating tasks with your team.

Accept Invitation & Sign Up:
${invitationUrl}

This invitation will expire in 30 days.

If you didn't expect this invitation, you can safely ignore this email.

© 2024 MacroScope. All rights reserved.
    `

    // Send email via Amazon SES
    const senderEmail = Deno.env.get('SES_SENDER_EMAIL') || 'noreply@macroscope.info'
    
    const command = new SendEmailCommand({
      Source: `MacroScope <${senderEmail}>`,
      Destination: {
        ToAddresses: [recipientEmail],
      },
      Message: {
        Subject: {
          Data: `You're invited to join ${groupName} on MacroScope`,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlContent,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textContent,
            Charset: 'UTF-8',
          },
        },
      },
    })

    console.log('Sending email via Amazon SES...')
    const response = await sesClient.send(command)
    console.log('SES Response:', response)

    // Update the invitation status to 'sent'
    const { error: updateError } = await supabaseClient
      .from('pending_email_invitations')
      .update({ 
        status: 'sent',
        email_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId)

    if (updateError) {
      console.error('Error updating invitation status:', updateError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation email sent successfully',
        messageId: response.MessageId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in send-invitation-ses function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})