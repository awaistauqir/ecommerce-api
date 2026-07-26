import { Router } from "express";
import { orderController } from "./orders.controller";
import { protect } from "../../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management and Stripe payments
 */

// Protected routes (must be logged in)
router.use(protect);

/**
 * @swagger
 * /api/v1/orders/checkout:
 *   post:
 *     summary: Create a Stripe checkout session
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId: { type: string }
 *                     quantity: { type: integer }
 *     responses:
 *       201: { description: Checkout session created }
 */
router.post("/checkout", orderController.createCheckoutSession);

/**
 * @swagger
 * /api/v1/orders:
 *   get:
 *     summary: Get current user's orders
 *     tags: [Orders]
 *     responses:
 *       200: { description: List of orders }
 */
router.get("/", orderController.getUserOrders);

export { router as orderRoutes };
