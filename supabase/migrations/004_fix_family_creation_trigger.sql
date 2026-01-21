-- Fix the family creation trigger to properly bypass RLS
-- This ensures the trigger can insert into user_families even with RLS enabled

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS auto_add_family_owner ON families;
DROP FUNCTION IF EXISTS create_family_with_owner();

-- Recreate the function with explicit RLS bypass
-- This function only adds the user if auth.uid() is not null (i.e., when called from an authenticated context)
CREATE OR REPLACE FUNCTION create_family_with_owner()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the current authenticated user ID
  current_user_id := auth.uid();
  
  -- Only insert into user_families if there's an authenticated user
  -- This allows manual inserts from dashboard (where auth.uid() is null) without errors
  IF current_user_id IS NOT NULL THEN
    INSERT INTO user_families (user_id, family_id, role)
    VALUES (current_user_id, NEW.id, 'owner')
    ON CONFLICT (user_id, family_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER auto_add_family_owner
  AFTER INSERT ON families
  FOR EACH ROW
  EXECUTE FUNCTION create_family_with_owner();

-- Grant necessary permissions to the function
GRANT EXECUTE ON FUNCTION create_family_with_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION create_family_with_owner() TO anon;

