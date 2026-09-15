# Shared DTO plan

The application now has one TypeScript workspace with a server, browser client,
and `src/shared/dtos` public contract barrel.

## Current boundary

- Server DTO modules remain the source of truth for Zod runtime validation.
- `src/shared/dtos/index.ts` exports only transport TypeScript types to the client.
- The client API module consumes those types, so request and response changes are
  compile-time visible on both sides.

## Next promotion step

When a DTO needs browser-side runtime validation, move its schema and primitive
enums into `src/shared/dtos/<domain>.ts`. The server should import that schema
for request validation, while the client can use the same schema for forms and
response parsing. Keep database entities, repositories, and service-only DTOs
outside `src/shared`.

## Rules

1. Shared DTOs contain transport data only: strings, numbers, booleans, arrays,
   nullable values, and dates represented as ISO strings at the HTTP boundary.
2. Shared DTOs must not import Drizzle entities, Express, database clients, or
   authentication internals.
3. Every endpoint promoted to the client gets a typed API function and a focused
   contract test.
