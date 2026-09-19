import { bigQueryClient } from "../../db/bigquery-client";
import {
  OutboundMovement,
  NewOutboundMovement,
  OUTBOUND_MOVEMENTS_TABLE_ID,
  outboundMovementsSchema,
} from "../entities/outbound-movement.entity";

const DATASET_ID = "medicine_forecasting";

export interface ForcastDataResponse {
  mediceneId: string;
  demand_7_days: number;
  demand_30_days: number;
}

export interface OutboundMovementRepository {
  create(input: NewOutboundMovement): Promise<OutboundMovement>;
  createMany(inputs: NewOutboundMovement[]): Promise<OutboundMovement[]>;
  getForcastData(
    mediceneId: string[],
    subTenantId: string,
  ): Promise<ForcastDataResponse[]>;
}

export class BigQueryOutboundMovementRepository implements OutboundMovementRepository {
  constructor(private readonly client = bigQueryClient) {}

  private get table() {
    return this.client.dataset(DATASET_ID).table(OUTBOUND_MOVEMENTS_TABLE_ID);
  }
  /**
   * Ensures the outbound_movements table exists under the configured
   * project/dataset, creating it if missing. Safe to call on every
   * script startup - does nothing if the table is already there.
   */
  async ensureOutboundMovementsTableExists(): Promise<void> {
    const dataset = bigQueryClient.dataset(DATASET_ID);

    const [datasetExists] = await dataset.exists();
    if (!datasetExists) {
      console.log(`Dataset ${DATASET_ID} not found - creating it...`);
      await dataset.create();
    }

    const table = dataset.table(OUTBOUND_MOVEMENTS_TABLE_ID);
    const [tableExists] = await table.exists();

    if (!tableExists) {
      console.log(
        `Table ${OUTBOUND_MOVEMENTS_TABLE_ID} not found - creating it...`,
      );
      await dataset.createTable(OUTBOUND_MOVEMENTS_TABLE_ID, {
        schema: outboundMovementsSchema,
      });
      console.log(`Table ${OUTBOUND_MOVEMENTS_TABLE_ID} created.`);
    }
  }
  async create(input: NewOutboundMovement) {
    //Maximum row size	10 MB	Exceeding this value causes invalid errors.
    //Maximum rows per request	50,000 rows
    await this.table.insert([input], {
      createInsertId: true,
    });
    return input as OutboundMovement;
  }

  async getForcastData(mediceneId: string[], subTenantId: string) {
    return {} as ForcastDataResponse[];
  }

  async createMany(inputs: NewOutboundMovement[]) {
    if (inputs.length === 0) return [];

    // insertId is supplied per-row via the "insertId" property on each
    // row object when inserting more than one at a time - the client
    // library reads it off each row rather than taking a single shared
    // option, so we map to BigQuery's expected { insertId, json } shape.
    const rowsWithInsertIds = inputs.map((row) => ({
      insertId: row.movement_id,
      json: row,
    }));

    await this.table.insert(rowsWithInsertIds, { raw: true });
    return inputs as OutboundMovement[];
  }
}
