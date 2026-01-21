-- Create people table
CREATE TABLE IF NOT EXISTS people (
  id SERIAL PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL, -- Unique identifier within family (e.g., "mom", "dad", "leon")
  name TEXT NOT NULL,
  is_child BOOLEAN NOT NULL DEFAULT false,
  availability BOOLEAN, -- For adults: whether they are available for childcare
  wfh_ability BOOLEAN, -- For adults: whether they can work from home
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(family_id, person_id)
);

-- Create family_preferences table
CREATE TABLE IF NOT EXISTS family_preferences (
  id SERIAL PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  max_mandatory_days_for_wfh_suggestion INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(family_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_people_family_id ON people(family_id);
CREATE INDEX IF NOT EXISTS idx_people_person_id ON people(person_id);
CREATE INDEX IF NOT EXISTS idx_family_preferences_family_id ON family_preferences(family_id);

-- Enable Row Level Security (RLS)
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for public read/write (you can restrict this later with authentication)
CREATE POLICY "Allow all operations on people" ON people
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on family_preferences" ON family_preferences
  FOR ALL USING (true) WITH CHECK (true);

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_people_updated_at
  BEFORE UPDATE ON people
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_preferences_updated_at
  BEFORE UPDATE ON family_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

