# Marketing Site - Supabase Authentication Guide

Technical documentation for implementing player login on The Nineteenth marketing website using Supabase Auth. This guide covers connection setup, authentication flows, and integration patterns for a Remix-based web application.

---

## Overview

The marketing site allows existing players to log in and access their account dashboard, view competition history, manage their profile, and upgrade subscription tiers. This uses the **same Supabase project** as the mobile app, ensuring a unified user experience.

### Key Features

- **Shared authentication**: Same Supabase project as mobile app
- **Session management**: Server-side and client-side session handling
- **Protected routes**: Middleware-based route protection
- **Player portal**: Account dashboard, stats, subscription management

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Marketing Site (Remix)                       │
├─────────────────────────────────────────────────────────────────┤
│  Browser                           │  Server (Loader/Action)    │
│  ─────────────────────────────────  │  ─────────────────────────  │
│  @supabase/ssr (client)            │  @supabase/ssr (server)    │
│  - Cookie-based sessions           │  - Cookie parsing          │
│  - Client-side queries             │  - Server-side queries     │
│  - Auth state listeners            │  - Protected data fetching │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Project                              │
│  (Same instance as mobile app)                                   │
├─────────────────────────────────────────────────────────────────┤
│  Auth Service      │  Database (PostgreSQL)  │  Storage          │
│  - Email/password  │  - players              │  - Avatars        │
│  - Magic links     │  - competitions         │  - Course images  │
│  - OAuth (future)  │  - scorecards           │                   │
│                    │  - user_subscriptions   │                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Setup

### 1. Install Dependencies

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

### 2. Environment Variables

```bash
# .env

# Supabase (same credentials as mobile app)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here

# Site URL (for OAuth redirects, email links)
SITE_URL=https://thenineteenth.app

# Cookie settings
SESSION_SECRET=your-session-secret-min-32-chars
```

**Important:** Use `SUPABASE_URL` (not `EXPO_PUBLIC_*`) for server-side access.

### 3. Supabase Client Setup

Create utility files for server and browser clients:

#### `app/lib/supabase/server.ts` - Server-Side Client

```typescript
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import type { Database } from '~/types/database.types';

/**
 * Create a Supabase client for server-side operations (loaders/actions)
 *
 * Usage in loader:
 * ```ts
 * export async function loader({ request }: LoaderFunctionArgs) {
 *   const { supabase, headers } = createSupabaseServerClient(request);
 *   const { data: { user } } = await supabase.auth.getUser();
 *   return json({ user }, { headers });
 * }
 * ```
 */
export function createSupabaseServerClient(request: Request) {
  const headers = new Headers();

  const supabase = createServerClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        // Get cookies from request
        getAll() {
          return parseCookieHeader(request.headers.get('Cookie') ?? '');
        },
        // Set cookies on response
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            headers.append(
              'Set-Cookie',
              serializeCookieHeader(name, value, options)
            );
          });
        },
      },
    }
  );

  return { supabase, headers };
}

/**
 * Get current user from request (convenience helper)
 * Returns null if not authenticated
 */
export async function getUser(request: Request) {
  const { supabase, headers } = createSupabaseServerClient(request);

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, headers };
  }

  return { user, headers };
}

/**
 * Get current session from request
 * Returns null if not authenticated
 */
export async function getSession(request: Request) {
  const { supabase, headers } = createSupabaseServerClient(request);

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    return { session: null, headers };
  }

  return { session, headers };
}

/**
 * Require authentication - redirects to login if not authenticated
 * Use in protected route loaders
 */
export async function requireAuth(request: Request, redirectTo = '/login') {
  const { user, headers } = await getUser(request);

  if (!user) {
    const url = new URL(request.url);
    const searchParams = new URLSearchParams([
      ['redirectTo', url.pathname + url.search],
    ]);

    throw redirect(`${redirectTo}?${searchParams}`, { headers });
  }

  return { user, headers };
}

/**
 * Get player profile for authenticated user
 */
export async function getPlayerProfile(request: Request) {
  const { supabase, headers } = createSupabaseServerClient(request);

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { player: null, headers };
  }

  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('*')
    .eq('id', user.id)
    .single();

  if (playerError || !player) {
    return { player: null, user, headers };
  }

  return { player, user, headers };
}
```

#### `app/lib/supabase/client.ts` - Browser Client

```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '~/types/database.types';

/**
 * Singleton browser client
 * Safe to use in components and hooks
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient<Database>(
    window.ENV.SUPABASE_URL,
    window.ENV.SUPABASE_PUBLISHABLE_KEY
  );

  return browserClient;
}

/**
 * Hook-friendly client getter (for use in React components)
 */
export function useSupabase() {
  return getSupabaseBrowserClient();
}
```

#### `app/lib/supabase/middleware.ts` - Auth Middleware

```typescript
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import type { Database } from '~/types/database.types';

/**
 * Middleware to refresh auth tokens on every request
 * Use in root loader to keep sessions fresh
 */
export async function refreshSession(request: Request) {
  const headers = new Headers();

  const supabase = createServerClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get('Cookie') ?? '');
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            headers.append(
              'Set-Cookie',
              serializeCookieHeader(name, value, options)
            );
          });
        },
      },
    }
  );

  // This will refresh the session if needed
  const { data: { session } } = await supabase.auth.getSession();

  return { session, headers, supabase };
}
```

### 4. Environment Variables in Browser

Expose environment variables to the browser via root loader:

#### `app/root.tsx`

```typescript
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { refreshSession } from '~/lib/supabase/middleware';

// Expose env vars to browser
declare global {
  interface Window {
    ENV: {
      SUPABASE_URL: string;
      SUPABASE_PUBLISHABLE_KEY: string;
    };
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, headers } = await refreshSession(request);

  return json(
    {
      ENV: {
        SUPABASE_URL: process.env.SUPABASE_URL!,
        SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY!,
      },
      user: session?.user ?? null,
    },
    { headers }
  );
}

export default function App() {
  const { ENV } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        {/* ... */}
      </head>
      <body>
        {/* ... */}

        {/* Expose ENV to browser */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(ENV)}`,
          }}
        />
      </body>
    </html>
  );
}
```

---

## Authentication Flows

### 1. Email + Password Login

#### Route: `app/routes/login.tsx`

```typescript
import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { Form, useActionData, useNavigation, useSearchParams } from '@remix-run/react';
import { createSupabaseServerClient, getUser } from '~/lib/supabase/server';

// Redirect if already logged in
export async function loader({ request }: LoaderFunctionArgs) {
  const { user, headers } = await getUser(request);

  if (user) {
    return redirect('/dashboard', { headers });
  }

  return json({}, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = formData.get('redirectTo') as string || '/dashboard';

  // Validate inputs
  const errors: Record<string, string> = {};

  if (!email || !email.includes('@')) {
    errors.email = 'Valid email is required';
  }

  if (!password || password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors, success: false }, { status: 400 });
  }

  // Attempt login
  const { supabase, headers } = createSupabaseServerClient(request);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return json(
      { errors: { form: error.message }, success: false },
      { status: 401, headers }
    );
  }

  // Success - redirect to dashboard or original destination
  return redirect(redirectTo, { headers });
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();

  const isSubmitting = navigation.state === 'submitting';
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Access your competitions, stats, and settings
          </p>
        </div>

        <Form method="post" className="mt-8 space-y-6">
          <input type="hidden" name="redirectTo" value={redirectTo} />

          {actionData?.errors?.form && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {actionData.errors.form}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
              {actionData?.errors?.email && (
                <p className="mt-1 text-sm text-red-600">{actionData.errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
              {actionData?.errors?.password && (
                <p className="mt-1 text-sm text-red-600">{actionData.errors.password}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <a href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-500">
              Forgot your password?
            </a>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </Form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <a href="/download" className="text-primary-600 hover:text-primary-500 font-medium">
              Download the app to sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
```

### 2. Magic Link Login (Passwordless)

#### Route: `app/routes/login.magic-link.tsx`

```typescript
import { json, type ActionFunctionArgs } from '@remix-run/node';
import { Form, useActionData, useNavigation } from '@remix-run/react';
import { createSupabaseServerClient } from '~/lib/supabase/server';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get('email') as string;

  if (!email || !email.includes('@')) {
    return json({ error: 'Valid email is required', success: false }, { status: 400 });
  }

  const { supabase, headers } = createSupabaseServerClient(request);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return json({ error: error.message, success: false }, { status: 400, headers });
  }

  return json({ success: true, email }, { headers });
}

export default function MagicLinkPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  if (actionData?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-4 text-green-500">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
          <p className="mt-2 text-gray-600">
            We've sent a magic link to <strong>{actionData.email}</strong>.
            Click the link to sign in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Sign in with email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We'll send you a magic link to sign in
          </p>
        </div>

        <Form method="post" className="mt-8 space-y-6">
          {actionData?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {actionData.error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Sending...' : 'Send magic link'}
          </button>
        </Form>

        <div className="text-center">
          <a href="/login" className="text-sm text-primary-600 hover:text-primary-500">
            Sign in with password instead
          </a>
        </div>
      </div>
    </div>
  );
}
```

### 3. Auth Callback Handler

Handle OAuth and magic link callbacks:

#### Route: `app/routes/auth.callback.tsx`

```typescript
import { redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { createSupabaseServerClient } from '~/lib/supabase/server';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/dashboard';

  if (!code) {
    return redirect('/login?error=missing_code');
  }

  const { supabase, headers } = createSupabaseServerClient(request);

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('Auth callback error:', error);
    return redirect(`/login?error=${encodeURIComponent(error.message)}`, { headers });
  }

  return redirect(next, { headers });
}
```

### 4. Password Reset Flow

#### Route: `app/routes/forgot-password.tsx`

```typescript
import { json, type ActionFunctionArgs } from '@remix-run/node';
import { Form, useActionData, useNavigation } from '@remix-run/react';
import { createSupabaseServerClient } from '~/lib/supabase/server';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get('email') as string;

  if (!email || !email.includes('@')) {
    return json({ error: 'Valid email is required', success: false }, { status: 400 });
  }

  const { supabase, headers } = createSupabaseServerClient(request);

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.SITE_URL}/auth/reset-password`,
  });

  if (error) {
    return json({ error: error.message, success: false }, { status: 400, headers });
  }

  return json({ success: true, email }, { headers });
}

export default function ForgotPasswordPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  if (actionData?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
          <p className="mt-2 text-gray-600">
            If an account exists for <strong>{actionData.email}</strong>,
            we've sent password reset instructions.
          </p>
          <a href="/login" className="mt-4 inline-block text-primary-600 hover:text-primary-500">
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email and we'll send you reset instructions
          </p>
        </div>

        <Form method="post" className="mt-8 space-y-6">
          {actionData?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {actionData.error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </button>
        </Form>

        <div className="text-center">
          <a href="/login" className="text-sm text-primary-600 hover:text-primary-500">
            Back to login
          </a>
        </div>
      </div>
    </div>
  );
}
```

#### Route: `app/routes/auth.reset-password.tsx`

```typescript
import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { Form, useActionData, useNavigation } from '@remix-run/react';
import { createSupabaseServerClient } from '~/lib/supabase/server';

export async function loader({ request }: LoaderFunctionArgs) {
  // Verify we have a valid session from the reset link
  const { supabase, headers } = createSupabaseServerClient(request);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return redirect('/forgot-password?error=invalid_link', { headers });
  }

  return json({}, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  // Validate
  const errors: Record<string, string> = {};

  if (!password || password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors, success: false }, { status: 400 });
  }

  const { supabase, headers } = createSupabaseServerClient(request);

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return json(
      { errors: { form: error.message }, success: false },
      { status: 400, headers }
    );
  }

  return redirect('/dashboard?message=password_updated', { headers });
}

export default function ResetPasswordPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Set new password
          </h2>
        </div>

        <Form method="post" className="mt-8 space-y-6">
          {actionData?.errors?.form && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {actionData.errors.form}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
              {actionData?.errors?.password && (
                <p className="mt-1 text-sm text-red-600">{actionData.errors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
              {actionData?.errors?.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{actionData.errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Updating...' : 'Update password'}
          </button>
        </Form>
      </div>
    </div>
  );
}
```

### 5. Logout Action

#### Route: `app/routes/logout.tsx`

```typescript
import { redirect, type ActionFunctionArgs } from '@remix-run/node';
import { createSupabaseServerClient } from '~/lib/supabase/server';

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);

  await supabase.auth.signOut();

  return redirect('/', { headers });
}

// Also handle GET for convenience (e.g., direct link)
export async function loader({ request }: ActionFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);

  await supabase.auth.signOut();

  return redirect('/', { headers });
}
```

---

## Protected Routes

### Dashboard Example

#### Route: `app/routes/dashboard.tsx`

```typescript
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireAuth, getPlayerProfile, createSupabaseServerClient } from '~/lib/supabase/server';

export async function loader({ request }: LoaderFunctionArgs) {
  // Require authentication - redirects to /login if not authenticated
  const { user, headers } = await requireAuth(request);

  // Get player profile
  const { supabase } = createSupabaseServerClient(request);

  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('id', user.id)
    .single();

  // Get subscription tier
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('tier, expires_at')
    .eq('user_id', user.id)
    .single();

  // Get recent competitions
  const { data: competitions } = await supabase
    .from('competition_players')
    .select(`
      competition:competitions (
        id,
        name,
        start_date,
        end_date,
        status
      )
    `)
    .eq('player_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Get stats summary
  const { data: stats } = await supabase
    .from('player_statistics')
    .select('*')
    .eq('player_id', user.id)
    .single();

  return json(
    {
      user,
      player,
      subscription,
      recentCompetitions: competitions?.map(c => c.competition) ?? [],
      stats,
    },
    { headers }
  );
}

export default function DashboardPage() {
  const { user, player, subscription, recentCompetitions, stats } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          G'day, {player?.name || user.email}!
        </h1>
        <p className="mt-1 text-gray-600">
          Here's your golf summary
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Current Handicap"
          value={player?.handicap?.toFixed(1) ?? 'Not set'}
        />
        <StatCard
          label="Competitions Played"
          value={stats?.competitions_played ?? 0}
        />
        <StatCard
          label="Rounds Played"
          value={stats?.rounds_played ?? 0}
        />
        <StatCard
          label="Average Score"
          value={stats?.average_score?.toFixed(1) ?? '-'}
        />
      </div>

      {/* Subscription Banner */}
      {subscription?.tier === 'free' && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-primary-900">Upgrade to Social</h3>
              <p className="text-sm text-primary-700">
                Get more competitions, players, and game formats
              </p>
            </div>
            <a
              href="/pricing"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
            >
              View plans
            </a>
          </div>
        </div>
      )}

      {/* Recent Competitions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Recent Competitions
        </h2>
        {recentCompetitions.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {recentCompetitions.map((comp: any) => (
              <li key={comp.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{comp.name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(comp.start_date).toLocaleDateString('en-AU')}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    comp.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : comp.status === 'completed'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {comp.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">
            No competitions yet. Download the app to join or create one!
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
```

---

## Auth Context (Client-Side)

For client-side auth state management:

#### `app/context/AuthContext.tsx`

```typescript
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRevalidator } from '@remix-run/react';
import { getSupabaseBrowserClient } from '~/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
});

export function AuthProvider({
  children,
  initialUser
}: {
  children: ReactNode;
  initialUser: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const revalidator = useRevalidator();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Revalidate server data on auth change
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          revalidator.revalidate();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [revalidator]);

  return (
    <AuthContext.Provider value={{ user, session, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

---

## Supabase Configuration

### Email Templates

Configure email templates in Supabase Dashboard > Authentication > Email Templates:

#### Confirmation Email
```html
<h2>Confirm your email</h2>
<p>G'day! Click the link below to confirm your email for The Nineteenth:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm email address</a></p>
<p>If you didn't sign up for The Nineteenth, you can ignore this email.</p>
```

#### Magic Link Email
```html
<h2>Your sign in link</h2>
<p>G'day! Click the link below to sign in to The Nineteenth:</p>
<p><a href="{{ .ConfirmationURL }}">Sign in to The Nineteenth</a></p>
<p>This link will expire in 24 hours.</p>
<p>If you didn't request this link, you can ignore this email.</p>
```

#### Password Reset Email
```html
<h2>Reset your password</h2>
<p>G'day! Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset password</a></p>
<p>This link will expire in 24 hours.</p>
<p>If you didn't request a password reset, you can ignore this email.</p>
```

### Redirect URLs

Configure in Supabase Dashboard > Authentication > URL Configuration:

- **Site URL**: `https://thenineteenth.app`
- **Redirect URLs**:
  - `https://thenineteenth.app/auth/callback`
  - `https://thenineteenth.app/auth/reset-password`
  - `http://localhost:3000/auth/callback` (development)
  - `thenineteenth://auth/*` (mobile app deep links)

---

## Security Considerations

### 1. Server-Side Validation

Always validate auth on the server:

```typescript
// ✅ Good - server-side validation
export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase } = createSupabaseServerClient(request);
  const { data: { user } } = await supabase.auth.getUser(); // Validates JWT
  // ...
}

// ❌ Bad - trusting client-side session
export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase } = createSupabaseServerClient(request);
  const { data: { session } } = await supabase.auth.getSession(); // Can be spoofed
  // ...
}
```

### 2. Row Level Security (RLS)

Supabase RLS policies protect data. Players can only access their own data:

```sql
-- Example: Players can only read their own profile
CREATE POLICY "Players can view own profile"
ON players FOR SELECT
USING (auth.uid() = id);

-- Example: Players can update own profile
CREATE POLICY "Players can update own profile"
ON players FOR UPDATE
USING (auth.uid() = id);
```

### 3. CSRF Protection

Remix handles CSRF automatically for form submissions. For API routes, verify the origin:

```typescript
export async function action({ request }: ActionFunctionArgs) {
  // Verify origin for non-form requests
  const origin = request.headers.get('Origin');
  if (origin && !origin.includes('thenineteenth.app')) {
    return json({ error: 'Invalid origin' }, { status: 403 });
  }
  // ...
}
```

### 4. Rate Limiting

Supabase Auth has built-in rate limiting. For additional protection, use Cloudflare or Vercel edge middleware.

---

## Type Definitions

Copy the database types from the mobile app:

#### `app/types/database.types.ts`

```typescript
// Copy from mobile app: src/types/database.types.ts
// This ensures type consistency between mobile and web
export type Database = {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          handicap: number | null;
          handicap_updated_at: string | null;
          golf_id: string | null;
          photo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { /* ... */ };
        Update: { /* ... */ };
      };
      // ... other tables
    };
  };
};

export type Player = Database['public']['Tables']['players']['Row'];
```

---

## Route Summary

| Route | Method | Description |
|-------|--------|-------------|
| `/login` | GET, POST | Email + password login |
| `/login/magic-link` | GET, POST | Magic link login |
| `/forgot-password` | GET, POST | Request password reset |
| `/auth/callback` | GET | Handle OAuth/magic link callbacks |
| `/auth/reset-password` | GET, POST | Set new password |
| `/logout` | GET, POST | Sign out |
| `/dashboard` | GET | Protected - Player dashboard |
| `/dashboard/profile` | GET, POST | Protected - Edit profile |
| `/dashboard/subscription` | GET | Protected - Manage subscription |

---

## Testing

### Local Development

1. Start Supabase locally or use staging project
2. Set environment variables in `.env`
3. Run `pnpm dev`
4. Test all auth flows:
   - Login with existing mobile app account
   - Magic link login
   - Password reset
   - Session persistence
   - Protected route access

### Test Accounts

Use these test accounts (create in Supabase Dashboard):

```
Email: test@thenineteenth.app
Password: TestPassword123!

Email: premium@thenineteenth.app
Password: TestPassword123!
(Premium tier for testing upgrade flows)
```

---

## Troubleshooting

### Common Issues

**1. Session not persisting**
- Ensure cookies are being set (check `Set-Cookie` header)
- Verify `SameSite` and `Secure` cookie attributes for production

**2. Magic link not working**
- Check redirect URL is in Supabase allowed list
- Verify `SITE_URL` environment variable

**3. "Invalid JWT" errors**
- Use `getUser()` instead of `getSession()` for server-side validation
- Check token hasn't expired

**4. CORS errors**
- Verify Supabase project URL is correct
- Check allowed origins in Supabase Dashboard

---

## Future Enhancements

1. **OAuth providers** (Google, Apple) for social sign-in
2. **MFA/2FA** support for premium accounts
3. **Session management** - view/revoke active sessions
4. **Account deletion** - GDPR-compliant self-service deletion
5. **Email preferences** - manage notification settings

---

*Last Updated: January 2025*
