import { Router } from "express";
import { summarize } from "../controllers/aiController.js";

const router = Router();

router.post("/summarize", summarize);

export default router;
