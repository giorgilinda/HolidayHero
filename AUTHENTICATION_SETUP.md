# Authentication Setup Guide

This guide will help you set up authentication for HolidayHero, enabling multiple families to use the app securely with Google OAuth and email/password authentication.

## 📋 Prerequisites

- Supabase project set up (see `SUPABASE_SETUP.md`)
- Database migrations run (including `003_add_authentication.sql`)
- Environment variables configured

## 🚀 Step-by-Step Setup

### 1. Run the Authentication Migrations

**Migration 1: Authentication (Required)**
1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the contents of `supabase/migrations/003_add_authentication.sql`
4. Click "Run" (or press Ctrl+Enter)
5. You should see "Success. No rows returned"

This migration creates:
- `user_families` table - links users to families with roles (owner, admin, member)
- Row Level Security (RLS) policies - ensures users can only access their own family data
- Automatic triggers - creates family ownership when a user creates a family

**Migration 2: Fix Family Creation Trigger (Recommended)**
1. Create a new query in SQL Editor
2. Copy and paste the contents of `supabase/migrations/004_fix_family_creation_trigger.sql`
3. Click "Run"
4. You should see "Success. No rows returned"

This migration fixes the trigger function to properly handle family creation and user assignment.

### 2. Configure Google OAuth (Optional but Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to **APIs & Services** → **Library**
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Choose **Web application**
   - **Important**: Add ONLY this authorized redirect URI:
     - `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
     - Replace `YOUR_PROJECT_ID` with your actual Supabase project ID (found in your Supabase URL)
     - **Do NOT add** `http://localhost:3000/auth/callback` - Supabase handles the redirect internally
   - Copy the **Client ID** and **Client Secret**
5. Configure in Supabase:
   - Go to your Supabase project dashboard
   - Navigate to **Authentication** → **Providers**
   - Find **Google** and click to configure
   - Enable the provider
   - Paste your **Client ID** and **Client Secret**
   - Click **Save**

### 3. Configure Email Authentication

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Email** provider (should be enabled by default)
3. Configure email settings:
   - **Enable email confirmations**: Recommended for production
   - **Enable email change confirmations**: Recommended
   - **Site URL**: Your app URL (e.g., `http://localhost:3000` for dev, `https://yourdomain.com` for production)
4. Configure email templates (optional):
   - Go to **Authentication** → **Email Templates**
   - Customize the confirmation, password reset, and magic link emails

### 4. Update Environment Variables

Make sure your `.env.local` file includes:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

These should already be set from the initial Supabase setup.

### 5. Test Authentication

1. Start your dev server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. You should be redirected to `/auth/login`
4. Test email/password signup:
   - Click "Sign up"
   - Enter an email and password
   - Check your email for confirmation (if enabled)
   - Sign in with your credentials
5. Test Google OAuth:
   - Click "Sign in with Google"
   - Complete the Google OAuth flow
   - You should be redirected back to the app

## 🔐 How Authentication Works

### User Flow

1. **Sign Up/Sign In**: Users authenticate via email/password or Google OAuth
2. **Family Creation**: When a user signs up, they automatically get a family created (via database trigger)
3. **Family Access**: Users can only see and modify data for families they belong to (enforced by RLS)
4. **Multi-Family Support**: Users can belong to multiple families (future feature)

### Security Features

- **Row Level Security (RLS)**: Database-level security ensures users can only access their own data
- **Session Management**: Supabase handles secure session tokens automatically
- **Protected Routes**: The app uses `ProtectedRoute` component to ensure only authenticated users can access the calendar
- **Automatic Family Creation**: New users automatically get a family created with them as the owner

### Database Schema

- **`auth.users`**: Managed by Supabase (contains user accounts)
- **`families`**: Family groups
- **`user_families`**: Junction table linking users to families with roles
- **`overrides`**: Calendar overrides (scoped by family_id)
- **`people`**: Family members (scoped by family_id)
- **`family_preferences`**: Family settings (scoped by family_id)

## 🛠️ Troubleshooting

### "No authenticated user" errors

- Check that you're signed in (check the header for your email)
- Verify your Supabase environment variables are set correctly
- Check browser console for authentication errors
- Try signing out and signing back in

### Google OAuth not working

**Common Error: "redirect_uri_mismatch" (Error 400)**
- The redirect URI in Google Cloud Console must be **exactly**: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
- Replace `YOUR_PROJECT_ID` with your Supabase project ID (the part before `.supabase.co` in your Supabase URL)
- **Do NOT add** `http://localhost:3000/auth/callback` - this is incorrect
- After updating the redirect URI in Google Cloud Console, wait a few minutes for changes to propagate
- Clear your browser cache and try again

**Other troubleshooting steps:**
- Verify redirect URIs are correctly configured in Google Cloud Console (should only have the Supabase URL)
- Check that the Google provider is enabled in Supabase
- Ensure Client ID and Secret are correct (no extra spaces)
- Check browser console for OAuth errors
- Make sure you're using the correct Supabase project ID

### Can't access family data

- Verify the authentication migration (`003_add_authentication.sql`) has been run
- Check that RLS policies are enabled on all tables
- Verify you're a member of the family (check `user_families` table in Supabase)

### Session not persisting

- Check that cookies are enabled in your browser
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Try clearing browser cache and cookies

## 📚 Next Steps

- **Add Family Management UI**: Allow users to invite family members
- **Multi-Family Selection**: Let users switch between families they belong to
- **Role-Based Permissions**: Implement different permissions for owners, admins, and members
- **Email Notifications**: Notify family members of calendar changes

## 🔗 Related Documentation

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)

