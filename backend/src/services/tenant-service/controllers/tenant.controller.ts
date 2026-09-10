import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../../db/client";
import { tenants } from "../models/tenant.model";

export const getAllTenants = async (_req: Request, res: Response) => {
  const result = await db.select().from(tenants);
  res.json(result);
};

export const getTenantById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await db.select().from(tenants).where(eq(tenants.id, id));
  if (!result.length) {
    return res.status(404).json({ error: "Tenant not found" });
  }
  res.json(result[0]);
};

export const createTenant = async (req: Request, res: Response) => {
  const { name } = req.body;
  const result = await db.insert(tenants).values({ name }).returning();
  res.status(201).json(result[0]);
};
