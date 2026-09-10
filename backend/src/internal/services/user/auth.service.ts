import { createHash, randomBytes } from "node:crypto";
import { LoginRequest, LoginResponse } from "../../dtos/auth.dto";
import { AuthContext } from "../../context/auth.context";
import { NewSession } from "../../entities/session.entity";
import { UserRepository } from "../../repositories/user.repository";
import { DrizzleSessionRepository, SessionRepository } from "../../repositories/session.repository";
import { UserServiceError, verifyPassword, toUserResponse } from "./user.service";

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository = new DrizzleSessionRepository(),
    private readonly sessionTtlMs = 7 * 24 * 60 * 60 * 1000,
  ) {}

  async login(input: LoginRequest): Promise<LoginResponse> {
    const user = await this.users.findByEmail(input.email);
    if (!user || !(await verifyPassword(input.password, user))) {
      throw new UserServiceError(401, "Invalid email or password");
    }

    const token = randomBytes(32).toString("base64url");
    const newSession: NewSession = {
      userId: user.id,
      tokenHash: tokenHash(token),
      expiresAt: new Date(Date.now() + this.sessionTtlMs),
    };
    await this.sessions.create(newSession);
    return { token, user: toUserResponse(user) };
  }

  async authenticate(token: string): Promise<AuthContext | undefined> {
    const session = await this.sessions.findActiveByTokenHash(tokenHash(token), new Date());
    if (!session) return undefined;
    const user = await this.users.findById(session.userId);
    if (!user) return undefined;
    return { userId: user.id, subTenantId: user.subTenant, roles: user.roles };
  }

  async revoke(token: string) {
    await this.sessions.revokeByTokenHash(tokenHash(token));
  }
}
