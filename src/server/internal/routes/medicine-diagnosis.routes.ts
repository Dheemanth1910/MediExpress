import { Router } from "express";

import { MedicineDiagnosisController } from "../controllers/medicine-diagnosis.controller";

import { MedicineDiagnosisService } from "../services/medicine-diagnosis/medicine-diagnosis.service";

import { AuthService } from "../services/user/auth.service";


export const createMedicineDiagnosisRoutes = (
  medicineDiagnosisService: MedicineDiagnosisService,
) => {
  const router = Router();

  const controller = new MedicineDiagnosisController(medicineDiagnosisService);

  // TODO: create meicine searchable dropdown api
  router.post("/medicines/create", controller.createMedicines.bind(controller));
  router.post("/diagnoses/create", controller.createDiagnoses.bind(controller));

  router.post(
    "/medicine-diagnoses/create",
    controller.createMedicineDiagnoses.bind(controller),
  );

  return router;
};
