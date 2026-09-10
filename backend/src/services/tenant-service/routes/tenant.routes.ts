import { Router } from "express";
import { getAllTenants, getTenantById, createTenant } from "../controllers/tenant.controller";

const router = Router();

router.get("/", getAllTenants);
router.get("/:id", getTenantById);
router.post("/", createTenant);

export default router;
