/**
 * Vacation Opportunities Finder
 * 
 * Finds optimal vacation opportunities where taking minimal PTO days
 * results in longer vacation periods (e.g., taking 1 day = 4-5 day vacation)
 */

import { DayData } from '@/components/calendarTypes';

export interface VacationOpportunity {
  /** Dates that need to be taken off (PTO days) */
  ptoDays: Date[];
  /** Total vacation period (includes weekends and holidays) */
  vacationPeriod: {
    start: Date;
    end: Date;
  };
  /** Number of PTO days required */
  ptoDaysCount: number;
  /** Total vacation days (including weekends and holidays) */
  totalVacationDays: number;
  /** Efficiency ratio (total days / PTO days) */
  efficiency: number;
  /** Description of the opportunity */
  description: string;
  /** Public holidays included in this period */
  holidays: Array<{ date: Date; name?: string | null }>;
}

/**
 * Check if a date is a weekend
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Check if a date is a public holiday
 */
function isPublicHoliday(date: Date, dayDataMap: Map<string, DayData>): boolean {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  return dayDataMap.get(dateStr)?.isPublicHoliday ?? false;
}

/**
 * Check if a date is a school holiday (school closed)
 */
function isSchoolHoliday(date: Date, dayDataMap: Map<string, DayData>): boolean {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const dayData = dayDataMap.get(dateStr);
  return dayData?.schoolStatus === 'closed' || dayData?.schoolStatus === 'half-day';
}

/**
 * Check if a date is any type of holiday (public or school)
 */
function isHoliday(date: Date, dayDataMap: Map<string, DayData>): boolean {
  return isPublicHoliday(date, dayDataMap) || isSchoolHoliday(date, dayDataMap);
}

/**
 * Check if a date is a valid work day where PTO can be taken
 * (not weekend, not public holiday, and school is open)
 */
function isValidPtoDay(date: Date, dayDataMap: Map<string, DayData>): boolean {
  if (isWeekend(date)) {
    return false;
  }
  if (isPublicHoliday(date, dayDataMap)) {
    return false;
  }
  // For school holidays, we can still take PTO if school is open
  // (school being closed means mandatory PTO, but we can extend it)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const dayData = dayDataMap.get(dateStr);
  // School status doesn't prevent taking PTO, but we prefer school to be open
  // Actually, if school is closed, you're already taking that day off, so it's not an "opportunity"
  // So we want school to be open for it to be a valid PTO day
  return dayData?.schoolStatus === 'open' || !dayData;
}

/**
 * Get holiday name for a date
 */
function getHolidayName(date: Date, dayDataMap: Map<string, DayData>): string | undefined {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const holidayName = dayDataMap.get(dateStr)?.holidayName;
  return holidayName ?? undefined;
}

/**
 * Count consecutive days in a period (excluding weekends and holidays)
 */
function countWorkDays(start: Date, end: Date, dayDataMap: Map<string, DayData>): number {
  let count = 0;
  const current = new Date(start);
  
  while (current <= end) {
    if (!isWeekend(current) && !isHoliday(current, dayDataMap)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Count total days in a period (including weekends and holidays)
 */
function countTotalDays(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // +1 to include both start and end
}

/**
 * Find all vacation opportunities in a given year
 */
export function findVacationOpportunities(
  year: number,
  dayDataMap: Map<string, DayData>
): VacationOpportunity[] {
  const opportunities: VacationOpportunity[] = [];
  
  // Get all public holidays AND school holidays in the year
  const publicHolidays: Array<{ date: Date; name?: string; type: 'public' }> = [];
  const schoolHolidayPeriods: Array<{ start: Date; end: Date }> = [];
  const processedSchoolHolidayDates = new Set<string>();
  
  for (let month = 0; month < 12; month++) {
    const lastDay = new Date(year, month + 1, 0);
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const yearStr = date.getFullYear();
      const monthStr = String(date.getMonth() + 1).padStart(2, '0');
      const dayStr = String(date.getDate()).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
      const dayData = dayDataMap.get(dateStr);
      
      // Collect public holidays
      if (dayData?.isPublicHoliday) {
        publicHolidays.push({
          date: new Date(date),
          name: dayData.holidayName ?? undefined,
          type: 'public',
        });
      }
      
      // Collect school holiday periods (start and end dates)
      // School holidays are represented by schoolStatus === 'closed' or 'half-day'
      const isSchoolHoliday = dayData?.schoolStatus === 'closed' || dayData?.schoolStatus === 'half-day';
      if (isSchoolHoliday && !processedSchoolHolidayDates.has(dateStr)) {
        // Find the start and end of this school holiday period
        let periodStart = new Date(date);
        let periodEnd = new Date(date);
        
        // Find start of period (go backwards until school is open)
        while (periodStart.getFullYear() === year) {
          const prevDate = new Date(periodStart);
          prevDate.setDate(prevDate.getDate() - 1);
          const prevYear = prevDate.getFullYear();
          const prevMonth = String(prevDate.getMonth() + 1).padStart(2, '0');
          const prevDay = String(prevDate.getDate()).padStart(2, '0');
          const prevDateStr = `${prevYear}-${prevMonth}-${prevDay}`;
          const prevDayData = dayDataMap.get(prevDateStr);
          
          if (prevDayData?.schoolStatus === 'closed' || prevDayData?.schoolStatus === 'half-day') {
            periodStart = prevDate;
          } else {
            break;
          }
        }
        
        // Find end of period (go forwards until school is open)
        while (periodEnd.getFullYear() === year) {
          const nextDate = new Date(periodEnd);
          nextDate.setDate(nextDate.getDate() + 1);
          const nextYear = nextDate.getFullYear();
          const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
          const nextDay = String(nextDate.getDate()).padStart(2, '0');
          const nextDateStr = `${nextYear}-${nextMonth}-${nextDay}`;
          const nextDayData = dayDataMap.get(nextDateStr);
          
          if (nextDayData?.schoolStatus === 'closed' || nextDayData?.schoolStatus === 'half-day') {
            periodEnd = nextDate;
            // Mark all dates in this period as processed
            for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
              const dYear = d.getFullYear();
              const dMonth = String(d.getMonth() + 1).padStart(2, '0');
              const dDay = String(d.getDate()).padStart(2, '0');
              const dDateStr = `${dYear}-${dMonth}-${dDay}`;
              processedSchoolHolidayDates.add(dDateStr);
            }
          } else {
            break;
          }
        }
        
        // Only add if this is a new period (not already processed)
        const periodStartStr = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}-${String(periodStart.getDate()).padStart(2, '0')}`;
        if (!processedSchoolHolidayDates.has(periodStartStr)) {
          schoolHolidayPeriods.push({
            start: new Date(periodStart),
            end: new Date(periodEnd),
          });
          // Mark all dates in this period
          for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
            const dYear = d.getFullYear();
            const dMonth = String(d.getMonth() + 1).padStart(2, '0');
            const dDay = String(d.getDate()).padStart(2, '0');
            const dDateStr = `${dYear}-${dMonth}-${dDay}`;
            processedSchoolHolidayDates.add(dDateStr);
          }
        }
      }
    }
  }
  
  // Combine public holidays and school holiday start/end dates for opportunity detection
  const holidays: Array<{ date: Date; name?: string; type: 'public' | 'school' }> = [...publicHolidays];
  
  // Add school holiday period start and end dates (only if they're not public holidays)
  schoolHolidayPeriods.forEach(period => {
    const startStr = `${period.start.getFullYear()}-${String(period.start.getMonth() + 1).padStart(2, '0')}-${String(period.start.getDate()).padStart(2, '0')}`;
    const endStr = `${period.end.getFullYear()}-${String(period.end.getMonth() + 1).padStart(2, '0')}-${String(period.end.getDate()).padStart(2, '0')}`;
    const startData = dayDataMap.get(startStr);
    const endData = dayDataMap.get(endStr);
    
    // Only add if not a public holiday (we already have those)
    if (startData && !startData.isPublicHoliday) {
      holidays.push({
        date: new Date(period.start),
        name: 'School Holiday Start',
        type: 'school',
      });
    }
    if (endData && !endData.isPublicHoliday && period.end.getTime() !== period.start.getTime()) {
      holidays.push({
        date: new Date(period.end),
        name: 'School Holiday End',
        type: 'school',
      });
    }
  });
  
  // For each holiday, find opportunities
  for (const holiday of holidays) {
    const holidayDate = holiday.date;
    const dayOfWeek = holidayDate.getDay();
    
    // Skip if holiday is on a weekend (already a long weekend)
    if (isWeekend(holidayDate)) {
      continue;
    }
    
    // Pattern 1: Holiday on Thursday -> Take Friday off = 4 days (Thu-Sun)
    if (dayOfWeek === 4) { // Thursday
      const friday = new Date(holidayDate);
      friday.setDate(friday.getDate() + 1);
      
      if (isValidPtoDay(friday, dayDataMap)) {
        const start = new Date(holidayDate);
        const end = new Date(friday);
        end.setDate(end.getDate() + 2); // Sunday
        
        const ptoDays = [friday];
        const ptoCount = countWorkDays(friday, friday, dayDataMap);
        const totalDays = countTotalDays(start, end);
        
        opportunities.push({
          ptoDays,
          vacationPeriod: { start, end },
          ptoDaysCount: ptoCount,
          totalVacationDays: totalDays,
          efficiency: totalDays / ptoCount,
          description: `Take Friday off for a 4-day weekend`,
          holidays: [holiday],
        });
      }
    }
    
    // Pattern 2: Holiday on Tuesday -> Take Monday off = 4 days (Sat-Tue)
    if (dayOfWeek === 2) { // Tuesday
      const monday = new Date(holidayDate);
      monday.setDate(monday.getDate() - 1);
      
      if (isValidPtoDay(monday, dayDataMap)) {
        const start = new Date(monday);
        start.setDate(start.getDate() - 2); // Saturday
        const end = new Date(holidayDate);
        
        const ptoDays = [monday];
        const ptoCount = countWorkDays(monday, monday, dayDataMap);
        const totalDays = countTotalDays(start, end);
        
        opportunities.push({
          ptoDays,
          vacationPeriod: { start, end },
          ptoDaysCount: ptoCount,
          totalVacationDays: totalDays,
          efficiency: totalDays / ptoCount,
          description: `Take Monday off for a 4-day weekend`,
          holidays: [holiday],
        });
      }
    }
    
    // Pattern 3: Holiday on Friday -> Take Thursday off = 4 days (Thu-Sun)
    if (dayOfWeek === 5) { // Friday
      const thursday = new Date(holidayDate);
      thursday.setDate(thursday.getDate() - 1);
      
      if (isValidPtoDay(thursday, dayDataMap)) {
        const start = new Date(thursday);
        const end = new Date(holidayDate);
        end.setDate(end.getDate() + 2); // Sunday
        
        const ptoDays = [thursday];
        const ptoCount = countWorkDays(thursday, thursday, dayDataMap);
        const totalDays = countTotalDays(start, end);
        
        opportunities.push({
          ptoDays,
          vacationPeriod: { start, end },
          ptoDaysCount: ptoCount,
          totalVacationDays: totalDays,
          efficiency: totalDays / ptoCount,
          description: `Take Thursday off for a 4-day weekend`,
          holidays: [holiday],
        });
      }
    }
    
    // Pattern 4: Holiday on Monday -> Take Friday off = 4 days (Fri-Mon)
    if (dayOfWeek === 1) { // Monday
      const friday = new Date(holidayDate);
      friday.setDate(friday.getDate() - 3); // Previous Friday
      
      if (isValidPtoDay(friday, dayDataMap)) {
        const start = new Date(friday);
        const end = new Date(holidayDate);
        
        const ptoDays = [friday];
        const ptoCount = countWorkDays(friday, friday, dayDataMap);
        const totalDays = countTotalDays(start, end);
        
        opportunities.push({
          ptoDays,
          vacationPeriod: { start, end },
          ptoDaysCount: ptoCount,
          totalVacationDays: totalDays,
          efficiency: totalDays / ptoCount,
          description: `Take Friday off for a 4-day weekend`,
          holidays: [holiday],
        });
      }
    }
    
    // Pattern 5: Holiday on Wednesday -> Take Tuesday and Thursday off = 5 days (Tue-Sat)
    if (dayOfWeek === 3) { // Wednesday
      const tuesday = new Date(holidayDate);
      tuesday.setDate(tuesday.getDate() - 1);
      const thursday = new Date(holidayDate);
      thursday.setDate(thursday.getDate() + 1);
      
      if (isValidPtoDay(tuesday, dayDataMap) && isValidPtoDay(thursday, dayDataMap)) {
        const start = new Date(tuesday);
        const end = new Date(thursday);
        end.setDate(end.getDate() + 2); // Saturday
        
        const ptoDays = [tuesday, thursday];
        const ptoCount = countWorkDays(tuesday, thursday, dayDataMap);
        const totalDays = countTotalDays(start, end);
        
        opportunities.push({
          ptoDays,
          vacationPeriod: { start, end },
          ptoDaysCount: ptoCount,
          totalVacationDays: totalDays,
          efficiency: totalDays / ptoCount,
          description: `Take Tuesday and Thursday off for a 5-day vacation`,
          holidays: [holiday],
        });
      }
    }
  }
  
  // Check for consecutive holidays (e.g., Thu + Fri holidays = take Wed = 5 days)
  for (let i = 0; i < holidays.length - 1; i++) {
    const holiday1 = holidays[i];
    const holiday2 = holidays[i + 1];
    
    const daysDiff = Math.abs(
      (holiday2.date.getTime() - holiday1.date.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // If holidays are 1 day apart (consecutive work days)
    if (daysDiff === 1 && !isWeekend(holiday1.date) && !isWeekend(holiday2.date)) {
      const day1 = holiday1.date.getDay();
      const day2 = holiday2.date.getDay();
      
      // Pattern: Thu + Fri holidays -> Take Wed = 5 days (Wed-Sun)
      if (day1 === 4 && day2 === 5) { // Thursday + Friday
        const wednesday = new Date(holiday1.date);
        wednesday.setDate(wednesday.getDate() - 1);
        
        if (isValidPtoDay(wednesday, dayDataMap)) {
          const start = new Date(wednesday);
          const end = new Date(holiday2.date);
          end.setDate(end.getDate() + 2); // Sunday
          
          const ptoDays = [wednesday];
          const ptoCount = countWorkDays(wednesday, wednesday, dayDataMap);
          const totalDays = countTotalDays(start, end);
          
          opportunities.push({
            ptoDays,
            vacationPeriod: { start, end },
            ptoDaysCount: ptoCount,
            totalVacationDays: totalDays,
            efficiency: totalDays / ptoCount,
            description: `Take Wednesday off for a 5-day vacation`,
            holidays: [holiday1, holiday2],
          });
        }
      }
      
      // Pattern: Mon + Tue holidays -> Take Fri = 5 days (Fri-Tue)
      if (day1 === 1 && day2 === 2) { // Monday + Tuesday
        const friday = new Date(holiday1.date);
        friday.setDate(friday.getDate() - 3); // Previous Friday
        
        if (isValidPtoDay(friday, dayDataMap)) {
          const start = new Date(friday);
          const end = new Date(holiday2.date);
          
          const ptoDays = [friday];
          const ptoCount = countWorkDays(friday, friday, dayDataMap);
          const totalDays = countTotalDays(start, end);
          
          opportunities.push({
            ptoDays,
            vacationPeriod: { start, end },
            ptoDaysCount: ptoCount,
            totalVacationDays: totalDays,
            efficiency: totalDays / ptoCount,
            description: `Take Friday off for a 5-day vacation`,
            holidays: [holiday1, holiday2],
          });
        }
      }
    }
  }
  
  // Sort by efficiency (highest first), then by date
  opportunities.sort((a, b) => {
    if (Math.abs(a.efficiency - b.efficiency) > 0.1) {
      return b.efficiency - a.efficiency;
    }
    return a.vacationPeriod.start.getTime() - b.vacationPeriod.start.getTime();
  });
  
  // Remove duplicates (same PTO days)
  const uniqueOpportunities: VacationOpportunity[] = [];
  const seenPtoDays = new Set<string>();
  
  for (const opp of opportunities) {
    const ptoKey = opp.ptoDays
      .map(d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
      .sort()
      .join(',');
    
    if (!seenPtoDays.has(ptoKey)) {
      seenPtoDays.add(ptoKey);
      uniqueOpportunities.push(opp);
    }
  }
  
  return uniqueOpportunities;
}

