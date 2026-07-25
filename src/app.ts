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

const app = express();

// 1. Core Middleware
app.use(express.json({ limit: "10kb" }));
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

// 6. 404 Handler (with debug log)
app.use((req: Request, res: Response) => {
  console.log(`⚠️ 404 Handler caught request for: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// 7. Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("🔥 Error:", err.message);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: env.NODE_ENV === "development" ? err.message : undefined,
  });
});

export default app;
