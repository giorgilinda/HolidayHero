"use client";

import React, { useMemo } from 'react';
import styles from './YearlyView.module.css';
import { DayCell } from './DayCell';
import { CalendarViewProps, CalendarDay, PersonConfig } from './calendarTypes';
import { calculateDayRating, DayContext } from '@/utils/brain';
import { userPreferences } from '@/config/userPreferences';

export const YearlyView: React.FC<CalendarViewProps> = ({
  currentYear,
  dayDataMap,
  people,
  onDayClick,
}) => {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  const yearlyCalendarData = useMemo(() => {
    const months: Array<{
      monthIndex: number;
      monthName: string;
      days: CalendarDay[];
    }> = [];
    
    const kids = people.filter((p: PersonConfig) => p.isChild === true);
    const adults = people.filter((p: PersonConfig) => p.isChild !== true);
    
    const adultsCanWfh: Record<string, boolean> = {};
    adults.forEach((adult: PersonConfig) => {
      adultsCanWfh[adult.id] = userPreferences.adultWfhAbilities[adult.id] ?? false;
    });
    
    // Calculate mandatory days count for the entire year
    const allDaysInYear: Array<{ dateString: string; isMandatory: boolean }> = [];
    for (let month = 0; month < 12; month++) {
      const lastDayOfMonth = new Date(currentYear, month + 1, 0);
      for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        const date = new Date(currentYear, month, day);
        const dateString = `${currentYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = dayDataMap.get(dateString);
        const isSchoolHoliday = dayData ? (dayData.schoolStatus === 'closed' || dayData.schoolStatus === 'half-day') : false;
        const isPublicHoliday = dayData?.isPublicHoliday || false;
        allDaysInYear.push({
          dateString,
          isMandatory: isSchoolHoliday && !isPublicHoliday
        });
      }
    }
    
    // Calculate mandatory days count for each day
    const mandatoryDaysCountMap = new Map<string, number>();
    for (let i = 0; i < allDaysInYear.length; i++) {
      if (allDaysInYear[i].isMandatory) {
        let start = i;
        while (start > 0 && allDaysInYear[start - 1].isMandatory) {
          start--;
        }
        let end = i;
        while (end < allDaysInYear.length - 1 && allDaysInYear[end + 1].isMandatory) {
          end++;
        }
        const count = end - start + 1;
        for (let j = start; j <= end; j++) {
          mandatoryDaysCountMap.set(allDaysInYear[j].dateString, count);
        }
      }
    }
    
    // Generate data for each month
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const lastDayOfMonth = new Date(currentYear, monthIndex + 1, 0);
      const days: CalendarDay[] = [];
      
      // Generate days 1-31, but only valid days for the month will have data
      for (let day = 1; day <= 31; day++) {
        if (day > lastDayOfMonth.getDate()) {
          // Invalid day for this month - add empty placeholder
          days.push({ date: new Date(currentYear, monthIndex, day) });
          continue;
        }
        
        const date = new Date(currentYear, monthIndex, day);
        const dateString = `${currentYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = dayDataMap.get(dateString);
        
        const finalDayData = dayData || {
          date: dateString,
          holidayName: undefined,
          isPublicHoliday: false,
          isBridgeDay: false,
          schoolStatus: 'open' as const,
        };
        
        // Calculate which kids can stay home
        const kidsCanStayHome: Record<string, boolean> = {};
        const isSchoolClosed = finalDayData.schoolStatus === 'closed' || finalDayData.schoolStatus === 'half-day';
        const override = finalDayData.manualOverride;
        
        kids.forEach((kid: PersonConfig) => {
          const hasActivity = override?.people[kid.id] === 'activity';
          kidsCanStayHome[kid.id] = isSchoolClosed && !hasActivity;
        });
        
        const mandatoryDaysCount = mandatoryDaysCountMap.get(dateString) ?? 0;
        
        const currentDay: DayContext = {
          date: date,
          isPublicHoliday: finalDayData.isPublicHoliday,
          schoolStatus: finalDayData.schoolStatus,
          isBridgeDay: finalDayData.isBridgeDay,
          kidsCanStayHome,
          adultsCanWfh,
          mandatoryDaysCount,
          maxMandatoryDaysForWfhSuggestion: userPreferences.maxMandatoryDaysForWfhSuggestion
        };
        const rating = calculateDayRating(currentDay);
        
        days.push({ date, dayData: finalDayData, rating });
      }
      
      months.push({
        monthIndex,
        monthName: monthNames[monthIndex],
        days
      });
    }
    
    return months;
  }, [dayDataMap, currentYear, people]);

  return (
    <div className={styles.yearlyCalendar}>
      <div className={styles.yearlyHeader}>
        <div className={styles.monthLabelColumn}></div>
        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
          <div key={day} className={styles.dayHeader}>
            {day}
          </div>
        ))}
      </div>
      {yearlyCalendarData.map((month) => (
        <div key={month.monthIndex} className={styles.yearlyMonthRow}>
          <div className={styles.monthLabel}>
            {month.monthName}
          </div>
          <div className={styles.yearlyDaysGrid}>
            {month.days.map((calendarDay, dayIndex) => {
              const isValidDay = calendarDay.dayData !== undefined || calendarDay.rating !== undefined;
              return (
                <div key={`${month.monthIndex}-${dayIndex}`} className={styles.yearlyDayCell}>
                  <DayCell
                    calendarDay={calendarDay}
                    people={people}
                    isCurrentMonth={true}
                    isValidDay={isValidDay}
                    onClick={() => onDayClick(calendarDay.date)}
                    className={styles.yearlyDayCellContent}
                    compact={true}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

