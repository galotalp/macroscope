import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Supabase configuration - using the same credentials as your backend
const supabaseUrl = 'https://ipaquntaeftocyvxoawo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwYXF1bnRhZWZ0b2N5dnhvYXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDgwODMsImV4cCI6MjA2NzkyNDA4M30.Yh4Xgulb_jo3BXbNMjxJ-4aF6oWJImGu3hQ6Pysx460'

// Create Supabase client with React Native AsyncStorage for session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Database types (you can generate these with Supabase CLI: npx supabase gen types typescript)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          email: string
          bio?: string
          profile_picture?: string
          created_at: string
          email_verified: boolean
        }
        Insert: {
          username: string
          email: string
          bio?: string
          profile_picture?: string
        }
        Update: {
          username?: string
          bio?: string
          profile_picture?: string
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          description?: string
          created_by: string
          created_at: string
        }
        Insert: {
          name: string
          description?: string
          created_by: string
        }
        Update: {
          name?: string
          description?: string
        }
      }
      group_memberships: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: 'admin' | 'member'
          created_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          role: 'admin' | 'member'
        }
        Update: {
          role?: 'admin' | 'member'
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description?: string
          group_id: string
          priority?: string
          notes?: string
          created_at: string
          created_by: string
        }
        Insert: {
          name: string
          description?: string
          group_id: string
          priority?: string
          notes?: string
          created_by: string
        }
        Update: {
          name?: string
          description?: string
          priority?: string
          notes?: string
        }
      }
    }
  }
}