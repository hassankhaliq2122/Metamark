import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/metamark";

  // Append database name if not present in Atlas URI
  const mongoUri = MONGODB_URI.includes("mongodb.net/") && !MONGODB_URI.includes("mongodb.net/metamark")
    ? MONGODB_URI.replace("mongodb.net/", "mongodb.net/metamark")
    : MONGODB_URI.includes("mongodb.net/?")
      ? MONGODB_URI.replace("mongodb.net/?", "mongodb.net/metamark?")
      : MONGODB_URI;

  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB:", mongoUri.replace(/\/\/.*@/, "//***@"));
  } catch (err: any) {
    console.error("MongoDB connection error:", err.message);
  }
};

export default connectDB;
