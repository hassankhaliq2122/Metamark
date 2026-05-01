import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import connectDB from "./config/db.js";
import { uploadDir } from "./middlewares/upload.js";
import { proxyAsset } from "./controllers/assetProxyController.js";

// Routes
import folderRoutes from "./routes/folderRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import proxyRoutes from "./routes/proxyRoutes.js";
import replyRoutes from "./routes/replyRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middleware - allow all origins for proxy to work
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

// Serve static files
app.use("/uploads", express.static(uploadDir));

// API Routes
app.use("/api/folders", folderRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/proxy", proxyRoutes);
app.use("/api/comments", replyRoutes);

// Serve Frontend in Production
if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(process.cwd(), "../frontend/dist");
  app.use(express.static(frontendPath));
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(frontendPath, "index.html"));
    }
  });
} else {
  // Development catch-all: proxy dynamic imports/assets from SPAs
  // When a proxied SPA (React/Vite app) dynamically imports chunks like
  // /assets/McpServer-abc.js, the request comes here with a Referer header
  // pointing to the original proxied URL so we can resolve the correct origin.
  app.get(/^\/(assets|static|_next|chunks|js|css|fonts|images|media|public)\//, proxyAsset);
  app.get(/\.(js|mjs|css|woff|woff2|ttf|eot|svg|png|jpg|jpeg|gif|ico|json|map)$/, proxyAsset);
}

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
