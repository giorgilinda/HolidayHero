# Deployment Guide for Vercel

This guide will help you deploy HolidayHero to Vercel with authentication and database support.

## 📋 Prerequisites

- ✅ Code is working locally
- ✅ Supabase project is set up
- ✅ All database migrations have been run
- ✅ Google OAuth is configured (if using)
- ✅ GitHub repository is ready

## 🚀 Step-by-Step Deployment

### 1. Prepare Your Code

1. **Test the production build locally:**
   ```bash
   npm run build
   npm start
   ```
   
   Visit `http://localhost:3000` and verify everything works.

2. **Commit and push to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for production deployment"
   git push origin main
   ```

### 2. Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [Vercel](https://vercel.com) and sign in (or create an account)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings
5. **Configure Environment Variables** (see step 3 below)
6. Click **"Deploy"**

#### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```
   
   Follow the prompts. For production, run:
   ```bash
   vercel --prod
   ```

### 3. Configure Environment Variables in Vercel

**Critical:** You must set these environment variables in Vercel:

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

#### Required Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find these:**
- Go to your Supabase Dashboard → **Settings** → **API**
- Copy the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- Copy the **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### Optional Variables:

**Important:** 
- Set these for **Production**, **Preview**, and **Development** environments
- After adding variables, you need to **redeploy** for them to take effect

### 4. Update Google OAuth Redirect URI

If you're using Google OAuth, you need to add your production URL:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```
   (This is the same as your development setup - Supabase handles the redirect)

5. **Also update Supabase Site URL:**
   - Go to Supabase Dashboard → **Authentication** → **URL Configuration**
   - Set **Site URL** to your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
   - Add your Vercel URL to **Redirect URLs** if needed

### 5. Verify Database Migrations

Ensure all migrations have been run in your Supabase project:

1. ✅ `001_initial_schema.sql` - Families and overrides tables
2. ✅ `002_add_people_and_preferences.sql` - People and preferences tables
3. ✅ `003_add_authentication.sql` - Authentication and RLS policies
4. ✅ `004_fix_family_creation_trigger.sql` - Fixed trigger function

**To verify:**
- Go to Supabase Dashboard → **SQL Editor**
- Check that all tables exist: `families`, `overrides`, `people`, `family_preferences`, `user_families`
- Check that RLS is enabled on all tables

### 6. Test Your Deployment

1. Visit your Vercel deployment URL
2. You should be redirected to `/auth/login`
3. Test authentication:
   - Sign up with email/password
   - Or sign in with Google
4. Verify:
   - ✅ Calendar loads
   - ✅ Holidays are fetched
   - ✅ You can create/edit overrides
   - ✅ Data persists after refresh

### 7. Set Up Custom Domain (Optional)

1. In Vercel Dashboard → **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update Google OAuth redirect URI if using custom domain
5. Update Supabase Site URL to match custom domain

## 🔧 Troubleshooting

### Build Fails

- Check build logs in Vercel Dashboard
- Ensure all dependencies are in `package.json`
- Verify TypeScript compiles: `npm run build`

### Environment Variables Not Working

- Verify variables are set for the correct environment (Production/Preview)
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)
- Ensure `NEXT_PUBLIC_*` variables are set (they're exposed to the browser)

### Authentication Not Working

- Verify Supabase environment variables are correct
- Check Google OAuth redirect URI includes Supabase callback URL
- Ensure Supabase Site URL matches your Vercel URL
- Check browser console for errors

### Database Errors

- Verify all migrations have been run
- Check RLS policies are correctly configured
- Ensure users can access their family data
- Check Supabase logs for detailed errors

### CORS or CSP Errors

- Check `next.config.ts` CSP headers
- Verify Supabase URLs are allowed in CSP
- Check browser console for specific blocked resources

## 📝 Post-Deployment Checklist

- [ ] Environment variables are set in Vercel
- [ ] All database migrations are run
- [ ] Google OAuth redirect URI is updated (if using)
- [ ] Supabase Site URL is set to production URL
- [ ] Authentication works (email/password and/or Google)
- [ ] Calendar loads and displays holidays
- [ ] Overrides can be created and saved
- [ ] Data persists after page refresh
- [ ] Mobile view works correctly
- [ ] Custom domain is configured (if applicable)

## 🔄 Continuous Deployment

Vercel automatically deploys on every push to your main branch:

1. Push to GitHub
2. Vercel detects the push
3. Builds and deploys automatically
4. You get a preview URL for each deployment

**To disable auto-deploy:**
- Go to Vercel Dashboard → **Settings** → **Git**
- Configure deployment settings

## 🎉 You're Live!

Your HolidayHero app is now deployed and accessible to users! Share your Vercel URL with your family members so they can start planning vacations together.

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)

