import { z } from "zod";

export const loginRequestSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(1),
}).strict();

export const loginResponseSchema = z.object({
  token: z.string().min(1),
  user: z.object({
    id: z.string().uuid(),
    name: z.string(),
    subTenant: z.string().uuid().nullable(),
    email: z.string().email(),
    roles: z.array(z.number().int()),
  }),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
