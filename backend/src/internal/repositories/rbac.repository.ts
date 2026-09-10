import { eq, inArray, or, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { NewRole, PermissionRecord, Role, permissions, roles } from "../entities/rbac.entity";

export interface RbacRepository {
  createRole(role: NewRole): Promise<Role>;
  updateRole(id: number, role: Partial<NewRole>): Promise<Role | undefined>;
  findRoleByName(name: string, subTenantId: string | null): Promise<Role | undefined>;
  findRolesByIds(ids: number[], subTenantId?: string | null): Promise<Role[]>;
  listRoles(subTenantId?: string): Promise<Role[]>;
  listPermissions(): Promise<PermissionRecord[]>;
  seedPermissions(values: PermissionRecord[]): Promise<void>;
}

export class DrizzleRbacRepository implements RbacRepository {
  async createRole(role: NewRole) {
    const [created] = await db.insert(roles).values(role).returning();
    return created;
  }

  async updateRole(id: number, role: Partial<NewRole>) {
    const [updated] = await db.update(roles).set(role).where(eq(roles.id, id)).returning();
    return updated;
  }

  async findRoleByName(name: string, subTenantId: string | null) {
    const [role] = await db.select().from(roles).where(
      sql`${roles.name} = ${name} AND ${roles.subTenantId} IS NOT DISTINCT FROM ${subTenantId}`,
    );
    return role;
  }

  async findRolesByIds(ids: number[], subTenantId?: string | null) {
    if (ids.length === 0) return [];
    const tenantFilter = subTenantId === undefined
      ? undefined
      : subTenantId === null
        ? sql`${roles.subTenantId} IS NULL`
        : or(eq(roles.subTenantId, subTenantId), sql`${roles.subTenantId} IS NULL`);
    const filters = [inArray(roles.id, ids)];
    if (tenantFilter) filters.push(tenantFilter);
    return db.select().from(roles).where(filters.length === 1 ? filters[0] : sql`${filters[0]} AND ${filters[1]}`);
  }

  async listRoles(subTenantId?: string) {
    if (!subTenantId) return db.select().from(roles);
    return db.select().from(roles).where(
      or(eq(roles.subTenantId, subTenantId), sql`${roles.subTenantId} IS NULL`),
    );
  }

  async listPermissions() {
    return db.select().from(permissions);
  }

  async seedPermissions(values: PermissionRecord[]) {
    if (values.length === 0) return;
    await db.insert(permissions).values(values).onConflictDoNothing();
  }
}
