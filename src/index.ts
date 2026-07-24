import { env } from "./config/env";
import { connectDB } from "./config/db";
import app from "./app";

const PORT = env.PORT;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(
        `🚀 Server running in ${env.NODE_ENV} mode on http://localhost:${PORT}`,
      );
      console.log(
        `📦 Products API available at http://localhost:${PORT}/api/v1/products`,
      );
      console.log(
        `📚 API Documentation available at http://localhost:${PORT}/api-docs`,
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
