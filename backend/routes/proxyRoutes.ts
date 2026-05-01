import { Router } from "express";
import { proxyRequest } from "../controllers/proxyController.js";

const router = Router();

router.get("/", proxyRequest);

export default router;
