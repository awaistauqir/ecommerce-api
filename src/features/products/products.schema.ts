import { z } from "zod";

/**
 * Schema for creating a new product
 * Used in POST /api/v1/products
 */
export const createProductSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Product name must be at least 2 characters")
      .max(100, "Product name cannot exceed 100 characters"),

    description: z
      .string()
      .min(10, "Description must be at least 10 characters")
      .max(2000, "Description cannot exceed 2000 characters"),

    price: z.coerce
      .number()
      .positive("Price must be a positive number")
      .min(0.01, "Price must be at least $0.01"),

    category: z
      .string()
      .min(2, "Category must be at least 2 characters")
      .max(50, "Category cannot exceed 50 characters"),

    stock: z.coerce
      .number()
      .int("Stock must be an integer")
      .min(0, "Stock cannot be negative")
      .default(0),

    images: z
      .array(z.string().url("Each image must be a valid URL"))
      .max(5, "Maximum 5 images allowed")
      .optional(),
  }),
});

/**
 * Schema for updating a product
 * All fields are optional (partial update)
 * Used in PUT /api/v1/products/:id
 */
export const updateProductSchema = z.object({
  body: createProductSchema.shape.body.partial(),
});

/**
 * Schema for product query parameters (pagination, filters, search)
 * Used in GET /api/v1/products
 */
export const getProductsQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .pipe(z.number().int().min(1, "Page must be at least 1")),

    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .pipe(z.number().int().min(1).max(100, "Limit cannot exceed 100")),

    sortBy: z.string().optional().default("createdAt"),

    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),

    search: z.string().optional(),

    category: z.string().optional(),

    minPrice: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined))
      .pipe(z.number().positive().optional()),

    maxPrice: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined))
      .pipe(z.number().positive().optional()),

    inStock: z
      .string()
      .optional()
      .transform((val) => val === "true"),
  }),
});

// Type inference from schemas
export type CreateProductInput = z.infer<typeof createProductSchema>["body"];
export type UpdateProductInput = z.infer<typeof updateProductSchema>["body"];
export type GetProductsQuery = z.infer<typeof getProductsQuerySchema>["query"];
