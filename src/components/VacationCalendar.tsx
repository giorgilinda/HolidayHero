"use client";

import React, { useMemo, useState, useEffect } from 'react';
import classNames from "classnames";
import styles from './VacationCalendar.module.css'
import { calculateDayRating, DayContext } from '@/utils/brain';
import { fetchAllHolidays, getHolidayName, type PublicHoliday, type SchoolHoliday } from '@/services/openHolidaysApi';
import { HOLIDAY_COUNTRY_CODE, HOLIDAY_LANGUAGE_CODE, HOLIDAY_SUBDIVISION_CODE } from '@/utils/constants';
import { userPreferences } from '@/config/userPreferences';

interface DayData {
  date: string;
  holidayName?: string | null;
  isPublicHoliday: boolean;
  isBridgeDay: boolean;
  schoolStatus: 'open' | 'closed' | 'half-day';
  spouseAvailable: boolean;
  wfhAbility: number;
}

export const VacationCalendar = () => {
  // Initialize to current month/year
  const now = new Date();
  const initialMonthIndex = now.getMonth();
  const initialYearNum = now.getFullYear();

  // State for current month/year
  const [currentMonth, setCurrentMonth] = useState(initialMonthIndex);
  const [currentYear, setCurrentYear] = useState(initialYearNum);

  // State for holiday data from API
  const [holidaysData, setHolidaysData] = useState<{
    publicHolidays: PublicHoliday[];
    schoolHolidays: SchoolHoliday[];
  } | null>(null);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  const [holidaysError, setHolidaysError] = useState<string | null>(null);

  // Fetch holidays when month/year changes
  useEffect(() => {
    const fetchHolidays = async () => {
      setIsLoadingHolidays(true);
      setHolidaysError(null);

      try {
        // Calculate date range for the current month (with some buffer for bridge days)
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        
        // Format dates as YYYY-MM-DD
        const validFrom = firstDay.toISOString().split('T')[0];
        const validTo = lastDay.toISOString().split('T')[0];

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
  }, [currentMonth, currentYear]);

  // Create a map of dates to day data for quick lookup
  const dayDataMap = useMemo(() => {
    const map = new Map<string, DayData>();

    // Process API holiday data
    if (holidaysData) {
      // First, we need to know the month range to check bridge days for all days
      // We'll get this from currentMonth and currentYear
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
      
      // Add all days in the current month to the map initially (for bridge day detection)
      for (let d = new Date(firstDayOfMonth); d <= lastDayOfMonth; d.setDate(d.getDate() + 1)) {
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
            spouseAvailable: userPreferences.spouseAvailable,
            wfhAbility: userPreferences.wfhAbility,
          });
        }
      }
      const { publicHolidays, schoolHolidays } = holidaysData;

      // Process public holidays
      publicHolidays.forEach((holiday) => {
        const startDate = new Date(holiday.startDate);
        const endDate = new Date(holiday.endDate);
        const holidayName = getHolidayName(holiday, HOLIDAY_LANGUAGE_CODE);

        // Mark each day in the holiday period
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          // Format date as YYYY-MM-DD using local timezone to match calendar day format
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
            spouseAvailable: userPreferences.spouseAvailable,
            wfhAbility: userPreferences.wfhAbility,
          });
        }
      });

      // Process school holidays
      schoolHolidays.forEach((holiday) => {
        const startDate = new Date(holiday.startDate);
        const endDate = new Date(holiday.endDate);

        // Mark each day in the school holiday period
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          // Format date as YYYY-MM-DD using local timezone to match calendar day format
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
            spouseAvailable: userPreferences.spouseAvailable,
            wfhAbility: userPreferences.wfhAbility,
          });
        }
      });

      // Detect bridge days: Monday or Friday with a holiday on adjacent weekday (excluding weekends)
      // Check all dates in the current month for bridge day potential
      for (let d = new Date(firstDayOfMonth); d <= lastDayOfMonth; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const existing = map.get(dateStr);

        // Skip if already a public holiday
        if (existing?.isPublicHoliday) continue;

        const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday
        const isFriday = dayOfWeek === 5;
        const isMonday = dayOfWeek === 1;

        // Only consider Monday or Friday
        if (!isFriday && !isMonday) continue;

        let hasHolidayNearby = false;

        if (isFriday) {
          // Check previous day (Thursday)
          const prevDate = new Date(d);
          prevDate.setDate(prevDate.getDate() - 1);
          const prevYear = prevDate.getFullYear();
          const prevMonth = String(prevDate.getMonth() + 1).padStart(2, '0');
          const prevDayNum = String(prevDate.getDate()).padStart(2, '0');
          const prevDateStr = `${prevYear}-${prevMonth}-${prevDayNum}`;
          const prevDay = map.get(prevDateStr);
          
          // Check next Monday (skip weekend)
          const nextMonday = new Date(d);
          nextMonday.setDate(nextMonday.getDate() + 3); // Friday + 3 = Monday
          const nextMondayYear = nextMonday.getFullYear();
          const nextMondayMonth = String(nextMonday.getMonth() + 1).padStart(2, '0');
          const nextMondayDay = String(nextMonday.getDate()).padStart(2, '0');
          const nextMondayStr = `${nextMondayYear}-${nextMondayMonth}-${nextMondayDay}`;
          const nextMondayDayData = map.get(nextMondayStr);

          // Friday is a bridge day if Thursday is a holiday OR next Monday is a holiday
          hasHolidayNearby = prevDay?.isPublicHoliday === true || nextMondayDayData?.isPublicHoliday === true;
        }

        if (isMonday) {
          // Check previous Friday (skip weekend)
          const prevFriday = new Date(d);
          prevFriday.setDate(prevFriday.getDate() - 3); // Monday - 3 = Friday
          const prevFridayYear = prevFriday.getFullYear();
          const prevFridayMonth = String(prevFriday.getMonth() + 1).padStart(2, '0');
          const prevFridayDay = String(prevFriday.getDate()).padStart(2, '0');
          const prevFridayStr = `${prevFridayYear}-${prevFridayMonth}-${prevFridayDay}`;
          const prevFridayDayData = map.get(prevFridayStr);
          
          // Check next day (Tuesday)
          const nextDate = new Date(d);
          nextDate.setDate(nextDate.getDate() + 1);
          const nextYear = nextDate.getFullYear();
          const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
          const nextDayNum = String(nextDate.getDate()).padStart(2, '0');
          const nextDateStr = `${nextYear}-${nextMonth}-${nextDayNum}`;
          const nextDay = map.get(nextDateStr);

          // Monday is a bridge day if previous Friday is a holiday OR Tuesday is a holiday
          hasHolidayNearby = prevFridayDayData?.isPublicHoliday === true || nextDay?.isPublicHoliday === true;
        }

        if (hasHolidayNearby) {
          const dayData: DayData = existing || {
            date: dateStr,
            holidayName: undefined,
            isPublicHoliday: false,
            isBridgeDay: true,
            schoolStatus: 'open',
            spouseAvailable: userPreferences.spouseAvailable,
            wfhAbility: userPreferences.wfhAbility,
          };
          
          map.set(dateStr, {
            ...dayData,
            isBridgeDay: true,
          });
        }
      }
    }

    return map;
  }, [holidaysData, currentMonth, currentYear]);

  // Navigation functions
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Format month string for display
  const monthString = useMemo(() => {
    const date = new Date(currentYear, currentMonth, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [currentMonth, currentYear]);

  const monthIndex = currentMonth;
  const yearNum = currentYear;

  // Generate all days of the month
  const calendarDays = useMemo(() => {
    const days: Array<{ date: Date; dayData?: DayData; rating?: ReturnType<typeof calculateDayRating> }> = [];
    
    // Get first day of month and last day of month
    const firstDay = new Date(yearNum, monthIndex, 1);
    const lastDay = new Date(yearNum, monthIndex + 1, 0);
    
    // Get the day of week for first day (0 = Sunday, 1 = Monday, etc.)
    // Adjust to make Monday = 0
    let firstDayOfWeek = firstDay.getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Monday = 0
    
    // Add empty cells for days before the first day of the month
    // JavaScript Date: day 0 = last day of previous month, day -1 = second to last, etc.
    for (let i = 0; i < firstDayOfWeek; i++) {
      const prevMonthDate = new Date(yearNum, monthIndex, 1 - firstDayOfWeek + i);
      days.push({ date: prevMonthDate });
    }
    
    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(yearNum, monthIndex, day);
      // Format date as YYYY-MM-DD
      const dateString = `${yearNum}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = dayDataMap.get(dateString);
      
      // Create day data with user preferences if not already in map
      const finalDayData: DayData = dayData || {
        date: dateString,
        holidayName: undefined,
        isPublicHoliday: false,
        isBridgeDay: false,
        schoolStatus: 'open',
        spouseAvailable: userPreferences.spouseAvailable,
        wfhAbility: userPreferences.wfhAbility,
      };
      
      let rating;
      const currentDay: DayContext = {
        date: date,
        isPublicHoliday: finalDayData.isPublicHoliday,
        schoolStatus: finalDayData.schoolStatus,
        wfhAbility: finalDayData.wfhAbility,
        isBridgeDay: finalDayData.isBridgeDay,
        spouseAvailable: finalDayData.spouseAvailable
      };
      rating = calculateDayRating(currentDay);
      
      days.push({ date, dayData: finalDayData, rating });
    }
    
    // Fill remaining cells to complete the last week (6 rows = 42 cells)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({ date: new Date(yearNum, monthIndex + 1, i) });
    }
    
    return days;
  }, [yearNum, monthIndex, dayDataMap]);

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button 
          className={styles.navButton}
          onClick={goToPreviousMonth}
          aria-label="Previous month"
          disabled={isLoadingHolidays}
        >
          ‹
        </button>
        <h2 className={styles.monthTitle}>
          {monthString}
          {isLoadingHolidays && <span style={{ fontSize: '0.6em', marginLeft: '8px' }}>Loading...</span>}
        </h2>
        <button 
          className={styles.navButton}
          onClick={goToNextMonth}
          aria-label="Next month"
          disabled={isLoadingHolidays}
        >
          ›
        </button>
      </div>
      {holidaysError && (
        <div style={{ padding: '8px', margin: '8px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px' }}>
          Error loading holidays: {holidaysError}
        </div>
      )}
      <div className={styles.calendar}>
        <div className={styles.weekHeader}>
          {weekDays.map((day) => (
            <div key={day} className={styles.weekDayHeader}>
              {day}
            </div>
          ))}
        </div>
        <div className={styles.weekGrid}>
          {calendarDays.map((calendarDay, index) => {
            const isCurrentMonth = calendarDay.date.getMonth() === monthIndex;
            const isToday = calendarDay.date.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={`${calendarDay.date.toISOString()}-${index}`}
                className={classNames(
                  styles.dayCell,
                  !isCurrentMonth && styles.otherMonth,
                  isToday && styles.today,
                  calendarDay.rating && styles[calendarDay.rating.tag]
                )}
              >
                <div className={styles.dayNumber}>
                  {calendarDay.date.getDate()}
                </div>
                {calendarDay.rating && (
                  <div className={styles.dayContent}>
                    {calendarDay.dayData?.holidayName && (
                      <div className={styles.holidayName}>
                        {calendarDay.dayData.holidayName}
                      </div>
                    )}
                    <div className={styles.recommendation}>
                      {calendarDay.rating.recommendation}
                    </div>
                    {calendarDay.rating.score > 0 && (
                      <div className={styles.score}>Score: {calendarDay.rating.score}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};