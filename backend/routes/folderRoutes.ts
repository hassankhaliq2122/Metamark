import { Router } from "express";
import { getFolders, createFolder, updateFolder, deleteFolder } from "../controllers/folderController.ts";

const router = Router();

router.get("/", getFolders);
router.post("/", createFolder);
router.patch("/:id", updateFolder);
router.delete("/:id", deleteFolder);

export default router;
