import { Router } from "express";
import { productController } from "./products.controller";
import { authorize, protect } from "../../middleware/auth.middleware";

const router = Router();

// POST /api/v1/products
/**
 * @swagger
 * tags:
 *   name: Products
 *   description: API for managing products
 */

/**
 * @swagger
 * /api/v1/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price, category, stock]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               category: { type: string }
 *               stock: { type: integer }
 *     responses:
 *       201: { description: Product created successfully }
 *       500: { description: Internal server error }
 */
router.post("/", protect, productController.createProduct);

// GET /api/v1/products
/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: A list of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count: { type: integer }
 *                 data: { type: array, items: { type: object } }
 */
router.get("/", productController.getAllProducts);

export const productRoutes = router;
export default router;
