import { Schema, model, Document } from "mongoose";

// 1. Define an interface for TypeScript type safety
export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 2. Define the Mongoose Schema
const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    imageUrl: { type: String },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  },
);

// 3. Export the Model
export const Product = model<IProduct>("Product", productSchema);
