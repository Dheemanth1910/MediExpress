import { eq } from "drizzle-orm";
import { db, type Database } from "../../db/client";
import {
  NewSubTenant,
  SubTenant,
  subTenants,
} from "../entities/sub-tenant.entity";

export interface SubTenantRepository {
  findAll(): Promise<SubTenant[]>;
  findById(id: string): Promise<SubTenant | undefined>;
  create(input: NewSubTenant): Promise<SubTenant>;
}

export class DrizzleSubTenantTenantRepository implements SubTenantRepository {
  constructor(private readonly database: Database = db) {}

  findAll() {
    return this.database.select().from(subTenants);
  }

  async findById(id: string) {
    const [subTenant] = await this.database
      .select()
      .from(subTenants)
      .where(eq(subTenants.id, id));
    return subTenant;
  }

  async create(input: NewSubTenant) {
    const [subTenant] = await this.database
      .insert(subTenants)
      .values(input)
      .returning();
    return subTenant;
  }
}
