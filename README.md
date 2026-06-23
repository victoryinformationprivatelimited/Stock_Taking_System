# Stock Taking System

SaaS platform to reconcile Microsoft Navision/Business Central stock-in-hand against physical counts. See [the architecture plan](.) for full details (manager web app, counter mobile app, offline-first sync, multi-tenant API).

## Structure

- `apps/api` — NestJS backend (Prisma/PostgreSQL, JWT auth, multi-tenant)
- `apps/web` — React + Vite manager web app
- `apps/mobile` — Expo (React Native) counter mobile app, offline-first via SQLite
- `packages/shared-types` — Shared TypeScript enums/models used by API and web
- `docker-compose.yml` — Local Postgres + Redis

## Prerequisites

- Node.js 20+ and npm
- Docker Desktop (for Postgres + Redis)
- Expo Go app (or Android/iOS simulator) for mobile testing

## Getting started

1. Start infra:
   ```
   docker compose up -d
   ```
2. API:
   ```
   cd apps/api
   cp .env.example .env
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

## Status

Phase 0 (foundations) complete:
- Monorepo scaffolded with shared types
- API: NestJS + Prisma schema covering tenants, users, products, stock uploads, store layouts, assignments, count records (with 3-attempt recount cap), audit/error logs; JWT auth with role guard (`MANAGER` / `COUNTER`) and request-scoped tenant context
- Web: Vite + React app with login, auth store, protected routing, API client
- Mobile: Expo app with login, local SQLite (assignments/pending counts/error logs), barcode scan + count entry screen enforcing the recount-attempt limit

Next: Postgres RLS policies, Excel upload/parsing module, assignment management UI, sync engine, live dashboard (Phase 1+ per the build plan).
