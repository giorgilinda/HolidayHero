/**
 * Vacation Rating Engine
 * * PURPOSE: 
 * Calculates a score (0-10) and a recommendation for a specific date.
 * * INPUTS:
 * - isPublicHoliday: If true, the day is "free" (no PTO cost).
 * - schoolStatus: 'open' | 'closed' | 'half-day'.
 * - wfhAbility: Parent's ability to work from home (0 = None, 1 = Full).
 * - isBridgeDay: If the day sits between a holiday and a weekend.
 * - spouseAvailable: If the other parent is already covering childcare.
 */

type SchoolStatus = 'open' | 'closed' | 'half-day';

export interface DayContext {
  date: Date;
  isPublicHoliday: boolean;
  schoolStatus: SchoolStatus;
  wfhAbility: number; // 0.0 to 1.0 (0% to 100% productivity)
  isBridgeDay: boolean;
  spouseAvailable: boolean;
}

interface DayRating {
  score: number;         // 0 to 10
  recommendation: string;
  tag: 'MANDATORY' | 'HIGH_VALUE' | 'WFH_CANDIDATE' | 'SKIP' | 'WORK';
}

export const calculateDayRating = (ctx: DayContext): DayRating => {
  let score = 0;
  let recommendation = "";
  let tag: DayRating['tag'] = 'SKIP';

  // 1. FREE DAYS: If it's a public holiday, no PTO needed.
  if (ctx.isPublicHoliday) {
    return { score: 0, recommendation: "Public Holiday: Enjoy your day off!", tag: 'SKIP' };
  }

  // 2. CHILDCARE NECESSITY (The "Must Stay Home" Factor)
  const needsChildcare = (ctx.schoolStatus === 'closed' || ctx.schoolStatus === 'half-day');
  
  if (needsChildcare && !ctx.spouseAvailable) {
    if (ctx.wfhAbility === 0) {
      // Hard Constraint: School closed, can't work from home, spouse busy.
      score = 10;
      recommendation = "Mandatory PTO: School is closed and you cannot WFH.";
      tag = 'MANDATORY';
    } else if (ctx.wfhAbility > 0 && ctx.wfhAbility < 1) {
      // Soft Constraint: Can WFH, but it's hard with kids.
      score = 7;
      recommendation = "WFH Recommended: School is closed, but you have WFH flexibility.";
      tag = 'WFH_CANDIDATE';
    }
  }

  // 3. EFFICIENCY (The "Long Weekend" Factor)
  if (ctx.isBridgeDay && !needsChildcare) {
    score = Math.max(score, 8); // High value because it creates a 4-day break
    recommendation = "High Efficiency: Great day to take PTO for a long weekend.";
    tag = 'HIGH_VALUE';
  }

  // 4. LOW VALUE (The "Isolated Day" Factor)
  if (!needsChildcare && !ctx.isBridgeDay) {
    score = 2;
    recommendation = "Standard Work Day";
    tag = 'WORK';
  }

  return { score, recommendation, tag };
}