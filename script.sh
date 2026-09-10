#!/usr/bin/env bash
set -euo pipefail

# ==============================================================
# Project scaffold script
#
#   frontend/  -> React + TypeScript (Vite)
#   backend/   -> Express + TypeScript, modular monolith
#                 - src/db/client.ts        (Drizzle + Postgres)
#                 - src/services/tenant-service/{controllers,routes,models}
#                 - src/services/inventory-service/{controllers,routes,models}
#   infra/     -> docker-compose.yml (backend, frontend, postgres), k8s/
#   docs/      -> API.md
# ==============================================================

PROJECT_ROOT="${1:-.}"
mkdir -p "$PROJECT_ROOT"
cd "$PROJECT_ROOT"

echo "==> Setting up project in: $(pwd)"

# ----------------------------
# Top-level files & folders
# ----------------------------
mkdir -p infra/k8s docs

cat > README.md << 'EOF'
# Project

## Structure
- `frontend/` - React + TypeScript client
- `backend/`  - Express + TypeScript API (modular monolith)
  - `src/services/tenant-service` - tenant domain (controllers, routes, models)
  - `src/services/inventory-service` - inventory domain (controllers, routes, models)
  - `src/db/client.ts` - Drizzle ORM + Postgres connection
- `infra/` - Docker & Kubernetes configs
- `docs/` - Project documentation

## Backend dev setup
1. `cd backend && cp .env.example .env` and fill in `DATABASE_URL`
2. `npm run db:generate` - generate SQL migrations from Drizzle schema
3. `npm run db:migrate` - apply migrations
4. `npm run dev` - start the API with hot reload
EOF

cat > .gitignore << 'EOF'
node_modules/
dist/
build/
.env
.env.local
*.log
.DS_Store
drizzle/
EOF

cat > docs/API.md << 'EOF'
# API Documentation

Document your API endpoints here.
EOF

cat > infra/docker-compose.yml << 'EOF'
version: "3.9"

services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: appdb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ../backend
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/appdb
    depends_on:
      - postgres

  frontend:
    build: ../frontend
    ports:
      - "5173:5173"

volumes:
  pgdata:
EOF



# ----------------------------
# backend (Express + TypeScript + Drizzle ORM)
# ----------------------------
echo "==> Setting up backend (Express + TypeScript + Drizzle)"
mkdir -p backend/src/db
mkdir -p backend/src/services/tenant-service/{controllers,routes,models}
mkdir -p backend/src/services/inventory-service/{controllers,routes,models}

pushd backend > /dev/null

npm init -y > /dev/null

npm install express dotenv drizzle-orm pg > /dev/null
npm install -D typescript ts-node-dev @types/node @types/express @types/pg drizzle-kit > /dev/null

cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
EOF

cat > .env.example << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/appdb
PORT=4000
EOF

cat > drizzle.config.ts << 'EOF'
import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();

export default {
  schema: "./src/services/**/models/*.model.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
} satisfies Config;
EOF

cat > src/db/client.ts << 'EOF'
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);
EOF

# ---- tenant-service ----
cat > src/services/tenant-service/models/tenant.model.ts << 'EOF'
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
EOF

cat > src/services/tenant-service/controllers/tenant.controller.ts << 'EOF'
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
EOF

cat > src/services/tenant-service/routes/tenant.routes.ts << 'EOF'
import { Router } from "express";
import { getAllTenants, getTenantById, createTenant } from "../controllers/tenant.controller";

const router = Router();

router.get("/", getAllTenants);
router.get("/:id", getTenantById);
router.post("/", createTenant);

export default router;
EOF

# ---- inventory-service ----
cat > src/services/inventory-service/models/inventory.model.ts << 'EOF'
import { pgTable, uuid, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "../../tenant-service/models/tenant.model";

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  quantity: integer("quantity").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;
EOF

cat > src/services/inventory-service/controllers/inventory.controller.ts << 'EOF'
import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../../db/client";
import { inventoryItems } from "../models/inventory.model";

export const getAllInventoryItems = async (_req: Request, res: Response) => {
  const result = await db.select().from(inventoryItems);
  res.json(result);
};

export const getInventoryItemById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
  if (!result.length) {
    return res.status(404).json({ error: "Inventory item not found" });
  }
  res.json(result[0]);
};

export const createInventoryItem = async (req: Request, res: Response) => {
  const { tenantId, name, quantity } = req.body;
  const result = await db
    .insert(inventoryItems)
    .values({ tenantId, name, quantity })
    .returning();
  res.status(201).json(result[0]);
};
EOF

cat > src/services/inventory-service/routes/inventory.routes.ts << 'EOF'
import { Router } from "express";
import {
  getAllInventoryItems,
  getInventoryItemById,
  createInventoryItem,
} from "../controllers/inventory.controller";

const router = Router();

router.get("/", getAllInventoryItems);
router.get("/:id", getInventoryItemById);
router.post("/", createInventoryItem);

export default router;
EOF

# ---- app entrypoint ----
cat > src/index.ts << 'EOF'
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
EOF

# Add scripts to package.json (dev/build/start + drizzle-kit helpers)
node -e "
  const fs = require('fs');
  const pkgPath = './package.json';
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.scripts = {
    ...pkg.scripts,
    dev: 'ts-node-dev --respawn --transpile-only src/index.ts',
    build: 'tsc',
    start: 'node dist/index.js',
    'db:generate': 'drizzle-kit generate',
    'db:migrate': 'drizzle-kit migrate',
    'db:studio': 'drizzle-kit studio'
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
"

popd > /dev/null

echo ""
echo "==> Done! Project structure created."
echo ""
echo "Next steps:"
echo "  cd backend && cp .env.example .env    # set your DATABASE_URL"
echo "  cd backend && npm run db:generate      # generate migrations from schema"
echo "  cd backend && npm run db:migrate       # apply migrations"
echo "  cd backend && npm run dev              # start API on :4000"
echo "  cd frontend && npm run dev             # start React dev server"
echo ""
echo "  or: docker-compose -f infra/docker-compose.yml up   # spin up backend + postgres + frontend"


# ----------------------------
# frontend (React + TypeScript via Vite)
# ----------------------------
echo "==> Setting up React + TypeScript frontend (Vite)"
if [ ! -d "frontend" ]; then
  npm create vite@latest frontend -- --template react-ts
fi
pushd frontend > /dev/null
npm install > /dev/null
popd > /dev/null