import { Request, Response } from "express";
import { ZodError } from "zod";
import {
  createUserRequestSchema,
  updateUserRequestSchema,
  userIdSchema,
} from "../../../shared/dtos/user.dto";
import { loginRequestSchema } from "../../../shared/dtos/auth.dto";
import { AuthService } from "../services/user/auth.service";
import { bearerToken } from "../middleware/authenticate.middleware";
import { UserService, UserServiceError } from "../services/user/user.service";

const validationError = (error: ZodError) => ({
  error: "Invalid request",
  details: error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
});

const requestId = (req: Request) => {
  const result = userIdSchema.safeParse({ id: req.params.id ?? req.body?.id ?? req.query.id });
  return result.success ? result.data.id : undefined;
};

const updatePayload = (req: Request) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) return req.body;
  const { id: _id, ...payload } = req.body as Record<string, unknown>;
  return payload;
};

const handleError = (res: Response, error: unknown) => {
  if (error instanceof UserServiceError) return res.status(error.statusCode).json({ error: error.message });
  console.error("User service request failed", error);
  return res.status(500).json({ error: "Internal server error" });
};

export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  async login(req: Request, res: Response) {
    const parsed = loginRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(validationError(parsed.error));

    try {
      return res.json(await this.authService.login(parsed.data));
    } catch (error) {
      return handleError(res, error);
    }
  }

  async logout(req: Request, res: Response) {
    const token = bearerToken(req.header("authorization"));
    if (token) await this.authService.revoke(token);
    return res.status(204).send();
  }

  async createUser(req: Request, res: Response) {
    const parsed = createUserRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(validationError(parsed.error));

    try {
      return res.status(201).json(await this.userService.create(parsed.data));
    } catch (error) {
      return handleError(res, error);
    }
  }

  async updateUser(req: Request, res: Response) {
    const id = requestId(req);
    if (!id) return res.status(400).json({ error: "A valid user id is required" });

    const parsed = updateUserRequestSchema.safeParse(updatePayload(req));
    if (!parsed.success) return res.status(400).json(validationError(parsed.error));

    try {
      return res.json(await this.userService.update(id, parsed.data));
    } catch (error) {
      return handleError(res, error);
    }
  }

  async getUserInfo(req: Request, res: Response) {
    const id = requestId(req);
    if (!id) return res.status(400).json({ error: "A valid user id is required" });

    try {
      return res.json(await this.userService.info(id));
    } catch (error) {
      return handleError(res, error);
    }
  }
}
