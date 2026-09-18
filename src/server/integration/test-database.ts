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
  if (!adminUrl) {
    throw new Error("TEST_DATABASE_URL is required for integration tests");
  }

  let testDatabase = process.env.TEST_DATABASE_NAME;
  if (!testDatabase) {
    testDatabase = `mediexpress_test_${process.pid}_${randomBytes(5).toString("hex")}`;
  }
  const adminPool = new Pool({ connectionString: adminUrl });
  const result = await adminPool.query(`SELECT 1 FROM pg_database WHERE datname = $1`,[testDatabase]);

  if (result.rowCount === 0) {
    await adminPool.query(
      `CREATE DATABASE ${identifier(testDatabase)}`,
    );
  }

  await adminPool.end();

  const testUrl = new URL(adminUrl);
  testUrl.pathname = `/${testDatabase}`;
  const pool = new Pool({ connectionString: testUrl.toString(), max: 20 });
  const database = drizzle(pool);

  await migrate(database, { migrationsFolder: resolve(process.cwd(), "drizzle") });

  return {
    database,
    async close() {
      await pool.end();
      // const cleanupPool = new Pool({ connectionString: adminUrl });
      // await cleanupPool.query(`DROP DATABASE ${identifier(name)} WITH (FORCE)`);
      // await cleanupPool.end();
    },
  };
};
