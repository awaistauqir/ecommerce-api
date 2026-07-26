import { Router } from "express";
import { authController } from "./auth.controller";
import { validate } from "../../middleware/validate.middleware";
import { authRateLimiter } from "../../middleware/ratelimit.middleware";
import { loginSchema, registerSchema } from "./auth.schema";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: API for user authentication
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: "John Doe" }
 *               email: { type: string, format: email, example: "john@example.com" }
 *               password: { type: string, format: password, example: "secret123" }
 *     responses:
 *       201: { description: User registered successfully }
 *       400: { description: Validation error }
 */
router.post(
  "/register",
  authRateLimiter,
  validate(registerSchema),
  authController.register,
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login and receive access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: "john@example.com" }
 *               password: { type: string, format: password, example: "secret123" }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 */
router.post(
  "/login",
  authRateLimiter,
  validate(loginSchema),
  authController.login,
);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string, example: "eyJhbGciOiJIUzI1NiIs..." }
 *     responses:
 *       200: { description: New access token issued }
 *       401: { description: Invalid or expired refresh token }
 */
router.post("/refresh", authController.refresh);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout and invalidate refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string, example: "eyJhbGciOiJIUzI1NiIs..." }
 *     responses:
 *       200: { description: Logged out successfully }
 *       401: { description: Invalid refresh token }
 */
router.post("/logout", authController.logout);

export default router;
