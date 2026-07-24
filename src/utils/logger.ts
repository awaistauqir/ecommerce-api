import pino from "pino";
import { env } from "../config/env";

export const logger = pino({
  // In dev, show debug logs. In prod, only show info and above.
  level: env.NODE_ENV === "development" ? "debug" : "info",

  // In development, use pino-pretty for colored, readable logs.
  // In production, output raw JSON (transport is undefined).
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        }
      : undefined,
});
