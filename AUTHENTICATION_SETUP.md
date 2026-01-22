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

1. **Configure Email Provider**:
   - In your Supabase dashboard, go to **Authentication** → **Providers**
   - Find **Email** provider (should be enabled by default)
   - Click on it to open the Email provider settings panel
   - Configure email settings:
     - **Enable Email provider**: Should be ON (green toggle)
     - **Secure email change**: Recommended to enable
     - **Secure password change**: Optional
     - **Minimum password length**: Set to 6 or more (recommended 8+)
     - **Password Requirements**: Configure as needed
   - Click **Save**

2. **Configure Email Confirmation** (Important!):
   - In your Supabase dashboard, go to **Authentication** → **Sign In / Providers** (or **Authentication** → **Settings**)
   - Look for the **"User Signups"** section
   - Find the **"Confirm email"** toggle:
     - **For development/testing**: You can **disable** this to allow immediate signup without email confirmation
     - **For production**: **Enable** this for security (recommended)
   - **Note**: If disabled, users are immediately authenticated and family linking happens right away
   - **Note**: If enabled, users must confirm their email before they can sign in, and family linking happens after confirmation
   - Click **Save changes** at the bottom

3. **Configure URL Settings**:
   - Go to **Authentication** → **URL Configuration**
   - **Site URL**: Your app URL (e.g., `http://localhost:3000` for dev, `https://yourdomain.com` for production)
   - **Redirect URLs**: Add your app URLs (e.g., `http://localhost:3000`, `https://yourdomain.com`)
   - Click **Save**

4. **Configure Email Templates** (optional):
   - Go to **Authentication** → **Email Templates**
   - Customize the confirmation, password reset, and magic link emails

5. **Important for Development**: 
   - **Supabase's default email service has limitations**:
     - Very low rate limits (typically 2 emails per hour)
     - Only sends to team member emails by default
     - Not suitable for production use
   - **If email confirmations are enabled but you're not receiving emails**:
     - **Option 1 (Recommended for testing)**: Disable "Confirm email" temporarily
       - Go to **Authentication** → **Sign In / Providers** → **User Signups**
       - Toggle "Confirm email" to OFF
       - Click "Save changes"
       - Users will be immediately authenticated after signup
     - **Option 2**: Manually confirm users for testing
       - Go to **Authentication** → **Users**
       - Find the unconfirmed user
       - Click on the user
       - Click "Confirm email" button (or "Send confirmation email" if available)
     - **Option 3**: Check email delivery
       - Check your spam/junk folder
       - Check Supabase dashboard → **Logs** → **Auth** for email sending errors
       - Verify the email address is correct
   - **For production**: Set up custom SMTP (see troubleshooting section below)

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

## 🔧 Troubleshooting Email Issues

### Email Not Being Sent

If you're not receiving confirmation emails, here are the most common causes and solutions:

1. **Supabase Default Email Service Limitations**:
   - Supabase's built-in email service has very restrictive rate limits (typically 2 emails per hour)
   - It may only send to team member emails
   - **Solution for development**: Disable "Confirm email" temporarily (see step 5 above)
   - **Solution for production**: Set up custom SMTP (see below)

2. **Check Auth Logs**:
   - Go to **Supabase Dashboard** → **Logs** → **Auth**
   - Look for errors related to email sending
   - Check for rate limit errors or SMTP configuration issues

3. **Verify Email Settings**:
   - Go to **Authentication** → **URL Configuration**
   - Ensure **Site URL** is set correctly (e.g., `http://localhost:3000` for dev)
   - Ensure **Redirect URLs** includes your app URL

4. **Set Up Custom SMTP (For Production)**:
   - Go to **Authentication** → **Settings** → **SMTP Settings**
   - Configure with a reliable email provider:
     - **SendGrid**: Free tier available, good for production
     - **Mailgun**: Free tier available
     - **AWS SES**: Very reliable, pay-as-you-go
     - **Resend**: Modern email API, developer-friendly
   - Enter SMTP credentials (host, port, username, password, sender email)
   - Test the configuration
   - **Note**: Custom SMTP is required for production use

5. **Manual User Confirmation (For Testing)**:
   - Go to **Authentication** → **Users**
   - Find the unconfirmed user
   - Click on the user to open details
   - Look for "Confirm email" or "Send confirmation email" button
   - Or use the SQL Editor to manually confirm:
     ```sql
     UPDATE auth.users 
     SET email_confirmed_at = NOW() 
     WHERE email = 'user@example.com';
     ```

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

