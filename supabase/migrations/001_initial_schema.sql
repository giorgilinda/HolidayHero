-- Create families table (for multi-family support)
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create overrides table
CREATE TABLE IF NOT EXISTS overrides (
  id SERIAL PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  people JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(family_id, date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_overrides_family_date ON overrides(family_id, date);
CREATE INDEX IF NOT EXISTS idx_overrides_date ON overrides(date);

-- Enable Row Level Security (RLS)
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE overrides ENABLE ROW LEVEL SECURITY;

-- Create policies for public read/write (you can restrict this later with authentication)
-- For now, allowing all operations - you can add authentication later
CREATE POLICY "Allow all operations on families" ON families
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on overrides" ON overrides
  FOR ALL USING (true) WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_families_updated_at
  BEFORE UPDATE ON families
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_overrides_updated_at
  BEFORE UPDATE ON overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

