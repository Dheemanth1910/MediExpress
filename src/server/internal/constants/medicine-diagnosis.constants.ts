import { medicineCategoryEnum } from "../entities/medicine.entity";
import { icdChapterEnum } from "../entities/diagnosis.entity";

export const MEDICINE_CATEGORY_LABELS: Record<
  (typeof medicineCategoryEnum.enumValues)[number],
  string
> = {
  A: "Alimentary tract and metabolism",
  B: "Blood and blood forming organs",
  C: "Cardiovascular system",
  D: "Dermatologicals",
  G: "Genito-urinary system and sex hormones",
  H: "Systemic hormonal preparations (excl. sex hormones)",
  J: "Antiinfectives for systemic use",
  L: "Antineoplastic and immunomodulating agents",
  M: "Musculo-skeletal system",
  N: "Nervous system",
  P: "Antiparasitic products, insecticides and repellents",
  R: "Respiratory system",
  S: "Sensory organs",
  V: "Various",
};

export const ICD_CHAPTER_LABELS: Record<
  (typeof icdChapterEnum.enumValues)[number],
  string
> = {
  I: "Certain infectious and parasitic diseases",
  II: "Neoplasms",
  III: "Diseases of the blood and blood-forming organs and certain disorders involving the immune mechanism",
  IV: "Endocrine, nutritional and metabolic diseases",
  V: "Mental and behavioural disorders",
  VI: "Diseases of the nervous system",
  VII: "Diseases of the eye and adnexa",
  VIII: "Diseases of the ear and mastoid process",
  IX: "Diseases of the circulatory system",
  X: "Diseases of the respiratory system",
  XI: "Diseases of the digestive system",
  XII: "Diseases of the skin and subcutaneous tissue",
  XIII: "Diseases of the musculoskeletal system and connective tissue",
  XIV: "Diseases of the genitourinary system",
  XV: "Pregnancy, childbirth and the puerperium",
  XVI: "Certain conditions originating in the perinatal period",
  XVII: "Congenital malformations, deformations and chromosomal abnormalities",
  XVIII:
    "Symptoms, signs and abnormal clinical and laboratory findings, not elsewhere classified",
  XIX: "Injury, poisoning and certain other consequences of external causes",
  XX: "External causes of morbidity and mortality",
  XXI: "Factors influencing health status and contact with health services",
  XXII: "Codes for special purposes",
};
