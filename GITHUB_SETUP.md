# GitHub Setup Guide

## 📤 Push This Boilerplate to GitHub

### Step 1: Create a New Repository on GitHub

1. Go to [GitHub](https://github.com) and create a new repository
2. Name it something like `nextjs-boilerplate` or `my-nextjs-starter`
3. **Don't** initialize with README, .gitignore, or license (we already have these)

### Step 2: Initialize Git and Push

```bash
cd /home/linda/personal/nextjs-boilerplate

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Next.js boilerplate"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Verify on GitHub

Visit your repository on GitHub and confirm all files are there.

## 🔄 Using This Boilerplate for New Projects

### Option 1: Clone and Customize

```bash
# Clone the boilerplate
git clone https://github.com/YOUR_USERNAME/nextjs-boilerplate.git my-new-project
cd my-new-project

# Install dependencies
npm install

# Start developing
npm run dev
```

### Option 2: Use GitHub Template

1. Go to your boilerplate repository on GitHub
2. Click "Use this template" button
3. Create a new repository from the template
4. Clone your new repository

### Option 3: Download ZIP

1. Go to your boilerplate repository on GitHub
2. Click "Code" → "Download ZIP"
3. Extract and rename the folder
4. Follow Option 1 steps starting from `npm install`

## 📋 Checklist for New Projects

After cloning this boilerplate, make sure to:

- [ ] Update `package.json` name, version, and description
- [ ] Update `src/app/layout.tsx` metadata (title, description)
- [ ] Customize `src/styles/theme.css` colors
- [ ] Update README.md with your project details
- [ ] Add environment variables to `.env.local` (see env.example)
- [ ] Delete or modify example components/tests as needed
- [ ] Add your first feature!
- [ ] Update this file or delete it if not needed

## 🔗 Useful GitHub Features

### GitHub Actions (Optional)

You can add CI/CD by creating `.github/workflows/nodejs.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
      - run: npm ci
      - run: npm test
      - run: npm run build
```

### GitHub Pages (Static Export)

If you want to use GitHub Pages:

1. Update `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: "export",
  // ... rest of config
};
```

2. Add to `package.json`:

```json
"scripts": {
  "deploy": "npm run build && gh-pages -d out"
}
```

## 🎉 You're Ready!

Your boilerplate is now on GitHub and ready to be cloned for new projects!
