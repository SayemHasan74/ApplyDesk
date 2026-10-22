# ApplyDesk

A personal job, certification and to-do tracker with an AI assistant and optional read-only Gmail suggestions.
One verified Google account owns the app. Visitors can explore isolated, expiring demo data.

## Stack
Next.js App Router, React, strict TypeScript, Tailwind CSS, copied shadcn/ui components,
Auth.js JWT sessions, MongoDB Atlas/Mongoose, TanStack Query, Zod, and the Gemini SDK.
Dates use Asia/Dhaka. Vercel functions run in Singapore (`sin1`). No service worker or offline mode.

## Run locally
1. Install Node 20.9+ and npm, clone the repository, then run `npm ci`.
2. Copy `.env.example` to `.env.local` and fill every variable below. Never commit secrets.
3. Create an Atlas database named `applydesk` with a database user scoped to that database.
4. Register Google OAuth callbacks for local and production origins:
   `/api/auth/callback/google` and `/api/gmail/callback`.
5. Run `npm run db:indexes`, then `npm run dev`; open `http://localhost:3000`.
6. Sign in with the allowed Google account, or open `/demo` and click once to explore.
7. Run all four checks below before deploying. See [deployment instructions](docs/DEPLOY.md).

## Environment
All variables stay on the server. `.env.local` is ignored; `.env.example` contains names only.
| Name | Purpose | Where to get it |
| --- | --- | --- |
| `MONGODB_URI` | Atlas connection to `/applydesk` | Atlas → Connect → Drivers |
| `AUTH_SECRET` | Signs/encrypts login sessions; keep stable | `npx auth secret` |
| `AUTH_GOOGLE_ID` | Google OAuth client ID | Google Cloud → Google Auth Platform → Clients |
| `AUTH_GOOGLE_SECRET` | Secret for the same OAuth client | Same Google OAuth client |
| `ALLOWED_EMAIL` | Owner's verified Google email | Your owner Google account |
| `APP_URL` | Origin, no trailing slash; localhost locally, HTTPS in production | Your local or Vercel domain |
| `GEMINI_API_KEY` | Server-side Gemini access | Google AI Studio → API keys |
| `GEMINI_MODEL` | Primary model available to your account | Google AI Studio/model documentation |
| `GEMINI_FALLBACK_MODELS` | Comma-separated fallback model IDs | Same available model list |
| `ENCRYPTION_KEY` | Encrypts Gmail refresh tokens; keep stable | `openssl rand -base64 32` (32 decoded bytes) |
| `CRON_SECRET` | Authenticates scheduled Gmail sync | Separate `openssl rand -base64 32` value |
| `DEMO_AI_DAILY_LIMIT` | Global daily demo AI budget; positive integer | Choose a limit, e.g. `6` |

Set the Google OAuth consent screen to **In production** before connecting Gmail; testing-mode
refresh tokens can expire after seven days. Enable the Gmail API in that Google Cloud project.
Gmail connection is optional; its controls and Inbox are available only to the owner.

## Scripts
| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript without emitting files |
| `npm test` | Vitest unit, security and source-audit tests |
| `npm run db:indexes` | Synchronize unique, tenant and TTL indexes; run after model-index changes |
| `node scripts/audit-bundles.mjs` | Measure production initial JS; fail above 170 kB per authenticated route |

## How the AI works
1. Send text, one screenshot, a voice recording, or a public page link in the floating chat.
2. Screenshots are compressed locally; recordings become 16 kHz mono WAV; media is not persisted.
3. Gemini returns structured proposals or answers from the current user's lists.
4. Review fields, edit create proposals, uncheck bulk items, or discard proposals.
5. Confirm sends one apply request; the server validates fields and tenant ownership again.
6. Each successful write has an audit snapshot; Undo restores the previous state.
7. Requests have daily limits, timeout/Stop handling and no polling or client mutation retries.
8. Read-only Gmail classification uses both the owner's limit and a separate five-call daily budget.

## Demo mode
Each visitor gets a new tenant and fictional seed data, with a shared 24-hour expiry on the user
and its records. MongoDB TTL deletion is asynchronous. Manual tracking remains available when
AI is exhausted. A demo has at most two AI calls for its session and shares the global daily budget;
each provider or repair attempt consumes usage. AI batch creation enforces a 150-record combined cap.
Demos cannot use owner settings, Gmail, Inbox or privileged action kinds.

## Scheduled Gmail sync
The workflow `.github/workflows/gmail-sync.yml` runs every six hours and supports manual dispatch.
Set GitHub repository **Actions secrets** `APP_URL` (production HTTPS origin) and `CRON_SECRET`
(exactly the same secret as the deployed app). Connect Gmail in Settings before running it.
Email bodies are classified in memory, never stored; matching emails produce pending suggestions.
Accept/Dismiss uses the audited actions engine. Syncing alone never updates a tracked job.

## Final acceptance
Run lint, typecheck, tests and build; check the production bundle audit after building.
Verify owner login survives reopening the installed app, and exercise AI proposals/Confirm/Undo.
Check Network for one request per mutation/send and none to `/api/*` on dashboard load.
These live production checks require your configured OAuth client, domain and available AI quota.
