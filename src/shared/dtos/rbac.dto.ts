import { z } from "zod";
const permissionIds = [1, 2, 3] as const;
type PermissionId = (typeof permissionIds)[number];

const permissionSchema = z.number().int().refine(
  (value): value is PermissionId => permissionIds.includes(value as PermissionId),
  "Unknown permission",
);

export const createRoleRequestSchema = z.object({
  subTenantId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(255),
  permissions: z.array(permissionSchema).default([]),
}).strict();

export const updateRoleRequestSchema = z.object({
  id: z.number().int().positive(),
  subTenantId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(255).optional(),
  permissions: z.array(permissionSchema).optional(),
}).strict().refine((input) => Object.keys(input).some((key) => key !== "id"), {
  message: "At least one role field must be supplied",
});

export const roleListQuerySchema = z.object({ subTenantId: z.string().uuid().optional() }).strict();
export const roleResponseSchema = z.object({
  id: z.number().int().positive(),
  subTenantId: z.string().uuid().nullable(),
  name: z.string(),
  permissions: z.array(permissionSchema),
});
export const permissionResponseSchema = z.object({ id: permissionSchema, name: z.string() });

export type CreateRoleRequest = z.infer<typeof createRoleRequestSchema>;
export type UpdateRoleRequest = z.infer<typeof updateRoleRequestSchema>;
export type RoleResponse = z.infer<typeof roleResponseSchema>;
export type PermissionResponse = z.infer<typeof permissionResponseSchema>;
