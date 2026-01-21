# Migration Guide: Moving People Configuration to Database

This guide explains how to migrate your family configuration from `people.json` to the Supabase database.

## 🗄️ Database Changes

A new migration has been added: `supabase/migrations/002_add_people_and_preferences.sql`

This creates two new tables:
- **`people`** - Stores family members with their properties
- **`family_preferences`** - Stores family-level preferences

## 📋 Migration Steps

### 1. Run the Database Migration

1. Go to your Supabase dashboard → **SQL Editor**
2. Open `supabase/migrations/002_add_people_and_preferences.sql`
3. Copy and paste the SQL into the editor
4. Click **Run**

### 2. Migrate Your Existing Data

After running the migration, you need to seed your database with data from `people.json`:

**Option A: Using the Migration API (Recommended)**

1. Make sure your dev server is running: `npm run dev`
2. Open your browser and go to: `http://localhost:3000/api/people/migrate`
3. Or use curl:
   ```bash
   curl -X POST http://localhost:3000/api/people/migrate
   ```

**Option B: Manual Migration via Supabase Dashboard**

1. Go to Supabase Dashboard → **Table Editor** → `people`
2. Click **Insert** → **Insert row**
3. For each person in your `people.json`, add a row with:
   - `family_id`: UUID of your default family (get from `families` table)
   - `person_id`: The person's ID (e.g., "mom", "dad", "leon")
   - `name`: The person's name
   - `is_child`: true/false
   - `availability`: true/false/null (for adults only)
   - `wfh_ability`: true/false/null (for adults only)

4. Go to **Table Editor** → `family_preferences`
5. Click **Insert** → **Insert row**
6. Add:
   - `family_id`: Same UUID as above
   - `max_mandatory_days_for_wfh_suggestion`: Value from your `people.json` preferences (default: 2)

## ✅ Verification

After migration:

1. **Check the database:**
   - Go to Supabase Dashboard → **Table Editor**
   - Verify `people` table has all your family members
   - Verify `family_preferences` table has your preferences

2. **Test the app:**
   - Restart your dev server
   - Open the calendar
   - People should load from the database
   - Preferences should work correctly

3. **Test the API:**
   ```bash
   curl http://localhost:3000/api/people
   ```
   Should return your people and preferences in JSON format.

## 🔄 What Changed

### Code Changes

- **New API endpoint:** `/api/people` - GET/POST for people and preferences
- **New hook:** `usePeople()` - Fetches people from database
- **New hook:** `useUserPreferences()` - Gets preferences from database
- **Updated:** `useManualOverrides` - Now uses `usePeople` hook
- **Updated:** All view components - Now use `useUserPreferences` hook

### File Changes

- ✅ `src/pages/api/people.ts` - New API endpoint
- ✅ `src/hooks/usePeople.ts` - New hook
- ✅ `src/hooks/useUserPreferences.ts` - New hook
- ✅ `src/hooks/useManualOverrides.ts` - Updated to use database
- ✅ `src/components/MonthlyView.tsx` - Updated to use hook
- ✅ `src/components/YearlyView.tsx` - Updated to use hook
- ✅ `src/components/SummaryView.tsx` - Updated to use hook
- ✅ `supabase/migrations/002_add_people_and_preferences.sql` - New migration

### What's Still Using `people.json`

The `people.json` file is still present and used for:
- Initial migration/seeding
- Fallback if database is unavailable (though this isn't implemented yet)

You can keep it as a backup or remove it after verifying the migration worked.

## 🎯 Multi-Family Support

The system now supports multiple families:

- Each family has its own `family_id` (UUID)
- People are linked to families via `family_id`
- Preferences are per-family
- Overrides are per-family (already implemented)

To use a different family, pass `family_id` as a query parameter:
- `/api/people?family_id=<uuid>`
- `/api/overrides?family_id=<uuid>`

## 🆘 Troubleshooting

**People not showing up:**
- Check that the migration ran successfully
- Verify data exists in Supabase `people` table
- Check browser console for errors
- Verify API endpoint returns data: `curl http://localhost:3000/api/people`

**Preferences not working:**
- Check `family_preferences` table has data
- Verify `max_mandatory_days_for_wfh_suggestion` is set
- Check browser console for errors

**Migration API returns error:**
- Make sure Supabase is configured (check `.env.local`)
- Verify the migration SQL ran successfully
- Check server logs for detailed error messages

## 📝 Next Steps

After successful migration:

1. ✅ Test all calendar views (Monthly, Yearly, Summary)
2. ✅ Verify people appear correctly
3. ✅ Verify preferences work (WFH suggestions, etc.)
4. ✅ Test adding/editing overrides
5. ⏭️ (Optional) Add UI for family selection
6. ⏭️ (Optional) Add authentication to link users to families
7. ⏭️ (Optional) Remove `people.json` if no longer needed

