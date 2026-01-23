"use client";

import React from 'react';
import classNames from 'classnames';
import dayCellStyles from './DayCell.module.css';
import { CalendarDay } from './calendarTypes';
import { Person } from './DayEditDialog';

interface DayCellProps {
  calendarDay: CalendarDay;
  people: Person[];
  isCurrentMonth?: boolean;
  isValidDay?: boolean;
  onClick: () => void;
  className?: string;
  compact?: boolean; // For yearly view - show only day number and color
  isSelected?: boolean;
  selectionMode?: boolean;
}

export const DayCell: React.FC<DayCellProps> = ({
  calendarDay,
  people,
  isCurrentMonth = true,
  isValidDay = true,
  onClick,
  className,
  compact = false,
  isSelected = false,
  selectionMode = false,
}) => {
  const isToday = isValidDay && calendarDay.date.toDateString() === new Date().toDateString();
  const dayOfWeek = calendarDay.date.getDay();
  const isWeekend = isValidDay && (dayOfWeek === 0 || dayOfWeek === 6); // Sunday = 0, Saturday = 6
  
  return (
    <div
      className={classNames(
        dayCellStyles.dayCell,
        !isCurrentMonth && dayCellStyles.otherMonth,
        !isValidDay && dayCellStyles.invalidDay,
        isWeekend && dayCellStyles.weekend,
        isToday && dayCellStyles.today,
        calendarDay.rating && dayCellStyles[calendarDay.rating.tag],
        calendarDay.dayData?.manualOverride && dayCellStyles.manualOverride,
        calendarDay.dayData?.manualOverride && 
          Object.values(calendarDay.dayData.manualOverride.people).includes('activity') &&
          dayCellStyles.manualOverrideActivity,
        calendarDay.dayData?.vacationOpportunity && dayCellStyles.vacationOpportunityDay,
        compact && dayCellStyles.compact,
        isSelected && dayCellStyles.selected,
        selectionMode && dayCellStyles.selectionMode,
        className
      )}
      onClick={isValidDay ? onClick : undefined}
    >
      {isValidDay ? (
        <>
          <div className={dayCellStyles.dayNumber}>
            {calendarDay.date.getDate()}
          </div>
          {!compact && calendarDay.rating && (
            <div className={dayCellStyles.dayContent}>
              {calendarDay.dayData?.holidayName && (
                <div className={dayCellStyles.holidayName}>
                  {calendarDay.dayData.holidayName}
                </div>
              )}
              {calendarDay.dayData?.manualOverride && (
                <div className={dayCellStyles.manualOverrideInfo}>
                  {Object.entries(calendarDay.dayData.manualOverride.people).map(([personId, type]) => {
                    const person = people.find(p => p.id === personId);
                    if (!person) return null;
                    const icon = type === 'vacation' ? '🏖️' : type === 'wfh' ? '🏠' : '🎨';
                    return (
                      <div key={personId} className={classNames(
                        dayCellStyles.manualOverridePerson,
                        type === 'activity' && dayCellStyles.manualOverridePersonActivity
                      )}>
                        <span className={dayCellStyles.manualOverridePersonName}>{person.name}:</span>
                        <span className={dayCellStyles.manualOverridePersonType}>
                          {icon}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className={dayCellStyles.recommendation}>
                {calendarDay.rating.recommendation}
              </div>
              {calendarDay.rating.wfhSuggestion && (
                <div className={dayCellStyles.wfhSuggestion}>
                  <span className={dayCellStyles.wfhSuggestionIcon}>💡</span>
                  <span className={dayCellStyles.wfhSuggestionText}>
                    {calendarDay.rating.wfhSuggestion.reason}
                  </span>
                </div>
              )}
              {calendarDay.dayData?.vacationOpportunity && (
                <div className={dayCellStyles.vacationOpportunity}>
                  <span className={dayCellStyles.vacationOpportunityIcon}>🎯</span>
                  <span className={dayCellStyles.vacationOpportunityText}>
                    {calendarDay.dayData.vacationOpportunity.ptoDaysCount} PTO = {calendarDay.dayData.vacationOpportunity.totalVacationDays} days
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

