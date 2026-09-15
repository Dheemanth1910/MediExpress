# Project

## Structure
- `src/server/` - Express + TypeScript API and domain modules
- `src/client/` - React + TypeScript client
- `src/shared/dtos/` - public transport contracts shared by client and server
- `drizzle/` - database migrations
- `infra/` - Docker & Kubernetes configs
- `docs/` - Project documentation

## Development setup
1. `cp .env.example .env` and fill in `DATABASE_URL`
2. `npm run db:generate` - generate SQL migrations from Drizzle schema
3. `npm run db:migrate` - apply migrations
4. `npm run dev` - start the API and React client together

The client runs on `http://localhost:5173` during development and proxies API
requests to the server on `http://localhost:4000`. A production build is served
by the same Express process with `npm run build && npm start`.
