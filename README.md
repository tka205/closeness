# Closeness (M0)

Personal 12-week interpersonal-skills training PWA. Local-first; Supabase is silent backup.

## Architecture (ratified decisions)
- **A** Local-first IndexedDB + Supabase background sync (outbox is THE write path)
- **B** Email+password auth, persistent session; app fully functional offline/logged-out
- **C** In-app banners v1; content-free server Web Push in v1.1
- **E** Behavioral counts are the primary metrics; depth = subjective experience
- **F** Adherence kit: ≤60s logs, one-tap quick log, reminders default on, Day-28 checkpoint

## Run
```bash
npm install
npm run dev        # local dev
npm run build      # production build (output: dist/)
```

## Setup (manual steps — YOU)
1. Create a Supabase project, **EU region** (e.g. eu-west-2 London / eu-central).
2. SQL editor → run `supabase/schema.sql`.
3. Auth → Providers → enable Email (password). Disable signups after creating your account, or leave invite-only.
4. Copy `.env.example` → `.env`, fill `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
5. Deploy to Vercel (`vercel.json` already handles SPA rewrites + SW no-cache headers). Add the two env vars in Vercel project settings.
6. iPhone: open the deployed URL in Safari → Share → **Add to Home Screen** → open the installed app (required for proper PWA behaviour and any future push).

No env vars = the app runs purely local (chip shows "local only"). Sync activates the moment credentials exist and you sign in.

## Build status (M0–M5 core)
- [x] Production build green (`npm run build`)
- [x] Typecheck green
- [x] PWA installable (manifest + SW + icons)
- [x] Local write path works end-to-end (one-tap log on Home → IndexedDB → outbox)
- [x] Sync engine: drain-on-online/focus/login, retry/backoff, idempotent upserts
- [x] Export/import (JSON) in the data layer (UI lands in M2 Settings)
- [ ] On-device test on your iPhone (only you can do this one)

## Milestones
All screens built: counts-first log form + list, prime, audit (predict-before-reveal), weekly review (data-derived aggregates), progress (dependency-free SVG charts), phase reference (corrected copy), settings (auth, reminders, export/import). Remaining for you: on-device iPhone test, Supabase project setup, deploy. v1.1 = server Web Push (SW handlers already in place).
