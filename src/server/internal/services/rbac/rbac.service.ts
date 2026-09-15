import { NewRole, PermissionRecord, Role } from "../../entities/rbac.entity";
import { Permission, allPermissions, permissionNames } from "./permission";
import {
  CreateRoleRequest,
  PermissionResponse,
  RoleResponse,
  UpdateRoleRequest,
} from "../../../shared/dtos/rbac.dto";
import { DrizzleRbacRepository, RbacRepository } from "../../repositories/rbac.repository";

export class RbacServiceError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = "RbacServiceError";
  }
}

const toRoleResponse = (role: Role): RoleResponse => ({
  id: role.id,
  subTenantId: role.subTenantId,
  name: role.name,
  permissions: role.permissions,
});

export class RbacService {
  constructor(private readonly repository: RbacRepository = new DrizzleRbacRepository()) {}

  async createRole(input: CreateRoleRequest): Promise<RoleResponse> {
    const subTenantId = input.subTenantId ?? null;
    if (await this.repository.findRoleByName(input.name, subTenantId)) {
      throw new RbacServiceError(409, "A role with this name already exists for this tenant");
    }
    const role: NewRole = {
      subTenantId,
      name: input.name,
      permissions: input.permissions,
    };
    return toRoleResponse(await this.repository.createRole(role));
  }

  async updateRole(input: UpdateRoleRequest): Promise<RoleResponse> {
    const updates: Partial<NewRole> = {
      subTenantId: input.subTenantId,
      name: input.name,
      permissions: input.permissions,
    };
    Object.keys(updates).forEach((key) => {
      if (updates[key as keyof NewRole] === undefined) delete updates[key as keyof NewRole];
    });
    const updated = await this.repository.updateRole(input.id, updates);
    if (!updated) throw new RbacServiceError(404, "Role not found");
    return toRoleResponse(updated);
  }

  async listRoles(subTenantId?: string): Promise<RoleResponse[]> {
    return (await this.repository.listRoles(subTenantId)).map(toRoleResponse);
  }

  async listPermissions(): Promise<PermissionResponse[]> {
    const stored = await this.repository.listPermissions();
    return stored.length > 0
      ? stored.map((permission) => ({ id: permission.id as Permission, name: permission.name }))
      : allPermissions.map((id) => ({ id, name: permissionNames[id] }));
  }

  async seedPermissions(): Promise<void> {
    const values: PermissionRecord[] = allPermissions.map((id) => ({ id, name: permissionNames[id] }));
    await this.repository.seedPermissions(values);
  }

  async seedDefaults(subTenantId: string | null = null): Promise<RoleResponse> {
    await this.seedPermissions();
    const existing = await this.repository.findRoleByName("Admin", subTenantId);
    if (existing) return toRoleResponse(existing);

    return toRoleResponse(await this.repository.createRole({
      subTenantId,
      name: "Admin",
      permissions: allPermissions,
    }));
  }

  async hasAllPermissions(subTenantId: string | null | undefined, roleIds: number[], required: Permission[]) {
    const assignedRoles = await this.repository.findRolesByIds(roleIds, subTenantId);
    const granted = new Set(assignedRoles.flatMap((role) => role.permissions));
    return required.every((permission) => granted.has(permission));
  }
}
