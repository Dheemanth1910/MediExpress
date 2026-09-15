import { Router } from "express";
import { InventoryController } from "../controllers/inventory.controller";
import { createAuthenticateMiddleware } from "../middleware/authenticate.middleware";
import { AuthService } from "../services/user/auth.service";
import { InventoryService } from "../services/inventory/inventory.service";

export const createInventoryRoutes = (service: InventoryService, authService: AuthService) => {
  const controller = new InventoryController(service);
  const authenticate = createAuthenticateMiddleware(authService);
  const router = Router();

  router.post("/add", authenticate, controller.create.bind(controller));
  router.put("/update", authenticate, controller.update.bind(controller));
  router.get("/get", authenticate, controller.list.bind(controller));
  router.get("/audit", authenticate, controller.audit.bind(controller));
  router.get("/:id", authenticate, controller.get.bind(controller));

  return router;
};
