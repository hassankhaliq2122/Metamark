import express from "express";
import { addReply } from "../controllers/replyController.js";

const router = express.Router();

router.post("/:id/replies", addReply);

export default router;
