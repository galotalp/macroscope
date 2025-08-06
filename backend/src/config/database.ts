import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Check if we have Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if credentials are properly set (not placeholders or empty)
const isValidUrl = supabaseUrl && 
                  supabaseUrl.trim() !== '' &&
                  supabaseUrl !== 'your-supabase-url-here' && 
                  supabaseUrl.startsWith('https://') &&
                  supabaseUrl.includes('.supabase.co');
                  
const isValidAnonKey = supabaseAnonKey && 
                      supabaseAnonKey.trim() !== '' &&
                      supabaseAnonKey !== 'your-supabase-anon-key-here' &&
                      supabaseAnonKey.length > 20;

const isValidServiceKey = supabaseServiceKey && 
                         supabaseServiceKey.trim() !== '' &&
                         supabaseServiceKey !== 'your-supabase-service-role-key-here' &&
                         supabaseServiceKey.length > 20;

// Force production mode when NODE_ENV is production, regardless of credentials
const isProduction = process.env.NODE_ENV === 'production';
export const isDemoMode = isProduction ? false : (!isValidUrl || !isValidAnonKey || !isValidServiceKey);

// Backend client using service role (bypasses RLS for your API)
export const supabase = (isDemoMode || !isValidUrl || !isValidServiceKey) ? null : createClient(supabaseUrl!, supabaseServiceKey!);

// Optional: Keep anon client for any client-side operations (if needed)
export const supabaseAnon = (isDemoMode || !isValidUrl || !isValidAnonKey) ? null : createClient(supabaseUrl!, supabaseAnonKey!);

if (isDemoMode) {
  console.log('🔧 Running in demo mode - no valid Supabase credentials found');
  if (supabaseUrl && supabaseUrl !== 'your-supabase-url-here') {
    console.log('   Supabase URL format appears invalid:', supabaseUrl);
  }
  if (!isValidAnonKey && supabaseAnonKey && supabaseAnonKey !== 'your-supabase-anon-key-here') {
    console.log('   Supabase anon key format appears invalid');
  }
  if (!isValidServiceKey) {
    console.log('   Supabase service role key missing or invalid');
  }
} else {
  console.log('🗄️  Connected to Supabase database with service role');
}
