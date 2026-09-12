import { describe, expect, it } from "vitest";
import { InventoryItem } from "../../entities/inventory.entity";
import { InventoryMovement } from "../../entities/inventory-movement.entity";
import { InventoryAuditFilters, InventoryAuditResult, InventoryFilters, InventoryListResult, InventoryRepository } from "../../repositories/inventory.repository";
import { InventoryService } from "./inventory.service";

const tenantId = "550e8400-e29b-41d4-a716-446655440000";
const medicineId = "550e8400-e29b-41d4-a716-446655440001";
const itemId = "550e8400-e29b-41d4-a716-446655440002";

const item: InventoryItem = {
  id: itemId,
  subTenantId: tenantId,
  medicineId,
  quantity: 10,
  expiryDate: new Date("2030-01-01"),
};

class InMemoryInventoryRepository implements InventoryRepository {
  current = { ...item };
  medicineFound = true;
  movements: InventoryMovement[] = [];

  async find(filters: InventoryFilters): Promise<InventoryListResult> {
    const matches = filters.subTenantId === this.current.subTenantId && (!filters.id || filters.id === this.current.id)
      ? [this.current]
      : [];
    return { data: matches.slice(filters.offset, filters.offset + filters.limit), total: matches.length };
  }

  async findById(id: string, subTenantId: string) {
    return id === this.current.id && subTenantId === this.current.subTenantId ? this.current : undefined;
  }

  async medicineExists() { return this.medicineFound; }

  async create(input: InventoryItem) {
    this.current = { ...input };
    return this.current;
  }

  async adjustQuantity(input: InventoryMovement) {
    const nextQuantity = input.operation === "add"
      ? this.current.quantity + input.quantity
      : this.current.quantity - input.quantity;
    if (nextQuantity < 0) return undefined;
    this.current = { ...this.current, quantity: nextQuantity };
    this.movements.push({
      ...input,
      id: `550e8400-e29b-41d4-a716-44665544000${this.movements.length + 3}`,
      createdAt: new Date(),
    });
    return this.current;
  }

  async findAudit(filters: InventoryAuditFilters): Promise<InventoryAuditResult> {
    const data = this.movements.filter((movement) => (
      movement.subTenantId === filters.subTenantId
      && (!filters.inventoryItemId || movement.inventoryItemId === filters.inventoryItemId)
    )).slice(filters.offset, filters.offset + filters.limit);
    return { data, total: this.movements.length };
  }
}

describe("InventoryService", () => {
  it("creates inventory only for an existing medicine", async () => {
    const repository = new InMemoryInventoryRepository();
    const service = new InventoryService(repository);

    const created = await service.create({
      medicineId,
      quantity: 5,
      expiryDate: new Date("2030-01-01"),
    }, tenantId);

    expect(created).toMatchObject({ medicineId, subTenantId: tenantId, quantity: 5 });
    repository.medicineFound = false;
    await expect(service.create({ medicineId, quantity: 1, expiryDate: new Date("2030-01-01") }, tenantId))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it("adds and removes stock while recording the movement", async () => {
    const repository = new InMemoryInventoryRepository();
    const service = new InventoryService(repository);

    await service.update({ id: itemId, operation: "add", quantity: 4, reason: "Restock" }, tenantId);
    await service.update({ id: itemId, operation: "del", quantity: 3, diagnosisCodes: ["J01"] }, tenantId);

    expect(repository.current.quantity).toBe(11);
    expect(repository.movements).toHaveLength(2);
    expect(repository.movements[1].diagnosisCodes).toEqual(["J01"]);

    const audit = await service.audit({ page: 1, pageSize: 10 }, tenantId);
    expect(audit).toMatchObject({ page: 1, pageSize: 10, total: 2 });
    expect(audit.data[0]).toMatchObject({ operation: "add", quantity: 4, reason: "Restock" });
  });

  it("rejects removing more stock than is available or another tenant's item", async () => {
    const repository = new InMemoryInventoryRepository();
    const service = new InventoryService(repository);

    await expect(service.update({ id: itemId, operation: "del", quantity: 11, diagnosisCodes: ["J01"] }, tenantId))
      .rejects.toMatchObject({ statusCode: 409 });
    await expect(service.get(itemId, "550e8400-e29b-41d4-a716-446655440099"))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});
