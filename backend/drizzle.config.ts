import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

export default {
  schema: "./src/internal/entities/*.entity.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
} satisfies Config;
