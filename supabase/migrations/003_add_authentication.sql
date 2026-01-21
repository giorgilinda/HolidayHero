-- Create user_families junction table for many-to-many relationship
-- This allows users to belong to multiple families and families to have multiple users
CREATE TABLE IF NOT EXISTS user_families (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, family_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_families_user_id ON user_families(user_id);
CREATE INDEX IF NOT EXISTS idx_user_families_family_id ON user_families(family_id);

-- Enable Row Level Security
ALTER TABLE user_families ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see families they belong to
CREATE POLICY "Users can view their own family memberships" ON user_families
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy: Users can insert their own family memberships (with restrictions)
CREATE POLICY "Users can create family memberships" ON user_families
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy: Only family owners/admins can update memberships
CREATE POLICY "Family owners can update memberships" ON user_families
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_families uf
      WHERE uf.family_id = user_families.family_id
      AND uf.user_id = auth.uid()
      AND uf.role IN ('owner', 'admin')
    )
  );

-- Create policy: Only family owners can delete memberships
CREATE POLICY "Family owners can delete memberships" ON user_families
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_families uf
      WHERE uf.family_id = user_families.family_id
      AND uf.user_id = auth.uid()
      AND uf.role = 'owner'
    )
  );

-- Update families table RLS policies
DROP POLICY IF EXISTS "Allow all operations on families" ON families;

-- Users can view families they belong to
CREATE POLICY "Users can view their families" ON families
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_families
      WHERE user_families.family_id = families.id
      AND user_families.user_id = auth.uid()
    )
  );

-- Users can create families (and will be auto-added as owner)
CREATE POLICY "Authenticated users can create families" ON families
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only family owners can update families
CREATE POLICY "Family owners can update families" ON families
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_families
      WHERE user_families.family_id = families.id
      AND user_families.user_id = auth.uid()
      AND user_families.role = 'owner'
    )
  );

-- Only family owners can delete families
CREATE POLICY "Family owners can delete families" ON families
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_families
      WHERE user_families.family_id = families.id
      AND user_families.user_id = auth.uid()
      AND user_families.role = 'owner'
    )
  );

-- Update overrides table RLS policies
DROP POLICY IF EXISTS "Allow all operations on overrides" ON overrides;

-- Users can view overrides for their families
CREATE POLICY "Users can view their family overrides" ON overrides
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_families
      WHERE user_families.family_id = overrides.family_id
      AND user_families.user_id = auth.uid()
    )
  );

-- Users can create overrides for their families
CREATE POLICY "Users can create overrides for their families" ON overrides
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_families
      WHERE user_families.family_id = overrides.family_id
      AND user_families.user_id = auth.uid()
    )
  );

-- Users can update overrides for their families
CREATE POLICY "Users can update their family overrides" ON overrides
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_families
      WHERE user_families.family_id = overrides.family_id
      AND user_families.user_id = auth.uid()
    )
  );

-- Users can delete overrides for their families
CREATE POLICY "Users can delete their family overrides" ON overrides
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_families
      WHERE user_families.family_id = overrides.family_id
      AND user_families.user_id = auth.uid()
    )
  );

-- Update people table RLS policies
DROP POLICY IF EXISTS "Allow all operations on people" ON people;

-- Users can view people in their families
CREATE POLICY "Users can view their family people" ON people
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_families
      WHERE user_families.family_id = people.family_id
      AND user_families.user_id = auth.uid()
    )
  );

-- Users can manage people in their families
CREATE POLICY "Users can manage their family people" ON people
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_families
      WHERE user_families.family_id = people.family_id
      AND user_families.user_id = auth.uid()
    )
  );

-- Update family_preferences table RLS policies
DROP POLICY IF EXISTS "Allow all operations on family_preferences" ON family_preferences;

-- Users can view preferences for their families
CREATE POLICY "Users can view their family preferences" ON family_preferences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_families
      WHERE user_families.family_id = family_preferences.family_id
      AND user_families.user_id = auth.uid()
    )
  );

-- Users can manage preferences for their families
CREATE POLICY "Users can manage their family preferences" ON family_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_families
      WHERE user_families.family_id = family_preferences.family_id
      AND user_families.user_id = auth.uid()
    )
  );

-- Create function to automatically add user as owner when creating a family
CREATE OR REPLACE FUNCTION create_family_with_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_families (user_id, family_id, role)
  VALUES (auth.uid(), NEW.id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-add creator as owner
CREATE TRIGGER auto_add_family_owner
  AFTER INSERT ON families
  FOR EACH ROW
  EXECUTE FUNCTION create_family_with_owner();

-- Create trigger to update updated_at for user_families
CREATE TRIGGER update_user_families_updated_at
  BEFORE UPDATE ON user_families
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

