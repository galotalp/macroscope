# Supabase Password Reset Rate Limits - Solutions

## Why Rate Limits Exist
Supabase enforces rate limits on password reset emails to:
- Prevent email bombing attacks
- Reduce costs from spam
- Protect users from harassment

## Current Limits
- **4 password reset emails per hour per email address**
- **30 total password reset emails per hour per project**

## Solutions

### 1. Immediate Fix - Wait and Retry
The rate limit resets hourly. If a user hits the limit:
- They need to wait up to 60 minutes
- The exact wait time depends on when they first requested

### 2. Better User Experience - Add Rate Limit Handling

Update the UI to handle rate limits gracefully:

```typescript
// In ForgotPasswordScreen.tsx
const handleForgotPassword = async () => {
  try {
    await supabaseService.forgotPassword(email);
    // Success
  } catch (error) {
    if (error.message.includes('rate limit')) {
      setSnackbarMessage(
        'You\'ve requested too many password resets. Please wait an hour and try again, or contact support.'
      );
      // Optionally store timestamp in AsyncStorage to show countdown
    }
  }
};
```

### 3. Implement Client-Side Throttling

Prevent users from hitting the rate limit:

```typescript
// Add to supabaseService.ts
private static lastPasswordResetAttempts: Map<string, number[]> = new Map();

async forgotPassword(email: string) {
  // Check client-side rate limit first
  const now = Date.now();
  const attempts = this.lastPasswordResetAttempts.get(email) || [];
  
  // Remove attempts older than 1 hour
  const recentAttempts = attempts.filter(time => now - time < 3600000);
  
  if (recentAttempts.length >= 3) {
    const oldestAttempt = recentAttempts[0];
    const waitTime = Math.ceil((3600000 - (now - oldestAttempt)) / 60000);
    throw new Error(`Please wait ${waitTime} minutes before requesting another password reset.`);
  }
  
  // Proceed with reset
  const result = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://macroscope.info/reset-password'
  });
  
  // Record the attempt
  recentAttempts.push(now);
  this.lastPasswordResetAttempts.set(email, recentAttempts);
  
  return result;
}
```

### 4. Alternative - Custom Password Reset System

If rate limits are a persistent issue, implement a custom system:

1. **Custom endpoint** that generates reset tokens
2. **Store in database** with expiration
3. **Send via SES directly** (no Supabase rate limits)
4. **Custom reset page** to handle the token

### 5. For Testing - Use Different Emails

During development:
- Use multiple test email addresses
- Wait between tests
- Use a staging environment with separate limits

## Recommended Approach

1. **Implement client-side throttling** to prevent hitting limits
2. **Show clear error messages** when limits are hit
3. **Add a "Contact Support" option** for urgent cases
4. **Consider custom implementation** if this becomes a frequent issue

## Check Current Rate Limit Status

You can't directly query the remaining rate limit, but you can:
- Track attempts client-side
- Monitor Supabase logs for rate limit errors
- Implement exponential backoff in your retry logic