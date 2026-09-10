import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../../db/client";
import { inventoryItems } from "../models/inventory.model";

export const getAllInventoryItems = async (_req: Request, res: Response) => {
  const result = await db.select().from(inventoryItems);
  res.json(result);
};

export const getInventoryItemById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
  if (!result.length) {
    return res.status(404).json({ error: "Inventory item not found" });
  }
  res.json(result[0]);
};

export const createInventoryItem = async (req: Request, res: Response) => {
  const { tenantId, name, quantity } = req.body;
  const result = await db
    .insert(inventoryItems)
    .values({ tenantId, name, quantity })
    .returning();
  res.status(201).json(result[0]);
};
