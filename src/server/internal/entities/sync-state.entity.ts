import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
 
// A single row per named sync job. jobName lets you reuse this same
// table if you ever add a second thing to sync (e.g. a different
// BigQuery table) without needing a new table each time.
export const syncState = pgTable("sync_state", {
  jobName: varchar("job_name", { length: 100 }).primaryKey(),
  lastSyncedId: uuid("last_synced_id"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
 
export type SyncState = typeof syncState.$inferSelect;
export type NewSyncState = typeof syncState.$inferInsert;
 