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
}

export const DayCell: React.FC<DayCellProps> = ({
  calendarDay,
  people,
  isCurrentMonth = true,
  isValidDay = true,
  onClick,
  className,
  compact = false,
}) => {
  const isToday = isValidDay && calendarDay.date.toDateString() === new Date().toDateString();
  
  return (
    <div
      className={classNames(
        dayCellStyles.dayCell,
        !isCurrentMonth && dayCellStyles.otherMonth,
        !isValidDay && dayCellStyles.invalidDay,
        isToday && dayCellStyles.today,
        calendarDay.rating && dayCellStyles[calendarDay.rating.tag],
        calendarDay.dayData?.manualOverride && dayCellStyles.manualOverride,
        calendarDay.dayData?.manualOverride && 
          Object.values(calendarDay.dayData.manualOverride.people).includes('activity') &&
          dayCellStyles.manualOverrideActivity,
        compact && dayCellStyles.compact,
        className
      )}
      onClick={isValidDay ? onClick : undefined}
      style={{ cursor: isValidDay ? 'pointer' : 'default' }}
    >
      {isValidDay && (
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
            </div>
          )}
        </>
      )}
    </div>
  );
};

