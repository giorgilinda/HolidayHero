# Supabase Setup Guide

This guide will help you set up Supabase for HolidayHero to store manual overrides and family configuration in a proper database that supports multiple families.

## 📋 Prerequisites

- A Supabase account (free at [supabase.com](https://supabase.com))
- Node.js and npm installed
- Your HolidayHero project set up

## 🚀 Step-by-Step Setup

### 1. Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name**: HolidayHero (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose the closest region to your users
   - **Pricing Plan**: Free tier is sufficient for most use cases
4. Click "Create new project"
5. Wait 2-3 minutes for the project to be created

### 2. Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll need two values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys" → "anon public")

### 3. Run the Database Migrations

Run the migrations in order:

#### Migration 1: Initial Schema
1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Click "Run" (or press Ctrl+Enter)
5. You should see "Success. No rows returned"

This creates:
- `families` table - for multi-family support
- `overrides` table - for storing manual overrides
- Indexes for fast queries

#### Migration 2: People and Preferences
1. Create a new query in SQL Editor
2. Copy and paste the contents of `supabase/migrations/002_add_people_and_preferences.sql`
3. Click "Run"
4. You should see "Success. No rows returned"

This creates:
- `people` table - for family members
- `family_preferences` table - for family settings

#### Migration 3: Authentication (Required for Multi-Family)
1. Create a new query in SQL Editor
2. Copy and paste the contents of `supabase/migrations/003_add_authentication.sql`
3. Click "Run"
4. You should see "Success. No rows returned"

This creates:
- `user_families` table - links users to families
- Row Level Security (RLS) policies - ensures users can only access their own family data
- Automatic triggers - creates family ownership when a user creates a family

**Important**: See `AUTHENTICATION_SETUP.md` for complete authentication setup instructions, including Google OAuth configuration.

#### Migration 4-7: Additional Features
Run migrations 004-007 in order:
- `004_fix_family_creation_trigger.sql` - Fixes family creation triggers
- `005_allow_family_search.sql` - Enables family search functionality
- `006_add_family_invite_codes.sql` - Adds invite code system for families
- `007_add_unique_family_name_constraint.sql` - Prevents duplicate family names

#### Migration 8: Holidays Cache (Recommended)
1. Create a new query in SQL Editor
2. Copy and paste the contents of `supabase/migrations/008_add_holidays_cache.sql`
3. Click "Run"
4. You should see "Success. No rows returned"

This creates:
- `holidays_cache` table - stores public and school holidays locally
- Indexes for fast holiday lookups by country, date range, and type
- Row Level Security policies - public read access (holidays are public data)

**Benefits of Holidays Cache:**
- ⚡ **Faster Performance**: Reduces external API calls by caching holidays locally
- 🛡️ **Reliability**: App continues working even if the external holiday API is down
- 💰 **Cost Savings**: Fewer API calls reduce rate limiting issues
- 🔄 **Automatic Caching**: Holidays are automatically cached when fetched from the API

The cache works transparently - the first request fetches from the external API and caches the results. Subsequent requests use the cached data. If the external API fails, the app automatically falls back to cached data.

### 4. Set Up Authentication

Before using the app, you need to set up authentication. See `AUTHENTICATION_SETUP.md` for detailed instructions on:
- Configuring Google OAuth
- Setting up email authentication
- Testing the authentication flow

### 5. Migrate Your People Data

After running all migrations, migrate your existing `people.json` data to the database:

1. Make sure your dev server is running: `npm run dev`
2. Open your browser and navigate to: `http://localhost:3000/api/people/migrate`
3. Or use curl:
   ```bash
   curl -X POST http://localhost:3000/api/people/migrate
   ```

This will copy all people and preferences from `people.json` into your database.

### 6. Install Dependencies

In your project directory, run:

```bash
npm install @supabase/supabase-js
```

### 7. Configure Environment Variables

1. Copy `env.example` to `.env.local`:
   ```bash
   cp env.example .env.local
   ```

2. Open `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   Replace:
   - `your-project-id` with your actual Supabase project ID
   - `your-anon-key-here` with your anon/public key from step 2

3. **Important**: Never commit `.env.local` to git (it's already in `.gitignore`)

### 7. Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your app in the browser
3. Try adding or editing a manual override
4. Check your Supabase dashboard → **Table Editor** → `overrides` to see if data appears

## 🏗️ Database Schema

### Families Table
- `id` (UUID) - Primary key
- `name` (TEXT) - Family name
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Overrides Table
- `id` (SERIAL) - Primary key
- `family_id` (UUID) - Foreign key to families
- `date` (DATE) - The date of the override
- `people` (JSONB) - JSON object mapping person IDs to override types
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### People Table
- `id` (SERIAL) - Primary key
- `family_id` (UUID) - Foreign key to families
- `person_id` (TEXT) - Unique identifier within family (e.g., "mom", "dad")
- `name` (TEXT) - Person's name
- `is_child` (BOOLEAN) - Whether the person is a child
- `availability` (BOOLEAN) - For adults: availability for childcare
- `wfh_ability` (BOOLEAN) - For adults: ability to work from home
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Family Preferences Table
- `id` (SERIAL) - Primary key
- `family_id` (UUID) - Foreign key to families (unique)
- `max_mandatory_days_for_wfh_suggestion` (INTEGER) - Threshold for WFH suggestions
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Holidays Cache Table
- `id` (SERIAL) - Primary key
- `country_code` (TEXT) - ISO country code (e.g., 'DE', 'US')
- `subdivision_code` (TEXT, nullable) - Regional subdivision code (e.g., 'DE-BY')
- `language_code` (TEXT) - Language for holiday names (default: 'EN')
- `holiday_type` (TEXT) - Either 'public' or 'school'
- `holiday_id` (TEXT) - Unique ID from external API
- `start_date` (DATE) - Holiday start date
- `end_date` (DATE) - Holiday end date
- `holiday_data` (JSONB) - Complete holiday object from API
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## 🔐 Multi-Family Support

The app supports multiple families through authentication. Each user must belong to at least one family:

1. Users authenticate via Supabase Auth
2. The `user_families` table links users to families
3. Family ID is automatically retrieved from the authenticated user's session
4. Users can create new families or join existing ones using invite codes

For API testing, you can use a query parameter:
```
GET /api/overrides?family_id=123e4567-e89b-12d3-a456-426614174000
```

## 🚢 Deployment to Vercel

1. In your Vercel project settings, go to **Environment Variables**
2. Add the same variables from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Redeploy your application

## 🔍 Verifying Your Setup

### Check Database Tables
1. Go to Supabase dashboard → **Table Editor**
2. You should see `families` and `overrides` tables
3. The `families` table should have one row with name "default"

### Check API Connection
1. Open browser DevTools → Network tab
2. Make a change in the calendar
3. Look for a request to `/api/overrides`
4. It should return 200 status

### Common Issues

**Error: "Missing Supabase environment variables"**
- Make sure `.env.local` exists and has the correct variable names
- Restart your dev server after adding environment variables

**Error: "Failed to fetch overrides"**
- Check that the migration ran successfully
- Verify your API keys are correct
- Check Supabase dashboard → Logs for errors

**Data not appearing**
- Check Supabase dashboard → Table Editor → `overrides`
- Verify the `family_id` matches what's in the `families` table

## 📚 Next Steps

- [ ] Set up authentication for multi-user support
- [ ] Add family management UI
- [ ] Implement Row Level Security policies for data isolation
- [ ] Add data export/import functionality
- [ ] Set up database backups

## 🆘 Need Help?

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- Check your Supabase dashboard → Logs for detailed error messages

