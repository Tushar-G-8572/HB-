# HB+ Portal — Google login restricted to one email domain

A cross-platform app (**Android, iOS and Web from one React Native codebase**) where users sign in with
**Google OAuth** and only emails ending in `@hbplus.fit` are allowed in. Everyone else sees:

> Access restricted. Please login using your official domain email.

**Stack:** React Native + Expo (Expo Router, React Native for Web) · TypeScript · Supabase (Auth + Postgres) · Google OAuth 2.0

## Features

| Requirement | Where |
| --- | --- |
| Google Sign-In button | `src/app/login.tsx` |
| Domain validation | `src/lib/domain.ts` (client) + `supabase/schema.sql` (database trigger) |
| Protected dashboard | `src/app/(app)/dashboard.tsx`, guarded by `src/app/(app)/_layout.tsx` |
| Logout | Dashboard top bar → `signOut()` in `src/context/AuthContext.tsx` |
| Loading state | Spinner on the button while signing in + full-screen loader while the session is restored |
| Error handling | Friendly error banner; OAuth, network and cancelled flows are handled |
| Role-based access (bonus) | `admin` / `user` roles; admins see a team-members panel |
| Store users in a database (bonus) | `profiles` table in Supabase Postgres |
| Protected routes (bonus) | Route guard + database Row Level Security |

## Folder structure

```
src/
  app/                    # Expo Router routes (file-based)
    _layout.tsx           # <AuthProvider> + root stack
    index.tsx             # decides: /login or /dashboard
    login.tsx             # public login page
    (app)/                # PROTECTED route group
      _layout.tsx         # route guard (redirects to /login without a session)
      dashboard.tsx       # dashboard page
    +not-found.tsx        # unknown URL -> back to "/"
  components/             # Button, Avatar, Badge, ErrorBanner, FullScreenLoader
  config/env.ts           # reads EXPO_PUBLIC_* environment variables
  context/AuthContext.tsx # auth state: session, profile, role, loading, error
  lib/
    domain.ts             # isAllowedEmail() — domain validation
    oauth.ts              # Google OAuth for web + native
    secureStorage.ts      # encrypted token storage for iOS/Android
    supabase.ts           # Supabase client
  theme.ts                # colors / spacing / breakpoints
  types.ts
supabase/schema.sql       # tables, RLS policies, domain trigger
netlify.toml              # Netlify build + SPA redirect
```

## Setup instructions

### 1. Install

```bash
git clone <your-repo-url>
cd hbplus-auth
npm install
cp .env.example .env      # then fill in the values (step 4)
```

### 2. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
3. Open **Project Settings → API** and copy the **Project URL** and the **anon public** key.

### 3. Configure Google OAuth

1. In [Google Cloud Console](https://console.cloud.google.com/) create a project → **APIs & Services → OAuth consent screen**
   (user type *External*; add your test users while in "Testing").
2. **Credentials → Create credentials → OAuth client ID → Web application**.
   Under **Authorized redirect URIs** add exactly:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Copy the **Client ID** and **Client secret**.
4. In Supabase: **Authentication → Sign In / Providers → Google** → enable it and paste the Client ID + secret.
5. In Supabase: **Authentication → URL Configuration**:
   - **Site URL:** your Netlify URL (or `http://localhost:8081` while developing)
   - **Redirect URLs** (add all that apply):
     - `http://localhost:8081`
     - `https://<your-site>.netlify.app`
     - `hbplusauth://**` (installed/dev-build mobile app)
     - `exp://**` (Expo Go during development)

> Tip: in **Authentication → Providers**, turn **Email** off so Google is the only way to sign in.

### 4. Environment variables (`.env`)

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
EXPO_PUBLIC_ALLOWED_DOMAIN=hbplus.fit
```

Only the public anon key is used. It is safe in the client because every table is protected by Row Level Security.

### 5. Run it

```bash
npm run web          # browser  -> http://localhost:8081
npm run android      # Android emulator (Expo Go)
npm run ios          # iOS simulator (macOS only)
```

### 6. Make yourself an admin (optional, for the role-based bonus)

Log in once, then run this in the Supabase SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@hbplus.fit';
```

### 7. Deploy to Netlify

1. Push the repo to GitHub.
2. Netlify → **Add new site → Import from Git** → select the repo. `netlify.toml` already sets
   the build command (`npx expo export --platform web`) and publish folder (`dist`).
3. **Site configuration → Environment variables:** add the three `EXPO_PUBLIC_*` variables from step 4
   (they are inlined at build time, so redeploy after changing them).
4. Add the Netlify URL to **Supabase → Authentication → URL Configuration** (step 3.5).

### Testing with a personal Gmail account

To demonstrate the error state, just log in with any `@gmail.com` account — it is rejected.
To demonstrate a *successful* login without a real `@hbplus.fit` account, temporarily change **both**:
`EXPO_PUBLIC_ALLOWED_DOMAIN=gmail.com` and the `like '%@hbplus.fit'` pattern in the trigger in `schema.sql`.
Change them back before submitting.

## Authentication flow

```
 User taps "Login with Google"
          │
          ▼
 Supabase builds the Google OAuth URL  (web: full-page redirect, native: in-app browser sheet)
          │
          ▼
 User picks a Google account ──► Google redirects to Supabase /auth/v1/callback
          │
          ▼
 Supabase creates/loads the user  ◄── DB trigger rejects emails outside the domain (Layer 1)
          │
          ▼
 App receives a session (access + refresh token)
          │
          ▼
 AuthContext.applySession()  ── email not in domain? ──► sign out + show error  (Layer 2)
          │ allowed
          ▼
 Profile (role) loaded from `profiles` ──► route guard lets the user into /dashboard (Layer 3)
```

1. **Web:** `supabase.auth.signInWithOAuth` redirects the page to Google and back to the site origin;
   `supabase-js` reads the session from the URL.
   **Native:** `expo-web-browser` opens Google's page in a secure browser sheet and returns through a deep link;
   the tokens are then handed to `supabase.auth.setSession`.
2. `AuthContext` keeps `session`, `profile`, `loading`, `signingIn` and `error` and exposes them via `useAuth()`.
3. The app restores the saved session on launch and refreshes the access token automatically.
4. **Logout** clears the session locally and the guard sends the user back to `/login`.

## How domain restriction works

The domain is enforced in **three independent layers**, so removing any one of them does not open a hole:

1. **Database trigger (server side — the real gate).**
   `supabase/schema.sql` adds a `BEFORE INSERT` trigger on `auth.users`. If the email does not end with
   `@hbplus.fit`, the sign-up is aborted, the account is never created and the user returns to the app with an error,
   which is shown as *"Access restricted. Please login using your official domain email."*
   A modified client cannot skip this.
2. **Client validation (`isAllowedEmail`).** After a session is received, `AuthContext` compares the part after the
   last `@` for **exact equality** with the allowed domain. Look-alikes such as `a@evilhbplus.fit`,
   `a@hbplus.fit.evil.com` or `a@sub.hbplus.fit` are rejected. A failing user is signed out immediately and
   no protected screen is rendered.
3. **Route guard + Row Level Security.** Every screen in `(app)/` is gated on a valid session, and the `profiles`
   table only returns a user's own row (admins can read all). Roles cannot be changed through the API because
   `role` is excluded from the column-level `UPDATE`/`INSERT` grants.

The `hd=hbplus.fit` parameter is also sent to Google so the account chooser highlights company accounts,
but it is only a **UX hint**; it is never trusted for security.

## Security notes

- **Protected routes:** opening `/dashboard` directly without a session redirects to `/login`; the guard renders nothing
  until the session check has finished, so protected content never flashes.
- **Token handling:** on iOS/Android the session (access + refresh token) is stored in the Keychain / Keystore via
  `expo-secure-store` (chunked, because of its size limit). On web, `supabase-js` uses `localStorage` — standard for
  browser SPAs, so the site sets security headers in `netlify.toml` and renders no user-controlled HTML.
  Access tokens are short-lived and refreshed automatically; refresh stops while a mobile app is in the background.
- **No secrets in the client:** only the public anon key is bundled. The Google client secret lives in Supabase.
- **Least privilege:** RLS is enabled on `profiles`; users can read only their own row and cannot edit their role.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run web` / `android` / `ios` | Start the dev server for a platform |
| `npm run typecheck` | TypeScript check |
| `npm run build:web` | Production web build into `dist/` |
