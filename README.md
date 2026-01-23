HolidayHero 🏖️

A smart vacation planning engine that balances local holidays, 
school closures, and WFH flexibility to find the best days for PTO.

## Key Features

### 🧠 Smart Day Rating System
- **The Brain**: TypeScript logic that rates each day from 0-10 based on multiple factors
- **Day Tags**: Automatically categorizes days as MANDATORY, HIGH_VALUE, WFH_CANDIDATE, SKIP, or WORK
- **Intelligent Recommendations**: Provides context-aware suggestions for each day

### 🎓 School & Holiday Integration
- **Public Holiday Detection**: Automatically fetches and displays public holidays
- **School Holiday Detection**: Integrates school holiday calendars
- **Childcare Guard**: Automatically flags days where school is closed (mandatory PTO)
- **Bridge Day Finder**: Detects high-efficiency days where 1 PTO = 4 Day Weekend
- **Holidays Cache**: Local database caching reduces API calls and provides fallback when external API is unavailable

### 🏠 Work-From-Home Suggestions
- **WFH Recommendations**: Suggests WFH when school is closed, kids can stay home, and mandatory days are below threshold
- **Per-Person WFH Settings**: Configure WFH ability for each adult individually
- **Childcare Availability**: Track which adults are available for childcare

### 📅 Calendar Views
- **Monthly View**: Detailed day-by-day view with all information
- **Yearly View**: Compact overview showing the entire year at a glance
- **Easy Navigation**: Quick month/year navigation with "Today" button

### ✏️ Manual Overrides
- **Per-Person Overrides**: Set vacation, WFH, or activity for each person individually
- **Bulk Updates**: Select multiple days and apply the same override to all at once
- **Persistent Storage**: All overrides saved to local API and persist across sessions
- **Auto-Generation**: Automatically creates activity overrides for school holidays

### 📱 Mobile-First Design
- **Fully Responsive**: Optimized for mobile, tablet, and desktop
- **Touch-Friendly**: Large touch targets and mobile-optimized dialogs
- **Icon-Only Mode**: On mobile, buttons show only icons for compact display
- **Bottom Sheet Dialogs**: Mobile-friendly dialog presentation

### 🎨 Customizable Theme
- **Centralized Variables**: All colors, spacing, and sizes in one theme file
- **Easy Customization**: Change the entire app's appearance by editing CSS variables
- **TypeScript Constants**: Theme values available in TSX files via constants

### 🔐 Authentication & Multi-Family Support
- **Google OAuth**: Sign in with your Google account
- **Email/Password**: Traditional email and password authentication
- **Multi-Family Support**: Each family has isolated data
- **Row Level Security**: Database-level security ensures data privacy
- **Automatic Family Creation**: New users automatically get their own family

## 🛠️ Technical Stack

- **Next.js 15** - Latest version with App Router
- **TypeScript** - Type-safe development
- **React 19** - Latest React features
- **Supabase** - Database and authentication
- **CSS Modules** - Scoped component styling
- **Custom Hooks** - Reusable logic (`useCalendarData`, `useManualOverrides`)
- **API Routes** - Server-side endpoints for holidays and overrides
- **Local Storage** - Client-side persistence for deleted dates

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles
│   └── templates/         # Page templates
│       └── BaseTemplate.tsx
├── components/             # React components
│   ├── VacationCalendar.tsx    # Main calendar component
│   ├── MonthlyView.tsx         # Monthly calendar view
│   ├── YearlyView.tsx          # Yearly calendar view
│   ├── DayCell.tsx             # Individual day cell
│   ├── DayEditDialog.tsx       # Edit dialog for day overrides
│   └── calendarTypes.ts        # Shared TypeScript types
├── pages/api/             # API routes
│   ├── holidays/          # Holiday data endpoints
│   │   ├── public.ts      # Public holidays API
│   │   └── school.ts      # School holidays API
│   └── overrides.ts       # Manual overrides API
├── hooks/                  # Custom React hooks
│   ├── useCalendarData.ts      # Holiday data fetching
│   └── useManualOverrides.ts   # Override management
├── services/               # External service integrations
│   └── openHolidaysApi.ts  # OpenHolidays API client
├── utils/                  # Utility functions
│   ├── brain.ts            # Day rating logic
│   ├── constants.ts         # App constants
│   └── themeConstants.ts   # Theme constants for TSX
├── config/                 # Configuration files
│   └── people.json         # People and preferences (used for initial migration only)
├── lib/                    # Library utilities
│   └── supabase.ts         # Supabase client configuration
├── supabase/               # Database migrations
│   └── migrations/         # SQL migration files
└── styles/                 # Global styles
    └── theme.css           # Theme variables
```

## 🛠️ Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

### Building for Production

```bash
npm run build
npm start
```

## 🎨 Theming

HolidayHero uses a comprehensive theme system with CSS variables. All colors, spacing, typography, and component sizes are centralized in `src/styles/theme.css`:

```css
:root {
  --color-primary: #0070f3;
  --calendar-holiday: #e2e8f0;
  --calendar-mandatory: #feb2b2;
  --calendar-work-from-home: #FFC067;
  /* ... more variables */
}
```

### Theme Categories
- **Calendar Colors**: Holiday, mandatory, WFH, and activity colors
- **UI Colors**: Backgrounds, borders, text colors
- **Spacing**: Consistent spacing scale (xs, sm, md, lg, xl, 2xl)
- **Typography**: Font sizes for desktop, tablet, and mobile
- **Breakpoints**: Mobile (480px), tablet (768px), desktop (1200px)
- **Component Sizes**: Button sizes, calendar cell sizes, yearly view dimensions

For TypeScript/TSX files, use `src/utils/themeConstants.ts` to access theme values.

## 📝 Core Components

### VacationCalendar
The main calendar component that orchestrates all views and state management.

### MonthlyView
Detailed monthly calendar view showing:
- Day ratings and recommendations
- Holiday information
- Manual overrides
- WFH suggestions

### YearlyView
Compact yearly overview showing:
- All 12 months in a single view
- Color-coded day status
- Quick visual reference

### DayCell
Individual day cell component used by both views, with:
- Compact mode for yearly view
- Selection state for bulk operations
- Visual indicators for different day types

### DayEditDialog
Modal dialog for editing day overrides:
- Single day editing
- Bulk editing for multiple selected days
- Per-person override management
- Mobile-optimized interface

## ⚙️ Configuration

### People & Preferences

People and preferences are now stored in Supabase. After running the database migrations, use the migration endpoint to seed initial data:

```bash
curl -X POST http://localhost:3000/api/people/migrate
```

This will copy data from `src/config/people.json` into your database. After migration, all people and preferences are managed through the database.

To update people or preferences, use the `/api/people` endpoint or update directly in Supabase.

See `MIGRATION_GUIDE.md` for detailed migration instructions.

### Holiday API Configuration

Configure holiday API settings in `src/utils/constants.ts`:
- Country code
- Subdivision code
- Language code

### Manual Overrides

Overrides are stored in Supabase and managed via the API at `/api/overrides`. See `SUPABASE_SETUP.md` for database setup instructions.

## 🔧 Configuration

### TypeScript

TypeScript configuration is in `tsconfig.json`. Path aliases are configured with `@/*` pointing to `src/*`.

### ESLint

ESLint configuration extends Next.js recommended rules. Customize in `eslint.config.mjs`.

### Jest

Jest is configured to work with TypeScript and React Testing Library. Configuration is in `jest.config.js`.

## 🚢 Deployment

### Vercel (Recommended)

See `DEPLOYMENT.md` for a complete step-by-step deployment guide.

**Quick Start:**
1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com)
3. Set environment variables (Supabase URL and keys)
4. Deploy!

**Important:** Make sure to:
- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel
- Update Google OAuth redirect URI for production (if using)
- Run all database migrations in Supabase
- Update Supabase Site URL to your Vercel deployment URL

### Other Platforms

The project can be deployed to any platform that supports Next.js:

- Netlify
- AWS Amplify
- Cloudflare Pages
- Self-hosted (Node.js)

See `DEPLOYMENT.md` for detailed deployment instructions.

## 📦 Features Summary

- ✅ Smart day rating system (0-10 scale)
- ✅ Public and school holiday integration
- ✅ Bridge day detection
- ✅ WFH suggestions based on childcare
- ✅ Monthly and yearly calendar views
- ✅ Manual overrides (vacation, WFH, activity)
- ✅ Bulk update functionality
- ✅ Mobile-first responsive design
- ✅ Comprehensive theme system
- ✅ Persistent override storage
- ✅ Auto-generation of school holiday overrides

## 🔮 Future Enhancements

- Export calendar to iCal/Google Calendar
- Share calendar with family members
- Vacation statistics and analytics
- Multi-year planning
- Integration with work calendar systems
- Push notifications for upcoming holidays

## 📚 Additional Documentation

- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Complete Supabase setup guide including holidays cache
- **[HOLIDAYS_CACHE.md](./HOLIDAYS_CACHE.md)** - Detailed holidays caching feature documentation
- **[AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md)** - Authentication and OAuth configuration
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment guide for Vercel and other platforms
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Guide for migrating from local storage to Supabase

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT

---

Made with ❤️ using Next.js
