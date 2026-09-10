import { CreateTenantRequest } from "../../dtos/tenant.dto";
import { NewTenant, Tenant } from "../../entities/tenant.entity";
import { DrizzleTenantRepository, TenantRepository } from "../../repositories/tenant.repository";

export class TenantService {
  constructor(private readonly repository: TenantRepository = new DrizzleTenantRepository()) {}

  list(): Promise<Tenant[]> { return this.repository.findAll(); }

  async get(id: string): Promise<Tenant> {
    const tenant = await this.repository.findById(id);
    if (!tenant) throw new TenantServiceError(404, "Tenant not found");
    return tenant;
  }

  create(input: CreateTenantRequest): Promise<Tenant> {
    const newTenant: NewTenant = input;
    return this.repository.create(newTenant);
  }
}

export class TenantServiceError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = "TenantServiceError";
  }
}
