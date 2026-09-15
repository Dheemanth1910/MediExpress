import { Router } from "express";
import { TenantController } from "../controllers/tenant.controller";
import { TenantService } from "../services/tenant/tenant.service";

export const createTenantRoutes = (service: TenantService) => {
  const controller = new TenantController(service);
  const router = Router();
  router.get("/", controller.list.bind(controller));
  router.get("/:id", controller.get.bind(controller));
  router.post("/", controller.create.bind(controller));
  return router;
};
