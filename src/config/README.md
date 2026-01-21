# Config Directory

This directory contains configuration files.

## people.json

**Purpose**: Initial data source for database migration only.

This file is used by the `/api/people/migrate` endpoint to seed initial family data into Supabase. After running the migration, all people and preferences are stored in the database and managed through:

- The `/api/people` API endpoint
- The Supabase dashboard
- Direct database updates

**Note**: After migration, changes to this file will not affect the application. Update people and preferences through the API or Supabase dashboard instead.

