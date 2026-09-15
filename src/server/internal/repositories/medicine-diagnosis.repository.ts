import { eq } from "drizzle-orm";
import { db } from "../../db/client";
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
  findAll() {
    return db.select().from(medicineDiagnoses);
  }

  async findByMedicineId(id: string) {
    const medicineDiagnosis = await db
      .select()
      .from(medicineDiagnoses)
      .where(eq(medicineDiagnoses.medicineId, id));
    return medicineDiagnosis;
  }

  async findByDiagnosisId(id: string) {
    const medicineDiagnosis = await db
      .select()
      .from(medicineDiagnoses)
      .where(eq(medicineDiagnoses.diagnosisId, id));
    return medicineDiagnosis;
  }

  async create(input: NewMedicineDiagnosis) {
    const [medicineDiagnosis] = await db
      .insert(medicineDiagnoses)
      .values(input)
      .returning();
    return medicineDiagnosis;
  }
}
