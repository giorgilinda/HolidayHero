# Duplicate Family Name Validation

## Current Status

The validation for duplicate family names has multiple layers of protection:

1. **Client-side check** (before signup) - May be blocked by RLS
2. **Server-side check** (during signup) - May be blocked by RLS  
3. **Database constraint** (final protection) - Should always work

## The Problem

The validation isn't working because:
- RLS policies block the check for existing families (families are private by default)
- The database constraint might not be applied yet (migration not run)
- Errors might not be in the expected format

## Solutions

### Option 1: Use Service Role Key (Recommended)

1. **Get your Service Role Key**:
   - Go to Supabase Dashboard → Settings → API
   - Copy the `service_role` key (NOT the `anon` key)
   - **Keep this secret!** Never commit it to git.

2. **Add to `.env.local`**:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

3. **Restart your dev server**:
   ```bash
   npm run dev
   ```

The API endpoint will now use the service role key to bypass RLS for duplicate checking.

### Option 2: Run the Database Migration

Run the migration `007_add_unique_family_name_constraint.sql` in Supabase SQL Editor. This will:
- Add a unique constraint on family names (case-insensitive)
- Prevent duplicates at the database level
- The error will be caught and displayed to the user

### Option 3: Make Families Public for Checking (Not Recommended)

This would allow anyone to see family names, which is a privacy concern.

## Testing

After implementing the solution:

1. Try to create a family with an existing name
2. You should see the error: "A family with the name '[name]' already exists. Please ask the family owner for the invite code to join instead."
3. Check the browser console for detailed error logs

## Debugging

If validation still doesn't work:

1. **Check browser console** for error logs
2. **Check Supabase logs** (Dashboard → Logs → Postgres Logs)
3. **Verify migration was run**: Check if `idx_families_name_unique_lower` index exists
4. **Verify service role key**: Check if `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`

## Current Error Handling

The code now:
- Logs full error details for debugging
- Checks multiple error formats (code, message, details, hint)
- Returns duplicate errors to the user
- Falls back to database constraint if checks fail

