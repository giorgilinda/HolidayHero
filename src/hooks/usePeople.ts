import { useState, useEffect } from 'react';
import { Person } from '@/components/DayEditDialog';
import { supabaseClient } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';

export interface FamilyPreferences {
  maxMandatoryDaysForWfhSuggestion: number;
}

export interface PeopleData {
  people: Person[];
  preferences: FamilyPreferences;
}

export const usePeople = (familyId?: string) => {
  const [people, setPeople] = useState<Person[]>([]);
  const [preferences, setPreferences] = useState<FamilyPreferences>({
    maxMandatoryDaysForWfhSuggestion: 2,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getFamilyId } = useAuth();

  useEffect(() => {
    const fetchPeople = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get family ID from auth if not provided
        let targetFamilyId = familyId;
        if (!targetFamilyId) {
          targetFamilyId = await getFamilyId() || undefined;
        }

        if (!targetFamilyId) {
          setError('No family ID available');
          setIsLoading(false);
          return;
        }

        // Fetch people directly from Supabase
        const { data: peopleRows, error: peopleError } = await supabaseClient
          .from('people')
          .select('person_id, name, is_child, availability, wfh_ability')
          .eq('family_id', targetFamilyId)
          .order('is_child', { ascending: true })
          .order('name', { ascending: true });

        if (peopleError) {
          throw new Error(`Failed to fetch people: ${peopleError.message}`);
        }

        // Fetch preferences
        const { data: preferencesRow, error: preferencesError } = await supabaseClient
          .from('family_preferences')
          .select('max_mandatory_days_for_wfh_suggestion')
          .eq('family_id', targetFamilyId)
          .maybeSingle();

        if (preferencesError && preferencesError.code !== 'PGRST116') {
          throw new Error(`Failed to fetch preferences: ${preferencesError.message}`);
        }

        // Transform database rows to API format
        const transformedPeople: Person[] = (peopleRows || []).map(row => ({
          id: row.person_id,
          name: row.name,
          isChild: row.is_child,
          availability: row.availability ?? undefined,
          wfhAbility: row.wfh_ability ?? undefined,
        }));

        const transformedPreferences: FamilyPreferences = {
          maxMandatoryDaysForWfhSuggestion: preferencesRow?.max_mandatory_days_for_wfh_suggestion ?? 2,
        };

        setPeople(transformedPeople);
        setPreferences(transformedPreferences);
      } catch (err) {
        console.error('Failed to fetch people:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch people');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPeople();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]); // Removed getFamilyId from dependencies to prevent infinite loop

  return { people, preferences, isLoading, error };
};

