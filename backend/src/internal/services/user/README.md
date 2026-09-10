

## DTOs

The request and response schemas live in `dtos/user.dto.ts` and are validated at the HTTP boundary with Zod.

### Create user

`POST /api/user/create`

```json
{
  "name": "Rahul",
  "subTenant": "550e8400-e29b-41d4-a716-446655440000",
  "email": "rahul@example.com",
  "password": "password123",
  "roles": [1, 2]
}
```

### Update user

`PUT /api/user/update/:id` or `PATCH /api/user/update/:id`

The body accepts any non-empty subset of `name`, `subTenant`, `email`, `password`, and `roles`.

### User response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Rahul",
  "subTenant": null,
  "email": "rahul@example.com",
  "roles": [1, 2]
}
```

Password hashes and salts are never included in the response DTO.

### Login

`POST /api/user/login`

```json
{
  "email": "rahul@example.com",
  "password": "password123"
}
```

The response contains a session token and the public user DTO:

```json
{
  "token": "opaque-session-token",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Rahul",
    "subTenant": null,
    "email": "rahul@example.com",
    "roles": [1, 2]
  }
}
```

The token is an opaque random value. Only its SHA-256 hash is stored in the
`sessions` table. Sessions expire after seven days by default and can be
revoked with `POST /api/user/logout`.

Send the token on protected requests:

```text
Authorization: Bearer <token>
```

The authentication middleware resolves the session and assigns this context
to `req.auth`:

```ts
{
  userId: string;
  subTenantId: string | null;
  roles: number[];
}
```

Missing, invalid, expired, or revoked sessions return `401`. The RBAC
middleware reads `req.auth.subTenantId` and `req.auth.roles` for permission
checks.

## Layers

- `controllers/`: HTTP parsing, DTO validation, status codes, and response mapping.
- `services/`: reusable user business logic; accepts typed DTO values, never Express requests.
- `repositories/`: Drizzle persistence and the repository interfaces used by tests.
- `entities/`: database schema and persistence types, including `sessions`.
