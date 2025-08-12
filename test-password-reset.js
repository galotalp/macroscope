#!/usr/bin/env node

// Test script to debug password reset issues with Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ipaquntaeftocyvxoawo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwYXF1bnRhZWZ0b2N5dnhvYXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDgwODMsImV4cCI6MjA2NzkyNDA4M30.Yh4Xgulb_jo3BXbNMjxJ-4aF6oWJImGu3hQ6Pysx460';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPasswordReset(email) {
    console.log(`\nTesting password reset for: ${email}`);
    console.log('----------------------------------------');
    
    try {
        // Test with the web URL
        console.log('Attempting password reset with web URL...');
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'https://macroscope.info/reset-password'
        });
        
        if (error) {
            console.error('❌ Error:', error.message);
            console.error('Full error:', JSON.stringify(error, null, 2));
        } else {
            console.log('✅ Password reset email request sent successfully!');
            console.log('Response:', JSON.stringify(data, null, 2));
        }
        
        // Also try without redirect URL to see if that's the issue
        console.log('\nTrying without custom redirect URL...');
        const { data: data2, error: error2 } = await supabase.auth.resetPasswordForEmail(email);
        
        if (error2) {
            console.error('❌ Error without redirect:', error2.message);
        } else {
            console.log('✅ Worked without custom redirect!');
        }
        
    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

// Get email from command line or use default
const email = process.argv[2];

if (!email) {
    console.log('Usage: node test-password-reset.js <email>');
    console.log('Example: node test-password-reset.js user@example.com');
    process.exit(1);
}

testPasswordReset(email);