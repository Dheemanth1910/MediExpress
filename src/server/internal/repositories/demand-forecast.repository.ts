import { bigQueryClient } from "../../db/bigquery-client";
import { MedicineDemandForecast } from "../entities/demand-forecast.entity";

const DATASET_ID = "medicine_forecasting";
const MODEL_ID = "demand_forecast_model";

export interface DemandForecastRepository {
  getForecast(
    subTenantId: string,
    medicineIds: string[],
  ): Promise<MedicineDemandForecast[]>;
}

export class BigQueryDemandForecastRepository
  implements DemandForecastRepository
{
  constructor(private readonly client = bigQueryClient) {}

  async getForecast(
    subTenantId: string,
    medicineIds: string[],
  ): Promise<MedicineDemandForecast[]> {
    if (medicineIds.length === 0) return [];

    const query = `
      WITH forecast AS (
        SELECT
          medicine_id,
          sub_tenant_id,
          forecast_timestamp,
          forecast_value
        FROM ML.FORECAST(
          MODEL \`${DATASET_ID}.${MODEL_ID}\`,
          STRUCT(30 AS horizon, 0.8 AS confidence_level)
        )
        WHERE sub_tenant_id = @subTenantId
          AND medicine_id IN UNNEST(@medicineIds)
      )
      SELECT
        medicine_id,
        SUM(IF(forecast_timestamp <= TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 7 DAY), forecast_value, 0)) AS demand_7_day,
        SUM(forecast_value) AS demand_30_day
      FROM forecast
      GROUP BY medicine_id
    `;

    const [rows] = await this.client.query({
      query,
      params: { subTenantId, medicineIds },
    });

    return (
      rows as {
        medicine_id: string;
        demand_7_day: number;
        demand_30_day: number;
      }[]
    ).map((row) => ({
      medicineId: row.medicine_id,
      demand7Day: row.demand_7_day,
      demand30Day: row.demand_30_day,
    }));
  }
}