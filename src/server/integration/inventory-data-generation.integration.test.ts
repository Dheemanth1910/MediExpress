import { randomBytes } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../internal";
import { createDependencies } from "../internal/container";
import { createIntegrationDatabase, IntegrationDatabase } from "./test-database";

const enabled = process.env.RUN_INVENTORY_DATA_GENERATION === "1";
const TOTAL_MOVEMENTS = 1_000_000;
const SUBTENANT_COUNT = 10;
const YEAR_START = new Date("2025-09-18T00:00:00.000Z");
const YEAR_END = new Date("2026-09-18T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1_000;

const medicineSeed = [
  ["Omeprazole", "A"], ["Domperidone", "A"], ["Loperamide", "A"], ["Metformin", "A"],
  ["Ferrous Sulfate", "B"], ["Aspirin", "B"], ["Amlodipine", "C"], ["Atorvastatin", "C"],
  ["Losartan", "C"], ["Hydrocortisone Cream", "D"], ["Clotrimazole Cream", "D"], ["Oxybutynin", "G"],
  ["Levothyroxine", "H"], ["Prednisolone", "H"], ["Amoxicillin", "J"], ["Azithromycin", "J"],
  ["Ciprofloxacin", "J"], ["Doxycycline", "J"], ["Methotrexate", "L"], ["Ibuprofen", "M"],
  ["Diclofenac", "M"], ["Paracetamol", "N"], ["Diazepam", "N"], ["Amitriptyline", "N"],
  ["Albendazole", "P"], ["Cetirizine", "R"], ["Salbutamol", "R"], ["Dextromethorphan", "R"],
  ["Guaifenesin", "R"], ["Artificial Tears", "S"], ["Multivitamin", "V"], ["Oral Rehydration Salts", "V"],
] as const;

const diagnosisSeed = [
  ["A09", "Diarrhoea and gastroenteritis", "I"], ["B34", "Viral infection", "I"],
  ["D50", "Iron deficiency anaemia", "III"], ["E03", "Hypothyroidism", "IV"],
  ["E11", "Type 2 diabetes mellitus", "IV"], ["F32", "Depressive episode", "V"],
  ["F41", "Anxiety disorder", "V"], ["G43", "Migraine", "VI"], ["G40", "Epilepsy", "VI"],
  ["H10", "Conjunctivitis", "VII"], ["H66", "Otitis media", "VIII"], ["I10", "Essential hypertension", "IX"],
  ["I25", "Chronic ischaemic heart disease", "IX"], ["J00", "Acute nasopharyngitis", "X"],
  ["J02", "Acute pharyngitis", "X"], ["J11", "Influenza", "X"], ["J45", "Asthma", "X"],
  ["K21", "Gastro-oesophageal reflux", "XI"], ["K29", "Gastritis", "XI"], ["K59", "Constipation", "XI"],
  ["L23", "Allergic contact dermatitis", "XII"], ["L30", "Dermatitis", "XII"],
  ["M25", "Joint pain", "XIII"], ["M54", "Back pain", "XIII"], ["N39", "Urinary tract infection", "XIV"],
  ["R50", "Fever of unknown origin", "XVIII"],
] as const;

const diagnosisCodesFor = (medicineIndex: number) => [
  diagnosisSeed[(medicineIndex * 3) % diagnosisSeed.length][0],
  diagnosisSeed[(medicineIndex * 3 + 1) % diagnosisSeed.length][0],
];

const isHoliday = (date: Date) => ["01-01", "05-01", "08-15", "10-02", "12-25"]
  .includes(date.toISOString().slice(5, 10));

const isHighConsumptionDay = (date: Date) => {
  const weekday = date.getUTCDay();
  return weekday === 0 || weekday === 6 || isHoliday(date) || date.getUTCDate() >= 28;
};

describe.skipIf(!enabled)("inventory training data generation", { timeout: 120 * 60 * 1_000 }, () => {
  let database: IntegrationDatabase;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    database = await createIntegrationDatabase();
    app = createApp(createDependencies({ database: database.database }));
  });

  afterAll(async () => {
    await database?.close();
  });

  it("creates one year of route-validated movement data for one tenant and ten subtenants", async () => {
    const suffix = randomBytes(4).toString("hex");
    const parentTenant = await request(app).post("/api/tenants").send({ name: `training-parent-${suffix}` });
    expect(parentTenant.status).toBe(201);
    const subTenantIds: string[] = [];
    const tokens: string[] = [];

    for (let index = 0; index < SUBTENANT_COUNT; index += 1) {
      const subTenant = await request(app).post("/api/sub-tenants").send({
        name: `training-subtenant-${suffix}-${index}`,
        latitude: 19.076 + index / 100,
        longitude: 72.8777 + index / 100,
        city: "Mumbai", district: `District ${index}`, state: "Maharashtra", country: "India",
        tenantId: parentTenant.body.id,
      });
      expect(subTenant.status).toBe(201);
      subTenantIds.push(subTenant.body.id);
      const email = `training-${suffix}-${index}@example.com`;
      const user = await request(app).post("/api/user/create").send({
        name: `Training subtenant ${index}`, email, password: "training-password", subTenant: subTenant.body.id,
      });
      expect(user.status).toBe(201);
      const login = await request(app).post("/api/user/login").send({ email, password: "training-password" });
      expect(login.status).toBe(200);
      tokens.push(login.body.token);
    }
    expect(subTenantIds).toHaveLength(SUBTENANT_COUNT);

    const medicineResponse = await request(app).post("/api/medicines/create").send(
      medicineSeed.map(([name, category]) => ({ name: `${name} ${suffix}`, category })),
    );
    expect(medicineResponse.status).toBe(201);
    const medicineIds = medicineResponse.body.map((entry: { success: boolean; data: { id: string } }) => {
      expect(entry.success).toBe(true);
      return entry.data.id;
    });

    const diagnosisResponse = await request(app).post("/api/diagnoses/create").send(
      diagnosisSeed.map(([icdCode, description, chapter]) => ({ icdCode: `${icdCode}${suffix.slice(0, 2)}`, description, chapter })),
    );
    expect(diagnosisResponse.status).toBe(201);
    const diagnosisIds = diagnosisResponse.body.map((entry: { success: boolean; data: { id: string } }) => {
      expect(entry.success).toBe(true);
      return entry.data.id;
    });

    const links = medicineIds.flatMap((medicineId: string, medicineIndex: number) =>
      diagnosisCodesFor(medicineIndex).map((code) => ({
        medicineId,
        diagnosisId: diagnosisIds[diagnosisSeed.findIndex(([icdCode]) => icdCode === code)],
      })),
    );
    const linkResponse = await request(app).post("/api/medicine-diagnoses/create").send(links);
    expect(linkResponse.status).toBe(201);
    expect(linkResponse.body.every((entry: { success: boolean }) => entry.success)).toBe(true);

    const inventoryIds: string[][] = [];
    for (let subTenantIndex = 0; subTenantIndex < SUBTENANT_COUNT; subTenantIndex += 1) {
      const ids: string[] = [];
      for (const medicineId of medicineIds) {
        const created = await request(app).post("/api/inventory/add")
          .set("Authorization", `Bearer ${tokens[subTenantIndex]}`)
          .send({ medicineId, quantity: 100_000, expiryDate: "2027-12-31" });
        expect(created.status).toBe(201);
        ids.push(created.body.id);
      }
      inventoryIds.push(ids);
    }

    const inventoryItemCount = SUBTENANT_COUNT * medicineIds.length;
    expect(TOTAL_MOVEMENTS % inventoryItemCount).toBe(0);
    const movementsPerInventoryItem = TOTAL_MOVEMENTS / inventoryItemCount;
    let highConsumptionMovements = 0;
    let completed = 0;

    // A round has one update per inventory item, so concurrent requests never race on the same stock row.
    for (let round = 0; round < movementsPerInventoryItem; round += 1) {
      const updates = Array.from({ length: inventoryItemCount }, (_, itemOffset) => {
        const index = round * inventoryItemCount + itemOffset;
        const subTenantIndex = Math.floor(itemOffset / medicineIds.length);
        const medicineIndex = itemOffset % medicineIds.length;
        const dayOffset = Math.floor(index * 365 / TOTAL_MOVEMENTS);
        const createdAt = new Date(YEAR_START.getTime() + dayOffset * DAY_MS + (index % 24) * 60 * 60 * 1_000);
        const highConsumption = isHighConsumptionDay(createdAt);
        const operation = highConsumption || index % 10 < 7 ? "del" : "add";
        if (highConsumption) highConsumptionMovements += 1;
        return {
          id: inventoryIds[subTenantIndex][medicineIndex], operation,
          quantity: operation === "del" ? (highConsumption ? 3 : 1 + (index % 3)) : 1 + (index % 5),
          reason: operation === "del" ? `${isHoliday(createdAt) ? "holiday" : highConsumption ? "event" : "routine"} consumption` : "scheduled restock",
          diagnosisCodes: operation === "del" ? diagnosisCodesFor(medicineIndex) : [],
          createdAt: createdAt.toISOString(),
        };
      });
      const responses = await Promise.all(Array.from({ length: SUBTENANT_COUNT }, (_, subTenantIndex) => {
        const batch = updates.slice(subTenantIndex * medicineIds.length, (subTenantIndex + 1) * medicineIds.length);
        return request(app).post("/api/inventory/bulk-update")
          .set("Authorization", `Bearer ${tokens[subTenantIndex]}`)
          .send(batch);
      }));
      responses.forEach((response) => expect(response.status, JSON.stringify(response.body)).toBe(200));
      completed += updates.length;
      if (completed % 100_000 === 0) console.log(`Generated ${completed}/${TOTAL_MOVEMENTS} movements`);
    }

    const audit = await request(app).get("/api/inventory/audit?page=1&pageSize=1")
      .set("Authorization", `Bearer ${tokens[0]}`);
    expect(audit.status).toBe(200);
    expect(audit.body.total).toBe(TOTAL_MOVEMENTS / SUBTENANT_COUNT);
    expect(highConsumptionMovements).toBeGreaterThan(0);
    expect(YEAR_END.getTime() - YEAR_START.getTime()).toBe(365 * DAY_MS);
    console.log(`Generated ${TOTAL_MOVEMENTS.toLocaleString()} movements across one tenant, ${SUBTENANT_COUNT} subtenants, and ${medicineIds.length} medicines.`);
  });
});
