# Seva — group donation collector

Mobile-first React + Vite app with Supabase (Google auth). English + Telugu.

## Setup (local)

1. `cp .env.example .env.local` and fill Supabase URL + publishable/anon key  
   (`.env.local` is gitignored — never commit it)
2. Run SQL in Supabase:
   - new project: `supabase/schema.sql`
   - existing: `migration_001_campaign_details.sql` then `migration_002_donation_history.sql`
3. Enable Google in Supabase Auth (Client ID/Secret live in Supabase only)
4. Auth → URL Configuration Redirect URLs:
   - `http://localhost:5173/**`
   - `https://sainathreddy2002.github.io/donation-collector/**`
5. Google Cloud OAuth → Authorized JavaScript origins also add:
   - `https://sainathreddy2002.github.io`
6. `npm install && npm run dev`

## Deploy (GitHub Pages)

Site: https://sainathreddy2002.github.io/donation-collector/

CI builds with GitHub Actions secrets (not committed):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (publishable/anon key — safe for client apps with RLS)

Repo → Settings → Pages → Source: **GitHub Actions**.

Push to `main` deploys automatically.

## Secrets policy

| Item | Where | In git? |
|------|--------|---------|
| Supabase publishable/anon key | `.env.local` / GH Actions secret | No (baked into client build only) |
| Supabase `service_role` | Never in this app | Never |
| Google Client Secret | Supabase dashboard only | Never |
| Google Client ID | Supabase dashboard only | Never |
