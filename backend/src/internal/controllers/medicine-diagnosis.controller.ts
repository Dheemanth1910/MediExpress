import { Request, Response } from "express";
import { ZodError } from "zod";

import {
  createMedicinesRequestSchema,
  createDiagnosesRequestSchema,
  createMedicineDiagnosesRequestSchema,
} from "../dtos/medicine-diagnosis.dto";

import {
  MedicineDiagnosisService,
  MedicineDiagnosisServiceError,
} from "../services/medicine-diagnosis/medicine-diagnosis.service";

const validationError = (error: ZodError) => ({
  error: "Invalid request",
  details: error.issues.map((issue) => ({
    path: issue.path,
    message: issue.message,
  })),
});

const handleError = (res: Response, error: unknown) => {
  if (error instanceof MedicineDiagnosisServiceError) {
    return res
      .status(error.statusCode)
      .json({ error: error.message });
  }

  console.error("Medicine diagnosis service request failed", error);

  return res
    .status(500)
    .json({ error: "Internal server error" });
};

export class MedicineDiagnosisController {
  constructor(
    private readonly medicineDiagnosisService: MedicineDiagnosisService,
  ) {}

  async createMedicines(req: Request, res: Response) {
    const parsed = createMedicinesRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json(validationError(parsed.error));
    }

    try {
      return res.status(201).json(
        await this.medicineDiagnosisService.createMedicines(
          parsed.data,
        ),
      );
    } catch (error) {
      return handleError(res, error);
    }
  }

  async createDiagnoses(req: Request, res: Response) {
    const parsed = createDiagnosesRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json(validationError(parsed.error));
    }

    try {
      return res.status(201).json(
        await this.medicineDiagnosisService.createDiagnoses(
          parsed.data,
        ),
      );
    } catch (error) {
      return handleError(res, error);
    }
  }

  async createMedicineDiagnoses(req: Request, res: Response) {
    const parsed =
      createMedicineDiagnosesRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json(validationError(parsed.error));
    }

    try {
      return res.status(201).json(
        await this.medicineDiagnosisService.createMedicineDiagnoses(
          parsed.data,
        ),
      );
    } catch (error) {
      return handleError(res, error);
    }
  }
}