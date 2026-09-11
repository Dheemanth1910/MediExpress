import { CreateTenantRequest } from "../../dtos/tenant.dto";
import { NewTenant, Tenant } from "../../entities/tenant.entity";
import { DrizzleTenantRepository, TenantRepository } from "../../repositories/tenant.repository";

export class TenantService {
  constructor(private readonly repository: TenantRepository = new DrizzleTenantRepository()) {}

  async list(): Promise<Tenant[]> {
    return this.repository.findAll();
  }

  async get(id: string): Promise<Tenant> {
    const tenant: Tenant | undefined = await this.repository.findById(id);
    if (!tenant) throw new TenantServiceError(404, "Tenant not found");
    return tenant;
  }

  async create(input: CreateTenantRequest): Promise<Tenant> {
    const newTenant: NewTenant = input;
    try {
      return await this.repository.create(newTenant);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new TenantServiceError(409, "A tenant with this name already exists");
      }
      throw error;
    }
  }
}

export class TenantServiceError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = "TenantServiceError";
  }
}

const isUniqueViolation = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "23505") return true;
  return "cause" in error && isUniqueViolation(error.cause);
};
