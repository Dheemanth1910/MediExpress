import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { medicines, Medicine, NewMedicine } from "../entities/medicine.entity";

export interface MedicineRepository {
  findAll(): Promise<Medicine[]>;
  findById(id: string): Promise<Medicine | undefined>;
  create(input: NewMedicine): Promise<Medicine>;
}

export class DrizzleMedicineRepository implements MedicineRepository {
  findAll() {
    return db.select().from(medicines);
  }

  async findById(id: string) {
    const [medicine] = await db
      .select()
      .from(medicines)
      .where(eq(medicines.id, id));
    return medicine;
  }
  
  async create(input: NewMedicine) {
    const [medicine] = await db.insert(medicines).values(input).returning();
    return medicine;
  }
}
