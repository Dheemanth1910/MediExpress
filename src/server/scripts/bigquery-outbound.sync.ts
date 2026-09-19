/**
 * Intended to run on a schedule via crontab, e.g.:
 * /15 * * * * cd /path/to/project && npx tsx bigquery-sync/sync-cron.ts >> /var/log/bq-sync.log 2>&1
 *
 * Reads the last synced inventory_movements.id from sync_state,
 * fetches every "DEL" movement created since then (using > on the
 * UUIDv7 id, which is safe because v7 UUIDs are time-ordered),
 * pushes them into BigQuery, and advances the watermark to the
 * highest id it just processed - per subtenant.
 **/

import { BigQueryOutboundMovementRepository } from "../internal/repositories/outbound-movement.repository";
import { DrizzleInventoryRepository } from "../internal/repositories/inventory.repository";
import { DrizzleSyncStateRepository } from "../internal/repositories/sync-state.repository";
import { DrizzleSubTenantTenantRepository } from "../internal/repositories/sub-tenant.repository";
import { NewOutboundMovement } from "../internal/entities/outbound-movement.entity";

const JOB_NAME = "inventory_movements_to_bigquery";
const LIMIT = 2000;

async function main() {
  const syncStateRepository = new DrizzleSyncStateRepository();
  const inventoryRepository = new DrizzleInventoryRepository();
  const subTenantRepository = new DrizzleSubTenantTenantRepository();
  const outboundMovementRepository = new BigQueryOutboundMovementRepository();
  
  //create Table if not exists
  await outboundMovementRepository.ensureOutboundMovementsTableExists();

  const subTenants = await subTenantRepository.findAll();
  // Sequential on purpose - one subtenant fully finishes (Postgres read,
  // BigQuery write, watermark update) before the next one starts. Safer
  // on BigQuery quota than firing all subtenants' inserts at once.
  for (const subTenant of subTenants) {
    await processSubTenant(subTenant.id, inventoryRepository, syncStateRepository , outboundMovementRepository);
  }
}

async function processSubTenant(
  subTenantId: string,
  inventoryRepository: DrizzleInventoryRepository,
  syncStateRepository: DrizzleSyncStateRepository,
  outboundMovementRepository : BigQueryOutboundMovementRepository
) {
  let lastSyncedId = await syncStateRepository.getLastSyncedId(
    JOB_NAME,
    subTenantId,
  );
  console.log(
    lastSyncedId
      ? `Fetching outbound movements after id ${lastSyncedId} for Subtenant - ${subTenantId}...`
      : `No watermark found - fetching all outbound movements for Subtenant - ${subTenantId}...`,
  );
 

  let totalSynced = 0;
 
  // Loops until a page comes back smaller than LIMIT, meaning there's
  // nothing left to fetch. On a subtenant's first run (lastSyncedId
  // null/empty), this walks through the ENTIRE backlog page by page in
  // this single invocation - unbounded catch-up, by design for now.
  while (true) {
    const rows = await inventoryRepository.getSyncDataForBigQuery(
      lastSyncedId,
      subTenantId,
      LIMIT,
    );

    if (rows.length === 0) {
      if (totalSynced === 0) {
        console.log(`No new outbound movements to sync for Subtenant - ${subTenantId}.`);
      }
      break;
    }
 
    console.log(`Found ${rows.length} outbound movement(s). Syncing...`);
    const syncedAt = new Date().toISOString();
    const bigQueryRows: NewOutboundMovement[] = rows.map((row) => ({
      movement_id: row.id,
      medicine_id: row.medicineId,
      sub_tenant_id: row.subTenantId,
      quantity: row.quantity,
      reason: row.reason,
      diagnosis_codes: row.diagnosisCodes ?? [],
      created_at: row.createdAt,
      synced_at: syncedAt,
    }));
 
    await outboundMovementRepository.createMany(bigQueryRows);
 
    // ids are UUIDv7, so the last row in ascending order is also the
    // highest id - no separate max() computation needed.
    lastSyncedId = rows[rows.length - 1].id;
    await syncStateRepository.setLastSyncedId(JOB_NAME, subTenantId, lastSyncedId);
    totalSynced += rows.length;
 
    console.log(
      `Synced ${rows.length} row(s) (page). Watermark now ${lastSyncedId} for SubTenant - ${subTenantId}`,
    );
    // A page smaller than LIMIT means we've reached the end - no point
    // issuing another query that will just come back empty.
    if (rows.length < LIMIT) break;
  }
 
  if (totalSynced > 0) {
    console.log(
      `Sync complete for Subtenant - ${subTenantId}: ${totalSynced} row(s) across all pages.`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    if (error?.name === "PartialFailureError" && error.errors) {
      console.error("BigQuery insert errors:");
      error.errors.forEach((e: { errors: unknown; row: unknown }, i: number) => {
        console.error(`Row ${i}:`, JSON.stringify(e.errors, null, 2));
        console.error(`Row ${i} data:`, JSON.stringify(e.row, null, 2));
      });
    } else {
      console.error("BigQuery sync cron failed:", error);
    }
    process.exit(1);
  });