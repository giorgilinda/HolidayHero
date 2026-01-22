# How to Delete a User from the Database

This guide shows you how to delete a user from Supabase to test the signup flow again.

## 🗑️ Method 1: Using Supabase Dashboard (Easiest)

1. **Go to Supabase Dashboard**:
   - Navigate to your project: https://app.supabase.com
   - Select your project

2. **Delete the User**:
   - Go to **Authentication** → **Users**
   - Find the user you want to delete (search by email)
   - Click on the user to open their details
   - Click the **"Delete user"** button (usually at the bottom or in a menu)
   - Confirm the deletion

3. **Verify Deletion**:
   - The user will be removed from `auth.users`
   - Their entries in `user_families` will be automatically deleted (due to `ON DELETE CASCADE`)
   - Check **Table Editor** → **user_families** to confirm

## 🗑️ Method 2: Using SQL Editor (For Bulk Operations)

1. **Go to Supabase SQL Editor**:
   - Navigate to **SQL Editor** in your Supabase dashboard
   - Click **"New query"**

2. **Delete User by Email**:
   ```sql
   -- First, find the user ID
   SELECT id, email FROM auth.users WHERE email = 'user@example.com';
   
   -- Then delete the user (this will cascade to user_families)
   DELETE FROM auth.users WHERE email = 'user@example.com';
   ```

3. **Delete User by ID**:
   ```sql
   -- If you know the user ID
   DELETE FROM auth.users WHERE id = 'user-uuid-here';
   ```

## 🧹 Complete Cleanup (Delete User + Family)

If you want to completely remove a user and their family:

```sql
-- 1. Find the user's family ID
SELECT uf.family_id, f.name 
FROM user_families uf
JOIN families f ON f.id = uf.family_id
WHERE uf.user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com');

-- 2. Delete the family (this will cascade to all related data)
-- Replace 'family-uuid-here' with the actual family ID from step 1
DELETE FROM families WHERE id = 'family-uuid-here';

-- 3. Delete the user
DELETE FROM auth.users WHERE email = 'user@example.com';
```

**Note**: Deleting a family will also delete:
- All entries in `user_families` for that family
- All entries in `overrides` for that family
- All entries in `people` for that family
- All entries in `family_preferences` for that family

## 🔍 Check What Will Be Deleted

Before deleting, you can check what data will be affected:

```sql
-- Check user's family memberships
SELECT uf.*, f.name as family_name
FROM user_families uf
JOIN families f ON f.id = uf.family_id
WHERE uf.user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com');

-- Check family data
SELECT 
  (SELECT COUNT(*) FROM user_families WHERE family_id = f.id) as member_count,
  (SELECT COUNT(*) FROM overrides WHERE family_id = f.id) as override_count,
  (SELECT COUNT(*) FROM people WHERE family_id = f.id) as people_count,
  f.*
FROM families f
WHERE f.id = (SELECT family_id FROM user_families WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com') LIMIT 1);
```

## ✅ After Deletion

1. **Clear Browser Data** (if testing in the same browser):
   - Clear cookies and localStorage for your app
   - Or use an incognito/private window

2. **Test Signup Again**:
   - Go to your signup page
   - Use the same email (it should work now)
   - Test the invite code flow

## ⚠️ Important Notes

- **Cascade Deletes**: Due to `ON DELETE CASCADE` constraints, deleting a user from `auth.users` will automatically delete their entries in `user_families`
- **Family Data**: If you're the only member of a family and you delete yourself, the family will remain but be orphaned. You may want to delete the family separately.
- **Production**: Be careful when deleting users in production! Consider soft-deleting instead.

## 🔄 Alternative: Soft Delete (For Production)

If you want to keep user data but prevent login, you can disable the user instead:

```sql
-- Disable user (prevents login but keeps data)
UPDATE auth.users 
SET email_confirmed_at = NULL, banned_until = '9999-12-31'
WHERE email = 'user@example.com';
```

Then re-enable later:
```sql
-- Re-enable user
UPDATE auth.users 
SET email_confirmed_at = NOW(), banned_until = NULL
WHERE email = 'user@example.com';
```

