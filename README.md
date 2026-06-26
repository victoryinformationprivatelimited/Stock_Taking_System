# Stock Taking System

SaaS platform to reconcile Microsoft Navision/Business Central stock-in-hand against physical counts. See [the architecture plan](.) for full details (manager web app, counter mobile app, offline-first sync, multi-tenant API).

## Architecture

- **Database**: a single Neon Postgres instance (`DATABASE_URL`), used by both local dev and production. No local database container.
- **App**: NestJS API and the React/Vite web app are built and deployed together as one container — the API serves the web app's static build directly (no separate frontend container, no Redis/queue infra).
- **Mobile**: a separate Expo (React Native) app, distributed independently (not containerized), which talks to the app container's `/api` over the network.

## Structure

- `apps/api` — NestJS backend (Prisma/Postgres via Neon, JWT auth, multi-tenant), also serves the built web SPA
- `apps/web` — React + Vite manager web app, built into `apps/api`'s static output for production
- `apps/mobile` — Expo (React Native) counter mobile app, offline-first via local SQLite (on-device only, unrelated to the server database)
- `packages/shared-types` — Shared TypeScript enums/models used by API and web
- `Dockerfile` (repo root) — single multi-stage build producing the one app container
- `docker-compose.prod.yml` — single `app` service, connects to Neon via `DATABASE_URL`

## Prerequisites

- Node.js 20+ and npm
- A Neon Postgres database (or any Postgres `DATABASE_URL`) — no local DB container needed
- Expo Go app (or Android/iOS simulator) for mobile testing

## Getting started

1. API:
   ```
   cd apps/api
   cp .env.example .env   # set DATABASE_URL to your Neon connection string
   npm install
   npx prisma generate
   npx prisma migrate dev --name init
   npm run start:dev
   ```
2. Web:
   ```
   cd apps/web
   cp .env.example .env
   npm install
   npm run dev
   ```
3. Mobile:
   ```
   cd apps/mobile
   npm install
   npm run start
   ```
4. Combined production container (builds web + api into one image):
   ```
   docker compose -f docker-compose.prod.yml up -d --build
   ```

## Status

Phase 0 (foundations) complete:
- Monorepo scaffolded with shared types
- API: NestJS + Prisma schema covering tenants, users, products, stock uploads, store layouts, assignments, count records (with 3-attempt recount cap), audit/error logs; JWT auth with role guard (`MANAGER` / `COUNTER`) and request-scoped tenant context
- Web: Vite + React app with login, auth store, protected routing, API client
- Mobile: Expo app with login, local SQLite (assignments/pending counts/error logs), barcode scan + count entry screen enforcing the recount-attempt limit

Next: Postgres RLS policies, Excel upload/parsing module, assignment management UI, sync engine, live dashboard (Phase 1+ per the build plan).
