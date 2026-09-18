import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../internal";
import { createDependencies } from "../internal/container";
import { Permission } from "../internal/services/rbac/permission";
import { medicines } from "../internal/entities/medicine.entity";
import { createIntegrationDatabase, IntegrationDatabase } from "./test-database";

const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "1";

if (runIntegrationTests && !process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is required. Start PostgreSQL and set TEST_DATABASE_URL before running integration tests.");
}

describe.skipIf(!runIntegrationTests)("system integration", () => {
  let database: IntegrationDatabase;
  let app: ReturnType<typeof createApp>;
  let tenantId: string;
  let subTenantId: string;
  let userId: string;
  let token: string;
  let userEmail: string;

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

    const subTenant = await request(app).post("/api/sub-tenants").send({
      name: `${uniqueName}-location`, latitude: 19.076, longitude: 72.8777,
      city: "Mumbai", district: "Mumbai", state: "Maharashtra", country: "India", tenantId,
    });
    expect(subTenant.status).toBe(201);
    subTenantId = subTenant.body.id;

    const duplicate = await request(app).post("/api/tenants").send({ name: uniqueName });
    expect(duplicate.status).toBe(409);
    expect((await request(app).get(`/api/tenants/${tenantId}`)).status).toBe(200);
    expect((await request(app).get("/api/tenants/00000000-0000-0000-0000-000000000000")).status).toBe(404);
  });

  it("runs user registration, login, protected access, update, and logout", async () => {
    const email = `integration-${Date.now()}@example.com`;
    userEmail = email;
    expect((await request(app).post("/api/user/create").send({ name: "Integration", email, password: "password123", subTenant: subTenantId })).status).toBe(201);
    expect((await request(app).post("/api/user/create").send({ name: "Duplicate", email, password: "password123" })).status).toBe(409);

    const login = await request(app).post("/api/user/login").send({ email, password: "password123" });
    expect(login.status).toBe(200);
    token = login.body.token;
    userId = login.body.user.id;
    expect(login.body.user.subTenant).toBe(subTenantId);
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

  it("runs the protected inventory lifecycle", async () => {
    const inventoryToken = (await request(app).post("/api/user/login").send({
      email: userEmail,
      password: "password123",
    })).body.token as string;

    const [medicine] = await database.database.insert(medicines).values({
      name: `Integration medicine ${Date.now()}`,
      category: "A",
    }).returning();

    expect((await request(app).post("/api/inventory/add").send({
      medicineId: medicine.id,
      quantity: 4,
      expiryDate: "2030-01-01",
    })).status).toBe(401); // auth failed

    const invalid = await request(app).post("/api/inventory/add")
      .set("Authorization", `Bearer ${inventoryToken}`)
      .send({ medicineId: medicine.id, quantity: 4 });
    expect(invalid.status).toBe(400); // invalid payload

    const item = await request(app).post("/api/inventory/add")
      .set("Authorization", `Bearer ${inventoryToken}`)
      .send({ medicineId: medicine.id, quantity: 4, expiryDate: "2030-01-01" });
    expect(item.status).toBe(201);

    const itemResponse = await request(app).get(`/api/inventory/${item.body.id}`).set("Authorization", `Bearer ${inventoryToken}`);
    expect(itemResponse.status).toBe(200);
    const queryResponse = await request(app).get("/api/inventory/get?page=1&pageSize=10").set("Authorization", `Bearer ${inventoryToken}`)
    expect(queryResponse.body.total).toBe(1);

    const added = await request(app).put("/api/inventory/update")
      .set("Authorization", `Bearer ${inventoryToken}`)
      .send({ id: item.body.id, operation: "add", quantity: 2, reason: "Restock" });
    expect(added.status).toBe(200);

    const removed = await request(app).put("/api/inventory/update")
      .set("Authorization", `Bearer ${inventoryToken}`)
      .send({ id: item.body.id, operation: "del", quantity: 1, diagnosisCodes: ["J01"] });
    expect(removed.status).toBe(200);

    const insufficient = await request(app).put("/api/inventory/update")
      .set("Authorization", `Bearer ${inventoryToken}`)
      .send({ id: item.body.id, operation: "del", quantity: 999, diagnosisCodes: ["J01"] });
    expect(insufficient.status).toBe(409);

    const audit = await request(app).get("/api/inventory/audit?page=1&pageSize=10")
      .set("Authorization", `Bearer ${inventoryToken}`);
    expect(audit.status).toBe(200);
    expect(audit.body.total).toBe(2);
    expect(audit.body.data).toHaveLength(2);
  });
})
