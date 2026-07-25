import Redis from "ioredis";
import { env } from "./env";
import { logger } from "../utils/logger";

export const redis = new Redis(env.REDIS_URL, {
  retryStrategy(times) {
    // If Redis is down, don't crash the app. Just wait and retry.
    if (times > 3) {
      logger.warn(
        "⚠️ Redis connection failed after 3 attempts. Running without cache.",
      );
      return null; // Stop retrying, let the app run without cache
    }
    return Math.min(times * 200, 2000); // Retry with exponential backoff
  },
});

redis.on("connect", () => logger.info("✅ Redis Connected"));
redis.on("error", (err) => logger.error({ err }, "❌ Redis Connection Error"));
