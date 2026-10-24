# HB+ Portal — Google login restricted to one email domain

**Live demo:** https://hb-plus-portal.netlify.app

A cross-platform app (**Android, iOS and Web from one React Native codebase**) where users sign in with
**Google OAuth 2.0** and only emails ending in `@hbplus.fit` are allowed in. Everyone else sees:

> Access restricted. Please login using your official domain email.

**Stack:** React Native + Expo (Expo Router, React Native for Web) · TypeScript · Supabase (Auth + Postgres) · Google OAuth 2.0 · Netlify

**Contents:** [Requirements](#assignment-requirements) · [Folder structure](#folder-structure) · [Setup](#setup-instructions) ·
[Authentication flow](#authentication-flow) · [Domain restriction](#how-domain-restriction-works) ·
[Security](#security-notes) · [Testing](#testing-and-verification) · [Troubleshooting](#troubleshooting)

## Assignment requirements

| Requirement | Where it is implemented |
| --- | --- |
| Google OAuth 2.0 login | Supabase Auth with the Google provider — `src/lib/oauth.ts` |
| Google Sign-In button | `src/app/login.tsx` |
| Verify the email domain / restrict all other domains | `src/lib/domain.ts` (client) + `supabase/schema.sql` (database trigger) |
| Exact error message for other domains | `RESTRICTED_MESSAGE` in `src/lib/domain.ts`, shown by `ErrorBanner` |
| Protected Dashboard page | `src/app/(app)/dashboard.tsx`, guarded by `src/app/(app)/_layout.tsx` |
| Logout | Dashboard top bar → `signOut()` in `src/context/AuthContext.tsx` |
| Loading state | Spinner on the button while signing in, full-screen loader while the session is restored |
| Error handling | Friendly error banner; rejected domain, cancelled sign-in and network/OAuth failures are handled |
| Same codebase on Mobile and Web | Expo + React Native for Web (`npm run web`, `npm run android`, `npm run ios`) |
| Responsive, clean UI | Single column on phones, card grid on wide screens (`WIDE_BREAKPOINT` in `src/theme.ts`) |
| Bonus: Admin / User roles | `profiles.role`; admins also see a team-members panel on the dashboard |
| Bonus: store user data in a database | `profiles` table in Supabase Postgres |
| Bonus: protected routes | Route guard + database Row Level Security |
| Token handling best practices | Keychain/Keystore on mobile, short-lived tokens with auto-refresh — see [Security](#security-notes) |

## Folder structure

```
src/
  app/                    # Expo Router routes (file-based: each file is a URL)
    _layout.tsx           # <AuthProvider> + root stack (wraps every screen)
    index.tsx             # "/"  -> decides: /login or /dashboard
    login.tsx             # "/login"  public login page
    (app)/                # route group = PROTECTED area (the folder name is not part of the URL)
      _layout.tsx         # route guard (redirects to /login without a session)
      dashboard.tsx       # "/dashboard"
    +not-found.tsx        # unknown URL -> back to "/"
  components/             # reusable UI: Button, Avatar, Badge, ErrorBanner, FullScreenLoader, ...
  config/env.ts           # reads EXPO_PUBLIC_* environment variables
  context/AuthContext.tsx # auth state: session, profile, role, loading, error
  lib/
    domain.ts             # isAllowedEmail() — domain validation
    oauth.ts              # Google OAuth for web + native
    secureStorage.ts      # encrypted token storage for iOS/Android
    supabase.ts           # Supabase client
  theme.ts                # colors / spacing / breakpoints
  types.ts
public/privacy.html       # privacy policy page (required by Google for a published app)
supabase/
  schema.sql              # tables, RLS policies, domain trigger
  test-domain-restriction.sql  # rolled-back SQL test for the domain rules
netlify.toml              # Netlify build + SPA redirect + security headers
.env.example              # environment variable template
```

## Setup instructions

### 1. Install

```bash
git clone <your-repo-url>
cd hbplus-auth
npm install
cp .env.example .env      # then fill in the values (step 4)
```

Requires Node.js 20 or newer.

### 2. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
3. Open **Project Settings → API** and copy the **Project URL** and the **anon public** key.

### 3. Configure Google OAuth

1. In [Google Cloud Console](https://console.cloud.google.com/) create a project, then open
   **Google Auth Platform** (formerly *APIs & Services → OAuth consent screen*).
2. **Branding:** set the app name (`HB+ Portal`), a user-support email, a developer contact email and:
   - **Authorized domain:** `<your-project-ref>.supabase.co`
   - **App home page:** your Netlify URL
   - **Privacy policy link:** `<your-netlify-url>/privacy.html` (served from [`public/privacy.html`](public/privacy.html) —
     put your contact email in it first). Do not upload a logo; a logo can trigger Google's verification review.
3. **Data Access:** keep only the default scopes `openid`, `email` and `profile`.
4. **Clients → Create client → Web application.** Under **Authorized redirect URIs** add exactly:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
   and copy the **Client ID** and **Client secret**.
5. In Supabase: **Authentication → Sign In / Providers → Google** → enable it and paste the Client ID + secret.
6. In Supabase: **Authentication → URL Configuration**:
   - **Site URL:** your Netlify URL (or `http://localhost:8081` while developing)
   - **Redirect URLs** (add all that apply):
     - `http://localhost:8081`
     - `https://<your-site>.netlify.app`
     - `hbplusauth://**` (installed/dev-build mobile app)
     - `exp://**` (Expo Go during development)
7. **Publish the app** (do this after step 7 below, because Google checks that the home page and privacy URLs load):
   Google Auth Platform → **Audience → Publish app** (status must read *In production*).
   While the app is in *Testing*, Google only lets listed test users sign in, so any other
   `@hbplus.fit` account would be blocked by Google before reaching this app.

> Tip: in **Authentication → Providers**, turn **Email** off so Google is the only way to sign in.

### 4. Environment variables (`.env`)

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
EXPO_PUBLIC_ALLOWED_DOMAIN=hbplus.fit
```

Only the public anon key is used. It is safe in the client because every table is protected by Row Level Security.
Never put the `service_role` key in an `EXPO_PUBLIC_` variable: those values are bundled into the app.
Restart the dev server after editing `.env` (`npx expo start -c`).

### 5. Run it

```bash
npm run web          # browser  -> http://localhost:8081
npm run android      # Android emulator or device (Expo Go)
npm run ios          # iOS simulator (macOS only)
```

For a physical phone, install **Expo Go**, keep the phone and computer on the same Wi-Fi and scan the QR code from
`npx expo start` (use `npx expo start --tunnel` if the phone cannot reach the computer).
Make sure `exp://**` is in the Supabase Redirect URLs (step 3.6).

### 6. Make yourself an admin (optional, for the role-based bonus)

Log in once with an allowed account, then run this in the Supabase SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@hbplus.fit';
```

New users are always created with the `user` role; the role cannot be changed from the app.

### 7. Deploy to Netlify

1. Push the repo to GitHub.
2. Netlify → **Add new site → Import from Git** → select the repo. `netlify.toml` already sets
   the build command (`npx expo export --platform web`), the publish folder (`dist`) and a rule that serves
   `index.html` for every path, so deep links such as `/dashboard` reach the app (where the route guard decides).
3. **Site configuration → Environment variables:** add the three `EXPO_PUBLIC_*` variables from step 4
   (they are inlined at build time, so trigger a new deploy after changing them).
4. These values are public by design, so they are excluded from Netlify's secrets scanner
   (`SECRETS_SCAN_OMIT_KEYS`); otherwise the scanner fails the build because the domain name appears in the source.
5. Keep the site **publicly accessible**: no Netlify password protection or *Netlify Authentication*,
   or visitors are asked to log in to Netlify before they can see the app.
6. Add the Netlify URL to **Supabase → Authentication → URL Configuration** (step 3.6).

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
3. The app restores the saved session on launch (showing a loader meanwhile) and refreshes the access token automatically.
4. If Supabase rejects the sign-up, Google returns the user to the app with an error in the URL;
   the app reads it, shows the *"Access restricted…"* message and cleans the address bar.
5. **Logout** clears the session and the guard sends the user back to `/login`.

## How domain restriction works

The domain is enforced in **three independent layers**, so removing any one of them does not open a hole:

1. **Database trigger (server side — the real gate).**
   `supabase/schema.sql` adds a `BEFORE INSERT` trigger on `auth.users`. If the email does not end with
   `@hbplus.fit`, the sign-up is aborted, the account is never created and the user returns to the app with an error,
   which is shown as *"Access restricted. Please login using your official domain email."*
   A modified client cannot skip this.

   ```sql
   if new.email is null or lower(new.email) not like '%@hbplus.fit' then
     raise exception 'Access restricted: only @hbplus.fit accounts are allowed';
   end if;
   ```

2. **Client validation (`isAllowedEmail`).** After a session is received, `AuthContext` compares the part after the
   last `@` for **exact equality** with the allowed domain. Look-alikes such as `a@evilhbplus.fit`,
   `a@hbplus.fit.evil.com` or `a@sub.hbplus.fit` are rejected. A failing user is signed out immediately and
   no protected screen is rendered.

   ```ts
   const at = value.lastIndexOf('@');
   return at >= 1 && value.slice(at + 1) === allowedDomain;   // exact match, case-insensitive
   ```

3. **Route guard + Row Level Security.** Every screen in `(app)/` is gated on a valid session, and the `profiles`
   table only returns a user's own row (admins can read all). Roles cannot be changed through the API because
   `role` is excluded from the column-level `UPDATE`/`INSERT` grants.

Google's `hd` (hosted-domain) sign-in parameter is intentionally **not** used: it would lock Google's own sign-in
box to one domain, so other users could never reach the app to see the "Access restricted" message, and it is
only a hint, never a security control.

## Security notes

- **Protected routes:** opening `/dashboard` directly without a session redirects to `/login`; the guard renders nothing
  until the session check has finished, so protected content never flashes.
- **Token handling:** on iOS/Android the session (access + refresh token) is stored in the Keychain / Keystore via
  `expo-secure-store` (chunked, because of its size limit). On web, `supabase-js` uses `localStorage` — standard for
  browser SPAs, so the site sets security headers in `netlify.toml` and renders no user-controlled HTML.
  Access tokens are short-lived and refreshed automatically; refresh stops while a mobile app is in the background.
- **No secrets in the client:** only the public anon key is bundled. The Google client secret lives in Supabase.
- **Least privilege:** RLS is enabled on `profiles`; users can read only their own row and cannot edit their role.
- **Minimal Google access:** only the `openid`, `email` and `profile` scopes are requested.

## Testing and verification

| Check | How | Expected result |
| --- | --- | --- |
| Other domains are rejected | Log in with any `@gmail.com` account | Back on `/login` with the red *"Access restricted…"* banner |
| Allowed domain is accepted, look-alikes are blocked | Run [`supabase/test-domain-restriction.sql`](supabase/test-domain-restriction.sql) in the Supabase SQL editor | A red error box listing five `PASS` lines; nothing is saved (the test rolls back) |
| Direct URL access is blocked | Open `/dashboard` in a private window | Redirected to `/login` |
| Loading state | Click *Login with Google* | Button shows a spinner and "Signing you in…" |
| Logout | Click *Logout* on the dashboard | Back on `/login`; `/dashboard` is no longer reachable |
| Mobile | `npm run android` (emulator) or Expo Go on a phone | Same login screen; Gmail login ends with the same error banner |

**Verified so far:** a real Gmail login on the live site is rejected with the required message, and the SQL test
returns `PASS` for `test.user@hbplus.fit` (accepted, profile created with role `user`) and for `someone@gmail.com`,
`a@evilhbplus.fit`, `a@hbplus.fit.evil.com` and `a@sub.hbplus.fit` (all blocked).

A real `@hbplus.fit` Google account is only needed to see the dashboard end to end. Without one, the SQL test above
proves the database accepts the domain. To see the full success flow with your own Gmail instead, temporarily set
`EXPO_PUBLIC_ALLOWED_DOMAIN=gmail.com` and change the `like '%@hbplus.fit'` pattern in the trigger to
`like '%@gmail.com'`, log in, then **change both back** and delete the test user under
*Supabase → Authentication → Users*. Never deploy the `gmail.com` value.

<!-- Add screenshots to a docs/ folder, then remove this comment markup to show them:
## Screenshots

| Login (web) | Gmail rejected | Mobile |
| --- | --- | --- |
| ![Login](docs/login-web.png) | ![Rejected](docs/rejected.png) | ![Mobile](docs/mobile.png) |
-->

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Redirected to `?error=server_error … Database error saving new user` | The domain trigger rejected the email (expected for non-allowed accounts). If an allowed email fails, check *Supabase → Logs → Postgres Logs* for the real error. |
| After login you land on `http://localhost:8081` instead of your site | Your site URL is missing from *Supabase → Authentication → URL Configuration* (Site URL and Redirect URLs). |
| Google shows "Access blocked" or only lets listed users in | The consent screen is still in *Testing*. Publish it: Google Auth Platform → Audience → **Publish app**. |
| Google's email box is locked to `@hbplus.fit` | The `hd` parameter is being sent. It should not be (see *How domain restriction works*). |
| Login page says "App is not configured yet" | `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` is missing or misspelled. Redeploy after fixing it on Netlify. |
| Netlify build fails with "Secrets scanning found secrets" | Add the three `EXPO_PUBLIC_*` names to `SECRETS_SCAN_OMIT_KEYS`. |
| Visitors are asked to log in to Netlify | Disable site password protection / Netlify Authentication under *Site configuration → Access & security*. |
| Env changes have no effect | `EXPO_PUBLIC_*` values are read at build/start time: restart `expo start -c` or redeploy. |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run web` / `android` / `ios` | Start the dev server for a platform |
| `npm run typecheck` | TypeScript check |
| `npm run build:web` | Production web build into `dist/` |