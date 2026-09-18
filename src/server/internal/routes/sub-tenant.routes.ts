import { Router } from "express";
import { SubTenantController } from "../controllers/sub-tenant.controller";
import { SubTenantService } from "../services/sub-tenant/sub-tenant.service";

export const createSubTenantRoutes = (service: SubTenantService) => {
  const controller = new SubTenantController(service);
  const router = Router();
  router.get("/", controller.list.bind(controller));
  router.get("/:id", controller.get.bind(controller));
  router.post("/", controller.create.bind(controller));
  return router;
};
