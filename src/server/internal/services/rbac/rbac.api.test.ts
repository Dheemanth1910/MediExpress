import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../index";
import { createDependencies } from "../../container";
import { NewRole, PermissionRecord, Role } from "../../entities/rbac.entity";
import { Permission } from "./permission";
import { RbacRepository } from "../../repositories/rbac.repository";
import { RbacService } from "./rbac.service";
import { accessControlMiddlewareGenerator, RbacPrincipal } from "../../middleware/access-control.middleware";

const tenantId = "550e8400-e29b-41d4-a716-446655440000";

class InMemoryRbacRepository implements RbacRepository {
  private nextRoleId = 1;
  private readonly roles = new Map<number, Role>();
  private readonly permissionRecords = new Map<number, PermissionRecord>();

  async createRole(input: NewRole) {
    const role: Role = {
      id: this.nextRoleId++,
      subTenantId: input.subTenantId ?? null,
      name: input.name,
      permissions: input.permissions ?? [],
    };
    this.roles.set(role.id, role);
    return role;
  }

  async updateRole(id: number, input: Partial<NewRole>) {
    const current = this.roles.get(id);
    if (!current) return undefined;
    const updated = { ...current, ...input } as Role;
    this.roles.set(id, updated);
    return updated;
  }

  async findRoleByName(name: string, subTenantId: string | null) {
    return [...this.roles.values()].find(
      (role) => role.name === name && role.subTenantId === subTenantId,
    );
  }

  async findRolesByIds(ids: number[], subTenantId?: string | null) {
    return [...this.roles.values()].filter((role) => {
      const tenantMatches = subTenantId === undefined
        ? true
        : subTenantId === null
          ? role.subTenantId === null
          : role.subTenantId === null || role.subTenantId === subTenantId;
      return ids.includes(role.id) && tenantMatches;
    });
  }

  async listRoles(subTenantId?: string) {
    return [...this.roles.values()].filter(
      (role) => !subTenantId || role.subTenantId === null || role.subTenantId === subTenantId,
    );
  }

  async listPermissions() {
    return [...this.permissionRecords.values()];
  }

  async seedPermissions(values: PermissionRecord[]) {
    values.forEach((permission) => this.permissionRecords.set(permission.id, permission));
  }
}

const makeApp = () => {
  const service = new RbacService(new InMemoryRbacRepository());
  return { app: createApp(createDependencies({ rbacService: service })), service };
};

describe("RBAC APIs", () => {
  it("seeds permissions and an all-access admin role idempotently", async () => {
    const repository = new InMemoryRbacRepository();
    const service = new RbacService(repository);

    const first = await service.seedDefaults(tenantId);
    const second = await service.seedDefaults(tenantId);

    expect(first).toEqual({
      id: 1,
      subTenantId: tenantId,
      name: "Admin",
      permissions: [Permission.Dashboard, Permission.InventoryMGMT, Permission.TenantHub],
    });
    expect(second).toEqual(first);
    expect(await service.listPermissions()).toHaveLength(3);
  });

  it("lists the permission catalog", async () => {
    const { app } = makeApp();

    const response = await request(app).get("/api/rbac/permissions");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: Permission.Dashboard, name: "Dashboard" },
      { id: Permission.InventoryMGMT, name: "InventoryMGMT" },
      { id: Permission.TenantHub, name: "TenantHub" },
    ]);
  });

  it("creates and lists a role", async () => {
    const { app } = makeApp();

    const createResponse = await request(app).post("/api/rbac/role/create").send({
      subTenantId: tenantId,
      name: "Inventory manager",
      permissions: [Permission.InventoryMGMT],
    });
    const listResponse = await request(app).get(`/api/rbac/roles?subTenantId=${tenantId}`);

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      id: 1,
      subTenantId: tenantId,
      name: "Inventory manager",
      permissions: [Permission.InventoryMGMT],
    });
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);
  });

  it("updates a role and rejects unknown permissions", async () => {
    const { app } = makeApp();
    await request(app).post("/api/rbac/role/create").send({ name: "Viewer", permissions: [] });

    const updateResponse = await request(app).put("/api/rbac/roles/update").send({
      id: 1,
      name: "Dashboard viewer",
      permissions: [Permission.Dashboard],
    });
    const invalidResponse = await request(app).post("/api/rbac/role/create").send({
      name: "Invalid",
      permissions: [999],
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.name).toBe("Dashboard viewer");
    expect(invalidResponse.status).toBe(400);
  });

  it("rejects duplicate role names within a tenant", async () => {
    const { app } = makeApp();
    const payload = { subTenantId: tenantId, name: "Admin", permissions: [] };

    await request(app).post("/api/rbac/role/create").send(payload);
    const response = await request(app).post("/api/rbac/role/create").send(payload);

    expect(response.status).toBe(409);
  });
});

describe("RBAC middleware", () => {
  const principal: RbacPrincipal = { subTenantId: tenantId, roles: [1] };

  const makeProtectedApp = async (resolvePrincipal: () => RbacPrincipal | undefined) => {
    const repository = new InMemoryRbacRepository();
    await repository.createRole({
      subTenantId: tenantId,
      name: "Inventory manager",
      permissions: [Permission.InventoryMGMT],
    });
    const service = new RbacService(repository);
    const app = express();
    app.use(
      "/inventory",
      accessControlMiddlewareGenerator(service, resolvePrincipal)(Permission.InventoryMGMT),
      (_req, res) => res.json({ ok: true }),
    );
    return app;
  };

  it("returns 401 when no principal is available", async () => {
    const app = await makeProtectedApp(() => undefined);
    const response = await request(app).get("/inventory");
    expect(response.status).toBe(401);
  });

  it("returns 403 when the principal lacks the required permission", async () => {
    const app = await makeProtectedApp(() => ({ ...principal, roles: [] }));
    const response = await request(app).get("/inventory");
    expect(response.status).toBe(403);
  });

  it("calls the next handler when the principal has the permission", async () => {
    const app = await makeProtectedApp(() => principal);
    const response = await request(app).get("/inventory");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("does not grant a tenant role to another tenant", async () => {
    const app = await makeProtectedApp(() => ({
      subTenantId: "550e8400-e29b-41d4-a716-446655440001",
      roles: [1],
    }));
    const response = await request(app).get("/inventory");
    expect(response.status).toBe(403);
  });
});
