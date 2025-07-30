// BACKEND UPDATE: Use Service Role for Database Operations
// Add this to your database.ts or create a new file

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if we have Supabase credentials
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

export const isDemoMode = !isValidUrl || !isValidAnonKey || !isValidServiceKey;

// Client for regular operations (with RLS)
export const supabase = isDemoMode ? null : createClient(supabaseUrl!, supabaseAnonKey!);

// Service role client for backend operations (bypasses RLS)
export const supabaseAdmin = isDemoMode ? null : createClient(supabaseUrl!, supabaseServiceKey!);

// Helper function to create a client with user context for RLS
export const createUserClient = (userToken) => {
  if (isDemoMode || !supabaseUrl || !supabaseAnonKey) return null;
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    }
  });
};

if (isDemoMode) {
  console.log('🔧 Running in demo mode - no valid Supabase credentials found');
} else {
  console.log('🗄️  Connected to Supabase database with service role');
}