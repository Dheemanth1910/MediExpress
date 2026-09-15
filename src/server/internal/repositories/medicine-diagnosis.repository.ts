import { eq } from "drizzle-orm";
import { db, type Database } from "../../db/client";
import {
  NewMedicineDiagnosis,
  MedicineDiagnosis,
  medicineDiagnoses,
} from "../entities/medicine-diagnosis.entity";

export interface MedicineDiagnosisRepository {
  findAll(): Promise<MedicineDiagnosis[]>;
  findByMedicineId(id: string): Promise<MedicineDiagnosis[] | undefined>;
  findByDiagnosisId(id: string): Promise<MedicineDiagnosis[] | undefined>;
  create(input: NewMedicineDiagnosis): Promise<MedicineDiagnosis>;
}

export class DrizzleMedicineDiagnosisRepository implements MedicineDiagnosisRepository {
  constructor(private readonly database: Database = db) {}
  findAll() {
    return this.database.select().from(medicineDiagnoses);
  }

  async findByMedicineId(id: string) {
    const medicineDiagnosis = await this.database
      .select()
      .from(medicineDiagnoses)
      .where(eq(medicineDiagnoses.medicineId, id));
    return medicineDiagnosis;
  }

  async findByDiagnosisId(id: string) {
    const medicineDiagnosis = await this.database
      .select()
      .from(medicineDiagnoses)
      .where(eq(medicineDiagnoses.diagnosisId, id));
    return medicineDiagnosis;
  }

  async create(input: NewMedicineDiagnosis) {
    const [medicineDiagnosis] = await this.database
      .insert(medicineDiagnoses)
      .values(input)
      .returning();
    return medicineDiagnosis;
  }
}
