import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Check if we have Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Check if credentials are properly set (not placeholders or empty)
const isValidUrl = supabaseUrl && 
                  supabaseUrl.trim() !== '' &&
                  supabaseUrl !== 'your-supabase-url-here' && 
                  supabaseUrl.startsWith('https://') &&
                  supabaseUrl.includes('.supabase.co');
                  
const isValidKey = supabaseKey && 
                  supabaseKey.trim() !== '' &&
                  supabaseKey !== 'your-supabase-anon-key-here' &&
                  supabaseKey.length > 20; // Basic validation for key length

export const isDemoMode = !isValidUrl || !isValidKey;

// Initialize Supabase client only if we have valid credentials
export const supabase = isDemoMode ? null : createClient(supabaseUrl!, supabaseKey!);

if (isDemoMode) {
  console.log('🔧 Running in demo mode - no valid Supabase credentials found');
  if (supabaseUrl && supabaseUrl !== 'your-supabase-url-here') {
    console.log('   Supabase URL format appears invalid:', supabaseUrl);
  }
  if (supabaseKey && supabaseKey !== 'your-supabase-anon-key-here') {
    console.log('   Supabase key format appears invalid');
  }
} else {
  console.log('🗄️  Connected to Supabase database');
}
