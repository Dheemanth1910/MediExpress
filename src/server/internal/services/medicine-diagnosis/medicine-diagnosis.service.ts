import {
  CreateMedicinesRequest,
  CreateDiagnosesRequest,
  CreateMedicineDiagnosesRequest,
  MedicineResponse,
  DiagnosisResponse,
  MedicineDiagnosisResponse,
} from "../../dtos/medicine-diagnosis.dto";

import { NewMedicine, Medicine } from "../../entities/medicine.entity";
import { NewDiagnosis, Diagnosis } from "../../entities/diagnosis.entity";
import {
  NewMedicineDiagnosis,
  MedicineDiagnosis,
} from "../../entities/medicine-diagnosis.entity";

import {
  DrizzleMedicineRepository,
  MedicineRepository,
} from "../../repositories/medicine.repository";
import {
  DrizzleDiagnosisRepository,
  DiagnosisRepository,
} from "../../repositories/diagnosis.repository";
import {
  DrizzleMedicineDiagnosisRepository,
  MedicineDiagnosisRepository,
} from "../../repositories/medicine-diagnosis.repository";

export class MedicineDiagnosisServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "MedicineDiagnosisServiceError";
  }
}

function toMedicineResponse(medicine: Medicine): MedicineResponse {
  return {
    id: medicine.id,
    name: medicine.name,
    category: medicine.category,
  };
}

function toDiagnosisResponse(diagnosis: Diagnosis): DiagnosisResponse {
  return {
    id: diagnosis.id,
    icdCode: diagnosis.icdCode,
    description: diagnosis.description,
    chapter: diagnosis.chapter,
  };
}

function toMedicineDiagnosisResponse(
  medicineDiagnosis: MedicineDiagnosis,
): MedicineDiagnosisResponse {
  return {
    medicineId: medicineDiagnosis.medicineId,
    diagnosisId: medicineDiagnosis.diagnosisId,
  };
}
type Repositories = {
  medicineRepository: MedicineRepository;
  diagnosisRepository: DiagnosisRepository;
  medicineDiagnosisRepository: MedicineDiagnosisRepository;
};

export class MedicineDiagnosisService {
  constructor(
    private readonly repositories : Repositories = {
      medicineRepository : new DrizzleMedicineRepository(),
      diagnosisRepository: new DrizzleDiagnosisRepository(),
      medicineDiagnosisRepository: new DrizzleMedicineDiagnosisRepository(),
    },
  ) {}

  async createMedicines(input: CreateMedicinesRequest) {
    return Promise.all(
      input.map(async (medicineInput) => {
        const newMedicine: NewMedicine = {
          name: medicineInput.name,
          category: medicineInput.category
        };

        try {
          const created = await this.repositories.medicineRepository.create(newMedicine);
          return { success: true as const, data: toMedicineResponse(created) };
        } catch (error) {
          return {
            success: false as const,
            error: error instanceof Error ? error.message : "Unknown error",
            input: medicineInput,
          };
        }
      }),
    );
  }

  async createDiagnoses(input: CreateDiagnosesRequest) {
    return Promise.all(
      input.map(async (diagnosisInput) => {
        const newDiagnosis: NewDiagnosis = {
          icdCode: diagnosisInput.icdCode,
          description: diagnosisInput.description,
          chapter: diagnosisInput.chapter,
        };

        try {
          const created = await this.repositories.diagnosisRepository.create(newDiagnosis);
          return { success: true as const, data: toDiagnosisResponse(created) };
        } catch (error) {
          return {
            success: false as const,
            error: error instanceof Error ? error.message : "Unknown error",
            input: diagnosisInput,
          };
        }
      }),
    );
  }

  async createMedicineDiagnoses(input: CreateMedicineDiagnosesRequest) {
    return Promise.all(
      input.map(async (medicineDiagnosisInput) => {
        const newMedicineDiagnosis: NewMedicineDiagnosis = {
          medicineId: medicineDiagnosisInput.medicineId,
          diagnosisId: medicineDiagnosisInput.diagnosisId,
        };

        try {
          const created = await this.repositories.medicineDiagnosisRepository.create(
            newMedicineDiagnosis,
          );
          return { success: true as const, data: toMedicineDiagnosisResponse(created) };
        } catch (error) {
          return {
            success: false as const,
            error: error instanceof Error ? error.message : "Unknown error",
            input: medicineDiagnosisInput,
          };
        }
      }),
    );
  }
}