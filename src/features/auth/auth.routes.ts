import { Router } from "express";
import { authController } from "./auth.controller";
import { validate } from "../../middleware/validate.middleware";
import { authRateLimiter } from "../../middleware/ratelimit.middleware";
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, resendVerificationSchema } from "./auth.schema";

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

/**
 * @swagger
 * /api/v1/auth/verify-email:
 *   get:
 *     summary: Verify user's email address
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Email verification token
 *     responses:
 *       200: { description: Email verified successfully }
 *       400: { description: Invalid or missing token }
 */
router.get("/verify-email", authController.verifyEmail);

/**
 * @swagger
 * /api/v1/auth/resend-verification:
 *   post:
 *     summary: Resend email verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email, example: "john@example.com" }
 *     responses:
 *       200: { description: Verification email sent }
 *       404: { description: User not found }
 */
router.post(
  "/resend-verification",
  authRateLimiter,
  validate(resendVerificationSchema),
  authController.resendVerification,
);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email, example: "john@example.com" }
 *     responses:
 *       200: { description: Password reset email sent (if account exists) }
 */
router.post(
  "/forgot-password",
  authRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password using token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string, example: "abc123..." }
 *               password: { type: string, format: password, example: "newpassword123" }
 *     responses:
 *       200: { description: Password reset successfully }
 *       400: { description: Invalid or expired token }
 */
router.post(
  "/reset-password",
  authRateLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

export default router;
