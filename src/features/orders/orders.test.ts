import { describe, it, expect, beforeEach, vi } from "vitest";
import Stripe from "stripe";
import { OrderService } from "./orders.service";
import { Order, IOrder } from "./orders.model";
import { Product } from "../products/products.model";
import { logger } from "../../utils/logger";
import { NotFoundError } from "../../utils/errors";

// Mock dependencies
vi.mock("./orders.model");
vi.mock("../products/products.model");
vi.mock("../../utils/logger");
vi.mock("stripe");
vi.mock("../../config/env", () => ({
  env: {
    STRIPE_SECRET_KEY: "sk_test_mock",
    FRONTEND_URL: "http://localhost:3000",
  },
}));

const mockedOrder = Order as unknown as typeof Order & {
  create: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
};
const mockedProduct = Product as unknown as typeof Product & {
  find: ReturnType<typeof vi.fn>;
  findByIdAndUpdate: ReturnType<typeof vi.fn>;
};
const mockedLogger = logger as unknown as typeof logger & {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
};
const mockedStripe = Stripe as unknown as jest.MockedClass<typeof Stripe>;

describe("OrderService", () => {
  let orderService: OrderService;
  let mockStripeInstance: jest.Mocked<Stripe>;

  beforeEach(() => {
    orderService = new OrderService();
    vi.clearAllMocks();

    // Create a mock Stripe instance
    mockStripeInstance = {
      checkout: {
        sessions: {
          create: vi.fn(),
          retrieve: vi.fn(),
        },
      },
    } as unknown as jest.Mocked<Stripe>;

    (mockedStripe as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => mockStripeInstance,
    );
  });

  describe("createCheckoutSession", () => {
    it("should create a checkout session successfully", async () => {
      const userId = "user123";
      const items = [
        { productId: "prod1", quantity: 2 },
        { productId: "prod2", quantity: 1 },
      ];

      const products = [
        { _id: "prod1", name: "Product 1", price: 50 },
        { _id: "prod2", name: "Product 2", price: 100 },
      ] as unknown as IOrder["items"];

      const mockOrder = {
        _id: "order123",
        user: userId,
        items: [
          { product: "prod1", name: "Product 1", price: 50, quantity: 2 },
          { product: "prod2", name: "Product 2", price: 100, quantity: 1 },
        ],
        totalAmount: 200,
        status: "pending",
        save: vi.fn().mockResolvedValue({}),
      } as unknown as IOrder;

      const mockSession = {
        id: "sess_123",
        url: "https://checkout.stripe.com/sess_123",
      };

      (mockedProduct.find as ReturnType<typeof vi.fn>).mockResolvedValue(
        products as never,
      );
      (mockedOrder.create as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockOrder,
      );
      mockStripeInstance.checkout.sessions.create.mockResolvedValue(
        mockSession as never,
      );

      const result = await orderService.createCheckoutSession(userId, items);

      expect(mockedProduct.find).toHaveBeenCalledWith({
        _id: { $in: ["prod1", "prod2"] },
      });
      expect(mockedOrder.create).toHaveBeenCalledWith({
        user: userId,
        items: expect.arrayContaining([
          expect.objectContaining({ product: "prod1" }),
          expect.objectContaining({ product: "prod2" }),
        ]),
        totalAmount: 200,
        status: "pending",
      });
      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalled();
      expect(mockOrder.save).toHaveBeenCalled();
      expect(result.order).toEqual(mockOrder);
      expect(result.sessionUrl).toBe(mockSession.url);
    });

    it("should throw NotFoundError if products not found", async () => {
      const userId = "user123";
      const items = [{ productId: "prod1", quantity: 2 }];

      (mockedProduct.find as ReturnType<typeof vi.fn>).mockResolvedValue(
        [] as never,
      );

      await expect(
        orderService.createCheckoutSession(userId, items),
      ).rejects.toThrow(NotFoundError);
      await expect(
        orderService.createCheckoutSession(userId, items),
      ).rejects.toThrow("One or more products not found");
    });
  });

  describe("handlePaymentSuccess", () => {
    it("should mark order as paid and reduce stock", async () => {
      const sessionId = "sess_123";
      const paymentIntentId = "pi_123";

      const mockSession = {
        payment_intent: paymentIntentId,
      };

      const mockOrder = {
        _id: "order123",
        stripeSessionId: sessionId,
        status: "pending",
        items: [
          { product: "prod1", quantity: 2 },
          { product: "prod2", quantity: 1 },
        ],
        save: vi.fn().mockResolvedValue({}),
      } as unknown as IOrder;

      mockStripeInstance.checkout.sessions.retrieve.mockResolvedValue(
        mockSession as never,
      );
      (mockedOrder.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockOrder,
      );
      (
        mockedProduct.findByIdAndUpdate as ReturnType<typeof vi.fn>
      ).mockResolvedValue({} as never);

      const result = await orderService.handlePaymentSuccess(sessionId);

      expect(mockStripeInstance.checkout.sessions.retrieve).toHaveBeenCalledWith(
        sessionId,
      );
      expect(mockedOrder.findOne).toHaveBeenCalledWith({
        stripeSessionId: sessionId,
      });
      expect(mockedProduct.findByIdAndUpdate).toHaveBeenCalledTimes(2);
      expect(mockOrder.status).toBe("paid");
      expect(mockOrder.stripePaymentIntentId).toBe(paymentIntentId);
      expect(mockOrder.save).toHaveBeenCalled();
      expect(result).toEqual(mockOrder);
    });

    it("should handle already paid order (idempotency)", async () => {
      const sessionId = "sess_123";

      const mockSession = {
        payment_intent: "pi_123",
      };

      const mockOrder = {
        _id: "order123",
        stripeSessionId: sessionId,
        status: "paid",
        save: vi.fn().mockResolvedValue({}),
      } as unknown as IOrder;

      mockStripeInstance.checkout.sessions.retrieve.mockResolvedValue(
        mockSession as never,
      );
      (mockedOrder.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockOrder,
      );

      const result = await orderService.handlePaymentSuccess(sessionId);

      expect(mockedLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("already marked as paid"),
      );
      expect(mockOrder.save).not.toHaveBeenCalled();
      expect(result).toEqual(mockOrder);
    });

    it("should throw NotFoundError if order not found", async () => {
      const sessionId = "sess_nonexistent";

      const mockSession = {
        payment_intent: "pi_123",
      };

      mockStripeInstance.checkout.sessions.retrieve.mockResolvedValue(
        mockSession as never,
      );
      (mockedOrder.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        orderService.handlePaymentSuccess(sessionId),
      ).rejects.toThrow(NotFoundError);
      await expect(
        orderService.handlePaymentSuccess(sessionId),
      ).rejects.toThrow(`Order not found for session ${sessionId}`);
    });
  });

  describe("getUserOrders", () => {
    it("should return orders for a specific user", async () => {
      const userId = "user123";
      const orders = [
        { _id: "order1", user: userId, totalAmount: 100 },
        { _id: "order2", user: userId, totalAmount: 200 },
      ] as IOrder[];

      (mockedOrder.find as ReturnType<typeof vi.fn>).mockReturnValue({
        sort: vi.fn().mockResolvedValue(orders),
      } as never);

      const result = await orderService.getUserOrders(userId);

      expect(mockedOrder.find).toHaveBeenCalledWith({ user: userId });
      expect(result).toEqual(orders);
    });

    it("should return empty array if no orders found", async () => {
      (mockedOrder.find as ReturnType<typeof vi.fn>).mockReturnValue({
        sort: vi.fn().mockResolvedValue([]),
      } as never);

      const result = await orderService.getUserOrders("nonexistent");

      expect(result).toEqual([]);
    });
  });

  describe("getAllOrders", () => {
    it("should return all orders with populated user data", async () => {
      const orders = [
        {
          _id: "order1",
          user: { name: "John", email: "john@example.com" },
          totalAmount: 100,
        },
        {
          _id: "order2",
          user: { name: "Jane", email: "jane@example.com" },
          totalAmount: 200,
        },
      ] as IOrder[];

      (mockedOrder.find as ReturnType<typeof vi.fn>).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          sort: vi.fn().mockResolvedValue(orders),
        }),
      } as never);

      const result = await orderService.getAllOrders();

      expect(mockedOrder.find).toHaveBeenCalled();
      expect(result).toEqual(orders);
    });

    it("should return empty array if no orders exist", async () => {
      (mockedOrder.find as ReturnType<typeof vi.fn>).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          sort: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      const result = await orderService.getAllOrders();

      expect(result).toEqual([]);
    });
  });
});
