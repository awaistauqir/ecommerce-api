import { Request, Response, NextFunction } from "express";
import { orderService, stripe } from "./orders.service";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { IOrder } from "./orders.model";

export class OrderController {
  // POST /api/v1/orders/checkout
  async createCheckoutSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId; // From our auth middleware
      const { items } = req.body; // [{ productId, quantity }]

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Items array is required",
        });
      }

      const { order, sessionUrl } = await orderService.createCheckoutSession(
        userId,
        items,
      );

      res.status(201).json({
        success: true,
        data: {
          orderId: order._id,
          totalAmount: order.totalAmount,
          checkoutUrl: sessionUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/orders
  async getUserOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const orders = await orderService.getUserOrders(userId);

      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/webhooks/stripe
  async handleStripeWebhook(req: Request, res: Response, next: NextFunction) {
    const sig = req.headers["stripe-signature"] as string;
    const rawBody = (req as any).rawBody;

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err: any) {
      logger.error({ err }, "❌ Webhook signature verification failed");
      return res.status(400).json({
        success: false,
        message: `Webhook Error: ${err.message}`,
      });
    }

    logger.info(`📩 Received Stripe event: ${event.type}`);

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await orderService.handlePaymentSuccess(event.data.object.id);
          break;
        case "checkout.session.expired":
          logger.warn(`Session ${event.data.object.id} expired`);
          break;
        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }
      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }
  async getAllOrders(req: Request, res: Response, next: NextFunction) {
    try {
      // Note: We will protect this route with the 'authorize("admin")' middleware
      const orders = await orderService.getAllOrders();

      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();
