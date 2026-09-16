import { eq, and } from "drizzle-orm";
import { db, type Database } from "../../db/client";
import { SyncState, syncState } from "../entities/sync-state.entity";

export interface SyncStateRepository {
  getLastSyncedId(jobName: string, subTenantId: string): Promise<string | null>;
  setLastSyncedId(jobName: string, subTenantId : string , id: string): Promise<SyncState>;
}

export class DrizzleSyncStateRepository implements SyncStateRepository {
  constructor(private readonly database: Database = db) {}

  async getLastSyncedId(jobName: string, subTenantId: string) {
    const [row] = await this.database
      .select()
      .from(syncState)
      .where(
        and(
          eq(syncState.jobName, jobName),
          eq(syncState.subTenantId, subTenantId),
        ),
      );
    return row?.lastSyncedId ?? null;
  }

  async setLastSyncedId(jobName: string, subTenantId : string , id: string) {
    const [row] = await this.database
      .insert(syncState)
      .values({ jobName, subTenantId , lastSyncedId: id })
      .onConflictDoUpdate({
        target: syncState.jobName,
        set: { lastSyncedId: id, updatedAt: new Date() },
      })
      .returning();
    return row;
  }
}
