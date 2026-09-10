import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { NewTenant, Tenant, tenants } from "../entities/tenant.entity";

export interface TenantRepository {
  findAll(): Promise<Tenant[]>;
  findById(id: string): Promise<Tenant | undefined>;
  create(input: NewTenant): Promise<Tenant>;
}

export class DrizzleTenantRepository implements TenantRepository {
  findAll() { return db.select().from(tenants); }

  async findById(id: string) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async create(input: NewTenant) {
    const [tenant] = await db.insert(tenants).values(input).returning();
    return tenant;
  }
}
