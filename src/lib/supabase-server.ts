import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client with authentication
 * Use this in API routes and server components
 * 
 * Note: For App Router routes, cookies are handled automatically by the client-side
 * Supabase client. This is a simplified version for basic server-side operations.
 */
export async function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.'
    );
  }

  // Create a basic client for server-side operations
  // For auth callbacks, the client-side will handle session management
  return createClient(supabaseUrl, supabaseAnonKey);
}
