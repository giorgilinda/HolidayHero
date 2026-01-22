-- Safe script to delete a family and all related data
-- This script will show what will be deleted before actually deleting

-- Replace 'YOUR_FAMILY_ID_HERE' with the actual family UUID
-- Example: '123e4567-e89b-12d3-a456-426614174000'

-- STEP 1: Preview what will be deleted (run this first to see what will be removed)
DO $$
DECLARE
  family_uuid UUID := 'YOUR_FAMILY_ID_HERE'; -- Replace with actual family ID
  family_name TEXT;
  user_count INTEGER;
  override_count INTEGER;
  people_count INTEGER;
  preferences_count INTEGER;
BEGIN
  -- Get family name
  SELECT name INTO family_name FROM families WHERE id = family_uuid;
  
  IF family_name IS NULL THEN
    RAISE NOTICE 'Family with ID % does not exist', family_uuid;
    RETURN;
  END IF;
  
  -- Count related records
  SELECT COUNT(*) INTO user_count FROM user_families WHERE family_id = family_uuid;
  SELECT COUNT(*) INTO override_count FROM overrides WHERE family_id = family_uuid;
  SELECT COUNT(*) INTO people_count FROM people WHERE family_id = family_uuid;
  SELECT COUNT(*) INTO preferences_count FROM family_preferences WHERE family_id = family_uuid;
  
  -- Display summary
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FAMILY DELETION PREVIEW';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Family Name: %', family_name;
  RAISE NOTICE 'Family ID: %', family_uuid;
  RAISE NOTICE '';
  RAISE NOTICE 'Records that will be deleted:';
  RAISE NOTICE '  - User memberships: %', user_count;
  RAISE NOTICE '  - Calendar overrides: %', override_count;
  RAISE NOTICE '  - People: %', people_count;
  RAISE NOTICE '  - Preferences: %', preferences_count;
  RAISE NOTICE '';
  RAISE NOTICE 'The family record itself will also be deleted.';
  RAISE NOTICE '========================================';
END $$;

-- STEP 2: Actually delete the family (uncomment and run after reviewing Step 1)
-- WARNING: This is permanent and cannot be undone!
-- DELETE FROM families WHERE id = 'YOUR_FAMILY_ID_HERE';

-- Alternative: Delete by family name (use with caution if multiple families have similar names)
-- DELETE FROM families WHERE name = 'Family Name Here';

