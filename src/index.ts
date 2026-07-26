import { env } from "./config/env";
import { connectDB } from "./config/db";
import app from "./app";
import { logger } from "./utils/logger";

const PORT = env.PORT;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      // Use logger instead of console.log
      logger.info(
        `🚀 Server running in ${env.NODE_ENV} mode on http://localhost:${PORT}`,
      );
      logger.info(
        `📦 Products API available at http://localhost:${PORT}/api/v1/products`,
      );
      logger.info(
        `📚 Swagger docs available at http://localhost:${PORT}/api-docs`,
      );
    });
  } catch (error) {
    // Use logger.error instead of console.error
    logger.error({ err: error }, "Failed to start server");
    process.exit(1);
  }
}

startServer();
