# Project

## Structure
- `frontend/` - React + TypeScript client
- `backend/`  - Express + TypeScript API (modular monolith)
  - `src/services/tenant-service` - tenant domain (controllers, routes, models)
  - `src/services/inventory-service` - inventory domain (controllers, routes, models)
  - `src/db/client.ts` - Drizzle ORM + Postgres connection
- `infra/` - Docker & Kubernetes configs
- `docs/` - Project documentation

## Backend dev setup
1. `cd backend && cp .env.example .env` and fill in `DATABASE_URL`
2. `npm run db:generate` - generate SQL migrations from Drizzle schema
3. `npm run db:migrate` - apply migrations
4. `npm run dev` - start the API with hot reload
