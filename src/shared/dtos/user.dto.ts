import { z } from "zod";

const optionalUuid = z.string().uuid().nullable().optional();

export const createUserRequestSchema = z.object({
  name: z.string().trim().min(1).max(255),
  subTenant: optionalUuid,
  email: z.string().trim().email().max(255).transform((email) => email.toLowerCase()),
  password: z.string().min(8),
  roles: z.array(z.number().int()).default([]),
}).strict();

export const updateUserRequestSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  subTenant: optionalUuid,
  email: z.string().trim().email().max(255).transform((email) => email.toLowerCase()).optional(),
  password: z.string().min(8).optional(),
  roles: z.array(z.number().int()).optional(),
}).strict().refine((input) => Object.keys(input).length > 0, {
  message: "At least one field must be supplied",
});

export const userIdSchema = z.object({ id: z.string().uuid() });

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  subTenant: z.string().uuid().nullable(),
  email: z.string().email(),
  roles: z.array(z.number().int()),
});

export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
