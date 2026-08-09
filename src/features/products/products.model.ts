import { Schema, model, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  slug: string; // NEW: SEO-friendly URL
  description: string;
  price: number;
  category: string;
  stock: number;
  imageUrl?: string;
  images?: string[]; // NEW: Support multiple images
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true, // Index for faster lookups
    },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    imageUrl: { type: String }, // Keep for backward compatibility
    images: [{ type: String }], // NEW: Array of image URLs
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete (ret as any).__v;
      },
    },
  },
);

// Pre-save hook to auto-generate slug if name changes
productSchema.pre("save", async function () {
  if (this.isModified("name") || !this.slug) {
    const { generateUniqueSlug } = await import("../../utils/slug.js");
    this.slug = await generateUniqueSlug(
      this.constructor,
      this.name,
      this._id?.toString(),
    );
  }
});

export const Product = model<IProduct>("Product", productSchema);
