# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Clone the Repository

```bash
git clone <your-github-repo-url> holiday-hero
cd holiday-hero
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Developing

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📋 Initial Setup

### 1. Set Up Database and Configure Your Family

1. **Set up Supabase** (see `SUPABASE_SETUP.md` for details):
   - Create a Supabase project
   - Run the database migrations
   - Configure environment variables

2. **Migrate your family data**:
   - Edit `src/config/people.json` with your family members (if needed)
   - Run the migration: `curl -X POST http://localhost:3000/api/people/migrate`
   - Or use the Supabase dashboard to add people directly

After migration, people and preferences are stored in Supabase and can be managed through the API or Supabase dashboard.

### 2. Configure Holiday API

Update `src/utils/constants.ts` with your location:
- `HOLIDAY_COUNTRY_CODE`: Your country code (e.g., "DE")
- `HOLIDAY_SUBDIVISION_CODE`: Your state/region code
- `HOLIDAY_LANGUAGE_CODE`: Language for holiday names

### 3. Customize Theme (Optional)

Edit `src/styles/theme.css` to customize colors and styling:

```css
:root {
  --calendar-holiday: #your-color;
  --calendar-mandatory: #your-color;
  /* ... */
}
```

## 🧪 Run Tests

```bash
npm test
```

## 🏗️ Build for Production

```bash
npm run build
npm start
```

## 📚 Next Steps

- [ ] Set up Supabase and run database migrations
- [ ] Migrate your family data to the database
- [ ] Set up holiday API location in `src/utils/constants.ts`
- [ ] Customize theme colors in `src/styles/theme.css` (optional)
- [ ] Start planning your vacations! 🏖️
- [ ] Deploy to Vercel or your preferred platform

## 💡 Usage Tips

### Using the Calendar

1. **View Modes**: Switch between Monthly and Yearly views using the buttons in the header
2. **Single Day Edit**: Click any day to open the edit dialog
3. **Bulk Updates**: 
   - Click "Select" to enter selection mode
   - Click multiple days to select them
   - Click "Edit" to apply the same override to all selected days
   - Click "Delete" to remove overrides from all selected days
4. **Day Types**: 
   - 🏖️ Vacation: Mark days as vacation
   - 🏠 WFH: Mark days as work from home
   - 🎨 Activity: Mark days with activities (e.g., school activities)

### Understanding Day Ratings

- **MANDATORY** (Red): School is closed - you need to take PTO
- **WFH_CANDIDATE** (Orange): School is closed but WFH is suggested
- **HIGH_VALUE** (Yellow): Bridge day - great efficiency (1 PTO = 4 days)
- **SKIP** (Gray): Public holiday - no PTO needed
- **WORK** (White): Regular work day

## 🆘 Need Help?

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/react)

Happy coding! 🎉
