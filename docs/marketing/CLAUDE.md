# The Nineteenth Marketing Site

## Project Overview

Marketing website for **The Nineteenth** - a mobile app for creating and managing social golf competitions. This site serves as the primary landing page, feature showcase, and conversion funnel for the mobile app.

**Primary Goals:**
1. Explain the product value proposition
2. Drive app downloads (iOS & Android)
3. Convert visitors to paid tiers
4. Provide support/documentation

---

## Tech Stack

- **Framework:** Remix (React)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Package Manager:** pnpm
- **Deployment:** Vercel (or Cloudflare Pages)
- **Analytics:** Plausible (privacy-focused)
- **Forms:** Remix actions (no external dependencies)

---

## Project Structure

```
/
├── app/
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # Base components (Button, Card, Input, etc.)
│   │   ├── layout/          # Header, Footer, Navigation
│   │   ├── sections/        # Page sections (Hero, Features, Pricing, etc.)
│   │   └── icons/           # SVG icon components
│   ├── routes/              # Remix routes (pages)
│   │   ├── _index.tsx       # Landing page
│   │   ├── features.tsx     # Features page
│   │   ├── pricing.tsx      # Pricing page
│   │   ├── about.tsx        # About page
│   │   ├── contact.tsx      # Contact form
│   │   ├── privacy.tsx      # Privacy policy
│   │   ├── terms.tsx        # Terms of service
│   │   └── blog/            # Blog routes (if needed)
│   ├── styles/              # Global styles
│   │   └── tailwind.css     # Tailwind imports
│   ├── lib/                 # Utility functions
│   │   ├── utils.ts         # General utilities
│   │   └── meta.ts          # SEO meta helpers
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript type definitions
│   ├── root.tsx             # Root layout
│   └── entry.*.tsx          # Remix entry files
├── public/
│   ├── images/              # Static images
│   │   ├── screenshots/     # App screenshots
│   │   ├── icons/           # Favicons, app icons
│   │   └── og/              # Open Graph images
│   └── fonts/               # Custom fonts (if any)
├── content/                 # Markdown content (optional)
│   └── blog/                # Blog posts
├── tailwind.config.ts       # Tailwind configuration
├── remix.config.js          # Remix configuration
├── tsconfig.json            # TypeScript configuration
├── package.json
└── .env.example
```

---

## Design System

### Colors

Primary brand colors aligned with the mobile app:

```typescript
// tailwind.config.ts
const colors = {
  // Primary
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',  // Primary blue
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  // Accent (trophy/winner gold)
  accent: {
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
  },
  // Golf-specific (for visual elements)
  golf: {
    birdie: '#22c55e',   // Green
    par: '#6b7280',      // Gray
    bogey: '#f97316',    // Orange
    double: '#ef4444',   // Red
    fairway: '#16a34a',  // Grass green
  },
  // Neutrals
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
};
```

### Typography

```typescript
// tailwind.config.ts
const fontFamily = {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  display: ['Cal Sans', 'Inter', 'system-ui', 'sans-serif'], // For headlines
};

const fontSize = {
  'display-xl': ['4.5rem', { lineHeight: '1.1', fontWeight: '700' }],
  'display-lg': ['3.75rem', { lineHeight: '1.1', fontWeight: '700' }],
  'display-md': ['3rem', { lineHeight: '1.2', fontWeight: '700' }],
  'display-sm': ['2.25rem', { lineHeight: '1.3', fontWeight: '600' }],
  'heading-lg': ['1.875rem', { lineHeight: '1.3', fontWeight: '600' }],
  'heading-md': ['1.5rem', { lineHeight: '1.4', fontWeight: '600' }],
  'heading-sm': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
  'body-lg': ['1.125rem', { lineHeight: '1.6' }],
  'body-md': ['1rem', { lineHeight: '1.6' }],
  'body-sm': ['0.875rem', { lineHeight: '1.5' }],
};
```

### Spacing

Use Tailwind defaults with these common patterns:
- Section padding: `py-16 md:py-24 lg:py-32`
- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Card padding: `p-6 md:p-8`
- Stack spacing: `space-y-4` or `space-y-6`

### Component Patterns

**Buttons:**
```tsx
// Primary
<button className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
  Download Free
</button>

// Secondary
<button className="border-2 border-primary-600 text-primary-600 hover:bg-primary-50 font-semibold px-6 py-3 rounded-lg transition-colors">
  Learn More
</button>
```

**Cards:**
```tsx
<div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
  {/* Card content */}
</div>
```

---

## Page Structure

### Landing Page (`_index.tsx`)

1. **Hero Section** - Headline, subheadline, CTA buttons, app mockup
2. **Problem Section** - Pain points (spreadsheets, complexity)
3. **Solution Section** - Product introduction
4. **Features Section** - 6 key features with icons
5. **How It Works** - 3-step process
6. **Social Proof** - Testimonials, stats
7. **Pricing Preview** - Tier overview with link to full page
8. **FAQ Section** - Common questions
9. **Final CTA** - Download buttons

### Features Page (`features.tsx`)

- Detailed feature breakdowns
- Screenshots/mockups for each feature
- Comparison with alternatives

### Pricing Page (`pricing.tsx`)

- 3 pricing cards (Free, Social, Premium)
- Feature comparison table
- FAQ specific to pricing
- Enterprise contact section

---

## SEO Requirements

### Meta Tags

Every page must include:

```tsx
export const meta: MetaFunction = () => {
  return [
    { title: "The Nineteenth - Golf Competitions Made Simple" },
    { name: "description", content: "Create and manage social golf competitions. Score offline, automatic pairings, live leaderboards. Free to start." },
    { property: "og:title", content: "The Nineteenth - Golf Competitions Made Simple" },
    { property: "og:description", content: "Create and manage social golf competitions." },
    { property: "og:image", content: "/images/og/home.png" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
};
```

### Structured Data

Include JSON-LD for:
- Organization
- SoftwareApplication (for app)
- FAQPage (on pages with FAQs)
- BreadcrumbList

### Performance

- Lazy load images below the fold
- Use `<link rel="preload">` for critical assets
- Optimize images (WebP with fallbacks)
- Target Lighthouse score: 90+ across all metrics

---

## Content Source

Marketing copy is available in the following files (copy from the mobile app repo):

- `docs/marketing/LANDING_PAGE_COPY.md` - Website copy
- `docs/marketing/PRICING_PAGE_COPY.md` - Pricing page
- `docs/marketing/FEATURE_COMPARISON.md` - Comparison tables
- `docs/marketing/APP_STORE_DESCRIPTION.md` - Additional copy
- `docs/marketing/SOCIAL_MEDIA_COPY.md` - Social snippets

---

## Environment Variables

```bash
# .env.example

# Site URL (for canonical URLs, OG images)
SITE_URL=https://thenineteenth.golf

# App Store Links
APP_STORE_URL=https://apps.apple.com/app/the-nineteenth/id...
PLAY_STORE_URL=https://play.google.com/store/apps/details?id=...

# Analytics (Plausible)
PLAUSIBLE_DOMAIN=thenineteenth.golf

# Contact Form (optional - if using external service)
CONTACT_EMAIL=hello@thenineteenth.golf

# Feature Flags
ENABLE_BLOG=false
```

---

## Commands

```bash
# Development
pnpm install          # Install dependencies
pnpm dev              # Start dev server (http://localhost:3000)

# Build
pnpm build            # Production build
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
pnpm typecheck        # Run TypeScript compiler
pnpm format           # Format with Prettier

# Testing
pnpm test             # Run tests
```

---

## Deployment

### Vercel (Recommended)

1. Connect GitHub repo to Vercel
2. Set environment variables
3. Deploy on push to `main`

```bash
# Manual deploy
vercel --prod
```

### Cloudflare Pages (Alternative)

1. Connect GitHub repo
2. Build command: `pnpm build`
3. Output directory: `build/client`

---

## Component Guidelines

### File Naming

- Components: `PascalCase.tsx` (e.g., `HeroSection.tsx`)
- Utilities: `camelCase.ts` (e.g., `formatPrice.ts`)
- Routes: `kebab-case.tsx` (e.g., `privacy-policy.tsx`)

### Component Structure

```tsx
// components/sections/HeroSection.tsx

interface HeroSectionProps {
  headline: string;
  subheadline: string;
}

export function HeroSection({ headline, subheadline }: HeroSectionProps) {
  return (
    <section className="py-16 md:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Content */}
      </div>
    </section>
  );
}
```

### Import Order

1. React/Remix imports
2. Third-party libraries
3. Components (absolute paths)
4. Utilities/hooks
5. Types
6. Styles/assets

```tsx
import { useState } from 'react';
import { Link, useLoaderData } from '@remix-run/react';
import { motion } from 'framer-motion';

import { Button } from '~/components/ui/Button';
import { Container } from '~/components/layout/Container';

import { formatPrice } from '~/lib/utils';
import { useMediaQuery } from '~/hooks/useMediaQuery';

import type { LoaderData } from './types';
```

---

## Accessibility

- All images must have `alt` text
- Buttons must have accessible names
- Color contrast ratio: minimum 4.5:1
- Focus states on all interactive elements
- Skip-to-content link
- Semantic HTML (`<main>`, `<nav>`, `<section>`, etc.)
- ARIA labels where needed

---

## Mobile Responsiveness

Breakpoints (Tailwind defaults):
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

Design mobile-first. Test on:
- iPhone SE (375px)
- iPhone 14 (390px)
- iPad (768px)
- Desktop (1280px+)

---

## Third-Party Integrations

### App Store Badges

Use official badges:
- [Apple App Store Badge](https://developer.apple.com/app-store/marketing/guidelines/)
- [Google Play Badge](https://play.google.com/intl/en_us/badges/)

### Analytics

Plausible (privacy-focused, GDPR-compliant):
```html
<script defer data-domain="thenineteenth.golf" src="https://plausible.io/js/script.js"></script>
```

### Contact Form

Use Remix actions to handle form submission. Send to email via:
- Resend (recommended)
- SendGrid
- Or simple mailto: link

---

## Brand Guidelines

### Voice & Tone

- **Casual & Australian:** Use "mates", "comp", "sorted"
- **Straightforward:** No corporate jargon
- **Confident but not arrogant:** We solve a real problem
- **Helpful:** Guide users to the right tier

### Language

- Australian English spellings (colour, organisation, centre)
- Date format: DD/MM/YYYY
- Currency: AUD

### Avoid

- Over-promising ("best app ever")
- Technical jargon
- US spellings
- Generic stock photo aesthetics

---

## Assets Checklist

### Required Before Launch

- [ ] App icon / logo (SVG + PNG)
- [ ] Favicon set (favicon.ico, apple-touch-icon, etc.)
- [ ] Open Graph images (1200x630px for each page)
- [ ] App screenshots (6 per platform)
- [ ] Hero section mockup/image
- [ ] Feature icons (6 icons)
- [ ] App Store badges
- [ ] Privacy policy content
- [ ] Terms of service content

### Nice to Have

- [ ] App preview video
- [ ] Animated illustrations
- [ ] Customer testimonials (with photos)
- [ ] Blog post images

---

## Launch Checklist

- [ ] All pages responsive and tested
- [ ] Meta tags on all pages
- [ ] Open Graph images working
- [ ] Analytics installed
- [ ] Forms tested
- [ ] 404 page created
- [ ] Sitemap generated
- [ ] robots.txt configured
- [ ] SSL certificate active
- [ ] Performance audit passed (Lighthouse 90+)
- [ ] Accessibility audit passed
- [ ] Legal pages in place (privacy, terms)
- [ ] App Store links working
- [ ] Contact email receiving
