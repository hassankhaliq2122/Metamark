import { Router } from "express";
import { getProjects, createProject, updateProject, deleteProject } from "../controllers/projectController.ts";

const router = Router();

router.get("/", getProjects);
router.post("/", createProject);
router.patch("/:id", updateProject);
router.delete("/:id", deleteProject);

export default router;
