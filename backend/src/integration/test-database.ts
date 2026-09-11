import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { Database } from "../db/client";

const identifier = (value: string) => `"${value.replaceAll('"', '""')}"`;

export interface IntegrationDatabase {
  database: Database;
  close(): Promise<void>;
}

export const createIntegrationDatabase = async (): Promise<IntegrationDatabase> => {
  const adminUrl = process.env.TEST_DATABASE_URL;
  if (!adminUrl) throw new Error("TEST_DATABASE_URL is required for integration tests");

  const name = `mediexpress_test_${process.pid}_${randomBytes(5).toString("hex")}`;
  const adminPool = new Pool({ connectionString: adminUrl });
  await adminPool.query(`CREATE DATABASE ${identifier(name)}`);
  await adminPool.end();

  const testUrl = new URL(adminUrl);
  testUrl.pathname = `/${name}`;
  const pool = new Pool({ connectionString: testUrl.toString() });
  const database = drizzle(pool);

  await migrate(database, { migrationsFolder: resolve(process.cwd(), "drizzle") });

  return {
    database,
    async close() {
      await pool.end();
      const cleanupPool = new Pool({ connectionString: adminUrl });
      await cleanupPool.query(`DROP DATABASE ${identifier(name)} WITH (FORCE)`);
      await cleanupPool.end();
    },
  };
};
