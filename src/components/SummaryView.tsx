"use client";

import React, { useMemo, useState } from 'react';
import styles from './SummaryView.module.css';
import { Person } from './DayEditDialog';
import { DayData, ManualOverride, PersonConfig } from './calendarTypes';
import { calculateDayRating, DayContext, DayRating } from '@/utils/brain';
import { userPreferences } from '@/config/userPreferences';

interface SummaryViewProps {
  currentYear: number;
  dayDataMap: Map<string, DayData>;
  people: Person[];
  manualOverrides: Map<string, ManualOverride>;
  selectedDates: Set<string>;
  selectionMode: boolean;
  onDaySelect: (date: Date) => void;
  onToggleSelectionMode: () => void;
  onBulkEdit: () => void;
  onBulkDelete: () => void;
  onNavigateToDay: (date: Date) => void;
}

type DayType = 'vacation' | 'wfh' | 'bridge' | 'mandatory' | 'activity' | 'with-issue';

interface DaySummary {
  date: string;
  dateObj: Date;
  rating?: DayRating;
  dayData?: DayData;
  type: DayType;
  people: Array<{ id: string; name: string; type: 'vacation' | 'wfh' | 'activity' }>;
}

interface PersonStats {
  personId: string;
  personName: string;
  vacationDays: number;
  wfhDays: number;
  activityDays: number;
}

type FilterType = 'all' | 'vacation' | 'wfh' | 'bridge' | 'mandatory' | 'activity' | 'need-attention';

export const SummaryView: React.FC<SummaryViewProps> = ({
  currentYear,
  dayDataMap,
  people,
  manualOverrides,
  selectedDates,
  selectionMode,
  onDaySelect,
  onToggleSelectionMode,
  onBulkEdit,
  onBulkDelete,
  onNavigateToDay,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('need-attention');
  const summaryData = useMemo(() => {
    const allDays: DaySummary[] = [];
    const personStats: PersonStats[] = people.map(p => ({
      personId: p.id,
      personName: p.name,
      vacationDays: 0,
      wfhDays: 0,
      activityDays: 0,
    }));

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

    // Iterate through all days of the year
    for (let month = 0; month < 12; month++) {
      const lastDay = new Date(currentYear, month + 1, 0);
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(currentYear, month, day);
        const dateString = `${currentYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = dayDataMap.get(dateString);
        
        if (!dayData) continue;

        const isPublicHoliday = dayData.isPublicHoliday;
        const isSchoolHoliday = dayData.schoolStatus === 'closed' || dayData.schoolStatus === 'half-day';
        const isBridgeDay = dayData.isBridgeDay;

        // Check manual overrides for this day
        // Priority: manualOverrides map (from hook) > dayData.manualOverride (from dayDataMap)
        const override = manualOverrides.get(dateString) || dayData.manualOverride;
        
        // Debug: log if we find an override
        if (override && process.env.NODE_ENV === 'development') {
          console.log(`Found override for ${dateString}:`, override);
        }

        // Check if it's a weekend
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6

        // Extract people involved on this day
        const dayPeople: Array<{ id: string; name: string; type: 'vacation' | 'wfh' | 'activity' }> = [];
        if (override) {
          Object.entries(override.people).forEach(([personId, type]) => {
            const person = people.find(p => p.id === personId);
            if (person) {
              dayPeople.push({ id: personId, name: person.name, type });
            }
            // Count person stats from overrides
            // Exclude weekends and public holidays from vacation and mandatory counts
            const stat = personStats.find(s => s.personId === personId);
            if (stat) {
              if (type === 'vacation' && !isPublicHoliday && !isWeekend) {
                stat.vacationDays++;
              } else if (type === 'wfh') {
                stat.wfhDays++;
              } else if (type === 'activity') {
                stat.activityDays++;
              }
            }
          });
        }

        // Calculate rating to determine if it's a WFH_CANDIDATE
        const kidsCanStayHome: Record<string, boolean> = {};
        const overrideForKids = override;
        
        kids.forEach((kid: PersonConfig) => {
          const hasActivity = overrideForKids?.people[kid.id] === 'activity';
          kidsCanStayHome[kid.id] = isSchoolHoliday && !hasActivity;
        });
        
        const mandatoryDaysCount = mandatoryDaysCountMap.get(dateString) ?? 0;
        
        const currentDay: DayContext = {
          date: date,
          isPublicHoliday,
          schoolStatus: dayData.schoolStatus,
          isBridgeDay,
          kidsCanStayHome,
          adultsCanWfh,
          mandatoryDaysCount,
          maxMandatoryDaysForWfhSuggestion: userPreferences.maxMandatoryDaysForWfhSuggestion
        };
        
        const rating = calculateDayRating(currentDay);

        // Check if any kids have activities on this day
        const hasKidActivity = kids.some((kid: PersonConfig) => {
          return override?.people[kid.id] === 'activity';
        });

        // Determine day type and categorize
        // Exclude public holidays and weekends from vacation and mandatory
        if (!isPublicHoliday) {
          let dayType: DaySummary['type'] | null = null;
          let isWithIssue = false;

          // Check for manual overrides first
          if (override) {
            const overrideTypes = Object.values(override.people);
            if (overrideTypes.includes('vacation') && !isWeekend) {
              // Only count vacation if it's not a weekend
              dayType = 'vacation';
            } else if (overrideTypes.includes('wfh')) {
              dayType = 'wfh';
            } else if (overrideTypes.includes('activity')) {
              dayType = 'activity';
            }
          }

          // If no override, check rating
          if (!dayType) {
            if (rating.tag === 'WFH_CANDIDATE') {
              dayType = 'wfh';
            } else if (rating.tag === 'MANDATORY' && !isWeekend) {
              // Only count mandatory if it's not a weekend
              dayType = 'mandatory';
            } else if (rating.tag === 'HIGH_VALUE' || isBridgeDay) {
              dayType = 'bridge';
            }
          }

          // Check if mandatory day has issues (WFH suggestion or bridge day)
          if (dayType === 'mandatory') {
            const isWfhCandidate = rating.tag === 'WFH_CANDIDATE';
            if (isWfhCandidate || isBridgeDay) {
              isWithIssue = true;
            }
          }

          // Check if we should show mandatory days (same logic as before)
          if (dayType === 'mandatory') {
            const allKidsHaveActivity = kids.length > 0 && kids.every((kid: PersonConfig) => {
              return override?.people[kid.id] === 'activity';
            });
            
            const hasAdultOnVacation = adults.some((adult: PersonConfig) => {
              return override?.people[adult.id] === 'vacation';
            });
            
            const shouldShowMandatory = !allKidsHaveActivity && !hasAdultOnVacation;
            
            if (!shouldShowMandatory) {
              dayType = null; // Don't show this mandatory day
            }
          }

          if (dayType) {
            // Add as the primary type
            allDays.push({ 
              date: dateString, 
              dateObj: date, 
              dayData, 
              rating,
              type: dayType,
              people: dayPeople
            });

            // If it's a mandatory day with issues, also add as 'with-issue'
            if (isWithIssue && dayType === 'mandatory') {
              allDays.push({ 
                date: dateString, 
                dateObj: date, 
                dayData, 
                rating,
                type: 'with-issue',
                people: dayPeople
              });
            }
          }
        }
      }
    }

    // Remove duplicates (same date can appear multiple times with different types)
    const uniqueDays = new Map<string, DaySummary>();
    allDays.forEach(day => {
      const existing = uniqueDays.get(day.date);
      if (!existing) {
        uniqueDays.set(day.date, day);
      } else {
        const dayType: DayType = day.type;
        const existingType: DayType = existing.type;
        if (dayType === 'with-issue' && existingType !== 'with-issue') {
          // Keep 'with-issue' entry if we have both
          uniqueDays.set(day.date, day);
        } else if (dayType !== 'with-issue' && existingType === 'with-issue') {
          // Replace 'with-issue' with actual type if we have it
          uniqueDays.set(day.date, day);
        }
      }
    });

    return {
      allDays: Array.from(uniqueDays.values()).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()),
      personStats: personStats.filter(p => p.vacationDays > 0 || p.wfhDays > 0 || p.activityDays > 0),
    };
  }, [currentYear, dayDataMap, people, manualOverrides]);

  // Filter days based on active filter
  const filteredDays = useMemo(() => {
    if (activeFilter === 'all') {
      return summaryData.allDays;
    }
    if (activeFilter === 'need-attention') {
      // Show mandatory, wfh, and bridge days
      return summaryData.allDays.filter(day => 
        day.type === 'mandatory' || day.type === 'wfh' || day.type === 'bridge'
      );
    }
    return summaryData.allDays.filter(day => day.type === activeFilter);
  }, [summaryData.allDays, activeFilter]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isWeekend = (date: Date) => {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  };

  const handleRowClick = (date: Date, dateString: string, e: React.MouseEvent) => {
    // If selection mode is active, toggle selection
    // Otherwise, navigate to monthly view for that day
    if (selectionMode) {
      onDaySelect(date);
    } else {
      onNavigateToDay(date);
    }
  };

  const handleCheckboxClick = (date: Date, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click from firing
    // Checkbox only works in selection mode
    if (selectionMode) {
      onDaySelect(date);
    }
  };

  const isDateSelected = (dateString: string) => {
    return selectedDates.has(dateString);
  };

  return (
    <div className={styles.summaryContainer}>
      <h2 className={styles.title}>Vacation Summary for {currentYear}</h2>

      {/* Person Statistics Table */}
      {summaryData.personStats.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Person Statistics</h3>
          <table className={styles.statsTable}>
            <thead>
              <tr>
                <th>Person</th>
                <th>🏖️ Vacation</th>
                <th>🏠 WFH</th>
                <th>🎨 Activity</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {summaryData.personStats.map((stat) => {
                const total = stat.vacationDays + stat.wfhDays + stat.activityDays;
                return (
                  <tr key={stat.personId}>
                    <td className={styles.personName}>{stat.personName}</td>
                    <td className={styles.statCell}>{stat.vacationDays > 0 ? stat.vacationDays : '-'}</td>
                    <td className={styles.statCell}>{stat.wfhDays > 0 ? stat.wfhDays : '-'}</td>
                    <td className={styles.statCell}>{stat.activityDays > 0 ? stat.activityDays : '-'}</td>
                    <td className={styles.totalCell}>{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Days Summary Table */}
      <section className={styles.section}>
        <div className={styles.daysSummaryHeader}>
          <h3 className={styles.sectionTitle}>Days Summary</h3>
          <div className={styles.filterButtons}>
            <button
              className={classNames(styles.filterButton, activeFilter === 'all' && styles.filterButtonActive)}
              onClick={() => setActiveFilter('all')}
              title="Show all days"
            >
              All
            </button>
            <button
              className={classNames(styles.filterButton, activeFilter === 'vacation' && styles.filterButtonActive)}
              onClick={() => setActiveFilter('vacation')}
              title="Show vacation days"
            >
              🏖️ Vacation
            </button>
            <button
              className={classNames(styles.filterButton, activeFilter === 'wfh' && styles.filterButtonActive)}
              onClick={() => setActiveFilter('wfh')}
              title="Show WFH days"
            >
              🏠 WFH
            </button>
            <button
              className={classNames(styles.filterButton, activeFilter === 'bridge' && styles.filterButtonActive)}
              onClick={() => setActiveFilter('bridge')}
              title="Show bridge days"
            >
              🌉 Bridge
            </button>
            <button
              className={classNames(styles.filterButton, activeFilter === 'mandatory' && styles.filterButtonActive)}
              onClick={() => setActiveFilter('mandatory')}
              title="Show mandatory days"
            >
              ⚠️ Mandatory
            </button>
            <button
              className={classNames(styles.filterButton, activeFilter === 'activity' && styles.filterButtonActive)}
              onClick={() => setActiveFilter('activity')}
              title="Show activity days"
            >
              🎨 Activity
            </button>
            <button
              className={classNames(styles.filterButton, activeFilter === 'need-attention' && styles.filterButtonActive)}
              onClick={() => setActiveFilter('need-attention')}
              title="Show days that need attention (mandatory, WFH, bridge)"
            >
              ⚠️ Need Attention
            </button>
          </div>
          <div className={styles.summaryActions}>
            <button
              className={classNames(styles.selectButton, selectionMode && styles.selectButtonActive)}
              onClick={onToggleSelectionMode}
              aria-label="Toggle selection mode"
              title="Toggle selection mode"
            >
              {selectionMode ? '✓ Select' : 'Select'}
            </button>
            {selectionMode && selectedDates.size > 0 && (
              <>
                <span className={styles.selectedCount}>
                  {selectedDates.size} selected
                </span>
                <button
                  className={styles.actionButton}
                  onClick={onBulkEdit}
                  aria-label="Edit selected days"
                  title="Edit selected days"
                >
                  Edit
                </button>
                <button
                  className={classNames(styles.actionButton, styles.deleteButton)}
                  onClick={onBulkDelete}
                  aria-label="Delete selected days"
                  title="Delete selected days"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
        <table className={styles.daysTable}>
          <thead>
            <tr>
              {selectionMode && <th className={styles.checkboxHeader}></th>}
              <th>Date</th>
              <th>Type</th>
              <th>People</th>
              <th>Holiday/Note</th>
            </tr>
          </thead>
          <tbody>
            {filteredDays.map((day) => {
              const isSelected = isDateSelected(day.date);
              const getTypeLabel = () => {
                switch (day.type) {
                  case 'vacation': return 'Vacation';
                  case 'wfh': return 'WFH';
                  case 'bridge': return 'Bridge';
                  case 'mandatory': return 'Mandatory';
                  case 'activity': return 'Activity';
                  case 'with-issue': return 'With Issue';
                  default: return day.type;
                }
              };
              const getRowClass = () => {
                switch (day.type) {
                  case 'vacation': return styles.vacationRow;
                  case 'wfh': return styles.wfhRow;
                  case 'bridge': return styles.bridgeRow;
                  case 'mandatory': return styles.mandatoryRow;
                  case 'activity': return styles.activityRow;
                  case 'with-issue': return styles.withIssueRow;
                  default: return '';
                }
              };
              const peopleList = day.people.length > 0 
                ? day.people.map(p => `${p.name} (${p.type === 'vacation' ? '🏖️' : p.type === 'wfh' ? '🏠' : '🎨'})`).join(', ')
                : '-';
              
              const isWeekendDay = isWeekend(day.dateObj);
              
              return (
                <tr 
                  key={`${day.type}-${day.date}`} 
                  className={classNames(
                    getRowClass(), 
                    isSelected && styles.selectedRow,
                    isWeekendDay && styles.weekendRow
                  )}
                  onClick={(e) => handleRowClick(day.dateObj, day.date, e)}
                >
                  {selectionMode && (
                    <td className={styles.checkboxCell} onClick={(e) => handleCheckboxClick(day.dateObj, e)}>
                      <span className={classNames(styles.checkbox, isSelected && styles.checkboxChecked)}>
                        {isSelected && '✓'}
                      </span>
                    </td>
                  )}
                  <td className={styles.dateCell}>{formatDate(day.dateObj)}</td>
                  <td className={styles.typeCell}>
                    <span className={styles.typeBadge}>{getTypeLabel()}</span>
                  </td>
                  <td className={styles.peopleCell}>{peopleList}</td>
                  <td className={styles.noteCell}>{day.dayData?.holidayName || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {filteredDays.length === 0 && summaryData.personStats.length === 0 && (
        <div className={styles.emptyState}>
          No vacation data available for {currentYear}
        </div>
      )}
      {filteredDays.length === 0 && summaryData.personStats.length > 0 && (
        <div className={styles.emptyState}>
          No days match the selected filter
        </div>
      )}
    </div>
  );
};

function classNames(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

