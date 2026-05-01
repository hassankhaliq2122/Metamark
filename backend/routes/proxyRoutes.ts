import { Router } from "express";
import { proxyRequest } from "../controllers/proxyController.ts";

const router = Router();

router.get("/", proxyRequest);

export default router;
