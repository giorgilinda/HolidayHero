-- Add unique constraint on family name to prevent duplicates at database level
-- This is a case-insensitive unique constraint

-- First, check for existing duplicates and handle them
-- If there are duplicates, you'll need to rename them manually before running this migration
-- Run this query to check for duplicates:
-- SELECT LOWER(name), COUNT(*) FROM families GROUP BY LOWER(name) HAVING COUNT(*) > 1;

-- Create a unique index on lowercased family name
-- This prevents duplicate family names regardless of case
-- If duplicates exist, this will fail - fix duplicates first
CREATE UNIQUE INDEX IF NOT EXISTS idx_families_name_unique_lower 
ON families (LOWER(name));

-- Add a comment explaining the constraint
COMMENT ON INDEX idx_families_name_unique_lower IS 'Ensures family names are unique case-insensitively. Prevents duplicate family creation.';

-- Create a function to check if a family name exists (bypasses RLS)
-- This function uses SECURITY DEFINER to bypass RLS for duplicate checking
CREATE OR REPLACE FUNCTION check_family_name_exists(family_name TEXT)
RETURNS TABLE(id UUID, name TEXT) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.name
  FROM families f
  WHERE LOWER(f.name) = LOWER(family_name)
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION check_family_name_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_family_name_exists(TEXT) TO anon;

-- Add comment explaining the function
COMMENT ON FUNCTION check_family_name_exists(TEXT) IS 'Checks if a family name exists (case-insensitive). Bypasses RLS for duplicate prevention during signup.';

-- Create a function to find family by invite code (bypasses RLS)
-- This allows anyone to join a family using the invite code, even if the family is private
CREATE OR REPLACE FUNCTION find_family_by_invite_code(invite_code_param TEXT)
RETURNS TABLE(id UUID, name TEXT, created_at TIMESTAMP WITH TIME ZONE, invite_code TEXT, is_public BOOLEAN, allow_public_join BOOLEAN) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.name, f.created_at, f.invite_code, f.is_public, f.allow_public_join
  FROM families f
  WHERE LOWER(f.invite_code) = LOWER(invite_code_param)
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION find_family_by_invite_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION find_family_by_invite_code(TEXT) TO anon;

-- Add comment explaining the function
COMMENT ON FUNCTION find_family_by_invite_code(TEXT) IS 'Finds a family by invite code (case-insensitive). Bypasses RLS to allow joining private families via invite code.';

-- Note: The RPC function `find_family_by_invite_code` bypasses RLS and is the preferred method.
-- We don't need a permissive RLS policy since the RPC function handles invite code lookups securely.

