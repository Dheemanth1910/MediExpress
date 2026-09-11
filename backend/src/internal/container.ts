import { InventoryService } from "./services/inventory/inventory.service";
import { RbacService } from "./services/rbac/rbac.service";
import { TenantService } from "./services/tenant/tenant.service";
import { UserService } from "./services/user/user.service";
import { AuthService } from "./services/user/auth.service";
import { DrizzleUserRepository } from "./repositories/user.repository";
import { DrizzleSessionRepository } from "./repositories/session.repository";
import { DrizzleInventoryRepository } from "./repositories/inventory.repository";
import { DrizzleRbacRepository } from "./repositories/rbac.repository";
import { DrizzleTenantRepository } from "./repositories/tenant.repository";
import { db, type Database } from "../db/client";

export interface AppDependencies {
  database: Database;
  inventoryService: InventoryService;
  rbacService: RbacService;
  tenantService: TenantService;
  userService: UserService;
  authService: AuthService;
}

export const createDependencies = (overrides: Partial<AppDependencies> = {}): AppDependencies => {
  const database = overrides.database ?? db;
  const userRepository = new DrizzleUserRepository(database);
  const sessionRepository = new DrizzleSessionRepository(database);

  return {
    database,
    inventoryService: overrides.inventoryService ?? new InventoryService(new DrizzleInventoryRepository(database)),
    rbacService: overrides.rbacService ?? new RbacService(new DrizzleRbacRepository(database)),
    tenantService: overrides.tenantService ?? new TenantService(new DrizzleTenantRepository(database)),
    userService: overrides.userService ?? new UserService(userRepository),
    authService: overrides.authService ?? new AuthService(userRepository, sessionRepository),
  };
};
