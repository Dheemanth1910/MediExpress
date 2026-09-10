import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../index";
import { createDependencies } from "../../container";
import { NewUser, User } from "../../entities/user.entity";
import { UserRepository } from "../../repositories/user.repository";
import { UserService, verifyPassword } from "./user.service";
import { NewSession, Session } from "../../entities/session.entity";
import { SessionRepository } from "../../repositories/session.repository";
import { AuthService } from "./auth.service";

const userId = "550e8400-e29b-41d4-a716-446655440000";
const otherUserId = "550e8400-e29b-41d4-a716-446655440001";

class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async findById(id: string) {
    return this.users.get(id);
  }

  async findByEmail(email: string) {
    return [...this.users.values()].find((user) => user.email === email);
  }

  async create(input: NewUser) {
    const user: User = {
      id: this.users.size === 0 ? userId : otherUserId,
      name: input.name,
      subTenant: input.subTenant ?? null,
      email: input.email,
      passwordHash: input.passwordHash,
      salt: input.salt,
      roles: input.roles ?? [],
    };
    this.users.set(user.id, user);
    return user;
  }

  async update(id: string, input: Partial<NewUser>) {
    const current = this.users.get(id);
    if (!current) return undefined;
    const updated = { ...current, ...input } as User;
    this.users.set(id, updated);
    return updated;
  }
}

class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, Session>();

  async create(input: NewSession) {
    const session: Session = {
      id: `session-${this.sessions.size + 1}`,
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      createdAt: new Date(),
      revokedAt: null,
    };
    this.sessions.set(session.tokenHash, session);
    return session;
  }

  async findActiveByTokenHash(tokenHash: string, now: Date) {
    const session = this.sessions.get(tokenHash);
    if (!session || session.revokedAt || session.expiresAt <= now) return undefined;
    return session;
  }

  async revokeByTokenHash(tokenHash: string) {
    const session = this.sessions.get(tokenHash);
    if (session) session.revokedAt = new Date();
  }
}

const makeApp = () => {
  const repository = new InMemoryUserRepository();
  const authService = new AuthService(repository, new InMemorySessionRepository());
  const service = new UserService(repository);
  return { app: createApp(createDependencies({ userService: service, authService })), service };
};

const login = async (app: ReturnType<typeof createApp>) => {
  const response = await request(app).post("/api/user/login").send({
    email: "rahul@example.com",
    password: "password123",
  });
  return response.body.token as string;
};

describe("user service APIs", () => {
  it("creates a user and never returns password material", async () => {
    const { app, service } = makeApp();

    const response = await request(app)
      .post("/api/user/create")
      .send({
        name: "Rahul",
        email: "RAHUL@example.com",
        password: "password123",
        roles: [1, 2],
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: userId,
      name: "Rahul",
      subTenant: null,
      email: "rahul@example.com",
      roles: [1, 2],
    });
    expect(response.body).not.toHaveProperty("passwordHash");
    expect(response.body).not.toHaveProperty("salt");

    const stored = await service.info(userId);
    expect(stored.email).toBe("rahul@example.com");
  });

  it("rejects invalid request DTOs before business logic", async () => {
    const { app } = makeApp();

    const response = await request(app).post("/api/user/create").send({
      name: "",
      email: "invalid-email",
      password: "short",
      unknown: true,
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid request");
    expect(response.body.details).toEqual(expect.any(Array));
  });

  it("rejects duplicate email addresses", async () => {
    const { app } = makeApp();
    const payload = { name: "Rahul", email: "rahul@example.com", password: "password123" };

    await request(app).post("/api/user/create").send(payload);
    const response = await request(app).post("/api/user/create").send(payload);

    expect(response.status).toBe(409);
    expect(response.body.error).toContain("already exists");
  });

  it("returns a user through the info API", async () => {
    const { app } = makeApp();
    await request(app).post("/api/user/create").send({
      name: "Rahul",
      email: "rahul@example.com",
      password: "password123",
    });

    const response = await request(app)
      .get(`/api/user/info/${userId}`)
      .set("Authorization", `Bearer ${await login(app)}`);

    expect(response.status).toBe(200);
    expect(response.body.email).toBe("rahul@example.com");
    expect(response.body).not.toHaveProperty("passwordHash");
  });

  it("updates a user and re-hashes a changed password", async () => {
    const { app } = makeApp();
    await request(app).post("/api/user/create").send({
      name: "Rahul",
      email: "rahul@example.com",
      password: "password123",
    });

    const response = await request(app)
      .patch(`/api/user/update/${userId}`)
      .set("Authorization", `Bearer ${await login(app)}`)
      .send({ name: "Rahul Kumar", password: "newpassword123", roles: [3] });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("Rahul Kumar");
    expect(response.body.roles).toEqual([3]);
    expect(response.body).not.toHaveProperty("passwordHash");
  });

  it("supports the documented body-id update endpoint", async () => {
    const { app } = makeApp();
    await request(app).post("/api/user/create").send({
      name: "Rahul",
      email: "rahul@example.com",
      password: "password123",
    });

    const response = await request(app)
      .put("/api/user/update")
      .set("Authorization", `Bearer ${await login(app)}`)
      .send({ id: userId, name: "Updated Rahul" });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("Updated Rahul");
  });

  it("returns 404 for an unknown user", async () => {
    const repository = new InMemoryUserRepository();
    const authService = new AuthService(repository, new InMemorySessionRepository());
    const app = createApp(createDependencies({
      userService: new UserService(repository),
      authService,
    }));
    await request(app).post("/api/user/create").send({
      name: "Rahul",
      email: "rahul@example.com",
      password: "password123",
    });

    const response = await request(app)
      .get(`/api/user/info/${otherUserId}`)
      .set("Authorization", `Bearer ${await login(app)}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("User not found");
  });

  it("logs in and rejects missing or invalid sessions", async () => {
    const { app } = makeApp();
    await request(app).post("/api/user/create").send({
      name: "Rahul",
      email: "rahul@example.com",
      password: "password123",
    });

    const loginResponse = await request(app).post("/api/user/login").send({
      email: "RAHUL@example.com",
      password: "password123",
    });
    const missing = await request(app).get(`/api/user/info/${userId}`);
    const invalid = await request(app)
      .get(`/api/user/info/${userId}`)
      .set("Authorization", "Bearer invalid-token");

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toEqual(expect.any(String));
    expect(loginResponse.body.user).not.toHaveProperty("passwordHash");
    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
  });

  it("revokes a session on logout", async () => {
    const { app } = makeApp();
    await request(app).post("/api/user/create").send({
      name: "Rahul",
      email: "rahul@example.com",
      password: "password123",
    });
    const token = await login(app);

    const logout = await request(app)
      .post("/api/user/logout")
      .set("Authorization", `Bearer ${token}`);
    const afterLogout = await request(app)
      .get(`/api/user/info/${userId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(logout.status).toBe(204);
    expect(afterLogout.status).toBe(401);
  });

  it("stores a password hash that verifies without exposing it through the API", async () => {
    const repository = new InMemoryUserRepository();
    const service = new UserService(repository);
    await service.create({
      name: "Rahul",
      email: "rahul@example.com",
      password: "password123",
      roles: [],
    });

    const stored = await repository.findById(userId);
    expect(stored).toBeDefined();
    expect(stored?.passwordHash).not.toBe("password123");
    expect(await verifyPassword("password123", stored!)).toBe(true);
    expect(await verifyPassword("wrong-password", stored!)).toBe(false);
  });
});
