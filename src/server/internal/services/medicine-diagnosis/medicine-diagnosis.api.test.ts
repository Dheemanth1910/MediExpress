import { describe, expect, it } from "vitest";
import { MedicineDiagnosisService } from "./medicine-diagnosis.service";
import { NewMedicine, Medicine } from "../../entities/medicine.entity";
import { MedicineRepository } from "../../repositories/medicine.repository";
import { NewDiagnosis, Diagnosis } from "../../entities/diagnosis.entity";
import { DiagnosisRepository } from "../../repositories/diagnosis.repository";
import {
  NewMedicineDiagnosis,
  MedicineDiagnosis,
} from "../../entities/medicine-diagnosis.entity";
import { MedicineDiagnosisRepository } from "../../repositories/medicine-diagnosis.repository";

const medicineId = "550e8400-e29b-41d4-a716-446655440010";
const diagnosisId = "550e8400-e29b-41d4-a716-446655440020";

class InMemoryMedicineRepository implements MedicineRepository {
  private readonly medicines = new Map<string, Medicine>();

  async findAll() {
    return [...this.medicines.values()];
  }

  async findById(id: string) {
    return this.medicines.get(id);
  }

  async create(input: NewMedicine) {
    const medicine: Medicine = {
      id: this.medicines.size === 0 ? medicineId : `medicine-${this.medicines.size + 1}`,
      name: input.name,
      category: input.category,
    };
    this.medicines.set(medicine.id, medicine);
    return medicine;
  }
}

class InMemoryDiagnosisRepository implements DiagnosisRepository {
  private readonly diagnoses = new Map<string, Diagnosis>();

  async findAll() {
    return [...this.diagnoses.values()];
  }

  async findById(id: string) {
    return this.diagnoses.get(id);
  }

  async create(input: NewDiagnosis) {
    if ([...this.diagnoses.values()].some((d) => d.icdCode === input.icdCode)) {
      throw new Error("duplicate key value violates unique constraint");
    }
    const diagnosis: Diagnosis = {
      id: this.diagnoses.size === 0 ? diagnosisId : `diagnosis-${this.diagnoses.size + 1}`,
      icdCode: input.icdCode,
      description: input.description,
      chapter: input.chapter,
    };
    this.diagnoses.set(diagnosis.id, diagnosis);
    return diagnosis;
  }
}

class InMemoryMedicineDiagnosisRepository implements MedicineDiagnosisRepository {
  private readonly links = new Map<string, MedicineDiagnosis>();

  async findAll() {
    return [...this.links.values()];
  }

  async findByMedicineId(id: string) {
    return [...this.links.values()].filter((link) => link.medicineId === id);
  }

  async findByDiagnosisId(id: string) {
    return [...this.links.values()].filter((link) => link.diagnosisId === id);
  }

  async create(input: NewMedicineDiagnosis) {
    const key = `${input.medicineId}:${input.diagnosisId}`;
    const link: MedicineDiagnosis = {
      medicineId: input.medicineId,
      diagnosisId: input.diagnosisId,
    };
    this.links.set(key, link);
    return link;
  }
}

const makeService = () => {
  const medicineRepository = new InMemoryMedicineRepository();
  const diagnosisRepository = new InMemoryDiagnosisRepository();
  const medicineDiagnosisRepository = new InMemoryMedicineDiagnosisRepository();
  const service = new MedicineDiagnosisService({
    medicineRepository,
    diagnosisRepository,
    medicineDiagnosisRepository,
  });
  return { service, medicineRepository, diagnosisRepository, medicineDiagnosisRepository };
};

describe("medicine-diagnosis service", () => {
  it("creates multiple medicines and returns success results", async () => {
    const { service } = makeService();

    const results = await service.createMedicines([
      { name: "Paracetamol", category: "N"  },
      { name: "Amoxicillin", category: "J"},
    ]);

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.success)).toBe(true);
    expect((results[0] as { success: true; data: { name: string } }).data.name).toBe(
      "Paracetamol",
    );
  });

  it("creates diagnoses and reports a failure for a duplicate icdCode", async () => {
    const { service } = makeService();

    const results = await service.createDiagnoses([
      { icdCode: "J11", description: "Influenza", chapter: "X" },
      { icdCode: "J11", description: "Influenza duplicate", chapter: "X" },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
    if (!results[1].success) {
      expect(results[1].error).toContain("duplicate key");
    }
  });

  it("links a medicine to a diagnosis", async () => {
    const { service, medicineRepository, diagnosisRepository } = makeService();

    const [medicineResult] = await service.createMedicines([
      { name: "Paracetamol", category: "N" },
    ]);
    const [diagnosisResult] = await service.createDiagnoses([
      { icdCode: "J11", description: "Influenza", chapter: "X" },
    ]);

    if (!medicineResult.success || !diagnosisResult.success) {
      throw new Error("setup failed");
    }

    const results = await service.createMedicineDiagnoses([
      { medicineId: medicineResult.data.id, diagnosisId: diagnosisResult.data.id },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    if (results[0].success) {
      expect(results[0].data).toEqual({
        medicineId: medicineResult.data.id,
        diagnosisId: diagnosisResult.data.id,
      });
    }
  });
});

