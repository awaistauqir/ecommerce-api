import { Request, Response, NextFunction } from "express";
import { productService } from "./products.service";
import { redis } from "../../config/redis";
import { logger } from "../../utils/logger";

export class ProductController {
  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.createProduct(req.body);

      // INVALIDATE CACHE: Delete the cached list of products so the next GET fetches fresh data
      await redis.del("cache:/api/v1/products");
      logger.info("🗑️ Cache invalidated for /api/v1/products");

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await productService.getAllProducts();
      res.status(200).json({
        success: true,
        count: products.length,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
