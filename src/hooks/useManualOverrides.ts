import { useState, useEffect } from 'react';
import { ManualOverride, PersonConfig } from '@/components/calendarTypes';
import { Person } from '@/components/DayEditDialog';
import peopleConfig from '@/config/people.json';

interface HolidaysData {
  publicHolidays: any[];
  schoolHolidays: any[];
}

export const useManualOverrides = (initialHolidaysData: HolidaysData | null) => {
  const [holidaysData, setHolidaysData] = useState<HolidaysData | null>(initialHolidaysData);
  const [manualOverrides, setManualOverrides] = useState<Map<string, ManualOverride>>(new Map());
  const [isOverridesLoaded, setIsOverridesLoaded] = useState(false);
  const [deletedDates, setDeletedDates] = useState<Set<string>>(new Set());
  const [people] = useState<Person[]>(peopleConfig.people as PersonConfig[]);

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

  // Load manual overrides from API on mount
  useEffect(() => {
    const loadOverrides = async () => {
      try {
        const response = await fetch('/api/overrides');
        if (response.ok) {
          const data = await response.json();
          const overrideMap = new Map<string, ManualOverride>();
          if (data.overrides && Array.isArray(data.overrides)) {
            data.overrides.forEach((override: ManualOverride) => {
              overrideMap.set(override.date, override);
            });
          }
          setManualOverrides(overrideMap);
          setIsOverridesLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load manual overrides:', error);
        setIsOverridesLoaded(true);
      }
    };
    loadOverrides();
  }, []);

  // Auto-generate overrides for school holidays
  useEffect(() => {
    if (!holidaysData || !isOverridesLoaded) return;

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
  }, [holidaysData, isOverridesLoaded, people, deletedDates]);

  // Save manual overrides to API whenever they change (but not on initial load)
  useEffect(() => {
    if (!isOverridesLoaded) return;
    
    const saveOverrides = async () => {
      try {
        const overridesArray = Array.from(manualOverrides.values());
        const response = await fetch('/api/overrides', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ overrides: overridesArray }),
        });
        if (!response.ok) {
          console.error('Failed to save overrides to file');
        }
      } catch (error) {
        console.error('Failed to save manual overrides:', error);
      }
    };
    
    saveOverrides();
  }, [manualOverrides, isOverridesLoaded]);

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

