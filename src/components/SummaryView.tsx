"use client";

import React, { useMemo } from 'react';
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

interface DaySummary {
  date: string;
  dateObj: Date;
  rating?: DayRating;
  dayData?: DayData;
}

interface PersonStats {
  personId: string;
  personName: string;
  vacationDays: number;
  wfhDays: number;
  activityDays: number;
}

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
  const summaryData = useMemo(() => {
    const mandatoryDays: DaySummary[] = [];
    const wfhDays: DaySummary[] = [];
    const bridgeDays: DaySummary[] = [];
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

        // Count person stats from overrides
        if (override) {
          Object.entries(override.people).forEach(([personId, type]) => {
            const stat = personStats.find(s => s.personId === personId);
            if (stat) {
              if (type === 'vacation') stat.vacationDays++;
              else if (type === 'wfh') stat.wfhDays++;
              else if (type === 'activity') stat.activityDays++;
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

        // Track if day was added to any category
        let dayAdded = false;

        // Categorize days based on rating
        if (!isPublicHoliday) {
          if (rating.tag === 'WFH_CANDIDATE' || (override && Object.values(override.people).includes('wfh'))) {
            // WFH candidate or manual WFH override
            if (!wfhDays.find(d => d.date === dateString)) {
              wfhDays.push({ date: dateString, dateObj: date, dayData, rating });
              dayAdded = true;
            }
          } else if (rating.tag === 'MANDATORY') {
            // Mandatory days (school holidays that are not WFH candidates)
            // Only show if we need to take care of the kids:
            // 1. Not all kids have activities (at least one kid needs care)
            // 2. No adults are on vacation (no adult available to help)
            
            // Check if all kids have activities
            const allKidsHaveActivity = kids.length > 0 && kids.every((kid: PersonConfig) => {
              return override?.people[kid.id] === 'activity';
            });
            
            // Check if any adults are on vacation
            const hasAdultOnVacation = adults.some((adult: PersonConfig) => {
              return override?.people[adult.id] === 'vacation';
            });
            
            const shouldShowMandatory = !allKidsHaveActivity && !hasAdultOnVacation;
            
            if (shouldShowMandatory && !wfhDays.find(d => d.date === dateString)) {
              mandatoryDays.push({ date: dateString, dateObj: date, dayData, rating });
              dayAdded = true;
            }
          } else if (rating.tag === 'HIGH_VALUE' || isBridgeDay) {
            // Bridge days
            bridgeDays.push({ date: dateString, dateObj: date, dayData, rating });
            dayAdded = true;
          }
        }
      }
    }

    return {
      mandatoryDays: mandatoryDays.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()),
      wfhDays: wfhDays.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()),
      bridgeDays: bridgeDays.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()),
      personStats: personStats.filter(p => p.vacationDays > 0 || p.wfhDays > 0 || p.activityDays > 0),
    };
  }, [currentYear, dayDataMap, people, manualOverrides]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
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
              <th>Holiday/Note</th>
            </tr>
          </thead>
          <tbody>
            {/* Mandatory Days */}
            {summaryData.mandatoryDays.map((day) => {
              const isSelected = isDateSelected(day.date);
              return (
                <tr 
                  key={`mandatory-${day.date}`} 
                  className={classNames(styles.mandatoryRow, isSelected && styles.selectedRow)}
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
                    <span className={styles.typeBadge}>Mandatory</span>
                  </td>
                  <td className={styles.noteCell}>{day.dayData?.holidayName || '-'}</td>
                </tr>
              );
            })}
            {/* WFH Days */}
            {summaryData.wfhDays.map((day) => {
              const isSelected = isDateSelected(day.date);
              const wfhPeople = day.dayData?.manualOverride
                ? Object.entries(day.dayData.manualOverride.people)
                    .filter(([_, type]) => type === 'wfh')
                    .map(([personId]) => {
                      const person = people.find(p => p.id === personId);
                      return person?.name;
                    })
                    .filter(Boolean)
                    .join(', ')
                : null;
              return (
                <tr 
                  key={`wfh-${day.date}`} 
                  className={classNames(styles.wfhRow, isSelected && styles.selectedRow)}
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
                    <span className={styles.typeBadge}>WFH</span>
                  </td>
                  <td className={styles.noteCell}>
                    {day.dayData?.holidayName || ''}
                    {wfhPeople && (
                      <span className={styles.wfhPeople}> ({wfhPeople})</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {/* Bridge Days */}
            {summaryData.bridgeDays.map((day) => {
              const isSelected = isDateSelected(day.date);
              return (
                <tr 
                  key={`bridge-${day.date}`} 
                  className={classNames(styles.bridgeRow, isSelected && styles.selectedRow)}
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
                    <span className={styles.typeBadge}>Bridge</span>
                  </td>
                  <td className={styles.noteCell}>{day.dayData?.holidayName || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {summaryData.mandatoryDays.length === 0 && 
       summaryData.wfhDays.length === 0 && 
       summaryData.bridgeDays.length === 0 && 
       summaryData.personStats.length === 0 && (
        <div className={styles.emptyState}>
          No vacation data available for {currentYear}
        </div>
      )}
    </div>
  );
};

function classNames(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

