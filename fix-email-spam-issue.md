# Fix MacroScope Emails Going to Spam

## Current Status
- ✅ DKIM: Enabled and verified
- ⚠️ SPF: Not found (needs to be added)
- ⚠️ DMARC: Set to "none" (needs to be strengthened)
- ⚠️ Email content: May have spam triggers

## Step 1: Add SPF Record

Add this TXT record to your domain (macroscope.info):

**Host/Name:** `@` (or leave blank)
**Type:** TXT
**Value:** `"v=spf1 include:amazonses.com ~all"`

This tells email providers that Amazon SES is authorized to send emails for your domain.

## Step 2: Strengthen DMARC Record

Update your DMARC record at `_dmarc.macroscope.info`:

**Current:** `"v=DMARC1; p=none;"`
**Update to:** `"v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@macroscope.info;"`

This provides better authentication and reporting.

## Step 3: Verify DKIM Records

Your DKIM tokens are configured. Ensure these CNAME records exist:

1. `ybcopsn3zvlbcpqrfbqdu5j76za3srfa._domainkey.macroscope.info` → `ybcopsn3zvlbcpqrfbqdu5j76za3srfa.dkim.amazonses.com`
2. `u44rhys6nagtbtn4p22e7bgjlcyasurh._domainkey.macroscope.info` → `u44rhys6nagtbtn4p22e7bgjlcyasurh.dkim.amazonses.com`
3. `6qd2ngge6vb57cljpsfse2t32xfwpixn._domainkey.macroscope.info` → `6qd2ngge6vb57cljpsfse2t32xfwpixn.dkim.amazonses.com`

## Step 4: Improve Email Content (Supabase Dashboard)

Update your email templates to avoid spam triggers:

### Password Reset Template
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Password Reset Request</h2>
  
  <p>Hello,</p>
  
  <p>We received a request to reset your password for your MacroScope account.</p>
  
  <p style="margin: 20px 0;">
    <a href="{{ .ConfirmationURL }}" 
       style="background-color: #667eea; color: white; padding: 12px 24px; 
              text-decoration: none; border-radius: 5px; display: inline-block;">
      Reset My Password
    </a>
  </p>
  
  <p><small>Or copy this link: {{ .ConfirmationURL }}</small></p>
  
  <p>This link will expire in 1 hour for security reasons.</p>
  
  <p>If you didn't request this password reset, please ignore this email. 
     Your password won't be changed.</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  
  <p style="color: #666; font-size: 12px;">
    This is an automated message from MacroScope. Please do not reply to this email.
    For support, visit <a href="https://macroscope.info">macroscope.info</a>
  </p>
</div>
```

### Key improvements:
- Professional HTML structure
- Clear, non-spammy language
- Proper link formatting
- Footer with unsubscribe/support info

## Step 5: Configure SES Settings

```bash
# Enable DKIM signing (already done)
aws ses put-identity-dkim-enabled --identity macroscope.info --dkim-enabled --region us-east-1

# Set up configuration set for tracking
aws ses put-configuration-set-reputation-options \
  --configuration-set default \
  --reputation-metrics-enabled \
  --region us-east-1
```

## Step 6: Email Best Practices

1. **From Address**: Use `noreply@macroscope.info` consistently
2. **Subject Lines**: Avoid CAPS, excessive punctuation (!!!), spam words
3. **Content**: 
   - Include both HTML and plain text versions
   - Avoid spam trigger words (FREE, CLICK NOW, etc.)
   - Include physical address in footer (if applicable)
4. **Links**: Use full URLs, not shortened links
5. **Images**: Minimize or avoid images in transactional emails

## Step 7: Test Email Deliverability

Use these tools to test:
1. [Mail Tester](https://www.mail-tester.com) - Send test email and get spam score
2. [MXToolbox](https://mxtoolbox.com/SuperTool.aspx) - Check DNS records
3. [Google Postmaster](https://postmaster.google.com) - Monitor Gmail delivery

## Step 8: Monitor and Maintain

1. **Check SES Reputation Dashboard**
   ```bash
   aws ses get-account-sending-enabled --region us-east-1
   aws ses get-send-quota --region us-east-1
   ```

2. **Monitor bounce/complaint rates** - Keep below 5% bounce, 0.1% complaint

3. **Warm up sending** - Gradually increase volume for new domains

## Quick DNS Commands

After adding records, verify with:
```bash
# Check SPF
dig TXT macroscope.info +short | grep spf

# Check DKIM
dig TXT ybcopsn3zvlbcpqrfbqdu5j76za3srfa._domainkey.macroscope.info +short

# Check DMARC
dig TXT _dmarc.macroscope.info +short
```

## Expected Results

After implementing these changes:
- Emails should land in inbox, not spam
- Better deliverability rates
- Improved sender reputation
- User trust increases

Changes typically take 24-48 hours to fully propagate and for email providers to recognize improvements.