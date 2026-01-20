/**
 * Theme Constants for TypeScript/TSX files
 * 
 * These constants mirror the CSS variables from theme.css
 * for use in inline styles and TypeScript code
 */

export const THEME_COLORS = {
  // Error Colors
  errorBackground: '#fee',
  errorText: '#c00',
  errorPrimary: '#ea4335',
  errorPrimaryDark: '#c5221f',
  
  // Button Colors
  buttonPrimary: '#1a73e8',
  buttonPrimaryHover: '#1557b0',
  
  // UI Colors
  uiBackgroundLight: '#f8f9fa',
  uiBackgroundHover: '#f8f9fa',
  uiBackgroundActive: '#e8eaed',
  uiBackgroundSelected: '#e8f0fe',
  uiBackgroundInput: '#f1f3f4',
  uiBorderDefault: '#dadce0',
  uiBorderLight: '#e0e0e0',
  uiTextDefault: '#3c4043',
  uiTextSecondary: '#70757a',
  
  // Calendar Colors
  calendarHoliday: '#e2e8f0',
  calendarMandatory: '#feb2b2',
  calendarHighValue: '#fefcbf',
  calendarWorkFromHome: '#FFC067',
  calendarWorkDay: '#ffffff',
  calendarOtherMonth: '#f5f5f5',
  calendarTodayBorder: '#1a73e8',
  calendarManualOverride: '#d4edda',
  calendarManualOverrideBorder: '#28a745',
  calendarManualOverrideActivity: '#fff3cd',
  calendarManualOverrideActivityBorder: '#ffc107',
  calendarManualOverrideActivityText: '#856404',
  
  // Background
  background: '#ffffff',
} as const;

export const THEME_SPACING = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
} as const;

export const THEME_BREAKPOINTS = {
  mobile: '480px',
  tablet: '768px',
  desktop: '1200px',
} as const;

