import express from "express";
import dotenv from "dotenv";
import tenantRoutes from "./services/tenant-service/routes/tenant.routes";
import inventoryRoutes from "./services/inventory-service/routes/inventory.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/tenants", tenantRoutes);
app.use("/api/inventory", inventoryRoutes);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
