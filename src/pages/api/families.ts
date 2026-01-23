import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getFamilyIdFromRequest } from "@/lib/auth-helpers";

// Helper to create authenticated Supabase client from request
function createAuthenticatedClient(req: NextApiRequest) {
  if (!supabase) {
    return null;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return supabase;
  }

  const token = authHeader.replace('Bearer ', '');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
}

export interface Family {
  id: string;
  name: string;
  created_at?: string;
  invite_code?: string;
  is_public?: boolean;
  allow_public_join?: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Family[] | { error: string }>
) {
  if (!supabase) {
    return res.status(500).json({ 
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file and restart your dev server.' 
    });
  }

  try {
    const client = createAuthenticatedClient(req) || supabase;

    if (req.method === 'GET') {
      // Check if fetching by family ID
      const familyId = req.query.family_id as string;
      if (familyId && familyId.trim().length > 0) {
        // Get family by ID (for authenticated users to see their own family)
        const { data: family, error } = await client
          .from('families')
          .select('id, name, created_at, invite_code, is_public, allow_public_join')
          .eq('id', familyId)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching family by ID:', error);
          return res.status(500).json({ 
            error: `Failed to fetch family: ${error.message}` 
          });
        }
        
        if (family) {
          return res.status(200).json([family]);
        } else {
          return res.status(404).json({ error: 'Family not found' });
        }
      }
      
      // Check if searching by invite code or by name
      const inviteCode = req.query.inviteCode as string;
      const searchQuery = req.query.search as string;
      
      if (inviteCode && inviteCode.trim().length > 0) {
        // Search by invite code (exact match, case-insensitive)
        // This needs to work for all families (even private ones) since invite codes
        // are the way to join private families
        
        // Try using RPC function first (bypasses RLS)
        let rpcFamily: Family[] | null = null;
        let rpcError: { message: string } | null = null;
        
        try {
          const rpcResult = await client.rpc('find_family_by_invite_code', {
            invite_code_param: inviteCode.trim()
          });
          rpcFamily = rpcResult.data as Family[] | null;
          rpcError = rpcResult.error;
        } catch (err) {
          // RPC function might not exist yet (migration not run)
          console.warn('RPC function not available or error:', err instanceof Error ? err.message : String(err));
          rpcError = { message: 'RPC function not available' };
        }
        
        if (!rpcError && rpcFamily && rpcFamily.length > 0) {
          // RPC function worked, return the family
          console.log('Found family via RPC function:', rpcFamily[0].name, rpcFamily[0].id);
          return res.status(200).json(rpcFamily);
        }
        
        // If RPC failed but it's just because function doesn't exist, continue to fallback
        if (rpcError && !rpcError.message?.includes('not available') && !rpcError.message?.includes('does not exist')) {
          console.error('RPC function error:', rpcError);
        }
        
        // Fallback to direct query (may be blocked by RLS)
        const { data: family, error } = await client
          .from('families')
          .select('id, name, created_at, invite_code, is_public, allow_public_join')
          .ilike('invite_code', inviteCode.trim())
          .maybeSingle();

        if (error) {
          console.error('Error searching family by invite code:', {
            error,
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            inviteCode: inviteCode.trim(),
            rpcError: rpcError?.message
          });
          
          // If RLS blocks it, return empty array instead of 500 error
          // This allows the UI to show "No family found" instead of an error
          if (error.code === '42501' || 
              error.message?.includes('row-level security') || 
              error.message?.includes('RLS') ||
              error.message?.includes('permission denied')) {
            console.warn('RLS blocked invite code lookup. Please run migration 007 to enable invite code lookup via RPC function.');
            return res.status(200).json([]);
          }
          
          // For other errors, still return empty array to avoid breaking the UI
          // Log the error for debugging
          console.error('Unexpected error in invite code lookup, returning empty:', error);
          return res.status(200).json([]);
        }

        // Log for debugging
        if (!family) {
          console.log('No family found with invite code:', inviteCode.trim());
        } else {
          console.log('Found family with invite code:', family.name, family.id);
        }

        return res.status(200).json(family ? [family] : []);
      } else if (searchQuery && searchQuery.trim().length > 0) {
        // Check if checking for exact name match (for duplicate checking)
        const checkExact = req.query.exact === 'true';
        
        if (checkExact) {
          // For exact match checking (duplicate prevention), use a database function
          // that bypasses RLS. This is needed because families are private by default
          const { data: result, error } = await client.rpc('check_family_name_exists', {
            family_name: searchQuery.trim()
          });
          
          if (error) {
            console.error('Error checking family name via RPC:', error);
            // If the function doesn't exist yet, fall back to direct query
            // (This handles the case where migration hasn't been run)
            const { data: family, error: fallbackError } = await client
              .from('families')
              .select('id, name')
              .ilike('name', searchQuery.trim())
              .maybeSingle();
            
            if (fallbackError) {
              // If RLS blocks it, return empty array (don't block signup)
              // The database constraint will prevent duplicates anyway
              if (fallbackError.code === '42501' || fallbackError.message?.includes('row-level security') || fallbackError.message?.includes('RLS')) {
                console.warn('RLS blocked family name check, but database constraint will prevent duplicates');
                return res.status(200).json([]);
              }
              return res.status(500).json({ 
                error: `Failed to check family name: ${fallbackError.message}` 
              });
            }
            
            return res.status(200).json(family ? [family] : []);
          }
          
          // The RPC function returns an array, so check if it has any results
          return res.status(200).json(result && result.length > 0 ? result : []);
        } else {
          // Search for public families by name (case-insensitive)
          // Only show families that are marked as public
          const { data: families, error } = await client
            .from('families')
            .select('id, name, created_at, invite_code, is_public, allow_public_join')
            .eq('is_public', true)
            .ilike('name', `%${searchQuery.trim()}%`)
            .limit(10)
            .order('name', { ascending: true });

          if (error) {
            console.error('Error searching families:', error);
            return res.status(500).json({ 
              error: `Failed to search families: ${error.message}` 
            });
          }

          return res.status(200).json(families || []);
        }
      } else {
        // Return empty array if no search query
        return res.status(200).json([]);
      }
    } else if (req.method === 'POST') {
      // Create a new family
      const { name } = req.body as { name: string };

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Family name is required' });
      }

      // Get authenticated user's family ID (will create one if needed)
      const familyId = await getFamilyIdFromRequest(req, undefined, true);

      if (familyId) {
        // User already has a family, return it
        const { data: existingFamily } = await client
          .from('families')
          .select('id, name, created_at')
          .eq('id', familyId)
          .single();

        if (existingFamily) {
          return res.status(200).json([existingFamily]);
        }
      }

      // Create new family with invite code
      // Generate a random 8-character invite code
      const generateInviteCode = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };
      
      let inviteCode = generateInviteCode();
      let attempts = 0;
      // Ensure unique invite code (retry if collision)
      while (attempts < 10) {
        const { data: existing } = await client
          .from('families')
          .select('id')
          .eq('invite_code', inviteCode)
          .maybeSingle();
        
        if (!existing) break;
        inviteCode = generateInviteCode();
        attempts++;
      }
      
      // Create new family (private by default, with invite code)
      const { data: newFamily, error: createError } = await client
        .from('families')
        .insert({ 
          name: name.trim(),
          invite_code: inviteCode,
          is_public: false,
          allow_public_join: false
        })
        .select('id, name, created_at, invite_code, is_public, allow_public_join')
        .single();

      if (createError || !newFamily) {
        console.error('Error creating family:', createError);
        return res.status(500).json({ 
          error: `Failed to create family: ${createError?.message || 'Unknown error'}` 
        });
      }

      return res.status(201).json([newFamily]);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in families API:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    });
  }
}

