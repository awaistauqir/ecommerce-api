import { Router } from "express";
import { usersController } from "./users.controller";
import { protect } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import { updateProfileSchema, updatePasswordSchema } from "./users.schema";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: API for user profile management
 */

/**
 * @swagger
 * /api/v1/users/me:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     name: { type: string }
 *                     email: { type: string }
 *                     role: { type: string }
 *       401: { description: Unauthorized - No token provided }
 *       404: { description: User not found }
 */
router.get("/me", protect, usersController.getProfile);

/**
 * @swagger
 * /api/v1/users/me:
 *   patch:
 *     summary: Update current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "John Doe" }
 *               email: { type: string, format: email, example: "john@example.com" }
 *     responses:
 *       200: { description: Profile updated successfully }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       409: { description: Email already registered }
 */
router.patch(
  "/me",
  protect,
  validate(updateProfileSchema),
  usersController.updateProfile
);

/**
 * @swagger
 * /api/v1/users/me/password:
 *   patch:
 *     summary: Update current user's password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword, confirmPassword]
 *             properties:
 *               currentPassword: { type: string, example: "oldpassword123" }
 *               newPassword: { type: string, example: "newpassword123" }
 *               confirmPassword: { type: string, example: "newpassword123" }
 *     responses:
 *       200: { description: Password updated successfully }
 *       400: { description: Validation error or passwords do not match }
 *       401: { description: Unauthorized or current password incorrect }
 */
router.patch(
  "/me/password",
  protect,
  validate(updatePasswordSchema),
  usersController.updatePassword
);

export default router;
