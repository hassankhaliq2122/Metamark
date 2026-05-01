import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, default: "" },
  folderId: { type: String, required: true },
  ownerId: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
  isPublic: { type: Boolean, default: true },
  thumbnailUrl: { type: String },
});

export const Project = mongoose.model("Project", projectSchema);
