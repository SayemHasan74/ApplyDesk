# Deploy ApplyDesk

1. Create an Atlas **Free / M0** cluster on **AWS Singapore (`ap-southeast-1`)**. Create a database named `applydesk`. Create an application database user with only **readWrite on `applydesk`**, rather than `atlasAdmin` or access to all databases. In Network Access add permanent `0.0.0.0/0` for this standard Vercel deployment with changing outbound IPs. This permits connection attempts from any IPv4 address; authentication and TLS remain required. Keep a strong unique database password and never commit the connection string. [Atlas network access](https://www.mongodb.com/docs/atlas/security/ip-access-list/).

2. Install Node 20.9+ and npm, clone the repository, run `npm ci`, and copy `.env.example` to `.env.local`. Add your Atlas driver connection string as `MONGODB_URI`, ending in `/applydesk`. URL-encode special characters in the password. `.env.local` is ignored by Git.

3. Generate `AUTH_SECRET` with `npx auth secret` and keep the resulting value in `.env.local`. Generate **separate** values with `openssl rand -base64 32` for `ENCRYPTION_KEY` and `CRON_SECRET`. `ENCRYPTION_KEY` must decode to exactly 32 bytes. Keep it stable: replacing it later prevents decryption of previously saved Gmail refresh tokens. Never put secrets in `NEXT_PUBLIC_*` variables.

4. In Google Cloud create a project and a **Web application** OAuth client. Configure Google Auth Platform branding and audience, and add these **authorized redirect URIs** exactly:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://YOUR-PRODUCTION-DOMAIN/api/auth/callback/google`
   - `http://localhost:3000/api/gmail/callback`
   - `https://YOUR-PRODUCTION-DOMAIN/api/gmail/callback`

   Add `http://localhost:3000` and your HTTPS production origin as authorized JavaScript origins if requested. Record the client ID and secret. Set `ALLOWED_EMAIL` to the owner's Google account; the app also requires Google's verified-email claim. Other Google accounts cannot sign in. Preview deployments need their own explicitly registered callback URL if used for OAuth testing.

5. Set the Google OAuth consent screen / Audience publishing status to **In production**. This is necessary for the Gmail integration: external apps in **Testing** receive refresh tokens that expire after seven days when requesting scopes beyond basic identity. Publishing does not guarantee tokens last forever; revocation and Google's other expiration rules still apply. Complete Google's verification requirements if the selected scopes require them. [Google token expiration rules](https://developers.google.com/identity/protocols/oauth2/#expiration).

6. Fill the environment variables below locally, then run `npm run db:indexes` once to create the unique, tenant, TTL, and counter indexes. Run it again after an authorized model-index change. Do this before using demos or creating records; `autoIndex` is disabled at runtime. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

   | Variable | Value |
   | --- | --- |
   | `MONGODB_URI` | Atlas URI for the `applydesk` database |
   | `AUTH_SECRET` | Generated Auth.js secret, at least 32 characters |
   | `AUTH_GOOGLE_ID` | Google OAuth client ID |
   | `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
   | `ALLOWED_EMAIL` | Owner's verified Google email |
   | `APP_URL` | `http://localhost:3000` locally; production HTTPS origin on Vercel |
   | `GEMINI_API_KEY` | Your Gemini API key; required by the shared environment schema |
   | `GEMINI_MODEL` | A Gemini model ID available to your account |
   | `GEMINI_FALLBACK_MODELS` | Comma-separated fallback Gemini model IDs |
   | `ENCRYPTION_KEY` | Separate generated 32-byte base64 encryption key |
   | `CRON_SECRET` | Separate generated cron secret |
   | `DEMO_AI_DAILY_LIMIT` | Positive integer, such as `6` |

7. Import the GitHub repository into **Vercel** as a Next.js project. Use the repository's npm lockfile and compatible Node runtime. Keep the standard `npm run build` command. `vercel.json` pins functions to **Singapore (`sin1`)**, next to Atlas. The AI chat and Gmail cron routes have `maxDuration = 60`. Enable the Gmail API in the OAuth project before connecting Gmail.

8. In Vercel Project Settings → Environment Variables enter every required value from step 6 for **Production**. Set `APP_URL` to the final **Production domain's HTTPS origin**, with no path. Use matching environment values and OAuth callbacks for Development/Preview if those environments are enabled. Never expose secrets in screenshots or build logs.

9. Deploy from Vercel. If the production hostname is only known after the first deployment, update `APP_URL` and Google's production redirect URI, then redeploy. Environment-variable changes require a new deployment. Sign in on the production URL using the allowed account and verify Settings saves; verify another Google account is rejected and a demo cannot access Settings. Deployment and Google authorization are human steps; they are not executed by this code change.

10. Open the production app in current **Chrome or Edge**, inspect the linked manifest, then select **Install ApplyDesk** (or the browser's install-app menu). Confirm the installed app opens in a standalone window. Manifest icons are generated PNG responses at `/icon-192` and `/icon-512`; the latter is maskable. The theme/background color is `#4f46e5`. There is **no service worker or offline mode**. If the browser does not offer installation, check HTTPS, manifest/icon responses, and its installation criteria; do not add a service worker to bypass the project rules.

## Final security and request audit

1. API inventory: all application APIs use `withApi`; native Auth.js and generated image endpoints retain their protocol handlers. OAuth connection redirects are explicitly allowed by the wrapper.
2. Tenant isolation: the source heuristic and manual review cover CRUD, linked IDs, concrete bulk filters, undo replacements, Gmail upserts and action logs. Scoped-filter helpers and aliased filters retain `userId`. The root users collection uses `_id: userId`. The authenticated cron's single-owner bootstrap lookup is the Part 9 exception; it passes that owner's ID into every operation afterward.
3. Permissions: `canUse` gates owner capabilities. Demos receive 403 on Settings, Gmail and secretless cron APIs; owner pages redirect demos to /. This Part 10 requirement overrides the earlier OAuth callback auth-failure redirect and cron 401 behavior. Authenticated callback failures still redirect to the generic Settings error URL.
4. Validation: strict manual, AI proposal and classifier contracts reject unknown/operator/dotted keys, excessive lengths, invalid dates/IDs and unsafe URL schemes. Raw AI records are rejected and use the existing bounded repair flow. Provider metadata is projected to known fields; full audit snapshots are restricted to model-declared fields. A malformed job URL previously threw inside its Zod refinement; it now returns a normal validation failure.
5. CSRF: POST, PATCH and DELETE tests reject missing/cross-origin Origin and cross-site Sec-Fetch-Site before authentication or mutation. Cron requires its timing-safe shared secret and ignores cookies.
6. Secrets: runtime environment reads are confined to the server-only env module; local env files are Git-ignored. No client imports server secrets. NODE_ENV checks for OAuth cookies use the central module. Secret values were not included in this audit.
7. Errors: only explicit non-internal AppErrors expose messages. Other failures, Mongo errors and stacks remain generic; action failures preserve independent per-item results.
8. Logs: no console.log calls. Server error logs contain only a code and request ID.
9. Requests: Server Components read data directly; independent loads use Promise.all. All three list queries receive initialData and disable mount refetch. The chat's two first-open history/usage GETs are the explicit Part 8 exception. No mount fetch follows server-provided lists; no polling, session provider, per-user persistent cache or automatic mutation retry. There are ten getUser call sites, at most one per page/layout level; React cache wraps the only auth call. Static tests enforce API wrappers and security headers.
10. Demo expiry: creation tests cover the user, all seed/manual/AI entity helpers, chat messages and action logs. Demo action logs now expire with the demo session, within their normal 30-day maximum; owner Gmail records are unavailable to demos. MongoDB TTL deletion is asynchronous. A real Atlas read verified the fresh demo user and all 8 jobs, 5 certifications and 8 to-dos share the same expiry.
11. Cleanup: removed six unused copied UI files, five unused UI wrapper functions, unused UI exports and unused public type/helper exports. Retained dependencies are used by runtime code, framework/type tooling or required scripts. No package was added. README documents the maintained app in fewer than 120 lines.

### Production initial JavaScript

After a successful build run `node scripts/audit-bundles.mjs`. Next.js 16 does not print First Load JS in its route table. This estimate counts unique bootstrap/layout/page chunks, gzip level 9, decimal kB; it excludes unopened lazy chunks, legacy polyfills and error-only entries, HTML/RSC and CSS.

| Route | Initial JS, gzip kB |
| --- | ---: |
| / | 158.1 |
| /jobs | 166.2 |
| /certifications | 166.6 |
| /todos | 167.0 |
| /inbox | 160.0 |
| /settings | 160.8 |
| /login | 150.5 |
| /demo | 150.5 |
| /_not-found | 150.2 |
| All API routes, generated icons and manifest | 0 |

### Acceptance limits

The local production browser check used a fresh isolated demo session, not a separate incognito profile. Passive server request counts verified zero dashboard API calls and exactly one to-do PATCH with no list GET. Demo quota fallback and its three example conversations can be verified without increasing the real budget.
Owner OAuth variables, APP_URL, ENCRYPTION_KEY and CRON_SECRET are still unconfigured locally. Production owner login persistence in an installed Chrome/Edge app and the complete live screenshot/multi-command AI acceptance sequence require the human's configured deployment and available AI quota. These checks are not represented as completed by unit tests.

For scheduled Gmail sync set GitHub Actions secrets APP_URL and CRON_SECRET to the production values, and connect Gmail in Settings. The workflow runs every six hours; no deployment or account permission change was performed by this audit.
