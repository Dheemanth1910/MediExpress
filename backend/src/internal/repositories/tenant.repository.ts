import { eq } from "drizzle-orm";
import { db, type Database } from "../../db/client";
import { NewTenant, Tenant, tenants } from "../entities/tenant.entity";

export interface TenantRepository {
  findAll(): Promise<Tenant[]>;
  findById(id: string): Promise<Tenant | undefined>;
  create(input: NewTenant): Promise<Tenant>;
}

export class DrizzleTenantRepository implements TenantRepository {
  constructor(private readonly database: Database = db) {}

  findAll() { return this.database.select().from(tenants); }

  async findById(id: string) {
    const [tenant] = await this.database.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async create(input: NewTenant) {
    const [tenant] = await this.database.insert(tenants).values(input).returning();
    return tenant;
  }
}
