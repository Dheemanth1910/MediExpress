/** Public transport contracts. Server Zod DTOs remain the runtime validators. */
export type LoginRequest = { email: string; password: string };
export type UserResponse = {
  id: string; name: string; subTenant: string | null; email: string; roles: number[];
};
export type LoginResponse = { token: string; user: UserResponse };

export type CreateInventoryRequest = { medicineId: string; quantity: number; expiryDate: string };
export type UpdateInventoryRequest = {
  id: string; operation: "add" | "del"; quantity: number; reason?: string; diagnosisCodes?: string[];
};
export type InventoryQuery = {
  id?: string; medicineId?: string; query?: string; category?: string;
  sort?: "expiryDate" | "medicineId"; order?: "asc" | "desc";
  page?: number; pageSize?: number; limit?: number;
};
export type InventoryAuditQuery = {
  inventoryItemId?: string; medicineId?: string; from?: string; to?: string;
  page?: number; pageSize?: number; limit?: number;
};
export type InventoryItemResponse = {
  id: string; subTenantId: string; medicineId: string; quantity: number; expiryDate: string;
};
export type InventoryAuditEntryResponse = {
  id: string; inventoryItemId: string; subTenantId: string;
  operation: "add" | "del"; quantity: number; reason: string | null;
  diagnosisCodes: string[]; createdAt: string;
};

export type MedicineCategory = "A" | "B" | "C" | "D" | "G" | "H" | "J" | "L" | "M" | "N" | "P" | "R" | "S" | "V";
export type IcdChapter = "I" | "II" | "III" | "IV" | "V" | "VI" | "VII" | "VIII" | "IX" | "X" | "XI" | "XII" | "XIII" | "XIV" | "XV" | "XVI" | "XVII" | "XVIII" | "XIX" | "XX" | "XXI" | "XXII";
export type MedicineResponse = { id: string; name: string; category: MedicineCategory };
export type DiagnosisResponse = { id: string; icdCode: string; description: string; chapter: IcdChapter };
export type MedicineDiagnosisResponse = { medicineId: string; diagnosisId: string };
export type CreateMedicinesRequest = Array<{ name: string; category: MedicineCategory }>;
export type CreateDiagnosesRequest = Array<{ icdCode: string; description: string; chapter: IcdChapter }>;
export type CreateMedicineDiagnosesRequest = MedicineDiagnosisResponse[];

export type CreateRoleRequest = { subTenantId?: string | null; name: string; permissions?: number[] };
export type UpdateRoleRequest = { id: number; subTenantId?: string | null; name?: string; permissions?: number[] };
export type RoleResponse = { id: number; subTenantId: string | null; name: string; permissions: number[] };
export type PermissionResponse = { id: number; name: string };
export type CreateTenantRequest = { name: string };
export type CreateUserRequest = { name: string; subTenant?: string | null; email: string; password: string; roles?: number[] };
export type UpdateUserRequest = { name?: string; subTenant?: string | null; email?: string; password?: string; roles?: number[] };
