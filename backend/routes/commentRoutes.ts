import { Router } from "express";
import { getComments, createComment, updateComment, deleteComment } from "../controllers/commentController.js";

const router = Router();

router.get("/:projectId", getComments);
router.post("/", createComment);
router.patch("/:id", updateComment);
router.delete("/:id", deleteComment);

export default router;
