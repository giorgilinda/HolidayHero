import { ManualOverride as DayEditManualOverride, Person } from './DayEditDialog';
import { calculateDayRating } from '@/utils/brain';

// Re-export ManualOverride for convenience
export type ManualOverride = DayEditManualOverride;

export interface PersonConfig {
  id: string;
  name: string;
  isChild?: boolean;
}

export interface DayData {
  date: string;
  holidayName?: string | null;
  isPublicHoliday: boolean;
  isBridgeDay: boolean;
  schoolStatus: 'open' | 'closed' | 'half-day';
  manualOverride?: ManualOverride;
}

export interface CalendarDay {
  date: Date;
  dayData?: DayData;
  rating?: ReturnType<typeof calculateDayRating>;
}

export interface CalendarViewProps {
  currentYear: number;
  currentMonth: number;
  dayDataMap: Map<string, DayData>;
  people: Person[];
  onDayClick: (date: Date) => void;
  selectedDates?: Set<string>;
  selectionMode?: boolean;
}

