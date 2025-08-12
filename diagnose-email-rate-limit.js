#!/usr/bin/env node

// Diagnose Supabase email rate limit issue
const fs = require('fs');

// We'll create a simple test to understand the rate limit better
console.log('Supabase Email Rate Limit Diagnostic');
console.log('=====================================');

// Check if we can get more details about the rate limit
console.log('\nPossible causes of rate limit:');
console.log('1. 30 emails/hour project limit (free plan)');
console.log('2. Multiple signup attempts in short period');
console.log('3. Password reset attempts from testing');
console.log('4. Email change requests');
console.log('5. Manual email triggers from dashboard');

console.log('\nSolutions:');
console.log('1. Wait for rate limit reset (1 hour from first email)');
console.log('2. Upgrade to Supabase Pro ($25/month = 100+ emails/hour)');
console.log('3. Implement custom email verification system');
console.log('4. Add registration throttling client-side');

console.log('\nTo check Supabase billing/usage:');
console.log('https://supabase.com/dashboard/project/ipaquntaeftocyvxoawo/settings/billing');

console.log('\nTo see email logs in Supabase:');
console.log('https://supabase.com/dashboard/project/ipaquntaeftocyvxoawo/logs/auth-logs');

// Create a simple rate limit checker
const rateLimitInfo = {
    timestamp: new Date().toISOString(),
    issue: 'email_rate_limit_exceeded',
    possibleCauses: [
        'Testing password reset multiple times',
        'Multiple registration attempts',
        'Free plan 30 emails/hour limit'
    ],
    nextSteps: [
        'Check Supabase auth logs',
        'Wait 1 hour for reset',
        'Consider Pro plan upgrade',
        'Implement custom email system'
    ]
};

fs.writeFileSync('rate-limit-diagnosis.json', JSON.stringify(rateLimitInfo, null, 2));
console.log('\nDiagnosis saved to rate-limit-diagnosis.json');