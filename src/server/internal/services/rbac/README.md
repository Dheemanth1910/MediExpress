# RBAC Service

The RBAC service manages roles, permissions, and access checks for the backend.
It keeps HTTP concerns in controllers, business rules in `RbacService`, and
database access behind `RbacRepository`.

## Permission Catalog

Permissions are numeric IDs so users can store role IDs and roles can store
permission IDs compactly.

| ID | Name | Use |
| --- | --- | --- |
| `1` | `Dashboard` | Dashboard access |
| `2` | `InventoryMGMT` | Inventory management |
| `3` | `TenantHub` | Tenant administration |

The enum is defined in `permissions/permission.ts`.

## API

The routes are mounted below `/api/rbac`.

### Create a role

`POST /api/rbac/role/create`

Request:

```json
{
  "subTenantId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Inventory manager",
  "permissions": [2]
}
```

`subTenantId` may be omitted or set to `null` for a global role. `permissions`
defaults to an empty array.

Response: `201 Created`

```json
{
  "id": 1,
  "subTenantId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Inventory manager",
  "permissions": [2]
}
```

### Update a role

`PUT /api/rbac/roles/update`

Request:

```json
{
  "id": 1,
  "name": "Inventory administrator",
  "permissions": [1, 2]
}
```

At least one field besides `id` is required. `subTenantId` can be set to
`null` to make the role global.

Response: `200 OK` with the updated role.

### List roles

`GET /api/rbac/roles`

Optionally filter by tenant:

`GET /api/rbac/roles?subTenantId=550e8400-e29b-41d4-a716-446655440000`

Tenant-scoped results include matching tenant roles and global roles.

Response: `200 OK`

```json
[
  {
    "id": 1,
    "subTenantId": null,
    "name": "Admin",
    "permissions": [1, 2, 3]
  }
]
```

### List permissions

`GET /api/rbac/permissions`

Response: `200 OK`

```json
[
  { "id": 1, "name": "Dashboard" },
  { "id": 2, "name": "InventoryMGMT" },
  { "id": 3, "name": "TenantHub" }
]
```

The permission catalog is returned even before database seeding. Unknown
permission IDs and unknown request fields are rejected with `400 Bad Request`.

## Initialization

Call `RbacService.seedDefaults(subTenantId)` once during deployment or setup.
The operation is idempotent and:

1. Seeds the permission catalog with `on conflict do nothing`.
2. Creates an `Admin` role containing every permission if it does not exist.

Use `null` for a global administrator or a tenant UUID for a tenant-specific
administrator.

```ts
import { RbacService } from "./services/rbac.service";

const rbac = new RbacService();
await rbac.seedDefaults(null);
```

Initialization is intentionally not run during module import or application
startup, so tests and worker processes do not perform unexpected writes.

## Access-Control Middleware

The middleware expects the authenticated request to expose this principal:

```ts
type RbacPrincipal = {
  subTenantId: string | null;
  roles: number[];
};
```

The default resolver reads `req.user`. An authentication layer must populate it
before RBAC middleware runs.

```ts
import { Permission } from "./services/rbac-service/permissions/permission";
import { accessControlMiddlewareGenerator } from "./services/rbac-service/middleware/access-control.middleware";

const requireAccess = accessControlMiddlewareGenerator(rbacService);

app.post(
  "/api/inventory/items",
  requireAccess(Permission.InventoryMGMT),
  createInventoryItem,
);
```

Multiple permissions are all required:

```ts
requireAccess(Permission.InventoryMGMT, Permission.TenantHub)
```

Responses are:

- `401` when no authenticated principal is available.
- `403` when the principal does not have every required permission.
- The next route handler is called when access is granted.

Global roles apply to every tenant. Tenant-scoped roles apply only when the
principal's `subTenantId` matches the role's `subTenantId`.

## DTOs and Layers

Runtime request and response schemas are defined in `dtos/rbac.dto.ts` using
Zod:

- `createRoleRequestSchema`
- `updateRoleRequestSchema`
- `roleListQuerySchema`
- `roleResponseSchema`
- `permissionResponseSchema`

The boundaries are:

- `controllers/`: parse HTTP input, validate DTOs, and map errors to status codes.
- `services/`: role creation, updates, seeding, and permission evaluation.
- `repositories/`: Drizzle queries behind the injectable `RbacRepository` interface.
- `middleware/`: reusable authorization middleware for other routes.
- `models/`: PostgreSQL table definitions and persistence types.

The service and repository do not receive Express request or response objects,
which keeps the business logic reusable and unit-testable.

## Tests

Run the full backend test suite from `backend/`:

```bash
npm test
```

RBAC tests are in `tests/rbac.api.test.ts`. They use an in-memory repository
and cover role CRUD, DTO validation, duplicate roles, permission seeding,
tenant scoping, and `401`/`403`/success middleware behavior without requiring
a PostgreSQL connection.
