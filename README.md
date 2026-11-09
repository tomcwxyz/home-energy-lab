# Home Energy Lab

Private, mobile-friendly household energy monitoring and experiment log.

## Architecture
- Next.js 15 / React 19 on Vercel
- Dedicated Neon Postgres database in London
- Server-only smart-meter, weather and local-sensor ingestion
- Private login with HMAC-signed, HttpOnly, SameSite cookies
- No automatic heating or hot-water control

The application supports manual programmes, tariff records and experiments, plus read-only consumption charts once measurements are connected. Programme records describe what was manually set on the Danfoss programmer; they do not cause changes to heating equipment.

## Environment
Create Vercel environment variables based on .env.example. DATABASE_URL and all credentials must remain server-side. Never commit .env.local, household readings, exact coordinates, or secrets.

Required before first login:
- DATABASE_URL — pooled Neon connection string
- DASHBOARD_USER and DASHBOARD_PASSWORD — long, unique credentials
- SESSION_SECRET — independent random value, at least 32 characters

Optional, for later:
- BRIGHT_USERNAME and BRIGHT_PASSWORD — consumer Bright account
- CRON_SECRET — Vercel scheduled sync bearer token
- SENSOR_INGEST_TOKEN — local sensor bearer token
- HOME_LATITUDE and HOME_LONGITUDE — weather forecast location

## Database
On the empty Neon project, run sql/001_init.sql and sql/002_programme_history.sql (already applied to the dedicated Neon project created for this release).

## Development
npm install
npm test
npm run dev

The private cloud site is not an automated heating controller. Sensor integrations must not bypass the cylinder's safety controls, and all water temperature/safety decisions require appropriate professional advice.

## Deployment
Connect GitHub tomcwxyz/home-energy-lab to the existing Vercel 'Tom's projects' team as a Next.js application. Choose root directory '.'. Disable deployment for public access until authentication secrets are configured. Use Vercel Firewall rate-limiting for POST /api/session/login. The dashboard remains unavailable (503) if private credentials are missing.

The first deployment is an alpha. Confirm mobile login, entry saving and signed-out API protections before using it for decisions.
