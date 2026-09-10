import { InventoryService } from "./services/inventory/inventory.service";
import { RbacService } from "./services/rbac/rbac.service";
import { TenantService } from "./services/tenant/tenant.service";
import { UserService } from "./services/user/user.service";
import { AuthService } from "./services/user/auth.service";
import { DrizzleUserRepository } from "./repositories/user.repository";
import { DrizzleSessionRepository } from "./repositories/session.repository";

export interface AppDependencies {
  inventoryService: InventoryService;
  rbacService: RbacService;
  tenantService: TenantService;
  userService: UserService;
  authService: AuthService;
}

export const createDependencies = (overrides: Partial<AppDependencies> = {}): AppDependencies => {
  const userRepository = new DrizzleUserRepository();
  const sessionRepository = new DrizzleSessionRepository();
  const userService = overrides.userService ?? new UserService(userRepository);
  return {
  inventoryService: overrides.inventoryService ?? new InventoryService(),
  rbacService: overrides.rbacService ?? new RbacService(),
  tenantService: overrides.tenantService ?? new TenantService(),
    userService,
    authService: overrides.authService ?? new AuthService(userRepository, sessionRepository),
  };
};
