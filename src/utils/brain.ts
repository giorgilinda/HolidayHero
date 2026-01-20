/**
 * Vacation Rating Engine
 * * PURPOSE: 
 * Calculates a score (0-10) and a recommendation for a specific date.
 * * INPUTS:
 * - isPublicHoliday: If true, the day is "free" (no PTO cost).
 * - schoolStatus: 'open' | 'closed' | 'half-day'.
 * - isBridgeDay: If the day sits between a holiday and a weekend.
 * - kidsCanStayHome: Information about which kids can stay home (no school, no activity)
 * - adultsCanWfh: Information about which adults can work from home
 * - mandatoryDaysCount: Number of mandatory days in the current period
 * - maxMandatoryDaysForWfhSuggestion: Threshold for suggesting WFH
 */

type SchoolStatus = 'open' | 'closed' | 'half-day';

export interface DayContext {
  date: Date;
  isPublicHoliday: boolean;
  schoolStatus: SchoolStatus;
  isBridgeDay: boolean;
  // Fields for WFH suggestions
  kidsCanStayHome?: Record<string, boolean>; // Map of kid ID to whether they can stay home
  adultsCanWfh?: Record<string, boolean>; // Map of adult ID to whether they can work from home
  mandatoryDaysCount?: number; // Number of mandatory days in the current period
  maxMandatoryDaysForWfhSuggestion?: number; // Threshold for suggesting WFH
}

export interface DayRating {
  score: number;         // 0 to 10
  recommendation: string;
  tag: 'MANDATORY' | 'HIGH_VALUE' | 'WFH_CANDIDATE' | 'SKIP' | 'WORK';
  wfhSuggestion?: {
    reason: string; // Explanation for the suggestion
  };
}

export const calculateDayRating = (ctx: DayContext): DayRating => {
  let score = 0;
  let recommendation = "";
  let tag: DayRating['tag'] = 'SKIP';
  let wfhSuggestion: DayRating['wfhSuggestion'] = undefined;

  // 1. FREE DAYS: If it's a public holiday, no PTO needed.
  if (ctx.isPublicHoliday) {
    return { score: 0, recommendation: "Public Holiday: Enjoy your day off!", tag: 'SKIP' };
  }

  // 2. SCHOOL HOLIDAYS: If school is closed (school holiday), it's mandatory PTO
  const isSchoolHoliday = (ctx.schoolStatus === 'closed' || ctx.schoolStatus === 'half-day');
  
  if (isSchoolHoliday) {
    // School holidays are mandatory, but check if WFH is a good option
    score = 10;
    recommendation = "School is closed.";
    tag = 'MANDATORY'; // Default to mandatory
    
    // Check if we should suggest WFH and change tag to WFH_CANDIDATE
    // Logic: If all kids (who are not busy with an activity but have no school) can stay home
    // AND the number of mandatory days are less than threshold, suggest WFH
    if (ctx.kidsCanStayHome && ctx.adultsCanWfh && ctx.mandatoryDaysCount !== undefined && ctx.maxMandatoryDaysForWfhSuggestion !== undefined) {
      const allKidsCanStayHome = Object.values(ctx.kidsCanStayHome).every(canStay => canStay);
      const hasKids = Object.keys(ctx.kidsCanStayHome).length > 0;
      
      if (allKidsCanStayHome && hasKids && ctx.mandatoryDaysCount < ctx.maxMandatoryDaysForWfhSuggestion) {
        // Check if any adult can WFH
        const canAnyAdultWfh = Object.values(ctx.adultsCanWfh).some(canWfh => canWfh === true);
        
        if (canAnyAdultWfh) {
          // Change tag to WFH_CANDIDATE when WFH is a good option
          tag = 'WFH_CANDIDATE';
          wfhSuggestion = {
            reason: `Consider WFH`
          };
        }
      }
    }
    
    return { score, recommendation, tag, wfhSuggestion };
  }

  // 3. EFFICIENCY (The "Long Weekend" Factor)
  // Bridge days are only valuable if school is open (no childcare needed)
  if (ctx.isBridgeDay && ctx.schoolStatus === 'open') {
    score = Math.max(score, 8); // High value because it creates a 4-day break
    recommendation = "Great day for a bridge-day";
    tag = 'HIGH_VALUE';
  }

  // 4. LOW VALUE (The "Isolated Day" Factor)
  // Standard work days (school open, not a bridge day)
  if (ctx.schoolStatus === 'open' && !ctx.isBridgeDay) {
    score = 2;
    recommendation = "";
    tag = 'WORK';
  }

  return { score, recommendation, tag, wfhSuggestion };
}