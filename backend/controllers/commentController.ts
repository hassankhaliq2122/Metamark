import { Request, Response } from "express";
import { Comment } from "../models/index.js";

export const getComments = async (req: Request, res: Response) => {
  try {
    const comments = await Comment.find({ projectId: req.params.projectId }).sort({ createdAt: 1 });
    res.json(comments);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

export const createComment = async (req: Request, res: Response) => {
  try {
    const comment = new Comment(req.body);
    await comment.save();
    res.json(comment);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

export const updateComment = async (req: Request, res: Response) => {
  try {
    const comment = await Comment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(comment);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    await Comment.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};
