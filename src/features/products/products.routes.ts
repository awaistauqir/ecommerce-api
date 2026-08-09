import { Router } from "express";
import { productController } from "./products.controller";
import { authorize, protect } from "../../middleware/auth.middleware";
import { cache } from "../../middleware/cache.middleware";
import { validate } from "../../middleware/validate.middleware";
import { upload } from "../../middleware/upload.middleware";
import {
  createProductSchema,
  updateProductSchema,
  getProductsQuerySchema,
} from "./products.schema";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: API for managing products
 */

// ==========================================================
// POST /api/v1/products
// ==========================================================
/**
 * @swagger
 * /api/v1/products:
 *   post:
 *     summary: Create a new product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, description, price, category]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               category: { type: string }
 *               stock: { type: integer }
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Product image file (max 5MB)
 *     responses:
 *       201: { description: Product created successfully }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden - Admin access required }
 */
router.post(
  "/",
  protect,
  authorize("admin"),
  upload.single("image"), // 1. Multer handles the file
  validate(createProductSchema), // 2. Zod validates AND coerces strings to numbers
  productController.createProduct, // 3. Controller receives perfectly typed data
);

// ==========================================================
// GET /api/v1/products
// ==========================================================
/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Get all products with pagination, filtering, and search
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 100 }
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, default: "createdAt" }
 *         description: Field to sort by (e.g., price, name, createdAt)
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: "desc" }
 *         description: Sort order
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search term for product name or description
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Filter by exact category name
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *         description: Maximum price filter
 *       - in: query
 *         name: inStock
 *         schema: { type: boolean }
 *         description: Set to true to show only items with stock > 0
 *     responses:
 *       200:
 *         description: Paginated list of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { type: object }
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage: { type: integer }
 *                     totalPages: { type: integer }
 *                     totalItems: { type: integer }
 *                     itemsPerPage: { type: integer }
 *                     hasNextPage: { type: boolean }
 *                     hasPrevPage: { type: boolean }
 *       400: { description: Validation error }
 */
router.get(
  "/",
  validate(getProductsQuerySchema), // Validate query params before caching/handling
  cache(60),
  productController.getAllProducts,
);

// ==========================================================
// GET /api/v1/products/slug/:slug
// ==========================================================
/**
 * @swagger
 * /api/v1/products/slug/{slug}:
 *   get:
 *     summary: Get a single product by its SEO-friendly slug
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         description: The URL-friendly slug of the product
 *     responses:
 *       200: { description: Product details }
 *       404: { description: Product not found }
 */
router.get("/slug/:slug", cache(300), productController.getProductBySlug);

// ==========================================================
// PUT /api/v1/products/:id
// ==========================================================
/**
 * @swagger
 * /api/v1/products/{id}:
 *   put:
 *     summary: Update an existing product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               category: { type: string }
 *               stock: { type: integer }
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200: { description: Product updated successfully }
 *       400: { description: Validation error }
 *       404: { description: Product not found }
 */
router.put(
  "/:id",
  protect,
  authorize("admin"),
  upload.single("image"),
  validate(updateProductSchema),
  productController.updateProduct,
);

// ==========================================================
// DELETE /api/v1/products/:id
// ==========================================================
/**
 * @swagger
 * /api/v1/products/{id}:
 *   delete:
 *     summary: Delete a product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Product ID
 *     responses:
 *       200: { description: Product deleted successfully }
 *       404: { description: Product not found }
 */
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  productController.deleteProduct,
);

export default router;
