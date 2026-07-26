import { Router } from "express";
import { orderController } from "../orders/orders.controller";

const router = Router();

/**
 * @swagger
 * /api/v1/webhooks/stripe:
 *   post:
 *     summary: Stripe webhook endpoint (called by Stripe servers)
 *     tags: [Webhooks]
 *     responses:
 *       200: { description: Webhook received }
 */
router.post("/stripe", orderController.handleStripeWebhook);

export { router as webhookRoutes };
