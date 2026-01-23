import type { NextApiRequest, NextApiResponse } from "next";
import { retryFetch } from "@/utils/retryFetch";
import { supabase } from "@/lib/supabase";

const API_BASE_URL = 'https://openholidaysapi.org';

type Holiday = {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  name: Array<{ language: string; text: string }>;
  nationwide: boolean;
  subdivisions?: Array<{ code: string; shortName: string }>;
};

/**
 * Check if holidays exist in database for the given date range
 */
async function getHolidaysFromCache(
  countryCode: string,
  subdivisionCode: string | undefined,
  languageCode: string,
  validFrom: string,
  validTo: string
): Promise<Holiday[] | null> {
  if (!supabase) {
    return null;
  }

  try {
    let query = supabase
      .from('holidays_cache')
      .select('holiday_data')
      .eq('country_code', countryCode)
      .eq('language_code', languageCode)
      .eq('holiday_type', 'school')
      .lte('start_date', validTo)
      .gte('end_date', validFrom);

    // Handle subdivision code (can be null in DB)
    if (subdivisionCode) {
      query = query.eq('subdivision_code', subdivisionCode);
    } else {
      query = query.is('subdivision_code', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching holidays from cache:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Extract holiday_data from cache and return as Holiday[]
    return data.map((row: { holiday_data: Holiday }) => row.holiday_data);
  } catch (error) {
    console.error('Error reading from holidays cache:', error);
    return null;
  }
}

/**
 * Save holidays to database cache
 */
async function saveHolidaysToCache(
  holidays: Holiday[],
  countryCode: string,
  subdivisionCode: string | undefined,
  languageCode: string
): Promise<void> {
  if (!supabase || holidays.length === 0) {
    return;
  }

  try {
    const cacheRows = holidays.map(holiday => ({
      country_code: countryCode,
      subdivision_code: subdivisionCode || null,
      language_code: languageCode,
      holiday_type: 'school' as const,
      holiday_id: holiday.id,
      start_date: holiday.startDate,
      end_date: holiday.endDate,
      holiday_data: holiday,
    }));

    // Insert holidays, ignoring duplicates
    // We'll insert in batches and catch duplicate errors
    let successCount = 0;
    for (const row of cacheRows) {
      const { error } = await supabase
        .from('holidays_cache')
        .insert(row);
      
      // Ignore duplicate errors (23505 is PostgreSQL unique violation)
      if (error) {
        if (error.code === '23505') {
          // Duplicate - that's fine, already cached
          successCount++;
        } else {
          console.error('Error saving holiday to cache:', error);
        }
      } else {
        successCount++;
      }
    }

    if (successCount > 0) {
      console.log(`Cached ${successCount} of ${holidays.length} school holidays`);
    }
  } catch (error) {
    console.error('Error saving holidays to cache:', error);
    // Don't throw - caching is optional
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Holiday[] | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { countryIsoCode, validFrom, validTo, languageIsoCode = 'EN', subdivisionCode } = req.query;

  if (!countryIsoCode || !validFrom || !validTo) {
    return res.status(400).json({ error: 'Missing required parameters: countryIsoCode, validFrom, validTo' });
  }

  const countryCode = countryIsoCode as string;
  const languageCode = languageIsoCode as string;
  const fromDate = validFrom as string;
  const toDate = validTo as string;
  const subdivision = subdivisionCode as string | undefined;

  try {
    // First, try to get holidays from database cache
    const cachedHolidays = await getHolidaysFromCache(
      countryCode,
      subdivision,
      languageCode,
      fromDate,
      toDate
    );

    if (cachedHolidays && cachedHolidays.length > 0) {
      console.log(`Returning ${cachedHolidays.length} school holidays from cache`);
      return res.status(200).json(cachedHolidays);
    }

    // If not in cache, fetch from external API
    console.log('Fetching school holidays from external API...');
    const url = new URL(`${API_BASE_URL}/SchoolHolidays`);
    url.searchParams.set('countryIsoCode', countryCode);
    url.searchParams.set('languageIsoCode', languageCode);
    url.searchParams.set('validFrom', fromDate);
    url.searchParams.set('validTo', toDate);
    
    if (subdivision) {
      url.searchParams.set('subdivisionCode', subdivision);
    }

    const response = await retryFetch(url.toString(), {
      headers: {
        'accept': 'application/json',
      },
    });

    if (!response.ok) {
      // If API fails and we have cached data (even if partial), return it
      if (cachedHolidays && cachedHolidays.length > 0) {
        console.log('API failed, returning cached holidays as fallback');
        return res.status(200).json(cachedHolidays);
      }

      // Return 503 for temporary errors, 500 for permanent ones
      const statusCode = response.status === 503 || response.status === 502 || response.status === 429 
        ? 503 
        : 500;
      const errorMessage = `OpenHolidays API error: ${response.status} ${response.statusText}`;
      return res.status(statusCode).json({ error: errorMessage });
    }

    const data = await response.json() as Holiday[];
    
    // Save to cache asynchronously (don't wait for it)
    saveHolidaysToCache(data, countryCode, subdivision, languageCode).catch(err => {
      console.error('Failed to cache holidays:', err);
    });

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching school holidays:', error);
    
    // Try to return cached data as fallback
    try {
      const cachedHolidays = await getHolidaysFromCache(
        countryCode,
        subdivision,
        languageCode,
        fromDate,
        toDate
      );
      
      if (cachedHolidays && cachedHolidays.length > 0) {
        console.log('Error occurred, returning cached holidays as fallback');
        return res.status(200).json(cachedHolidays);
      }
    } catch (cacheError) {
      console.error('Error fetching from cache as fallback:', cacheError);
    }

    // Network errors or other issues
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch school holidays' 
    });
  }
}

