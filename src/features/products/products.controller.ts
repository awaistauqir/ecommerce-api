import { Request, Response, NextFunction } from "express";
import { productService } from "./products.service";

export class ProductController {
  // POST /api/v1/products
  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.createProduct(req.body);
      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: product,
      });
    } catch (error) {
      next(error); // Pass errors to our global error handler (we will build this later)
    }
  }

  // GET /api/v1/products
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
