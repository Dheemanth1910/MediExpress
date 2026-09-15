import { eq } from "drizzle-orm";
import { db, type Database } from "../../db/client";
import { SyncState, syncState } from "../entities/sync-state.entity";

export interface SyncStateRepository {
  getLastSyncedId(jobName: string): Promise<string | null>;
  setLastSyncedId(jobName: string, id: string): Promise<SyncState>;
}

export class DrizzleSyncStateRepository implements SyncStateRepository {
  constructor(private readonly database: Database = db) {}

  async getLastSyncedId(jobName: string) {
    const [row] = await this.database
      .select()
      .from(syncState)
      .where(eq(syncState.jobName, jobName));
    return row?.lastSyncedId ?? null;
  }

  async setLastSyncedId(jobName: string, id: string) {
    const [row] = await this.database
      .insert(syncState)
      .values({ jobName, lastSyncedId: id })
      .onConflictDoUpdate({
        target: syncState.jobName,
        set: { lastSyncedId: id, updatedAt: new Date() },
      })
      .returning();
    return row;
  }
}
