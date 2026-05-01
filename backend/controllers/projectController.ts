import { Request, Response } from "express";
import mongoose from "mongoose";
import { Project } from "../models/index.js";
import { Comment } from "../models/index.js";

export const getProjects = async (_req: Request, res: Response) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).send("Database not connected.");
  }
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

export const createProject = async (req: Request, res: Response) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).send("Database not connected.");
  }
  try {
    const project = new Project(req.body);
    if (req.body.url) {
      project.thumbnailUrl = `https://s.wordpress.com/mshots/v1/${encodeURIComponent(req.body.url)}?w=600`;
    }
    await project.save();
    res.json(project);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    if (updates.url) {
      updates.thumbnailUrl = `https://s.wordpress.com/mshots/v1/${encodeURIComponent(updates.url)}?w=600`;
    }
    const project = await Project.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(project);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    // Cascade: delete all comments for this project
    await Comment.deleteMany({ projectId: req.params.id });
    await Project.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};
