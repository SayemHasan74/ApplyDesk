# Deploy ApplyDesk

1. Create an Atlas **Free / M0** cluster on **AWS Singapore (`ap-southeast-1`)**. Create a database named `applydesk`. Create an application database user with only **readWrite on `applydesk`**, rather than `atlasAdmin` or access to all databases. In Network Access add permanent `0.0.0.0/0` for this standard Vercel deployment with changing outbound IPs. This permits connection attempts from any IPv4 address; authentication and TLS remain required. Keep a strong unique database password and never commit the connection string. [Atlas network access](https://www.mongodb.com/docs/atlas/security/ip-access-list/).

2. Install Node 20.9+ and npm, clone the repository, run `npm ci`, and copy `.env.example` to `.env.local`. Add your Atlas driver connection string as `MONGODB_URI`, ending in `/applydesk`. URL-encode special characters in the password. `.env.local` is ignored by Git.

3. Generate `AUTH_SECRET` with `npx auth secret` and keep the resulting value in `.env.local`. Generate **separate** values with `openssl rand -base64 32` for `ENCRYPTION_KEY` and `CRON_SECRET`. `ENCRYPTION_KEY` must decode to exactly 32 bytes. Keep it stable: replacing it later prevents decryption of previously saved Gmail refresh tokens. Never put secrets in `NEXT_PUBLIC_*` variables.

4. In Google Cloud create a project and a **Web application** OAuth client. Configure Google Auth Platform branding and audience, and add these **authorized redirect URIs** exactly:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://YOUR-PRODUCTION-DOMAIN/api/auth/callback/google`

   Add `http://localhost:3000` and your HTTPS production origin as authorized JavaScript origins if requested. Record the client ID and secret. Set `ALLOWED_EMAIL` to the owner's Google account; the app also requires Google's verified-email claim. Other Google accounts cannot sign in. Preview deployments need their own explicitly registered callback URL if used for OAuth testing.

5. Set the Google OAuth consent screen / Audience publishing status to **In production**. This is necessary for the later Gmail integration: external apps in **Testing** receive refresh tokens that expire after seven days when requesting scopes beyond basic identity. Publishing does not guarantee tokens last forever; revocation and Google's other expiration rules still apply. Complete Google's verification requirements if the selected scopes require them. [Google token expiration rules](https://developers.google.com/identity/protocols/oauth2/#expiration).

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
   | `TELEGRAM_BOT_TOKEN` | Optional until Telegram is implemented; omit if unused |
   | `TELEGRAM_CHAT_ID` | Optional until Telegram is implemented; omit if unused |

7. Import the GitHub repository into **Vercel** as a Next.js project. Use the repository's npm lockfile and compatible Node runtime. Keep the standard `npm run build` command. `vercel.json` pins functions to **Singapore (`sin1`)**, next to Atlas. No AI route exists yet; only that future route will receive `maxDuration = 60`.

8. In Vercel Project Settings → Environment Variables enter every required value from step 6 for **Production**. Add optional Telegram values only when available. Set `APP_URL` to the final **Production domain's HTTPS origin**, with no path. Use matching environment values and OAuth callbacks for Development/Preview if those environments are enabled. Never expose secrets in screenshots or build logs.

9. Deploy from Vercel. If the production hostname is only known after the first deployment, update `APP_URL` and Google's production redirect URI, then redeploy. Environment-variable changes require a new deployment. Sign in on the production URL using the allowed account and verify Settings saves; verify another Google account is rejected and a demo cannot access Settings. Deployment and Google authorization are human steps; they are not executed by this code change.

10. Open the production app in current **Chrome or Edge**, inspect the linked manifest, then select **Install ApplyDesk** (or the browser's install-app menu). Confirm the installed app opens in a standalone window. Manifest icons are generated PNG responses at `/icon-192` and `/icon-512`; the latter is maskable. The theme/background color is `#4f46e5`. There is **no service worker or offline mode**. If the browser does not offer installation, check HTTPS, manifest/icon responses, and its installation criteria; do not add a service worker to bypass the project rules.

## Part 5 request and performance audit

1. Runtime application source contains none of the forbidden session hooks, timer polling, caching directives, libraries, or suppression patterns listed in the Part 5 prompt. Generated build output, dependency code, and rule documents are excluded from the runtime-source search.
2. Server pages/layouts perform no HTTP fetches. The three list queries all receive server `initialData`; effects do not fetch. Settings uses local optimistic state and a mutation, without another query key or a mount request. Production browser regression checks confirmed one API request for each tested mutation and no list GET afterward.
3. There are nine direct `getUser()` call sites: seven across the root/app layouts and five authenticated pages, one API helper, and one session helper. Each page/layout level calls it at most once. React `cache` shares the session lookup within a request. Only `session.ts` imports the actual `auth` function; login actions import `signIn`/`signOut`, and the native Auth.js route imports its protocol handlers.
4. [Next.js 16 removed First Load JS from build output](https://nextjs.org/docs/app/guides/upgrading/version-16). After a successful build run `node scripts/audit-bundles.mjs` for a reproducible initial-JS estimate from production manifests. It counts unique bootstrap, layout, and page chunks with gzip level 9, in decimal kB; it excludes legacy-only polyfills, unopened lazy editors/validators, and error-only entries. It is not a measurement of HTML, RSC payloads, CSS, or later interactions. The script exits unsuccessfully if an authenticated page exceeds 170,000 bytes. The audit reduced the initial client dependency graph by deferring editors/validation/request helpers, keeping date-only formatting separate from timezone code, rendering static icons on the server, and using native menu/buttons on initial screens.

   | Route | Initial JS, gzip kB |
   | --- | ---: |
   | `/` | 156.3 |
   | `/jobs` | 165.5 |
   | `/certifications` | 165.9 |
   | `/todos` | 166.3 |
   | `/settings` | 158.1 |
   | `/login` | 150.4 |
   | `/demo` | 150.4 |
   | `/_not-found` | 150.1 |
   | `/api/auth/[...nextauth]` | 0 |
   | `/api/jobs`, `/api/jobs/[id]` | 0 |
   | `/api/certifications`, `/api/certifications/[id]` | 0 |
   | `/api/todos`, `/api/todos/[id]`, `/api/todos/clear-done` | 0 |
   | `/api/settings` | 0 |
   | `/icon`, `/apple-icon`, `/icon-192`, `/icon-512`, `/manifest.webmanifest` | 0 |

5. Every application JSON API handler uses `withApi`. The native Auth.js protocol endpoint is the necessary exception: OAuth redirects, cookies and protocol responses must remain under Auth.js rather than the application's JSON envelope. The public generated PNG routes also intentionally use native `ImageResponse` handlers. Unauthenticated application APIs now reach `withApi` instead of being redirected by the page proxy, and return JSON 401 with `Cache-Control: no-store`. Demo Settings API access returns 403 and its page redirects to `/`. Tenant-owned document filters use `userId`; the root `users` collection identifies the owner by `_id: userId`, plus `role: 'admin'` for Settings. A source-scanning Vitest test enforces first-parameter `userId` on all exported data functions; the pure serializer was moved out of that directory.
6. `securityHeaders()` is exported from `next.config.ts` and tested for all five standard headers plus exact production-only CSP. Production HTTP responses were also checked, including absence of `X-Powered-By`. The database index command was corrected to use the tsx CommonJS evaluation entry point for compatibility with the installed Node/Mongoose combination, and successfully run against Atlas.

The manifest and PNG dimensions were tested against the production server. A live owner Settings save, Google production login, and OS-level Chrome/Edge installation remain human checks after the real OAuth/environment configuration and deployment. Browser checks used an isolated expiring demo and temporary process-only values for unconfigured services. No deployment or external account settings were changed by Part 5.
