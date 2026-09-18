import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { existsSync } from "node:fs";
import { AppDependencies, createDependencies } from "./container";
import { createTenantRoutes } from "./routes/tenant.routes";
import { createSubTenantRoutes } from "./routes/sub-tenant.routes";
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
  app.use("/api/sub-tenants", createSubTenantRoutes(dependencies.subTenantService));
  app.use("/api/user", createUserRoutes(dependencies.userService, dependencies.authService));
  app.use("/api/rbac", createRbacRoutes(dependencies.rbacService));
  app.use("/api/inventory", createInventoryRoutes(dependencies.inventoryService, dependencies.authService));
  app.use("/api" , createMedicineDiagnosisRoutes(dependencies.medicineDiagnosesService))

  const clientDist = path.resolve(process.cwd(), "dist/client");
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api|\/health).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  return app;
};
