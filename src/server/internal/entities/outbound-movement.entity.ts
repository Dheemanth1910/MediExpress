// Big Query Entity. Different from pg-Drizzle.entity.ts

import type { TableField } from "@google-cloud/bigquery";

export const OUTBOUND_MOVEMENTS_TABLE_ID = "outbound_movements";

// Used only if you create the table programmatically (table.create({ schema })).
// If you created the table by hand in the BigQuery console, this is just
// documentation of the table shape - it has no runtime effect on its own.
export const outboundMovementsSchema: TableField[] = [
  { name: "movement_id", type: "STRING", mode: "REQUIRED" },
  { name: "inventory_item_id", type: "STRING", mode: "REQUIRED" },
  { name: "item_name", type: "STRING", mode: "NULLABLE" },
  { name: "item_category", type: "STRING", mode: "NULLABLE" },
  { name: "sub_tenant_id", type: "STRING", mode: "REQUIRED" },
  { name: "quantity", type: "INTEGER", mode: "REQUIRED" },
  { name: "reason", type: "STRING", mode: "NULLABLE" },
  { name: "diagnosis_codes", type: "STRING", mode: "REPEATED" },
  { name: "created_at", type: "TIMESTAMP", mode: "REQUIRED" },
  { name: "synced_at", type: "TIMESTAMP", mode: "REQUIRED" },
];

// Hand-written row shape - the BigQuery equivalent of Diagnosis ($inferSelect).
// There's no schema-inference here, so this must be kept in sync with
// outboundMovementsSchema above manually if the table shape ever changes.
export interface OutboundMovement {
  movement_id: string;
  inventory_item_id: string;
  item_name: string | null;
  item_category: string | null;
  sub_tenant_id: string;
  quantity: number;
  reason: string | null;
  diagnosis_codes: string[];
  created_at: string;
  synced_at: string;
}

// The BigQuery equivalent of NewDiagnosis ($inferInsert) - what you
// pass to table.insert(). Identical shape here since BigQuery doesn't
// have DB-generated defaults the way Postgres's defaultRandom() does.
export type NewOutboundMovement = OutboundMovement;