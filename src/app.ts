import express, { Request, Response, NextFunction } from "express";
import productRoutes from "./features/products/products.routes";
import { env } from "./config/env";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import authRoutes from "./features/auth/auth.routes";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import { requestLogger } from "./middleware/requestLogger.middleware";
import { register } from "./utils/metrics";
import { webhookRoutes } from "./features/webhooks/webhook.routes";
import { orderRoutes } from "./features/orders/orders.routes";
import userRoutes from "./features/users/users.routes";
import { logger } from "./utils/logger";
import path from "path";
import { AppError } from "./utils/errors";
import mongoose from "mongoose";

const app = express();

// 1. Core Middleware
app.use("/api/v1/webhooks", express.raw({ type: "application/json" }));
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.originalUrl.startsWith("/api/v1/webhooks")) {
    (req as any).rawBody = req.body;
  }
  next();
});
app.use(express.json({ limit: "10kb" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(helmet());

// CORS: Configure exactly who can talk to your API
const corsOptions = {
  // In production, only allow your actual frontend domain.
  // In dev, allow Vite (5173) and Swagger (3000).
  origin:
    env.NODE_ENV === "production"
      ? ["https://your-frontend-domain.com"]
      : ["http://localhost:5173", "http://localhost:3000"],
  credentials: true, // CRITICAL: Allows the browser to send our HTTP-only refresh token cookie
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(morgan("dev"));
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  if (req.query) mongoSanitize.sanitize(req.query);
  next();
});
app.use(requestLogger);
// 2. DEBUG ROUTE: Proves the server is reading this exact file
app.get("/debug-ping", (req: Request, res: Response) => {
  res.json({ message: "SUCCESS: Server is reading the new app.ts file!" });
});

// 3. Swagger Setup (Simplified to rule out config errors)
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "E-Commerce API",
      version: "1.0.0",
      description: "Test API",
    },
  },
  apis: ["./src/features/**/*.routes.ts"],
};

try {
  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log("✅ Swagger UI mounted at /api-docs");
} catch (error) {
  console.error("❌ Swagger setup failed:", error);
}

// 4. Health Check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "OK", environment: env.NODE_ENV });
});
// Prometheus Metrics Endpoint
app.get("/metrics", async (req: Request, res: Response) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end();
  }
});
// 5. Feature Routes
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/webhooks", webhookRoutes);

// 6. 404 Handler (with debug log)
app.use((req: Request, res: Response) => {
  console.log(`⚠️ 404 Handler caught request for: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// 7. Global Error Handler
// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log the full error internally (for debugging)
  logger.error(
    {
      err,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    },
    "Unhandled Error",
  );

  // Handle Mongoose validation errors
  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message).join(", ");
    return res.status(422).json({
      success: false,
      message: messages,
      code: "VALIDATION_ERROR",
    });
  }

  // Handle Mongoose duplicate key errors
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
      code: "DUPLICATE_KEY",
    });
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
      code: "CAST_ERROR",
    });
  }

  // Handle our custom AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
    });
  }

  // Determine the status code (default to 500)
  const statusCode = (err as any).statusCode || 500;

  // Build the response
  const errorResponse: any = {
    success: false,
    message: statusCode === 500 ? "Internal Server Error" : err.message,
  };

  // Only include stack trace in development
  if (env.NODE_ENV === "development") {
    errorResponse.stack = err.stack;
    errorResponse.error = err.message;
  }

  res.status(statusCode).json(errorResponse);
});

export default app;
