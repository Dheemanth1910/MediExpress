import { BigQuery } from "@google-cloud/bigquery";
import dotenv from "dotenv";
 
dotenv.config({ quiet: true });
 
export const bigQueryClient = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID,
});
 
export type BigQueryClient = typeof bigQueryClient;
