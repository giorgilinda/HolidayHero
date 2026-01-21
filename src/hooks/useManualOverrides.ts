import { useState, useEffect } from 'react';
import { ManualOverride, PersonConfig } from '@/components/calendarTypes';
import { Person } from '@/components/DayEditDialog';
import { usePeople } from './usePeople';
import { supabaseClient } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';

interface HolidaysData {
  publicHolidays: any[];
  schoolHolidays: any[];
}

export const useManualOverrides = (initialHolidaysData: HolidaysData | null, familyId?: string) => {
  const [holidaysData, setHolidaysData] = useState<HolidaysData | null>(initialHolidaysData);
  const [manualOverrides, setManualOverrides] = useState<Map<string, ManualOverride>>(new Map());
  const [isOverridesLoaded, setIsOverridesLoaded] = useState(false);
  const [deletedDates, setDeletedDates] = useState<Set<string>>(new Set());
  const { getFamilyId } = useAuth();
  const { people, isLoading: isLoadingPeople } = usePeople(familyId);

  // Load deleted dates from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('holidayHero_deletedDates');
      if (saved) {
        const dates = JSON.parse(saved) as string[];
        setDeletedDates(new Set(dates));
      }
    } catch (error) {
      console.error('Failed to load deleted dates:', error);
    }
  }, []);

  // Save deleted dates to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('holidayHero_deletedDates', JSON.stringify(Array.from(deletedDates)));
    } catch (error) {
      console.error('Failed to save deleted dates:', error);
    }
  }, [deletedDates]);

  // Load manual overrides from database on mount
  useEffect(() => {
    const loadOverrides = async () => {
      try {
        // Get family ID from auth if not provided
        let targetFamilyId = familyId;
        if (!targetFamilyId) {
          targetFamilyId = await getFamilyId() || undefined;
        }

        if (!targetFamilyId) {
          setIsOverridesLoaded(true);
          return;
        }

        // Fetch overrides directly from Supabase
        const { data: overrides, error } = await supabaseClient
          .from('overrides')
          .select('date, people')
          .eq('family_id', targetFamilyId)
          .order('date', { ascending: true });

        if (error) {
          console.error('Failed to load overrides:', error);
          setIsOverridesLoaded(true);
          return;
        }

        const overrideMap = new Map<string, ManualOverride>();
        if (overrides && Array.isArray(overrides)) {
          overrides.forEach((row) => {
            overrideMap.set(row.date, {
              date: row.date,
              people: row.people as Record<string, 'vacation' | 'wfh' | 'activity'>,
            });
          });
        }
        setManualOverrides(overrideMap);
        setIsOverridesLoaded(true);
      } catch (error) {
        console.error('Failed to load manual overrides:', error);
        setIsOverridesLoaded(true);
      }
    };
    loadOverrides();
  }, [familyId, getFamilyId]);

  // Auto-generate overrides for school holidays
  useEffect(() => {
    if (!holidaysData || !isOverridesLoaded || isLoadingPeople) return;

    setManualOverrides(prev => {
      const newOverrides = new Map(prev);
      let hasChanges = false;

      const publicHolidayDates = new Set<string>();
      holidaysData.publicHolidays.forEach((holiday) => {
        const startDate = new Date(holiday.startDate);
        const endDate = new Date(holiday.endDate);
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          publicHolidayDates.add(dateStr);
        }
      });

      holidaysData.schoolHolidays.forEach((holiday) => {
        const startDate = new Date(holiday.startDate);
        const endDate = new Date(holiday.endDate);

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;

          if (publicHolidayDates.has(dateStr) || deletedDates.has(dateStr)) {
            continue;
          }

          const existing = newOverrides.get(dateStr);
          const newOverride: ManualOverride = existing || {
            date: dateStr,
            people: {},
          };

          const children = people.filter((p: PersonConfig) => p.isChild === true);
          children.forEach((child: PersonConfig) => {
            if (!newOverride.people[child.id]) {
              newOverride.people[child.id] = 'activity';
              hasChanges = true;
            }
          });

          if (hasChanges || !existing) {
            newOverrides.set(dateStr, newOverride);
          }
        }
      });

      return hasChanges ? newOverrides : prev;
    });
  }, [holidaysData, isOverridesLoaded, people, deletedDates, isLoadingPeople]);

  // Save manual overrides to database whenever they change (but not on initial load)
  useEffect(() => {
    if (!isOverridesLoaded) return;
    
    const saveOverrides = async () => {
      try {
        // Get family ID from auth
        let targetFamilyId = familyId;
        if (!targetFamilyId) {
          console.log('No familyId provided, fetching from auth...');
          targetFamilyId = await getFamilyId() || undefined;
        }
        
        if (!targetFamilyId) {
          console.error('No family ID available for saving overrides. User might not be linked to a family.');
          console.error('Please ensure:');
          console.error('1. You are logged in');
          console.error('2. You are linked to a family in the user_families table');
          console.error('3. The authentication migration has been run');
          return;
        }
        
        console.log('Saving overrides for family:', targetFamilyId);

        const overridesArray = Array.from(manualOverrides.values());

        if (overridesArray.length > 0) {
          const overrideRows = overridesArray.map(override => ({
            family_id: targetFamilyId,
            date: override.date,
            people: override.people,
          }));

          // Use upsert to handle duplicates (INSERT ... ON CONFLICT UPDATE)
          // This will insert new overrides or update existing ones based on the unique constraint (family_id, date)
          const { error: upsertError } = await supabaseClient
            .from('overrides')
            .upsert(overrideRows, {
              onConflict: 'family_id,date',
              ignoreDuplicates: false,
            });

          if (upsertError) {
            const upsertErrorMessage = upsertError.message || upsertError.details || upsertError.hint || upsertError.code || 'Unknown error';
            console.error('=== Failed to save overrides ===');
            console.error('Error message:', upsertErrorMessage);
            console.error('Error code:', upsertError.code);
            console.error('Family ID:', targetFamilyId);
            console.error('Number of overrides:', overridesArray.length);
            console.error('Full error:', upsertError);
            console.error('===============================');
            
            // Check for common RLS errors
            const errorString = upsertErrorMessage.toLowerCase();
            if (errorString.includes('permission') || errorString.includes('policy') || errorString.includes('rls')) {
              console.error('This appears to be an RLS (Row Level Security) error. Please ensure:');
              console.error('1. The authentication migration (003_add_authentication.sql) has been run');
              console.error('2. You are properly linked to the family in user_families table');
              console.error('3. RLS policies are correctly configured');
            }
          } else {
            console.log('Successfully saved', overridesArray.length, 'overrides');
          }
        } else {
          // If no overrides, delete all existing ones for this family
          const { error: deleteError } = await supabaseClient
            .from('overrides')
            .delete()
            .eq('family_id', targetFamilyId);

          if (deleteError) {
            const deleteErrorMessage = deleteError.message || deleteError.details || deleteError.hint || deleteError.code || 'Unknown error';
            console.error('Error deleting existing overrides:', {
              message: deleteErrorMessage,
              code: deleteError.code,
              fullError: deleteError,
            });
          } else {
            console.log('Cleared all overrides for family');
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to save manual overrides:', {
          message: errorMessage,
          error,
        });
      }
    };
    
    saveOverrides();
  }, [manualOverrides, isOverridesLoaded, familyId, getFamilyId]);

  const handleSaveOverride = (override: ManualOverride) => {
    setManualOverrides(prev => {
      const newMap = new Map(prev);
      newMap.set(override.date, override);
      return newMap;
    });
    
    setDeletedDates(prev => {
      const newSet = new Set(prev);
      newSet.delete(override.date);
      return newSet;
    });
  };

  const handleDeleteOverride = (dateStr: string) => {
    setManualOverrides(prev => {
      const newMap = new Map(prev);
      newMap.delete(dateStr);
      return newMap;
    });
    
    setDeletedDates(prev => {
      const newSet = new Set(prev);
      newSet.add(dateStr);
      return newSet;
    });
  };

  return {
    manualOverrides,
    setManualOverrides,
    isOverridesLoaded,
    deletedDates,
    people,
    handleSaveOverride,
    handleDeleteOverride,
    setHolidaysDataForOverrides: setHolidaysData,
  };
};

