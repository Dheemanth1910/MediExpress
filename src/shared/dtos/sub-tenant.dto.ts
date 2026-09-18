import { z } from "zod";

export const createSubTenantRequestSchema = z.object({
  name: z.string().trim().min(1).max(255),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  city: z.string().trim().min(1).max(255),
  district: z.string().trim().min(1).max(255),
  state: z.string().trim().min(1).max(255),
  country: z.string().trim().min(1).max(255),
  tenantId: z.string().uuid(),
}).strict();

export type CreateSubTenantRequest = z.infer<typeof createSubTenantRequestSchema>;
