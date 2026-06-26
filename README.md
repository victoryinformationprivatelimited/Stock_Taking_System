# Stock Taking System

SaaS platform to reconcile Microsoft Navision/Business Central stock-in-hand against physical counts. See [the architecture plan](.) for full details (manager web app, counter mobile app, offline-first sync, multi-tenant API).

## Architecture

- **Database**: a self-hosted Postgres container (`postgres:16-alpine`), one per environment — `docker-compose.yml` for local dev, `docker-compose.prod.yml` for production. All connection details (user/password/db/port) are environment variables, never hardcoded.
- **App**: NestJS API and the React/Vite web app are built and deployed together as one container — the API serves the web app's static build directly (no separate frontend container, no Redis/queue infra).
- **Mobile**: a separate Expo (React Native) app, distributed independently (not containerized), which talks to the app container's `/api` over the network.

## Structure

- `apps/api` — NestJS backend (Prisma/Postgres, JWT auth, multi-tenant), also serves the built web SPA
- `apps/web` — React + Vite manager web app, built into `apps/api`'s static output for production
- `apps/mobile` — Expo (React Native) counter mobile app, offline-first via local SQLite (on-device only, unrelated to the server database)
- `packages/shared-types` — Shared TypeScript enums/models used by API and web
- `Dockerfile` (repo root) — single multi-stage build producing the one app container
- `docker-compose.yml` — local dev Postgres only (run `npm run start:dev` against it directly)
- `docker-compose.prod.yml` — `postgres` + `app` services for production

## Prerequisites

- Node.js 20+ and npm
- Docker Desktop (for the local Postgres container)
- Expo Go app (or Android/iOS simulator) for mobile testing

## Getting started

1. Start local Postgres:
   ```
   docker compose up -d
   ```
2. API:
   ```
   cd apps/api
   cp .env.example .env   # defaults already match docker-compose.yml
   npm install
   npx prisma generate
   npx prisma migrate dev --name init
   npm run start:dev
   ```
3. Web:
   ```
   cd apps/web
   cp .env.example .env
   npm install
   npm run dev
   ```
4. Mobile:
   ```
   cd apps/mobile
   npm install
   npm run start
   ```
5. Combined production stack (Postgres + app container):
   ```
   cp .env.prod.example .env   # set POSTGRES_PASSWORD, JWT secrets, VITE_API_BASE_URL
   docker compose -f docker-compose.prod.yml up -d --build
   docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
   ```

## Status

Phase 0 (foundations) complete:
- Monorepo scaffolded with shared types
- API: NestJS + Prisma schema covering tenants, users, products, stock uploads, store layouts, assignments, count records (with 3-attempt recount cap), audit/error logs; JWT auth with role guard (`MANAGER` / `COUNTER`) and request-scoped tenant context
- Web: Vite + React app with login, auth store, protected routing, API client
- Mobile: Expo app with login, local SQLite (assignments/pending counts/error logs), barcode scan + count entry screen enforcing the recount-attempt limit

Next: Postgres RLS policies, Excel upload/parsing module, assignment management UI, sync engine, live dashboard (Phase 1+ per the build plan).
