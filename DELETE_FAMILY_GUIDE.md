# How to Safely Delete a Family from Supabase

## Overview

Yes, **deleting from the `families` table is enough**. All related tables have `ON DELETE CASCADE` constraints, so deleting a family will automatically delete:

- ✅ All entries in `user_families` (user memberships)
- ✅ All entries in `overrides` (calendar overrides)
- ✅ All entries in `people` (family members)
- ✅ All entries in `family_preferences` (family settings)

## Important Notes

### Row Level Security (RLS)

The database has RLS policies that restrict who can delete families:
- **Only family owners** can delete families through the application
- If you're deleting directly from the Supabase dashboard, you may need to:
  1. Use the SQL Editor with service role credentials, OR
  2. Temporarily disable RLS (not recommended for production)

## Methods to Delete a Family

### Method 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run the preview script first to see what will be deleted:

```sql
-- Preview what will be deleted
DO $$
DECLARE
  family_uuid UUID := 'YOUR_FAMILY_ID_HERE'; -- Replace with actual family ID
  family_name TEXT;
  user_count INTEGER;
  override_count INTEGER;
  people_count INTEGER;
  preferences_count INTEGER;
BEGIN
  SELECT name INTO family_name FROM families WHERE id = family_uuid;
  
  IF family_name IS NULL THEN
    RAISE NOTICE 'Family with ID % does not exist', family_uuid;
    RETURN;
  END IF;
  
  SELECT COUNT(*) INTO user_count FROM user_families WHERE family_id = family_uuid;
  SELECT COUNT(*) INTO override_count FROM overrides WHERE family_id = family_uuid;
  SELECT COUNT(*) INTO people_count FROM people WHERE family_id = family_uuid;
  SELECT COUNT(*) INTO preferences_count FROM family_preferences WHERE family_id = family_uuid;
  
  RAISE NOTICE 'Family: %', family_name;
  RAISE NOTICE 'User memberships: %', user_count;
  RAISE NOTICE 'Calendar overrides: %', override_count;
  RAISE NOTICE 'People: %', people_count;
  RAISE NOTICE 'Preferences: %', preferences_count;
END $$;
```

4. If the preview looks correct, delete the family:

```sql
-- Delete the family (this will cascade to all related tables)
DELETE FROM families WHERE id = 'YOUR_FAMILY_ID_HERE';
```

### Method 2: Delete by Family Name

```sql
-- Preview first
SELECT 
  f.id,
  f.name,
  (SELECT COUNT(*) FROM user_families WHERE family_id = f.id) as user_count,
  (SELECT COUNT(*) FROM overrides WHERE family_id = f.id) as override_count,
  (SELECT COUNT(*) FROM people WHERE family_id = f.id) as people_count,
  (SELECT COUNT(*) FROM family_preferences WHERE family_id = f.id) as preferences_count
FROM families f
WHERE f.name = 'Family Name Here';

-- Then delete
DELETE FROM families WHERE name = 'Family Name Here';
```

### Method 3: Using Supabase Table Editor

1. Go to **Table Editor** → `families`
2. Find the family you want to delete
3. Click the row and select **Delete**
4. Confirm the deletion

**Note**: This method respects RLS policies, so you must be authenticated as the family owner.

## Finding a Family ID

If you need to find a family ID:

```sql
-- List all families with their IDs
SELECT id, name, created_at 
FROM families 
ORDER BY created_at DESC;

-- Or search by name
SELECT id, name 
FROM families 
WHERE name ILIKE '%search term%';
```

## Verification After Deletion

After deleting, verify that all related data was removed:

```sql
-- Check if any orphaned records exist (should return 0 rows)
SELECT 'user_families' as table_name, COUNT(*) as orphaned_count
FROM user_families uf
WHERE NOT EXISTS (SELECT 1 FROM families f WHERE f.id = uf.family_id)
UNION ALL
SELECT 'overrides', COUNT(*)
FROM overrides o
WHERE NOT EXISTS (SELECT 1 FROM families f WHERE f.id = o.family_id)
UNION ALL
SELECT 'people', COUNT(*)
FROM people p
WHERE NOT EXISTS (SELECT 1 FROM families f WHERE f.id = p.family_id)
UNION ALL
SELECT 'family_preferences', COUNT(*)
FROM family_preferences fp
WHERE NOT EXISTS (SELECT 1 FROM families f WHERE f.id = fp.family_id);
```

## ⚠️ Warnings

1. **This action is permanent** - There is no undo
2. **Backup first** - If you need the data later, export it before deleting
3. **RLS policies** - Make sure you have the right permissions
4. **Cascade behavior** - All related data will be deleted automatically

## Backup Before Deletion (Optional)

If you want to backup the data before deletion:

```sql
-- Export family data to JSON (run before deletion)
SELECT 
  f.*,
  json_agg(DISTINCT uf.*) as user_memberships,
  json_agg(DISTINCT o.*) as overrides,
  json_agg(DISTINCT p.*) as people,
  json_agg(DISTINCT fp.*) as preferences
FROM families f
LEFT JOIN user_families uf ON uf.family_id = f.id
LEFT JOIN overrides o ON o.family_id = f.id
LEFT JOIN people p ON p.family_id = f.id
LEFT JOIN family_preferences fp ON fp.family_id = f.id
WHERE f.id = 'YOUR_FAMILY_ID_HERE'
GROUP BY f.id;
```

