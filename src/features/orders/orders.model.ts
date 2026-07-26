import { Schema, model, Document, Types } from "mongoose";

export interface IOrderItem {
  product: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
}

export interface IOrder extends Document {
  user: Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  status: "pending" | "paid" | "failed" | "cancelled";
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
});

const orderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled"],
      default: "pending",
    },
    stripeSessionId: { type: String },
    stripePaymentIntentId: { type: String },
  },
  { timestamps: true },
);

export const Order = model<IOrder>("Order", orderSchema);
