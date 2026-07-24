import mongoose from "mongoose";
import { env } from "./env";

export async function connectDB() {
  try {
    // 1. Connect to MongoDB
    const conn = await mongoose.connect(env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // 2. Listen for connection errors during runtime
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB runtime connection error:", err);
    });

    // 3. Listen for disconnections
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected.");
    });

    // 4. Graceful Shutdown (Pro-level best practice)
    // If the server is stopped (e.g., Ctrl+C), close the DB connection cleanly
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("🔒 MongoDB connection closed due to app termination");
      process.exit(0);
    });
  } catch (error) {
    // 5. Fail Fast: If the initial connection fails, crash the app immediately
    console.error("❌ MongoDB initial connection error:", error);
    process.exit(1);
  }
}
