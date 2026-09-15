export enum Permission {
  Dashboard = 1,
  InventoryMGMT = 2,
  TenantHub = 3,
}

export const permissionNames: Record<Permission, string> = {
  [Permission.Dashboard]: "Dashboard",
  [Permission.InventoryMGMT]: "InventoryMGMT",
  [Permission.TenantHub]: "TenantHub",
};

export const allPermissions = Object.values(Permission).filter(
  (value): value is Permission => typeof value === "number",
);
