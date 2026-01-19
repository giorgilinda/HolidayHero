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

  // 2. SCHOOL HOLIDAYS: If school is closed (school holiday), it's mandatory PTO
  const isSchoolHoliday = (ctx.schoolStatus === 'closed' || ctx.schoolStatus === 'half-day');
  
  if (isSchoolHoliday) {
    // School holidays are always mandatory, regardless of spouse/wfh status
    score = 10;
    recommendation = "School is closed.";
    tag = 'MANDATORY';
    return { score, recommendation, tag };
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

  return { score, recommendation, tag };
}