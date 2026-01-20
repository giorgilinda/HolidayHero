"use client";

import React, { useMemo } from 'react';
import styles from './MonthlyView.module.css';
import { DayCell } from './DayCell';
import { CalendarViewProps, CalendarDay, PersonConfig } from './calendarTypes';
import { calculateDayRating, DayContext } from '@/utils/brain';
import { userPreferences } from '@/config/userPreferences';

export const MonthlyView: React.FC<CalendarViewProps> = ({
  currentYear,
  currentMonth,
  dayDataMap,
  people,
  onDayClick,
  selectedDates = new Set(),
  selectionMode = false,
}) => {
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const monthIndex = currentMonth;
  const yearNum = currentYear;

  // Generate all days of the month
  const calendarDays = useMemo(() => {
    const days: CalendarDay[] = [];
    
    const firstDay = new Date(yearNum, monthIndex, 1);
    const lastDay = new Date(yearNum, monthIndex + 1, 0);
    
    let firstDayOfWeek = firstDay.getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Monday = 0
    
    const kids = people.filter((p: PersonConfig) => p.isChild === true);
    const adults = people.filter((p: PersonConfig) => p.isChild !== true);
    
    const adultsCanWfh: Record<string, boolean> = {};
    adults.forEach((adult: PersonConfig) => {
      adultsCanWfh[adult.id] = userPreferences.adultWfhAbilities[adult.id] ?? false;
    });
    
    // Calculate mandatory days count
    const allDaysInMonth: Array<{ dateString: string; isMandatory: boolean }> = [];
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(yearNum, monthIndex, day);
      const dateString = `${yearNum}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = dayDataMap.get(dateString);
      const isSchoolHoliday = dayData ? (dayData.schoolStatus === 'closed' || dayData.schoolStatus === 'half-day') : false;
      const isPublicHoliday = dayData?.isPublicHoliday || false;
      allDaysInMonth.push({
        dateString,
        isMandatory: isSchoolHoliday && !isPublicHoliday
      });
    }
    
    const mandatoryDaysCountMap = new Map<string, number>();
    for (let i = 0; i < allDaysInMonth.length; i++) {
      if (allDaysInMonth[i].isMandatory) {
        let start = i;
        while (start > 0 && allDaysInMonth[start - 1].isMandatory) {
          start--;
        }
        let end = i;
        while (end < allDaysInMonth.length - 1 && allDaysInMonth[end + 1].isMandatory) {
          end++;
        }
        const count = end - start + 1;
        for (let j = start; j <= end; j++) {
          mandatoryDaysCountMap.set(allDaysInMonth[j].dateString, count);
        }
      }
    }
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      const prevMonthDate = new Date(yearNum, monthIndex, 1 - firstDayOfWeek + i);
      days.push({ date: prevMonthDate });
    }
    
    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(yearNum, monthIndex, day);
      const dateString = `${yearNum}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = dayDataMap.get(dateString);
      
      const finalDayData = dayData || {
        date: dateString,
        holidayName: undefined,
        isPublicHoliday: false,
        isBridgeDay: false,
        schoolStatus: 'open' as const,
      };
      
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
    
    // Fill remaining cells to complete the last week (6 rows = 42 cells)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({ date: new Date(yearNum, monthIndex + 1, i) });
    }
    
    return days;
  }, [yearNum, monthIndex, dayDataMap, people]);

  return (
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
                  const year = calendarDay.date.getFullYear();
                  const month = String(calendarDay.date.getMonth() + 1).padStart(2, '0');
                  const day = String(calendarDay.date.getDate()).padStart(2, '0');
                  const dateStr = `${year}-${month}-${day}`;
                  const isSelected = selectionMode && selectedDates.has(dateStr);
                  
                  return (
                    <DayCell
                      key={`${calendarDay.date.toISOString()}-${index}`}
                      calendarDay={calendarDay}
                      people={people}
                      isCurrentMonth={isCurrentMonth}
                      isValidDay={true}
                      onClick={() => onDayClick(calendarDay.date)}
                      isSelected={isSelected}
                      selectionMode={selectionMode}
                    />
                  );
        })}
      </div>
    </div>
  );
};

