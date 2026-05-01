import { Router } from "express";
import { summarize } from "../controllers/aiController.ts";

const router = Router();

router.post("/summarize", summarize);

export default router;
