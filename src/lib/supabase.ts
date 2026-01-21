import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
// These environment variables should be set in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars: string[] = [];
  if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  console.error(`Missing Supabase environment variables: ${missingVars.join(', ')}`);
  console.error('Please set these in your .env.local file and restart your dev server.');
}

// Create client - will be null if env vars are missing
export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Database types
export interface OverrideRow {
  id?: number;
  family_id: string;
  date: string;
  people: Record<string, 'vacation' | 'wfh' | 'activity'>;
  created_at?: string;
  updated_at?: string;
}

