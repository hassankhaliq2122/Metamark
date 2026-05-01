import mongoose from "mongoose";

const folderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ownerId: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

export const Folder = mongoose.model("Folder", folderSchema);
