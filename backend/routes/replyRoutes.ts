import express from "express";
import { addReply } from "../controllers/replyController.ts";

const router = express.Router();

router.post("/:id/replies", addReply);

export default router;
