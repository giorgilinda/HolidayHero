"use client";

import React, { useState, useMemo, useEffect } from 'react';
import classNames from "classnames";
import styles from './VacationCalendar.module.css';
import { MonthlyView } from './MonthlyView';
import { YearlyView } from './YearlyView';
import { DayEditDialog, type ManualOverride } from './DayEditDialog';
import { useCalendarData } from '@/hooks/useCalendarData';
import { useManualOverrides } from '@/hooks/useManualOverrides';
import { THEME_COLORS, THEME_SPACING } from '@/utils/themeConstants';

export const VacationCalendar = () => {
  const now = new Date();
  const initialMonthIndex = now.getMonth();
  const initialYearNum = now.getFullYear();

  const [currentMonth, setCurrentMonth] = useState(initialMonthIndex);
  const [currentYear, setCurrentYear] = useState(initialYearNum);
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

  // Get calendar data (holidays, dayDataMap) - this will fetch holidays
  // Start with empty overrides, will update after overrides are loaded
  const [tempOverrides] = useState<Map<string, ManualOverride>>(new Map());
  const { dayDataMap, isLoadingHolidays, holidaysError, holidaysData } = useCalendarData(
    currentYear,
    currentMonth,
    viewMode,
    tempOverrides
  );

  // Get manual overrides management
  const {
    manualOverrides,
    people,
    handleSaveOverride,
    handleDeleteOverride,
    setHolidaysDataForOverrides,
  } = useManualOverrides(holidaysData);

  // Update holidaysData in useManualOverrides when it's fetched
  useEffect(() => {
    if (holidaysData) {
      setHolidaysDataForOverrides(holidaysData);
    }
  }, [holidaysData, setHolidaysDataForOverrides]);

  // Re-fetch calendar data with actual overrides
  const { dayDataMap: finalDayDataMap } = useCalendarData(
    currentYear,
    currentMonth,
    viewMode,
    manualOverrides
  );

  // Navigation functions
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToPreviousYear = () => {
    setCurrentYear(currentYear - 1);
  };

  const goToNextYear = () => {
    setCurrentYear(currentYear + 1);
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
  };

  const monthString = useMemo(() => {
    const date = new Date(currentYear, currentMonth, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [currentMonth, currentYear]);

  const yearString = useMemo(() => {
    return currentYear.toString();
  }, [currentYear]);

  const handleDayClick = (date: Date) => {
    if (selectionMode) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      setSelectedDates(prev => {
        const newSet = new Set(prev);
        if (newSet.has(dateStr)) {
          newSet.delete(dateStr);
        } else {
          newSet.add(dateStr);
        }
        return newSet;
      });
    } else {
      setSelectedDate(date);
      setDialogOpen(true);
    }
  };

  const getSelectedDateOverride = (): ManualOverride | null => {
    if (!selectedDate) return null;
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return manualOverrides.get(dateStr) || null;
  };

  const handleSave = (override: ManualOverride) => {
    handleSaveOverride(override);
  };

  const handleBulkSave = (overrides: ManualOverride[]) => {
    overrides.forEach(override => {
      handleSaveOverride(override);
    });
    setSelectedDates(new Set());
    setSelectionMode(false);
  };

  const handleDelete = () => {
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      handleDeleteOverride(dateStr);
    }
  };

  const handleBulkDelete = () => {
    if (selectedDates.size === 0) return;
    if (window.confirm(`Are you sure you want to delete overrides for ${selectedDates.size} day(s)?`)) {
      selectedDates.forEach(dateStr => {
        handleDeleteOverride(dateStr);
      });
      setSelectedDates(new Set());
      setSelectionMode(false);
    }
  };

  const handleToggleSelectionMode = () => {
    setSelectionMode(prev => !prev);
    if (selectionMode) {
      setSelectedDates(new Set());
    }
  };

  const handleOpenBulkDialog = () => {
    if (selectedDates.size === 0) {
      alert('Please select at least one day');
      return;
    }
    setDialogOpen(true);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button 
          className={classNames(styles.navButton, styles.arrow)}
          onClick={viewMode === 'yearly' ? goToPreviousYear : goToPreviousMonth}
          aria-label={viewMode === 'yearly' ? 'Previous year' : 'Previous month'}
          disabled={isLoadingHolidays}
        >
          ‹
        </button>
        <div className={styles.monthTitleContainer}>
          <button 
            className={styles.navButton}
            onClick={goToCurrentMonth}
            aria-label="Go to current month"
            disabled={isLoadingHolidays}
            title="Go to current month"
          >
            Today
          </button>
          <h2 className={styles.monthTitle}>
            {viewMode === 'yearly' ? yearString : monthString}
            {isLoadingHolidays && <span style={{ fontSize: '0.6em', marginLeft: '8px' }}>Loading...</span>}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className={classNames(styles.navButton, selectionMode && styles.activeViewButton)}
            onClick={handleToggleSelectionMode}
            aria-label="Toggle selection mode"
            disabled={isLoadingHolidays}
            title="Toggle selection mode"
          >
            {selectionMode ? '✓ Select' : 'Select'}
          </button>
          {selectionMode && selectedDates.size > 0 && (
            <>
              <span style={{ fontSize: '0.9em', color: 'var(--ui-text-secondary)' }}>
                {selectedDates.size} selected
              </span>
              <button
                className={classNames(styles.navButton)}
                onClick={handleOpenBulkDialog}
                aria-label="Edit selected days"
                disabled={isLoadingHolidays}
                title="Edit selected days"
              >
                Edit
              </button>
              <button
                className={classNames(styles.navButton)}
                onClick={handleBulkDelete}
                aria-label="Delete selected days"
                disabled={isLoadingHolidays}
                title="Delete selected days"
                style={{ backgroundColor: 'var(--error-primary)', color: 'var(--color-text-inverse)' }}
              >
                Delete
              </button>
            </>
          )}
          <button
            className={classNames(styles.navButton, viewMode === 'monthly' && styles.activeViewButton)}
            onClick={() => setViewMode('monthly')}
            aria-label="Monthly view"
            disabled={isLoadingHolidays}
            title="Monthly view"
          >
            Month
          </button>
          <button
            className={classNames(styles.navButton, viewMode === 'yearly' && styles.activeViewButton)}
            onClick={() => setViewMode('yearly')}
            aria-label="Yearly view"
            disabled={isLoadingHolidays}
            title="Yearly view"
          >
            Year
          </button>
        </div>
        <button 
          className={classNames(styles.navButton, styles.arrow)}
          onClick={viewMode === 'yearly' ? goToNextYear : goToNextMonth}
          aria-label={viewMode === 'yearly' ? 'Next year' : 'Next month'}
          disabled={isLoadingHolidays}
        >
          ›
        </button>
      </div>
      {holidaysError && (
        <div style={{ 
          padding: THEME_SPACING.sm, 
          margin: THEME_SPACING.sm, 
          backgroundColor: THEME_COLORS.errorBackground, 
          color: THEME_COLORS.errorText, 
          borderRadius: '4px' 
        }}>
          Error loading holidays: {holidaysError}
        </div>
      )}
      {viewMode === 'monthly' ? (
        <MonthlyView
          currentYear={currentYear}
          currentMonth={currentMonth}
          dayDataMap={finalDayDataMap}
          people={people}
          onDayClick={handleDayClick}
          selectedDates={selectedDates}
          selectionMode={selectionMode}
        />
      ) : (
        <YearlyView
          currentYear={currentYear}
          currentMonth={0}
          dayDataMap={finalDayDataMap}
          people={people}
          onDayClick={handleDayClick}
          selectedDates={selectedDates}
          selectionMode={selectionMode}
        />
      )}
      <DayEditDialog
        isOpen={dialogOpen}
        date={selectionMode && selectedDates.size > 0 ? null : selectedDate}
        dates={selectionMode ? Array.from(selectedDates) : null}
        people={people}
        existingOverride={selectionMode ? null : getSelectedDateOverride()}
        onClose={() => {
          setDialogOpen(false);
          if (selectionMode) {
            setSelectedDates(new Set());
            setSelectionMode(false);
          }
        }}
        onSave={handleSave}
        onBulkSave={handleBulkSave}
        onDelete={handleDelete}
      />
    </div>
  );
};
