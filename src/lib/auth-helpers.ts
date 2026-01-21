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
 * Returns the first family the user belongs to, or creates a new one
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
      .single();

    if (userFamily) {
      return userFamily.family_id;
    }

    // If no family exists, create one
    if (familyError && familyError.code === 'PGRST116') {
      const familyName = user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`;
      
      const { data: newFamily, error: createError } = await supabaseClient
        .from('families')
        .insert({ name: familyName })
        .select('id')
        .single();

      if (createError || !newFamily) {
        console.error('Failed to create family:', createError);
        return null;
      }

      // The trigger should auto-add the user as owner
      return newFamily.id;
    }

    console.error('Error fetching user family:', familyError);
    return null;
  } catch (error) {
    console.error('Error in getUserFamilyIdFromRequest:', error);
    return null;
  }
}

/**
 * Get family ID from request (for Pages Router API routes)
 * Falls back to query parameter or authenticated user's family
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
    const familyId = await getUserFamilyIdFromRequest(req);
    if (familyId) {
      return familyId;
    }
  }

  // Fallback: create/get default family (for backward compatibility)
  // This should only happen if auth is disabled or user has no family
  if (!supabase) {
    return null;
  }

  const defaultFamilyName = process.env.DEFAULT_FAMILY_NAME || 'default';
  
  const { data: existingFamily } = await supabase
    .from('families')
    .select('id')
    .eq('name', defaultFamilyName)
    .maybeSingle();
  
  if (existingFamily) {
    return existingFamily.id;
  }
  
  const { data: newFamily, error } = await supabase
    .from('families')
    .insert({ name: defaultFamilyName })
    .select('id')
    .single();
  
  if (error || !newFamily) {
    return null;
  }
  
  return newFamily.id;
}

