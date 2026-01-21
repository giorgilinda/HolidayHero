import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";
import { getFamilyIdFromRequest } from "@/lib/auth-helpers";

type Override = {
  date: string;
  people: Record<string, 'vacation' | 'wfh' | 'activity'>; // Map of person ID to type
};

type OverridesData = {
  overrides: Override[];
};

// Helper to create authenticated Supabase client from request
function createAuthenticatedClient(req: NextApiRequest) {
  if (!supabase) {
    return null;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return supabase; // Return unauthenticated client as fallback
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Create a new client with the token
  const { createClient } = require('@supabase/supabase-js');
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OverridesData | { error: string }>
) {
  // Check if Supabase is configured
  if (!supabase) {
    console.error('Supabase client is null - environment variables may not be set');
    return res.status(500).json({ 
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file and restart your dev server.' 
    });
  }

  console.log('Supabase client initialized, processing request...');

  try {
    // Get authenticated client (if token provided) or fallback to default
    const client = createAuthenticatedClient(req) || supabase;
    
    // Get family_id from query parameter, authenticated user, or default
    let familyId = req.query.family_id as string;
    if (!familyId) {
      familyId = await getFamilyIdFromRequest(req, undefined, true) || '';
      
      if (!familyId) {
        // Fallback to default family (for backward compatibility)
        const defaultFamilyName = process.env.DEFAULT_FAMILY_NAME || 'default';
        const { data: existingFamily } = await client
          .from('families')
          .select('id')
          .eq('name', defaultFamilyName)
          .maybeSingle();
        
        if (existingFamily) {
          familyId = existingFamily.id;
        } else {
          const { data: newFamily, error } = await client
            .from('families')
            .insert({ name: defaultFamilyName })
            .select('id')
            .single();
          
          if (error || !newFamily) {
            return res.status(500).json({ 
              error: `Failed to initialize family: ${error?.message || 'Unknown error'}` 
            });
          }
          familyId = newFamily.id;
        }
      }
    }
    
    if (req.method === 'GET') {
      try {
        console.log(`Fetching overrides for family_id: ${familyId}`);
        const { data: overrides, error } = await client
          .from('overrides')
          .select('date, people')
          .eq('family_id', familyId)
          .order('date', { ascending: true });
        
        if (error) {
          console.error('Error fetching overrides:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          return res.status(500).json({ 
            error: `Failed to fetch overrides: ${error.message || JSON.stringify(error)}` 
          });
        }
        
        console.log(`Successfully fetched ${overrides?.length || 0} overrides`);
        
        // Transform database rows to API format
        const transformedOverrides: Override[] = (overrides || []).map(row => ({
          date: row.date,
          people: row.people as Record<string, 'vacation' | 'wfh' | 'activity'>,
        }));
        
        res.status(200).json({ overrides: transformedOverrides });
      } catch (error) {
        console.error('Error reading overrides:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({ 
          error: `Failed to fetch overrides: ${errorMessage}` 
        });
      }
  } else if (req.method === 'POST') {
    try {
      const { overrides } = req.body as OverridesData;
      
      if (!Array.isArray(overrides)) {
        return res.status(400).json({ error: 'Invalid overrides format' });
      }

      // Delete all existing overrides for this family
      const { error: deleteError } = await client
        .from('overrides')
        .delete()
        .eq('family_id', familyId);
      
      if (deleteError) {
        console.error('Error deleting existing overrides:', deleteError);
        // Continue anyway - might be first time
      }
      
      // Insert new overrides
      if (overrides.length > 0) {
        const overrideRows = overrides.map(override => ({
          family_id: familyId,
          date: override.date,
          people: override.people,
        }));
        
        const { error: insertError } = await client
          .from('overrides')
          .insert(overrideRows);
        
        if (insertError) {
          console.error('Error inserting overrides:', insertError);
          return res.status(500).json({ error: 'Failed to save overrides' });
        }
      }
      
      res.status(200).json({ overrides });
    } catch (error) {
      console.error('Error saving overrides:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to save overrides' 
      });
    }
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in overrides API:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    });
  }
}

