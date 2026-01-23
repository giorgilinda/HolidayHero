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
    return supabase; // Return unauthenticated client as fallback
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Create a new client with the token
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

export interface Person {
  id: string;
  name: string;
  isChild: boolean;
  availability?: boolean;
  wfhAbility?: boolean;
}

export interface FamilyPreferences {
  maxMandatoryDaysForWfhSuggestion: number;
}

export interface PeopleData {
  people: Person[];
  preferences: FamilyPreferences;
}


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PeopleData | { error: string }>
) {
  if (!supabase) {
    return res.status(500).json({ 
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file and restart your dev server.' 
    });
  }

  try {
    // Get authenticated client (if token provided) or fallback to default
    const client = createAuthenticatedClient(req) || supabase;
    
    // Get family_id from query parameter or authenticated user
    let familyId = req.query.family_id as string;
    if (!familyId) {
      familyId = await getFamilyIdFromRequest(req, undefined, true) || '';
      
      if (!familyId) {
        return res.status(403).json({ 
          error: 'No family found. Please create or join a family first.' 
        });
      }
    }

    if (req.method === 'GET') {
      // Fetch people
      const { data: peopleRows, error: peopleError } = await client
        .from('people')
        .select('person_id, name, is_child, availability, wfh_ability')
        .eq('family_id', familyId)
        .order('is_child', { ascending: true })
        .order('name', { ascending: true });

      if (peopleError) {
        console.error('Error fetching people:', peopleError);
        return res.status(500).json({ 
          error: `Failed to fetch people: ${peopleError.message || JSON.stringify(peopleError)}` 
        });
      }

      // Fetch preferences
      const { data: preferencesRow, error: preferencesError } = await client
        .from('family_preferences')
        .select('max_mandatory_days_for_wfh_suggestion')
        .eq('family_id', familyId)
        .maybeSingle();

      if (preferencesError && preferencesError.code !== 'PGRST116') {
        console.error('Error fetching preferences:', preferencesError);
        return res.status(500).json({ 
          error: `Failed to fetch preferences: ${preferencesError.message}` 
        });
      }

      // Transform database rows to API format
      const people: Person[] = (peopleRows || []).map(row => ({
        id: row.person_id,
        name: row.name,
        isChild: row.is_child,
        availability: row.availability ?? undefined,
        wfhAbility: row.wfh_ability ?? undefined,
      }));

      const preferences: FamilyPreferences = {
        maxMandatoryDaysForWfhSuggestion: preferencesRow?.max_mandatory_days_for_wfh_suggestion ?? 2,
      };

      res.status(200).json({ people, preferences });
    } else if (req.method === 'POST') {
      const { people, preferences } = req.body as PeopleData;

      if (!Array.isArray(people)) {
        return res.status(400).json({ error: 'Invalid people format' });
      }

      // Delete existing people for this family
      const { error: deletePeopleError } = await client
        .from('people')
        .delete()
        .eq('family_id', familyId);

      if (deletePeopleError) {
        console.error('Error deleting existing people:', deletePeopleError);
      }

      // Insert new people
      if (people.length > 0) {
        const peopleRows = people.map(person => ({
          family_id: familyId,
          person_id: person.id,
          name: person.name,
          is_child: person.isChild,
          availability: person.availability ?? null,
          wfh_ability: person.wfhAbility ?? null,
        }));

        const { error: insertPeopleError } = await client
          .from('people')
          .insert(peopleRows);

        if (insertPeopleError) {
          console.error('Error inserting people:', insertPeopleError);
          return res.status(500).json({ error: 'Failed to save people' });
        }
      }

      // Upsert preferences
      const { error: upsertPrefsError } = await client
        .from('family_preferences')
        .upsert({
          family_id: familyId,
          max_mandatory_days_for_wfh_suggestion: preferences?.maxMandatoryDaysForWfhSuggestion ?? 2,
        }, {
          onConflict: 'family_id'
        });

      if (upsertPrefsError) {
        console.error('Error saving preferences:', upsertPrefsError);
        return res.status(500).json({ error: 'Failed to save preferences' });
      }

      res.status(200).json({ people, preferences: preferences || { maxMandatoryDaysForWfhSuggestion: 2 } });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in people API:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    });
  }
}

