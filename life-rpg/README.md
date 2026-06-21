# Life RPG — Personal Dashboard

Turn your goals and habits into a video-game character sheet. Every action you
log earns XP, raises your stat levels and overall Character Level, builds a
streak, unlocks achievements, and chips away at your "boss" goals. Google
Calendar events become auto-completable quests. All charts update in real time.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind · Recharts ·
framer-motion · lucide-react · NextAuth (Google)**. Game state lives in
`localStorage` behind a typed `useGameState` hook, so it can later be swapped
for a database without touching components.

> This app lives in the `life-rpg/` subdirectory of the repository. When you
> create a Vercel project for it, set the **Root Directory** to `life-rpg`.

---

## Screens

| Route           | What it does                                                                 |
| --------------- | ---------------------------------------------------------------------------- |
| `/`             | Character sheet: avatar + level, total XP, streak, energy bar, stat radar, 30-day XP line, 12-week activity heatmap, stat-level bars. |
| `/quests`       | Add manual quests (title, stat, XP, optional daily). Check one off to animate the XP gain and possible level-up. |
| `/calendar`     | Connect Google Calendar (read-only), see this week's events, map each to a stat, and convert it into a completed quest for XP. |
| `/achievements` | Badge grid; locked badges are greyed. Unlock logic runs on every state change. |
| `/bosses`       | Big goals with a target + unit and a progress bar you increment manually.    |
| `/settings`     | Rename/add/remove stats, tune streak multipliers, reset season, export/import JSON, and generate an AI weekly recap. |

## Game mechanics

- **Leveling** — `xpForLevel(n) = round(100 · n^1.5)` is the XP to go from level
  *n* to *n+1*. A stat's level is derived from its cumulative XP. Character Level
  = `floor(average of all stat levels)`.
- **Streak multiplier** — applied at log time: 7-day streak → ×1.5, 30-day → ×2
  (both editable in Settings).
- **Dailies** reset at local midnight; the streak breaks if a day is missed.
- **Achievements** seeded: Early Riser, Closer, Iron Will, Polymath, Marathoner.
- **Persistence** — debounced `localStorage` writes; full JSON export/import so
  your data is never trapped. Sample data is seeded on first load (clear it in
  Settings).

---

## Local setup

```bash
cd life-rpg
npm install
cp .env.example .env.local   # fill in values (all optional for a first run)
npm run dev                  # http://localhost:3000
```

The app runs with **zero configuration** — calendar and AI-recap features
degrade gracefully when their env vars are absent.

### Environment variables

| Variable               | Required for        | Notes                                              |
| ---------------------- | ------------------- | -------------------------------------------------- |
| `GOOGLE_CLIENT_ID`     | Calendar            | Google OAuth client ID.                            |
| `GOOGLE_CLIENT_SECRET` | Calendar            | Google OAuth client secret.                        |
| `NEXTAUTH_SECRET`      | Auth (any sign-in)  | `openssl rand -base64 32`.                         |
| `NEXTAUTH_URL`         | Auth                | `http://localhost:3000` locally; your prod URL on Vercel. |
| `ANTHROPIC_API_KEY`    | AI weekly recap     | Optional Phase 2 feature. Uses Claude.             |

---

## Google Calendar setup (optional)

1. Open the [Google Cloud Console](https://console.cloud.google.com/) → create
   or pick a project.
2. **APIs & Services → Library →** enable the **Google Calendar API**.
3. **APIs & Services → OAuth consent screen →** configure it (External is fine
   for personal use). Add your Google account as a **Test user**, and add the
   scope `https://www.googleapis.com/auth/calendar.readonly`.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID →**
   *Web application*. Add **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-vercel-domain>/api/auth/callback/google`
5. Copy the client ID/secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

The app only ever reads your **primary** calendar (today → +7 days) and never
writes to it.

---

## Deploy to Vercel

1. Push this repository to GitHub (already done if you're reading this on the
   remote).
2. In Vercel, **Add New → Project**, import the repo, and set:
   - **Framework Preset:** Next.js
   - **Root Directory:** `life-rpg`  ← important (the app is in a subfolder)
3. Add the environment variables from the table above (set `NEXTAUTH_URL` to the
   project's production URL).
4. Deploy. After the first deploy, add the production callback URL to your
   Google OAuth credentials (step 4 above).

`npm run build` passes with no errors, and the app works in production with no
calendar setup at all.

---

## Architecture notes

- `lib/gameState.tsx` — the single source of truth. A `commit()` helper clones
  state, applies a daily reset, runs the mutation, re-evaluates achievements,
  persists (debounced), and fires toasts. Swap the `localStorage` read/write in
  here for Vercel Postgres later and nothing else changes.
- `lib/leveling.ts` — pure leveling math (unit-testable).
- `app/api/calendar/events` — server route using the stored Google access token
  + `googleapis` to list events. Token refresh is handled in the NextAuth `jwt`
  callback (`lib/auth.ts`).
- `app/api/recap` — Phase 2 AI narrator, gated behind `ANTHROPIC_API_KEY`.
