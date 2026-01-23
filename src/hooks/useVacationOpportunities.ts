import { useMemo } from 'react';
import { findVacationOpportunities, VacationOpportunity } from '@/utils/vacationOpportunities';
import { DayData } from '@/components/calendarTypes';

/**
 * Hook to find vacation opportunities for a given year
 */
export function useVacationOpportunities(
  year: number,
  dayDataMap: Map<string, DayData>
): VacationOpportunity[] {
  return useMemo(() => {
    if (!dayDataMap || dayDataMap.size === 0) {
      return [];
    }
    
    return findVacationOpportunities(year, dayDataMap);
  }, [year, dayDataMap]);
}

