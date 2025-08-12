# Fix Password Reset Emails - Troubleshooting Guide

Since email verification works but password reset doesn't, and both use the same SES configuration, the issue is likely in Supabase's email template settings.

## Check These Settings in Supabase Dashboard

Go to: https://supabase.com/dashboard/project/ipaquntaeftocyvxoawo/settings/auth

### 1. Email Templates Section
Look for "Email Templates" and check:

- **Enable email confirmations**: Should be ON (this is working)
- **Enable password recovery**: **THIS MUST BE ON** ← Most likely issue
- **Password recovery template**: Make sure it's not empty

### 2. Password Recovery Template
If the template is empty or disabled, use this:

```html
<h2>Reset Your Password</h2>
<p>Hello,</p>
<p>You requested to reset your password. Click the link below:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>This link will expire in 1 hour.</p>
<p>If you didn't request this, please ignore this email.</p>
```

### 3. Redirect URLs
Make sure these are in the allowed list:
- `https://macroscope.info/reset-password`
- `https://macroscope.info/verify-email`

### 4. SMTP Configuration (Should be correct since signup works)
- Should show your SES configuration
- Test email button should work

## If Password Recovery is Disabled

This is the most likely issue. In Supabase:
1. Go to Email Templates
2. Find "Password recovery" section
3. Toggle it ON
4. Save changes

## Test After Fixing

1. Use the app to request password reset
2. Check the console logs (I added detailed logging)
3. Check your email
4. Check SES metrics: `aws ses get-send-statistics --region us-east-1`

## Alternative: Custom Password Reset

If Supabase's password recovery can't be enabled for some reason, we can implement a custom solution that:
1. Generates a secure token
2. Sends email directly via SES
3. Handles the reset through a custom endpoint

Let me know what you find in the Supabase dashboard!