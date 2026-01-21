import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";
import peopleConfig from '@/config/people.json';

/**
 * Migration endpoint to seed people data from people.json into the database
 * 
 * NOTE: This file imports src/config/people.json which is only used for initial migration.
 * After migration, all people and preferences are stored in Supabase and managed through
 * the /api/people endpoint or Supabase dashboard.
 * 
 * This should only be run once after setting up the database.
 * 
 * Usage: POST /api/people/migrate?family_id=<family-id>
 * Or: POST /api/people/migrate (uses default family)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; message: string } | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ 
      error: 'Supabase is not configured' 
    });
  }

  try {
    // Get or create default family
    let familyId = req.query.family_id as string;
    if (!familyId) {
      const defaultFamilyName = process.env.DEFAULT_FAMILY_NAME || 'default';
      
      const { data: existingFamily } = await supabase
        .from('families')
        .select('id')
        .eq('name', defaultFamilyName)
        .maybeSingle();
      
      if (existingFamily) {
        familyId = existingFamily.id;
      } else {
        const { data: newFamily, error } = await supabase
          .from('families')
          .insert({ name: defaultFamilyName })
          .select('id')
          .single();
        
        if (error || !newFamily) {
          throw new Error(`Failed to create default family: ${error?.message || 'Unknown error'}`);
        }
        familyId = newFamily.id;
      }
    }

    // Transform people.json data to database format
    const peopleRows = (peopleConfig as any).people.map((person: any) => ({
      family_id: familyId,
      person_id: person.id,
      name: person.name,
      is_child: person.isChild || false,
      availability: person.availability ?? null,
      wfh_ability: person.wfhAbility ?? null,
    }));

    // Insert people
    const { error: peopleError } = await supabase
      .from('people')
      .upsert(peopleRows, {
        onConflict: 'family_id,person_id',
      });

    if (peopleError) {
      throw new Error(`Failed to insert people: ${peopleError.message}`);
    }

    // Insert preferences
    const preferences = (peopleConfig as any).preferences || {};
    const { error: prefsError } = await supabase
      .from('family_preferences')
      .upsert({
        family_id: familyId,
        max_mandatory_days_for_wfh_suggestion: preferences.maxMandatoryDaysForWfhSuggestion ?? 2,
      }, {
        onConflict: 'family_id',
      });

    if (prefsError) {
      throw new Error(`Failed to insert preferences: ${prefsError.message}`);
    }

    res.status(200).json({ 
      success: true, 
      message: `Successfully migrated ${peopleRows.length} people and preferences to family ${familyId}` 
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Migration failed' 
    });
  }
}

