import { Router } from "express";
import { uploadFile } from "../controllers/uploadController.ts";
import { upload } from "../middlewares/upload.ts";

const router = Router();

router.post("/", upload.single("file"), uploadFile);

export default router;
