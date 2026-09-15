import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import {
  Diagnosis,
  NewDiagnosis,
  diagnoses,
} from "../entities/diagnosis.entity";

export interface DiagnosisRepository {
  findAll(): Promise<Diagnosis[]>;
  findById(id: string): Promise<Diagnosis | undefined>;
  create(input: NewDiagnosis): Promise<Diagnosis>;
}

export class DrizzleDiagnosisRepository implements DiagnosisRepository {
  findAll() {
    return db.select().from(diagnoses);
  }

  async findById(id: string) {
    const [diagnosis] = await db
      .select()
      .from(diagnoses)
      .where(eq(diagnoses.id, id));
    return diagnosis;
  }

  async create(input: NewDiagnosis) {
    const [diagnosis] = await db.insert(diagnoses).values(input).returning();
    return diagnosis;
  }
}
