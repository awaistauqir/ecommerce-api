import Stripe from "stripe";
import { env } from "../../config/env";
import { Order, IOrder } from "./orders.model";
import { Product } from "../products/products.model";
import { logger } from "../../utils/logger";

// Initialize Stripe
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-06-24.dahlia", // Use the latest version
});

export class OrderService {
  /**
   * Create a pending order and generate a Stripe Checkout Session
   */
  async createCheckoutSession(
    userId: string,
    items: { productId: string; quantity: number }[],
  ): Promise<{ order: IOrder; sessionUrl: string }> {
    // 1. Fetch product details from DB
    const products = await Product.find({
      _id: { $in: items.map((i) => i.productId) },
    });

    if (products.length !== items.length) {
      throw new Error("One or more products not found");
    }

    // 2. Build order items and calculate total
    const orderItems = items.map((item) => {
      const product = products.find(
        (p) => p._id.toString() === item.productId,
      )!;
      return {
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      };
    });

    const totalAmount = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // 3. Create the pending order in our database
    const order = await Order.create({
      user: userId,
      items: orderItems,
      totalAmount,
      status: "pending",
    });

    // 4. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: orderItems.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100), // Stripe uses cents!
        },
        quantity: item.quantity,
      })),
      metadata: {
        orderId: order._id.toString(),
      },
      success_url: `${env.FRONTEND_URL}/orders/${order._id}/success`,
      cancel_url: `${env.FRONTEND_URL}/orders/${order._id}/cancel`,
    });

    // 5. Save the Stripe session ID to our order
    order.stripeSessionId = session.id;
    await order.save();

    logger.info(`🛒 Created checkout session for order ${order._id}`);

    return { order, sessionUrl: session.url! };
  }

  /**
   * Handle successful payment from Stripe Webhook
   */
  async handlePaymentSuccess(sessionId: string): Promise<IOrder> {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const order = await Order.findOne({ stripeSessionId: sessionId });

    if (!order) {
      throw new Error(`Order not found for session ${sessionId}`);
    }

    // Idempotency check: Prevent processing the same webhook twice
    if (order.status === "paid") {
      logger.warn(`Order ${order._id} already marked as paid. Skipping.`);
      return order;
    }

    // 🚀 NEW: Reduce stock for each item in the order
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } }, // Safely decrement stock
        { new: true },
      );
    }
    logger.info(
      `📦 Stock reduced for ${order.items.length} items in order ${order._id}`,
    );

    // Update order status
    order.status = "paid";
    order.stripePaymentIntentId = session.payment_intent as string;
    await order.save();

    logger.info(`💰 Order ${order._id} marked as PAID`);
    return order;
  }

  /**
   * Get orders for a specific user
   */
  async getUserOrders(userId: string): Promise<IOrder[]> {
    return await Order.find({ user: userId }).sort({ createdAt: -1 });
  }

  /**
   * Get all orders (Admin only)
   */
  async getAllOrders(): Promise<IOrder[]> {
    // Populate the user field so the admin can see who bought what
    return await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });
  }
}

export const orderService = new OrderService();
