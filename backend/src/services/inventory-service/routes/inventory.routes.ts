import { Router } from "express";
import {
  getAllInventoryItems,
  getInventoryItemById,
  createInventoryItem,
} from "../controllers/inventory.controller";

const router = Router();

router.get("/", getAllInventoryItems);
router.get("/:id", getInventoryItemById);
router.post("/", createInventoryItem);

export default router;
