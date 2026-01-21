"use client";

import React, { useState, useMemo, useEffect } from 'react';
import classNames from "classnames";
import styles from './VacationCalendar.module.css';
import { MonthlyView } from './MonthlyView';
import { YearlyView } from './YearlyView';
import { SummaryView } from './SummaryView';
import { DayEditDialog, type ManualOverride } from './DayEditDialog';
import { useCalendarData } from '@/hooks/useCalendarData';
import { useManualOverrides } from '@/hooks/useManualOverrides';
import { THEME_COLORS, THEME_SPACING } from '@/utils/themeConstants';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export const VacationCalendar = () => {
  const now = new Date();
  const initialMonthIndex = now.getMonth();
  const initialYearNum = now.getFullYear();

  const [currentMonth, setCurrentMonth] = useState(initialMonthIndex);
  const [currentYear, setCurrentYear] = useState(initialYearNum);
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly' | 'summary'>('monthly');
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

  // Get authenticated user's family
  const { getFamilyId, user, signOut } = useAuth();
  const router = useRouter();
  const [familyId, setFamilyId] = useState<string | undefined>(undefined);

  // Load family ID from auth
  useEffect(() => {
    const loadFamilyId = async () => {
      if (user) {
        const id = await getFamilyId();
        setFamilyId(id || undefined);
      }
    };
    loadFamilyId();
  }, [user, getFamilyId]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

  // Get manual overrides management
  const {
    manualOverrides,
    people,
    handleSaveOverride,
    handleDeleteOverride,
    setHolidaysDataForOverrides,
  } = useManualOverrides(holidaysData, familyId);

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

  const handleNavigateToDay = (date: Date) => {
    setCurrentMonth(date.getMonth());
    setCurrentYear(date.getFullYear());
    setViewMode('monthly');
    // Optionally, you could also set the selected date to open the dialog
    // setSelectedDate(date);
    // setDialogOpen(true);
  };

  const monthString = useMemo(() => {
    const date = new Date(currentYear, currentMonth, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [currentMonth, currentYear]);

  const yearString = useMemo(() => {
    return currentYear.toString();
  }, [currentYear]);

  const handleDayClick = (date: Date) => {
    if (viewMode === 'summary') {
      // In summary view, always toggle selection
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
    } else if (selectionMode) {
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
          onClick={viewMode === 'yearly' || viewMode === 'summary' ? goToPreviousYear : goToPreviousMonth}
          aria-label={viewMode === 'yearly' || viewMode === 'summary' ? 'Previous year' : 'Previous month'}
          disabled={isLoadingHolidays}
        >
          ‹
        </button>
        <div className={styles.monthTitleContainer}>
          <button 
            className={styles.navButton}
            onClick={viewMode === 'summary' ? () => {
              const now = new Date();
              setCurrentYear(now.getFullYear());
            } : goToCurrentMonth}
            aria-label={viewMode === 'summary' ? 'Go to current year' : 'Go to current month'}
            disabled={isLoadingHolidays}
            title={viewMode === 'summary' ? 'Go to current year' : 'Go to current month'}
          >
            Today
          </button>
          <h2 className={styles.monthTitle}>
            {viewMode === 'yearly' || viewMode === 'summary' ? yearString : monthString}
            {isLoadingHolidays && <span style={{ fontSize: '0.6em', marginLeft: '8px' }}>Loading...</span>}
          </h2>
        </div>
        <div className={styles.viewButtonsContainer}>
          {viewMode !== 'summary' && (
            <>
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
                  <span className={styles.selectedCount}>
                    {selectedDates.size}
                  </span>
                  <button
                    className={classNames(styles.navButton, styles.actionButton)}
                    onClick={handleOpenBulkDialog}
                    aria-label="Edit selected days"
                    disabled={isLoadingHolidays}
                    title="Edit selected days"
                  >
                    Edit
                  </button>
                  <button
                    className={classNames(styles.navButton, styles.deleteButton)}
                    onClick={handleBulkDelete}
                    aria-label="Delete selected days"
                    disabled={isLoadingHolidays}
                    title="Delete selected days"
                  >
                    Del
                  </button>
                </>
              )}
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
          <button
            className={classNames(styles.navButton, viewMode === 'summary' && styles.activeViewButton)}
            onClick={() => setViewMode('summary')}
            aria-label="Summary view"
            disabled={isLoadingHolidays}
            title="Summary view"
          >
            Summary
          </button>
        </div>
          <button 
            className={classNames(styles.navButton, styles.arrow)}
            onClick={viewMode === 'yearly' || viewMode === 'summary' ? goToNextYear : goToNextMonth}
            aria-label={viewMode === 'yearly' || viewMode === 'summary' ? 'Next year' : 'Next month'}
            disabled={isLoadingHolidays}
          >
            ›
          </button>
        </div>
        {user && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.9em', color: THEME_COLORS.uiTextSecondary }}>
              {user.email}
            </span>
            <button
              onClick={handleSignOut}
              className={styles.navButton}
              aria-label="Sign out"
              title="Sign out"
              style={{ fontSize: '0.85em', padding: '4px 8px' }}
            >
              Sign Out
            </button>
          </div>
        )}
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
          familyId={familyId}
        />
      ) : viewMode === 'yearly' ? (
        <YearlyView
          currentYear={currentYear}
          currentMonth={0}
          dayDataMap={finalDayDataMap}
          people={people}
          onDayClick={handleDayClick}
          selectedDates={selectedDates}
          selectionMode={selectionMode}
          familyId={familyId}
        />
      ) : (
        <SummaryView
          currentYear={currentYear}
          dayDataMap={finalDayDataMap}
          people={people}
          manualOverrides={manualOverrides}
          selectedDates={selectedDates}
          selectionMode={selectionMode}
          onDaySelect={handleDayClick}
          onToggleSelectionMode={handleToggleSelectionMode}
          onBulkEdit={handleOpenBulkDialog}
          onBulkDelete={handleBulkDelete}
          onNavigateToDay={handleNavigateToDay}
          familyId={familyId}
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
