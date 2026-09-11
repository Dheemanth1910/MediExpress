import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../internal";
import { createDependencies } from "../internal/container";
import { Permission } from "../internal/services/rbac/permission";
import { createIntegrationDatabase, IntegrationDatabase } from "./test-database";

const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "1";

if (runIntegrationTests && !process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is required. Start PostgreSQL and set TEST_DATABASE_URL before running integration tests.");
}

describe.skipIf(!runIntegrationTests)("system integration", () => {
  let database: IntegrationDatabase;
  let app: ReturnType<typeof createApp>;
  let tenantId: string;
  let userId: string;
  let token: string;

  beforeAll(async () => {
    database = await createIntegrationDatabase();
    app = createApp(createDependencies({ database: database.database }));
  });

  afterAll(async () => {
    await database.close();
  });

  it("runs the tenant API lifecycle", async () => {
    const uniqueName = `integration-tenant-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    expect((await request(app).get("/api/tenants")).status).toBe(200);
    expect((await request(app).post("/api/tenants").send({})).status).toBe(400);

    const created = await request(app).post("/api/tenants").send({ name: uniqueName });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe(uniqueName);
    tenantId = created.body.id;

    const duplicate = await request(app).post("/api/tenants").send({ name: uniqueName });
    expect(duplicate.status).toBe(409);
    expect((await request(app).get(`/api/tenants/${tenantId}`)).status).toBe(200);
    expect((await request(app).get("/api/tenants/00000000-0000-0000-0000-000000000000")).status).toBe(404);
  });

  it("runs user registration, login, protected access, update, and logout", async () => {
    const email = `integration-${Date.now()}@example.com`;
    expect((await request(app).post("/api/user/create").send({ name: "Integration", email, password: "password123", subTenant: tenantId })).status).toBe(201);
    expect((await request(app).post("/api/user/create").send({ name: "Duplicate", email, password: "password123" })).status).toBe(409);

    const login = await request(app).post("/api/user/login").send({ email, password: "password123" });
    expect(login.status).toBe(200);
    token = login.body.token;
    userId = login.body.user.id;
    expect(login.body.user.subTenant).toBe(tenantId);
    expect((await request(app).post("/api/user/login").send({ email, password: "wrong" })).status).toBe(401);
    expect((await request(app).get(`/api/user/info/${userId}`)).status).toBe(401);
    expect((await request(app).get(`/api/user/info/${userId}`).set("Authorization", `Bearer ${token}`)).status).toBe(200);
    expect((await request(app).patch(`/api/user/update/${userId}`).set("Authorization", `Bearer ${token}`).send({ name: "Updated Integration" })).status).toBe(200);
    expect((await request(app).get(`/api/user/info/${userId}`).set("Authorization", `Bearer ${token}`)).body.name).toBe("Updated Integration")
    expect((await request(app).get(`/api/user/info/${userId}`).set("Authorization", `Bearer ${token}`)).status).toBe(200);
    expect((await request(app).post("/api/user/logout").set("Authorization", `Bearer ${token}`)).status).toBe(204);
    expect((await request(app).get(`/api/user/info/${userId}`).set("Authorization", `Bearer ${token}`)).status).toBe(401);
    expect((await request(app).post("/api/user/logout").set("Authorization", `Bearer ${token}`)).status).toBe(401);

  });


  it("custom api calls", async () => {
    const payload = { email: "rahul@gmail.com", password: "passwd" };

    await request(app).post("/api/user/login").send(payload)
      .then(response => {
        console.log(response.status)
      });
  });
})
