/**
 * Seeds medicines, diagnoses, and their static medicine-diagnosis
 * associations by reading local CSVs and batching requests against
 * the running API.
 *
 * Order matters: medicine-diagnoses links reference IDs that only
 * exist after medicines and diagnoses have been created, so we
 * run those two steps first and build name/code -> id lookup maps
 * from their responses.
 *
 * Run with: npm run seed
 * (or compile with tsc and run with node, if you don't have tsx)
 */

import { readFileSync } from "fs";
import { join } from "path";

const BASE_URL = "http://localhost:4000/api/medicine";
const BATCH_SIZE = 10;

type CreationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; input: unknown };

interface MedicineRow {
  name: string;
  category: string;
}

interface DiagnosisRow {
  icdCode: string;
  description: string;
  chapter: string;
}

interface MedicineDiagnosisRow {
  medicineName: string;
  icdCode: string;
}

// --- minimal CSV parsing (no external deps; CSVs here have no quoted commas) ---
function parseCsv<T extends object>(filePath: string): T[] {
  const content = readFileSync(filePath, "utf-8").trim();
  const [headerLine, ...lines] = content.split("\n");
  const headers = headerLine.split(",").map((h) => h.trim());

  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const row = {} as T;
      headers.forEach((header, i) => {
        (row as Record<string, string>)[header] = values[i];
      });
      return row;
    });
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function postBatch<TInput, TOutput>(
  path: string,
  items: TInput[],
): Promise<CreationResult<TOutput>[]> {
  const results: CreationResult<TOutput>[] = [];

  for (const batch of chunk(items, BATCH_SIZE)) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${path} responded ${response.status}: ${text}`);
    }

    const batchResults = (await response.json()) as CreationResult<TOutput>[];
    results.push(...batchResults);
  }

  return results;
}

async function main() {
  const medicineRows = parseCsv<MedicineRow>(
    join(__dirname, "../seed-data/medicines.csv"),
  );
  const diagnosisRows = parseCsv<DiagnosisRow>(
    join(__dirname, "../seed-data/diagnoses.csv"),
  );
  const medicineDiagnosisRows = parseCsv<MedicineDiagnosisRow>(
    join(__dirname, "../seed-data/medicine-diagnoses.csv"),
  );

  // --- Step 1: medicines ---
  console.log(`Seeding ${medicineRows.length} medicines...`);
  
  const medicineResults = await postBatch<
    { name: string; category: string },
    { id: string; name: string; category: string;}
  >(
    "/medicines/create",
    medicineRows.map((row) => ({ name: row.name, category: row.category })),
  );

  const medicineIdByName = new Map<string, string>();
  let medicineFailures = 0;
  for (const result of medicineResults) {
    if (result.success) {
      medicineIdByName.set(result.data.name, result.data.id);
    } else {
      medicineFailures++;
      console.warn(`  medicine failed: ${result.error}`, result.input);
    }
  }
  console.log(
    `  -> ${medicineIdByName.size} created, ${medicineFailures} failed`,
  );

  // --- Step 2: diagnoses ---
  console.log(`Seeding ${diagnosisRows.length} diagnoses...`);
  const diagnosisResults = await postBatch<
    { icdCode: string; description: string; chapter: string },
    { id: string; icdCode: string; description: string; chapter: string }
  >(
    "/diagnoses/create",
    diagnosisRows.map((row) => ({
      icdCode: row.icdCode,
      description: row.description,
      chapter: row.chapter,
    })),
  );

  const diagnosisIdByCode = new Map<string, string>();
  let diagnosisFailures = 0;
  for (const result of diagnosisResults) {
    if (result.success) {
      diagnosisIdByCode.set(result.data.icdCode, result.data.id);
    } else {
      diagnosisFailures++;
      console.warn(`  diagnosis failed: ${result.error}`, result.input);
    }
  }
  console.log(
    `  -> ${diagnosisIdByCode.size} created, ${diagnosisFailures} failed`,
  );

  // --- Step 3: medicine-diagnosis links, resolved from the maps above ---
  const linkInputs = medicineDiagnosisRows
    .map((row) => {
      const medicineId = medicineIdByName.get(row.medicineName);
      const diagnosisId = diagnosisIdByCode.get(row.icdCode);
      if (!medicineId || !diagnosisId) {
        console.warn(
          `  skipping link (${row.medicineName} -> ${row.icdCode}): missing id`,
        );
        return null;
      }
      return { medicineId, diagnosisId };
    })
    .filter((input): input is { medicineId: string; diagnosisId: string } =>
      input !== null,
    );

  console.log(`Seeding ${linkInputs.length} medicine-diagnosis links...`);
  const linkResults = await postBatch<
    { medicineId: string; diagnosisId: string },
    { medicineId: string; diagnosisId: string }
  >("/medicine-diagnoses/create", linkInputs);

  const linkFailures = linkResults.filter((r) => !r.success).length;
  linkResults
    .filter((r): r is { success: false; error: string; input: unknown } => !r.success)
    .forEach((r) => console.warn(`  link failed: ${r.error}`, r.input));

  console.log(
    `  -> ${linkResults.length - linkFailures} created, ${linkFailures} failed`,
  );

  console.log("Seeding complete.");
}

main().catch((error) => {
  console.error("Seed script failed:", error);
  process.exit(1);
});