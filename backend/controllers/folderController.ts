import { Request, Response } from "express";
import mongoose from "mongoose";
import { Folder } from "../models/index.ts";
import { Project } from "../models/index.ts";
import { Comment } from "../models/index.ts";

export const getFolders = async (_req: Request, res: Response) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).send("Database not connected. Please start MongoDB.");
  }
  try {
    const folders = await Folder.find().sort({ createdAt: -1 });
    res.json(folders);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

export const createFolder = async (req: Request, res: Response) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).send("Database not connected. Please start MongoDB.");
  }
  try {
    const folder = new Folder(req.body);
    await folder.save();
    res.json(folder);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

export const updateFolder = async (req: Request, res: Response) => {
  try {
    const folder = await Folder.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(folder);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

export const deleteFolder = async (req: Request, res: Response) => {
  try {
    // Cascade: delete all projects in this folder and their comments
    const projects = await Project.find({ folderId: req.params.id });
    const projectIds = projects.map((p) => p._id.toString());
    await Comment.deleteMany({ projectId: { $in: projectIds } });
    await Project.deleteMany({ folderId: req.params.id });
    await Folder.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};
