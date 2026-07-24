import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { httpRequestDuration, httpRequestsTotal } from "../utils/metrics";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Listen for the response to finish
  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const durationSec = durationMs / 1000;

    const { method, originalUrl, ip } = req;
    const { statusCode } = res;

    // Clean up the URL for metrics (remove query strings)
    const path = originalUrl.split("?")[0];

    // 1. Log the request using our structured logger
    logger.info(
      {
        http: {
          method,
          url: originalUrl,
          status_code: statusCode,
        },
        duration_ms: durationMs,
        client_ip: ip,
      },
      "HTTP Request Completed",
    );

    // 2. Increment the total requests counter
    httpRequestsTotal.inc({ method, path, status: statusCode.toString() });

    // 3. Observe the request duration
    httpRequestDuration.observe(
      { method, path, status: statusCode.toString() },
      durationSec,
    );
  });

  next();
}
