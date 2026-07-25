import { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis";
import { logger } from "../utils/logger";

export const cache = (durationInSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    // Create a unique key based on the URL (e.g., "cache:/api/v1/products")
    const key = `cache:${req.originalUrl}`;

    try {
      const cachedData = await redis.get(key);

      if (cachedData) {
        logger.info(`🚀 Cache HIT for ${req.originalUrl}`);
        return res.status(200).json(JSON.parse(cachedData));
      }

      logger.info(`💾 Cache MISS for ${req.originalUrl}. Fetching from DB...`);

      // Override the res.json method to save to cache before sending
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        // Save to Redis with an expiration time (SETEX)
        redis.setex(key, durationInSeconds, JSON.stringify(body));
        return originalJson(body);
      };

      next(); // Continue to the controller
    } catch (error) {
      // FAIL OPEN: If Redis crashes, we still want the API to work via MongoDB
      logger.error({ err: error }, "Redis cache error, falling back to DB");
      next();
    }
  };
};
