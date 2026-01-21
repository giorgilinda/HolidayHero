import { useMemo } from 'react';
import { usePeople, FamilyPreferences } from './usePeople';
import { Person } from '@/components/DayEditDialog';

export interface UserPreferences {
  adultAvailability: Record<string, boolean>;
  adultWfhAbilities: Record<string, boolean>;
  maxMandatoryDaysForWfhSuggestion: number;
}

/**
 * Hook to get user preferences from the database
 * Transforms people data into the format expected by the calendar components
 */
export const useUserPreferences = (familyId?: string): UserPreferences => {
  const { people, preferences } = usePeople(familyId);

  return useMemo(() => {
    const adultAvailability: Record<string, boolean> = {};
    const adultWfhAbilities: Record<string, boolean> = {};

    people.forEach((person: Person) => {
      if (!person.isChild) {
        if (person.availability !== undefined) {
          adultAvailability[person.id] = person.availability;
        }
        if (person.wfhAbility !== undefined) {
          adultWfhAbilities[person.id] = person.wfhAbility;
        }
      }
    });

    return {
      adultAvailability,
      adultWfhAbilities,
      maxMandatoryDaysForWfhSuggestion: preferences.maxMandatoryDaysForWfhSuggestion,
    };
  }, [people, preferences]);
};

