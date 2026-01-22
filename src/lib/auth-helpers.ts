import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { NextApiRequest } from 'next';

/**
 * Create a Supabase client with session from request (for Pages Router API routes)
 */
function createClientFromRequest(req: NextApiRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  // Get access token from cookies or Authorization header
  const accessToken = req.cookies['sb-access-token'] || 
                     req.headers.authorization?.replace('Bearer ', '');

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken ? {
        Authorization: `Bearer ${accessToken}`,
      } : {},
    },
  });

  return client;
}

/**
 * Get the authenticated user's family ID from request
 * Returns the first family the user belongs to, or null if no family exists
 * Users must create or join a family through the UI - no auto-creation
 */
export async function getUserFamilyIdFromRequest(req: NextApiRequest): Promise<string | null> {
  try {
    const supabaseClient = createClientFromRequest(req);
    
    if (!supabaseClient) {
      return null;
    }

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('No authenticated user:', userError);
      return null;
    }

    // Get user's first family
    const { data: userFamily, error: familyError } = await supabaseClient
      .from('user_families')
      .select('family_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (familyError) {
      // If no family found (PGRST116), return null - user must create/join a family
      if (familyError.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching user family:', familyError);
      return null;
    }

    return userFamily?.family_id || null;
  } catch (error) {
    console.error('Error in getUserFamilyIdFromRequest:', error);
    return null;
  }
}

/**
 * Get family ID from request (for Pages Router API routes)
 * Returns query parameter or authenticated user's family, or null if not found
 * No default family fallback - users must have a real family
 */
export async function getFamilyIdFromRequest(
  req: NextApiRequest,
  queryFamilyId?: string,
  useAuth: boolean = true
): Promise<string | null> {
  // If family_id is provided in query, use it (for admin/testing)
  if (queryFamilyId) {
    return queryFamilyId;
  }

  // Otherwise, get from authenticated user
  if (useAuth) {
    return await getUserFamilyIdFromRequest(req);
  }

  // No fallback - return null if no family found
  return null;
}

