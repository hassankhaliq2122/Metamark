import mongoose from "mongoose";

const replySchema = new mongoose.Schema({
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

const commentSchema = new mongoose.Schema({
  projectId: { type: String, required: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  text: { type: String, default: "" },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  // Element anchor fields
  selector: { type: String },
  offsetXPct: { type: Number },
  offsetYPct: { type: Number },
  refW: { type: Number },
  refH: { type: Number },
  elementInfo: {
    tagName: String,
    id: String,
    className: String,
  },
  status: { type: String, enum: ["open", "resolved"], default: "open" },
  color: { type: String, default: "#3b82f6" },
  audioUrl: { type: String },
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number,
  }],
  replies: [replySchema],
  createdAt: { type: String, default: () => new Date().toISOString() },
});

export const Comment = mongoose.model("Comment", commentSchema);
