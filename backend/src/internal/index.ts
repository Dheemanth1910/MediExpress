import express from "express";
import dotenv from "dotenv";
import { AppDependencies, createDependencies } from "./container";
import { createTenantRoutes } from "./routes/tenant.routes";
import { createInventoryRoutes } from "./routes/inventory.routes";
import { createUserRoutes } from "./routes/user.routes";
import { createRbacRoutes } from "./routes/rbac.routes";
import { createMedicineDiagnosisRoutes } from "./routes/medicine-diagnosis.routes"

dotenv.config({ quiet: true });

export const createApp = (dependencies: AppDependencies = createDependencies()) => {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/tenants", createTenantRoutes(dependencies.tenantService));
  app.use("/api/user", createUserRoutes(dependencies.userService, dependencies.authService));
  app.use("/api/rbac", createRbacRoutes(dependencies.rbacService));
  app.use("/api/medicine" , createMedicineDiagnosisRoutes(dependencies.medicineDiagnosesService))
  app.use("/api/inventory", createInventoryRoutes(dependencies.inventoryService, dependencies.authService));

  return app;
};
