import { Router } from "express";
import { RbacController } from "../controllers/rbac.controller";
import { RbacService } from "../services/rbac/rbac.service";

export const createRbacRoutes = (service: RbacService) => {
  const router = Router();
  const controller = new RbacController(service);

  router.post("/role/create", controller.createRole.bind(controller));
  router.put("/roles/update", controller.updateRole.bind(controller));
  router.get("/roles", controller.listRoles.bind(controller));
  router.get("/permissions", controller.listPermissions.bind(controller));

  return router;
};
