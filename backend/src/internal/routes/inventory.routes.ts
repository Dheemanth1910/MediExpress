import { Router } from "express";
import { InventoryController } from "../controllers/inventory.controller";
import { InventoryService } from "../services/inventory/inventory.service";

export const createInventoryRoutes = (service: InventoryService) => {
  const controller = new InventoryController(service);
  const router = Router();
  router.get("/", controller.list.bind(controller));
  router.get("/:id", controller.get.bind(controller));
  router.post("/", controller.create.bind(controller));
  return router;
};
