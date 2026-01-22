-- Add invite code and privacy settings to families table
-- This prevents unauthorized users from joining families by guessing names

-- Add columns to families table
ALTER TABLE families 
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_public_join BOOLEAN DEFAULT false;

-- Create index for faster invite code lookups
CREATE INDEX IF NOT EXISTS idx_families_invite_code ON families(invite_code) WHERE invite_code IS NOT NULL;

-- Generate invite codes for existing families (optional - for migration)
-- This will generate a random 8-character code for each existing family
UPDATE families 
SET invite_code = LOWER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 8))
WHERE invite_code IS NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN families.invite_code IS 'Unique invite code for joining this family. If NULL, family cannot be joined via invite code.';
COMMENT ON COLUMN families.is_public IS 'Whether this family appears in public searches.';
COMMENT ON COLUMN families.allow_public_join IS 'Whether anyone can join this family without an invite code (if is_public is true).';

-- Update RLS policy to allow searching only public families
-- The existing "Anyone can search families by name" policy will be updated
-- to only show families where is_public = true

-- Drop the overly permissive search policy
DROP POLICY IF EXISTS "Anyone can search families by name" ON families;

-- Create a more restrictive policy: only show public families in search
CREATE POLICY "Anyone can search public families by name" ON families
  FOR SELECT USING (is_public = true);

-- Note: Users can still view families they belong to via the existing
-- "Users can view their families" policy

