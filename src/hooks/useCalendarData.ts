import { useMemo, useEffect, useState } from 'react';
import { fetchAllHolidays, getHolidayName } from '@/services/openHolidaysApi';
import { HOLIDAY_COUNTRY_CODE, HOLIDAY_LANGUAGE_CODE, HOLIDAY_SUBDIVISION_CODE } from '@/utils/constants';
import { DayData, ManualOverride } from '@/components/calendarTypes';

export const useCalendarData = (
  currentYear: number,
  currentMonth: number,
  viewMode: 'monthly' | 'yearly' | 'summary',
  manualOverrides: Map<string, ManualOverride>
) => {
  const [holidaysData, setHolidaysData] = useState<{
    publicHolidays: any[];
    schoolHolidays: any[];
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
          const firstDay = new Date(currentYear, currentMonth, 1);
          const lastDay = new Date(currentYear, currentMonth + 1, 0);
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
        firstDay = new Date(currentYear, currentMonth, 1);
        lastDay = new Date(currentYear, currentMonth + 1, 0);
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

      // Detect bridge days
      for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const existing = map.get(dateStr);

        if (existing?.isPublicHoliday) continue;

        const dayOfWeek = d.getDay();
        const isFriday = dayOfWeek === 5;
        const isMonday = dayOfWeek === 1;

        if (!isFriday && !isMonday) continue;

        let hasHolidayNearby = false;

        if (isFriday) {
          const prevDate = new Date(d);
          prevDate.setDate(prevDate.getDate() - 1);
          const prevYear = prevDate.getFullYear();
          const prevMonth = String(prevDate.getMonth() + 1).padStart(2, '0');
          const prevDayNum = String(prevDate.getDate()).padStart(2, '0');
          const prevDateStr = `${prevYear}-${prevMonth}-${prevDayNum}`;
          const prevDay = map.get(prevDateStr);
          
          const nextMonday = new Date(d);
          nextMonday.setDate(nextMonday.getDate() + 3);
          const nextMondayYear = nextMonday.getFullYear();
          const nextMondayMonth = String(nextMonday.getMonth() + 1).padStart(2, '0');
          const nextMondayDay = String(nextMonday.getDate()).padStart(2, '0');
          const nextMondayStr = `${nextMondayYear}-${nextMondayMonth}-${nextMondayDay}`;
          const nextMondayDayData = map.get(nextMondayStr);

          hasHolidayNearby = prevDay?.isPublicHoliday === true || nextMondayDayData?.isPublicHoliday === true;
        }

        if (isMonday) {
          const prevFriday = new Date(d);
          prevFriday.setDate(prevFriday.getDate() - 3);
          const prevFridayYear = prevFriday.getFullYear();
          const prevFridayMonth = String(prevFriday.getMonth() + 1).padStart(2, '0');
          const prevFridayDay = String(prevFriday.getDate()).padStart(2, '0');
          const prevFridayStr = `${prevFridayYear}-${prevFridayMonth}-${prevFridayDay}`;
          const prevFridayDayData = map.get(prevFridayStr);
          
          const nextDate = new Date(d);
          nextDate.setDate(nextDate.getDate() + 1);
          const nextYear = nextDate.getFullYear();
          const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
          const nextDayNum = String(nextDate.getDate()).padStart(2, '0');
          const nextDateStr = `${nextYear}-${nextMonth}-${nextDayNum}`;
          const nextDay = map.get(nextDateStr);

          hasHolidayNearby = prevFridayDayData?.isPublicHoliday === true || nextDay?.isPublicHoliday === true;
        }

        if (hasHolidayNearby) {
          const dayData: DayData = existing || {
            date: dateStr,
            holidayName: undefined,
            isPublicHoliday: false,
            isBridgeDay: true,
            schoolStatus: 'open',
          };
          
          map.set(dateStr, {
            ...dayData,
            isBridgeDay: true,
          });
        }
      }
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

