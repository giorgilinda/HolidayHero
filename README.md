HolidayHero 🏖️

A smart vacation planning engine that balances local holidays, 
school closures, and WFH flexibility to find the best days for PTO.

## Key Features
- **The Brain**: TypeScript logic to rate days from 1-10.
- **Childcare Guard**: Automatically flags days where school is closed.
- **Bridge Finder**: Detects high-efficiency days (1 PTO = 4 Day Weekend).
- **Spouse Sync**: Real-time coordination via Supabase.

## 🚀 Features

- **Next.js 15** - Latest version with App Router
- **TypeScript** - Type-safe development
- **Jest** - Unit and integration testing with coverage
- **ESLint** - Code quality and consistency
- **CSS Modules** - Scoped styling
- **Theme System** - Customizable CSS variables
- **Dark Mode Support** - Automatic dark mode via prefers-color-scheme
- **Mobile-First** - Responsive design out of the box
- **Production Ready** - Security headers, optimized builds

## 📁 Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── layout.tsx   # Root layout
│   ├── page.tsx     # Home page
│   └── globals.css  # Global styles
├── components/       # Reusable React components
├── pages/           # API routes (Pages Router)
│   └── api/
├── utils/           # Utility functions
├── hooks/           # Custom React hooks
├── contexts/        # React contexts
├── services/        # External service integrations
└── styles/          # Global styles and theme
tests/               # Test files
public/              # Static assets
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

The boilerplate includes a comprehensive theme system using CSS variables. Customize colors, spacing, typography, and more in `src/styles/theme.css`:

```css
:root {
  --color-primary: #0070f3;
  --color-secondary: #7c3aed;
  /* ... more variables */
}
```

Dark mode is automatically enabled based on system preferences. Customize dark mode styles in the `@media (prefers-color-scheme: dark)` section.

## 📝 Example Components

The boilerplate includes a few example components to get you started:

- **Button** - Accessible button component with variants
- **Card** - Card container component

These serve as examples of best practices for component structure and CSS Modules usage.

## 🧪 Testing

Tests are located in the `tests/` directory. Example tests are included for:

- Utility functions (`tests/utils.test.ts`)
- Components (`tests/components/Button.test.tsx`)

### Writing Tests

```typescript
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/Button";

describe("Button", () => {
  it("renders correctly", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });
});
```

## 🔧 Configuration

### TypeScript

TypeScript configuration is in `tsconfig.json`. Path aliases are configured with `@/*` pointing to `src/*`.

### ESLint

ESLint configuration extends Next.js recommended rules. Customize in `eslint.config.mjs`.

### Jest

Jest is configured to work with TypeScript and React Testing Library. Configuration is in `jest.config.js`.

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com)
3. Deploy!

### Other Platforms

The project can be deployed to any platform that supports Next.js:

- Netlify
- AWS Amplify
- Cloudflare Pages
- Self-hosted (Node.js)

## 📦 What's Included

- ✅ Next.js 15 with App Router
- ✅ TypeScript configuration
- ✅ Jest with React Testing Library
- ✅ ESLint configuration
- ✅ CSS Modules with theme system
- ✅ Dark mode support
- ✅ Security headers
- ✅ Example components and tests
- ✅ Mobile-first responsive design
- ✅ Production optimizations

## 🔮 Next Steps

- Add state management (Redux, Zustand, etc.)
- Set up internationalization (i18n)
- Add Storybook for component development
- Configure CI/CD pipeline
- Add end-to-end testing (Playwright, Cypress)
- Set up authentication
- Add a UI library (Tailwind CSS, Material-UI, etc.)

## 📄 License

MIT

## 🤝 Contributing

This is a boilerplate template. Feel free to fork and customize for your needs!

---

Made with ❤️ using Next.js
