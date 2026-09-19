/**
 * Rebuilds the zero-filled daily_demand view and retrains the
 * ARIMA_PLUS demand forecast model against it.
 *
 * Intended to run weekly via crontab, e.g.:
 *   0 3 * * 0 cd /path/to/project && npx tsx bigquery-sync/retrain-model.ts >> /var/log/bq-retrain.log 2>&1
 *   (3 AM every Sunday)
 *
 * Both statements are idempotent (CREATE OR REPLACE) - safe to
 * re-run manually at any time if you want a fresh retrain outside
 * the schedule.
 */

import { bigQueryClient } from "../db/bigquery-client";

const DATASET_ID = "medicine_forecasting";
const TRAINING_START_DATE = "2025-09-19"; // 1 year lookback, per your data-volume decision

const DAILY_DEMAND_VIEW_SQL = `
CREATE OR REPLACE VIEW \`${DATASET_ID}.daily_demand\` AS
SELECT
  skeleton.day AS movement_date,
  skeleton.medicine_id,
  skeleton.sub_tenant_id,
  COALESCE(daily.daily_quantity, 0) AS daily_quantity
FROM (
  SELECT day, medicine_id, sub_tenant_id
  FROM UNNEST(GENERATE_DATE_ARRAY('${TRAINING_START_DATE}', CURRENT_DATE(), INTERVAL 1 DAY)) AS day
  CROSS JOIN (
    SELECT DISTINCT medicine_id, sub_tenant_id
    FROM \`${DATASET_ID}.outbound_movements\`
  )
) AS skeleton
LEFT JOIN (
  SELECT
    DATE(created_at) AS movement_date,
    medicine_id,
    sub_tenant_id,
    SUM(quantity) AS daily_quantity
  FROM \`${DATASET_ID}.outbound_movements\`
  GROUP BY DATE(created_at), medicine_id, sub_tenant_id
) AS daily
  ON skeleton.day = daily.movement_date
  AND skeleton.medicine_id = daily.medicine_id
  AND skeleton.sub_tenant_id = daily.sub_tenant_id;
`;

const CREATE_MODEL_SQL = `
CREATE OR REPLACE MODEL \`${DATASET_ID}.demand_forecast_model\`
OPTIONS(
  model_type = 'ARIMA_PLUS',
  time_series_timestamp_col = 'movement_date',
  time_series_data_col = 'daily_quantity',
  time_series_id_col = ['medicine_id', 'sub_tenant_id'],
  horizon = 30,
  auto_arima = TRUE,
  data_frequency = 'DAILY'
) AS
SELECT movement_date, medicine_id, sub_tenant_id, daily_quantity
FROM \`${DATASET_ID}.daily_demand\`;
`;

async function runStatement(label: string, query: string): Promise<void> {
  console.log(`Running: ${label}...`);
  const [job] = await bigQueryClient.createQueryJob({ query });
  await job.getQueryResults();
  console.log(`Done: ${label}.`);
}

async function main() {
  await runStatement("rebuild daily_demand view", DAILY_DEMAND_VIEW_SQL);
  await runStatement("retrain demand_forecast_model", CREATE_MODEL_SQL);
  console.log("Retrain complete.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Model retrain failed:", error);
    process.exit(1);
  });