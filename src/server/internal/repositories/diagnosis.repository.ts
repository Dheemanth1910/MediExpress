import { eq } from "drizzle-orm";
import { db, type Database } from "../../db/client";
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
  constructor(private readonly database: Database = db) {}
  findAll() {
    return this.database.select().from(diagnoses);
  }

  async findById(id: string) {
    const [diagnosis] = await this.database
      .select()
      .from(diagnoses)
      .where(eq(diagnoses.id, id));
    return diagnosis;
  }

  async create(input: NewDiagnosis) {
    const [diagnosis] = await this.database.insert(diagnoses).values(input).returning();
    return diagnosis;
  }
}
