import type { NextApiRequest, NextApiResponse } from "next";
import fs from 'fs';
import path from 'path';

const OVERRIDES_FILE = path.join(process.cwd(), 'src/data/manualOverrides.json');

type Override = {
  date: string;
  people: Record<string, 'vacation' | 'wfh' | 'activity'>; // Map of person ID to type
};

type OverridesData = {
  overrides: Override[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OverridesData | { error: string }>
) {
  if (req.method === 'GET') {
    try {
      const fileContents = fs.readFileSync(OVERRIDES_FILE, 'utf8');
      const data: OverridesData = JSON.parse(fileContents);
      res.status(200).json(data);
    } catch (error) {
      console.error('Error reading overrides:', error);
      res.status(200).json({ overrides: [] });
    }
  } else if (req.method === 'POST') {
    try {
      const { overrides } = req.body as OverridesData;
      
      if (!Array.isArray(overrides)) {
        return res.status(400).json({ error: 'Invalid overrides format' });
      }

      const data: OverridesData = { overrides };
      fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(data, null, 2), 'utf8');
      
      res.status(200).json(data);
    } catch (error) {
      console.error('Error saving overrides:', error);
      res.status(500).json({ error: 'Failed to save overrides' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

