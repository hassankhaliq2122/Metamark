import { Request, Response } from "express";
import { Comment } from "../models/index.ts";

// Add a reply to a comment
export const addReply = async (req: Request, res: Response) => {
  try {
    const { authorId, authorName, text } = req.body;
    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          replies: {
            authorId,
            authorName,
            text,
            createdAt: new Date().toISOString(),
          },
        },
      },
      { new: true }
    );
    if (!comment) return res.status(404).send("Comment not found");
    res.json(comment);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};
