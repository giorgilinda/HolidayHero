import { useMemo, useEffect, useState } from 'react';
import { fetchAllHolidays, getHolidayName, PublicHoliday, SchoolHoliday } from '@/services/openHolidaysApi';
import { HOLIDAY_COUNTRY_CODE, HOLIDAY_LANGUAGE_CODE, HOLIDAY_SUBDIVISION_CODE } from '@/utils/constants';
import { DayData, ManualOverride } from '@/components/calendarTypes';
import { findVacationOpportunities } from '@/utils/vacationOpportunities';

export const useCalendarData = (
  currentYear: number,
  currentMonth: number,
  viewMode: 'monthly' | 'yearly' | 'summary',
  manualOverrides: Map<string, ManualOverride>
) => {
  const [holidaysData, setHolidaysData] = useState<{
    publicHolidays: PublicHoliday[];
    schoolHolidays: SchoolHoliday[];
  } | null>(null);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  const [holidaysError, setHolidaysError] = useState<string | null>(null);

  // Fetch holidays when month/year changes or view mode changes
  useEffect(() => {
    const fetchHolidays = async () => {
      setIsLoadingHolidays(true);
      setHolidaysError(null);

      try {
        let validFrom: string;
        let validTo: string;
        
        if (viewMode === 'yearly' || viewMode === 'summary') {
          const firstDay = new Date(currentYear, 0, 1);
          const lastDay = new Date(currentYear, 11, 31);
          validFrom = firstDay.toISOString().split('T')[0];
          validTo = lastDay.toISOString().split('T')[0];
        } else {
          // For monthly view, fetch a wider range (previous month to next month)
          // to detect vacation opportunities that span across months
          const firstDay = new Date(currentYear, currentMonth - 1, 1);
          const lastDay = new Date(currentYear, currentMonth + 2, 0); // Last day of next month
          validFrom = firstDay.toISOString().split('T')[0];
          validTo = lastDay.toISOString().split('T')[0];
        }

        const holidays = await fetchAllHolidays(
          HOLIDAY_COUNTRY_CODE,
          validFrom,
          validTo,
          HOLIDAY_LANGUAGE_CODE,
          HOLIDAY_SUBDIVISION_CODE || undefined
        );

        setHolidaysData(holidays);
      } catch (error) {
        console.error('Failed to fetch holidays:', error);
        setHolidaysError(error instanceof Error ? error.message : 'Failed to fetch holidays');
      } finally {
        setIsLoadingHolidays(false);
      }
    };

    fetchHolidays();
  }, [currentMonth, currentYear, viewMode]);

  // Create a map of dates to day data for quick lookup
  const dayDataMap = useMemo(() => {
    const map = new Map<string, DayData>();

    if (holidaysData) {
      let firstDay: Date;
      let lastDay: Date;
      
      if (viewMode === 'yearly' || viewMode === 'summary') {
        firstDay = new Date(currentYear, 0, 1);
        lastDay = new Date(currentYear, 11, 31);
      } else {
        // For monthly view, we fetch wider range but only process current month for display
        // However, we need the wider range to calculate opportunities correctly
        firstDay = new Date(currentYear, currentMonth - 1, 1);
        lastDay = new Date(currentYear, currentMonth + 2, 0);
      }
      
      // Add all days in the range to the map initially
      for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        if (!map.has(dateStr)) {
          map.set(dateStr, {
            date: dateStr,
            holidayName: undefined,
            isPublicHoliday: false,
            isBridgeDay: false,
            schoolStatus: 'open',
          });
        }
      }
      
      const { publicHolidays, schoolHolidays } = holidaysData;

      // Process public holidays
      publicHolidays.forEach((holiday) => {
        const startDate = new Date(holiday.startDate);
        const endDate = new Date(holiday.endDate);
        const holidayName = getHolidayName(holiday, HOLIDAY_LANGUAGE_CODE);

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          const existing = map.get(dateStr);

          map.set(dateStr, {
            date: dateStr,
            holidayName: holidayName || existing?.holidayName,
            isPublicHoliday: true,
            isBridgeDay: existing?.isBridgeDay || false,
            schoolStatus: existing?.schoolStatus || 'open',
          });
        }
      });

      // Process school holidays
      schoolHolidays.forEach((holiday) => {
        const startDate = new Date(holiday.startDate);
        const endDate = new Date(holiday.endDate);

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          const existing = map.get(dateStr);

          map.set(dateStr, {
            date: dateStr,
            holidayName: existing?.holidayName,
            isPublicHoliday: existing?.isPublicHoliday || false,
            isBridgeDay: existing?.isBridgeDay || false,
            schoolStatus: 'closed',
          });
        }
      });

      // Mark bridge days and vacation opportunities
      // This replaces the old bridge day detection logic and is more comprehensive:
      // - Considers both public and school holidays
      // - Handles more patterns (not just Friday/Monday)
      // - Stores opportunity data for display
      const opportunities = findVacationOpportunities(currentYear, map);
      
      // Create a map of date strings to opportunities for quick lookup
      const opportunityMap = new Map<string, typeof opportunities[0]>();
      opportunities.forEach(opp => {
        opp.ptoDays.forEach(ptoDate => {
          const year = ptoDate.getFullYear();
          const month = String(ptoDate.getMonth() + 1).padStart(2, '0');
          const day = String(ptoDate.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          // Store the opportunity with highest efficiency if multiple exist
          const existing = opportunityMap.get(dateStr);
          if (!existing || opp.efficiency > existing.efficiency) {
            opportunityMap.set(dateStr, opp);
          }
        });
      });
      
      // Mark bridge days and store opportunity data
      opportunityMap.forEach((opportunity, dateStr) => {
        const existing = map.get(dateStr);
        
        // Only mark as bridge day if it's not already a public holiday
        if (existing && !existing.isPublicHoliday) {
          map.set(dateStr, {
            ...existing,
            isBridgeDay: true,
            vacationOpportunity: {
              ptoDaysCount: opportunity.ptoDaysCount,
              totalVacationDays: opportunity.totalVacationDays,
              efficiency: opportunity.efficiency,
              description: opportunity.description,
            },
          });
        } else if (!existing) {
          // Create new entry if it doesn't exist
          map.set(dateStr, {
            date: dateStr,
            holidayName: undefined,
            isPublicHoliday: false,
            isBridgeDay: true,
            schoolStatus: 'open',
            vacationOpportunity: {
              ptoDaysCount: opportunity.ptoDaysCount,
              totalVacationDays: opportunity.totalVacationDays,
              efficiency: opportunity.efficiency,
              description: opportunity.description,
            },
          });
        }
      });
    }

    // Apply manual overrides
    manualOverrides.forEach((override, dateStr) => {
      const existing = map.get(dateStr);
      if (existing) {
        map.set(dateStr, {
          ...existing,
          manualOverride: override,
        });
      } else {
        map.set(dateStr, {
          date: dateStr,
          holidayName: undefined,
          isPublicHoliday: false,
          isBridgeDay: false,
          schoolStatus: 'open',
          manualOverride: override,
        });
      }
    });

    return map;
  }, [holidaysData, currentMonth, currentYear, manualOverrides, viewMode]);

  return { dayDataMap, isLoadingHolidays, holidaysError, holidaysData };
};

