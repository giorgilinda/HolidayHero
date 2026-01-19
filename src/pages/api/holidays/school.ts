import type { NextApiRequest, NextApiResponse } from "next";

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

  try {
    const url = new URL(`${API_BASE_URL}/SchoolHolidays`);
    url.searchParams.set('countryIsoCode', countryIsoCode as string);
    url.searchParams.set('languageIsoCode', languageIsoCode as string);
    url.searchParams.set('validFrom', validFrom as string);
    url.searchParams.set('validTo', validTo as string);
    
    if (subdivisionCode) {
      url.searchParams.set('subdivisionCode', subdivisionCode as string);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenHolidays API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching school holidays:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch school holidays' 
    });
  }
}

