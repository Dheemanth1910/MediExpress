import { CreateSubTenantRequest } from "../../../../shared/dtos/sub-tenant.dto";
import { NewSubTenant, SubTenant } from "../../entities/sub-tenant.entity";
import { DrizzleSubTenantTenantRepository, SubTenantRepository } from "../../repositories/sub-tenant.repository";

export class SubTenantServiceError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = "SubTenantServiceError";
  }
}

export class SubTenantService {
  constructor(private readonly repository: SubTenantRepository = new DrizzleSubTenantTenantRepository()) {}

  async list(tenantId?: string): Promise<SubTenant[]> {
    const rows = await this.repository.findAll();
    return tenantId ? rows.filter((row) => row.tenantId === tenantId) : rows;
  }

  async get(id: string): Promise<SubTenant> {
    const row = await this.repository.findById(id);
    if (!row) throw new SubTenantServiceError(404, "Subtenant not found");
    return row;
  }

  async create(input: CreateSubTenantRequest): Promise<SubTenant> {
    const value: NewSubTenant = input;
    try {
      return await this.repository.create(value);
    } catch (error) {
      if (isForeignKeyViolation(error)) throw new SubTenantServiceError(404, "Parent tenant not found");
      throw error;
    }
  }
}

const isForeignKeyViolation = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "code" in error && error.code === "23503";
