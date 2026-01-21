/**
 * OpenHolidays API Service
 * 
 * Fetches public and school holidays from https://www.openholidaysapi.org/
 * Uses Next.js API routes to proxy requests and avoid CORS issues
 */

const API_BASE_URL = '/api/holidays';

export interface Holiday {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  name: Array<{ language: string; text: string }>;
  nationwide: boolean;
  subdivisions?: Array<{ code: string; shortName: string }>;
}

export interface PublicHoliday extends Holiday {
  type: 'public';
}

export interface SchoolHoliday extends Holiday {
  type: 'school';
}

/**
 * Fetch public holidays for a country within a date range
 */
export async function fetchPublicHolidays(
  countryIsoCode: string,
  validFrom: string,
  validTo: string,
  languageIsoCode: string = 'EN',
  subdivisionCode?: string
): Promise<PublicHoliday[]> {
  const params = new URLSearchParams({
    countryIsoCode,
    languageIsoCode,
    validFrom,
    validTo,
  });
  
  if (subdivisionCode) {
    params.set('subdivisionCode', subdivisionCode);
  }
  
  const url = `${API_BASE_URL}/public?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      const status = response.status;
      const errorMessage = errorData.error || response.statusText;
      
      // Provide user-friendly messages for common errors
      if (status === 503 || status === 502 || status === 429) {
        throw new Error(`The holiday service is temporarily unavailable. Please try again in a moment. (${status} ${errorMessage})`);
      }
      
      throw new Error(`Failed to fetch public holidays: ${status} ${errorMessage}`);
    }

    const data = await response.json();
    
    // Check if the response is an error object
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data.map((holiday: any) => ({
      ...holiday,
      type: 'public' as const,
    }));
  } catch (error) {
    console.error('Error fetching public holidays:', error);
    throw error;
  }
}

/**
 * Fetch school holidays for a country within a date range
 */
export async function fetchSchoolHolidays(
  countryIsoCode: string,
  validFrom: string,
  validTo: string,
  languageIsoCode: string = 'EN',
  subdivisionCode?: string
): Promise<SchoolHoliday[]> {
  const params = new URLSearchParams({
    countryIsoCode,
    languageIsoCode,
    validFrom,
    validTo,
  });
  
  if (subdivisionCode) {
    params.set('subdivisionCode', subdivisionCode);
  }
  
  const url = `${API_BASE_URL}/school?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      const status = response.status;
      const errorMessage = errorData.error || response.statusText;
      
      // Provide user-friendly messages for common errors
      if (status === 503 || status === 502 || status === 429) {
        throw new Error(`The holiday service is temporarily unavailable. Please try again in a moment. (${status} ${errorMessage})`);
      }
      
      throw new Error(`Failed to fetch school holidays: ${status} ${errorMessage}`);
    }

    const data = await response.json();
    
    // Check if the response is an error object
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data.map((holiday: any) => ({
      ...holiday,
      type: 'school' as const,
    }));
  } catch (error) {
    console.error('Error fetching school holidays:', error);
    throw error;
  }
}

/**
 * Fetch both public and school holidays for a country within a date range
 */
export async function fetchAllHolidays(
  countryIsoCode: string,
  validFrom: string,
  validTo: string,
  languageIsoCode: string = 'EN',
  subdivisionCode?: string
): Promise<{ publicHolidays: PublicHoliday[]; schoolHolidays: SchoolHoliday[] }> {
  const [publicHolidays, schoolHolidays] = await Promise.all([
    fetchPublicHolidays(countryIsoCode, validFrom, validTo, languageIsoCode, subdivisionCode),
    fetchSchoolHolidays(countryIsoCode, validFrom, validTo, languageIsoCode, subdivisionCode),
  ]);

  return { publicHolidays, schoolHolidays };
}

/**
 * Get holiday name in the specified language
 */
export function getHolidayName(holiday: Holiday, languageIsoCode: string = 'EN'): string | null {
  const nameEntry = holiday.name.find(n => n.language === languageIsoCode);
  return nameEntry?.text || holiday.name[0]?.text || null;
}

/**
 * Check if a date falls within a holiday period
 */
export function isDateInHoliday(date: Date, holiday: Holiday): boolean {
  const dateStr = date.toISOString().split('T')[0];
  return dateStr >= holiday.startDate && dateStr <= holiday.endDate;
}

