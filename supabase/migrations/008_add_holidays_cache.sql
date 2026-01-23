-- Create holidays cache table to store public and school holidays
-- This reduces API calls and provides fallback when the external API is down
CREATE TABLE IF NOT EXISTS holidays_cache (
  id SERIAL PRIMARY KEY,
  country_code TEXT NOT NULL,
  subdivision_code TEXT,
  language_code TEXT NOT NULL DEFAULT 'EN',
  holiday_type TEXT NOT NULL CHECK (holiday_type IN ('public', 'school')),
  holiday_id TEXT NOT NULL, -- ID from the external API
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  holiday_data JSONB NOT NULL, -- Full holiday object from API
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint using a unique index to handle NULL subdivision_code properly
-- This ensures no duplicates for the same holiday
CREATE UNIQUE INDEX IF NOT EXISTS idx_holidays_cache_unique ON holidays_cache(
  country_code, 
  COALESCE(subdivision_code, ''), 
  language_code, 
  holiday_type, 
  holiday_id, 
  start_date, 
  end_date
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_holidays_cache_country_subdivision ON holidays_cache(country_code, COALESCE(subdivision_code, ''));
CREATE INDEX IF NOT EXISTS idx_holidays_cache_type ON holidays_cache(holiday_type);
CREATE INDEX IF NOT EXISTS idx_holidays_cache_dates ON holidays_cache(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_holidays_cache_date_range ON holidays_cache USING GIST (daterange(start_date, end_date, '[]'));

-- Create function to update updated_at timestamp
CREATE TRIGGER update_holidays_cache_updated_at
  BEFORE UPDATE ON holidays_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) - holidays are public data
ALTER TABLE holidays_cache ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (holidays are public information)
CREATE POLICY "Allow public read access to holidays" ON holidays_cache
  FOR SELECT USING (true);

-- Only allow inserts/updates from authenticated service (can be restricted further if needed)
-- For now, allowing inserts for caching purposes
CREATE POLICY "Allow inserts to holidays cache" ON holidays_cache
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow updates to holidays cache" ON holidays_cache
  FOR UPDATE USING (true) WITH CHECK (true);

