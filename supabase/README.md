# Supabase Migrations

This directory contains database migration files for Supabase.

## Running Migrations

### Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New query**
4. Copy and paste the contents of the migration file
5. Click **Run** (or press Ctrl+Enter)

### Via Supabase CLI (Advanced)

If you have the Supabase CLI installed:

```bash
supabase db push
```

## Migration Files

### 001_initial_schema.sql
Creates the initial database schema:
- `families` table for multi-family support
- `overrides` table for storing manual overrides
- Indexes for performance
- Row Level Security policies
- Automatic timestamp triggers

## Creating New Migrations

When you need to modify the schema:

1. Create a new file: `002_your_migration_name.sql`
2. Use numbered prefixes (001, 002, 003...) to ensure order
3. Write your SQL changes
4. Run the migration via Supabase Dashboard or CLI

## Rollback

To rollback a migration, you'll need to manually write a reverse migration. For example, if `001_initial_schema.sql` creates tables, a rollback would drop them.

**Note**: Be careful with rollbacks in production! Always backup your data first.

