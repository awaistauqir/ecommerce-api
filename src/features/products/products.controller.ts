import { Request, Response, NextFunction } from "express";
import { productService } from "./products.service";
import { redis } from "../../config/redis";
import { logger } from "../../utils/logger";
import { parsePaginationQuery } from "../../utils/pagination";
import cloudinary from "../../config/cloudinary";
import { NotFoundError } from "../../utils/errors";

export class ProductController {
  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const productData = { ...req.body };

      // 🚀 If image was uploaded, stream it to Cloudinary
      const file = req.file;
      if (file) {
        const uploadResult = (await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "ecommerce-api/products", // Keeps your Cloudinary dashboard organized
              resource_type: "auto",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          );

          // Stream the multer buffer to Cloudinary
          uploadStream.end(file.buffer);
        })) as any;

        // Attach the secure (HTTPS) URL to the product data
        productData.imageUrl = uploadResult.secure_url;
        productData.images = [uploadResult.secure_url];

        logger.info(
          `☁️ Image uploaded to Cloudinary: ${uploadResult.secure_url}`,
        );
      }

      const product = await productService.createProduct(productData);

      // Invalidate cache
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
      // Parse query parameters
      const paginationQuery = parsePaginationQuery(req);

      // Add custom filters from query params
      paginationQuery.filters = {
        category: req.query.category as string,
        minPrice: req.query.minPrice
          ? parseFloat(req.query.minPrice as string)
          : undefined,
        maxPrice: req.query.maxPrice
          ? parseFloat(req.query.maxPrice as string)
          : undefined,
        inStock: req.query.inStock === "true",
      };

      // Remove undefined values
      Object.keys(paginationQuery.filters!).forEach(
        (key) =>
          paginationQuery.filters![key] === undefined &&
          delete paginationQuery.filters![key],
      );

      const result = await productService.getAllProducts(paginationQuery);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProductBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const product = await productService.getProductBySlug(slug);

      if (!product) {
        throw new NotFoundError("Product not found");
      }

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const updateData = { ...req.body };

      // 🚀 Handle new image upload on update
      const file = req.file;
      if (file) {
        const uploadResult = (await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "ecommerce-api/products", resource_type: "auto" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          );
          uploadStream.end(file.buffer);
        })) as any;

        updateData.imageUrl = uploadResult.secure_url;

        // Optional: Append to images array or replace it. Here we replace for simplicity.
        updateData.images = [uploadResult.secure_url];

        logger.info(
          `☁️ New image uploaded to Cloudinary for update: ${uploadResult.secure_url}`,
        );
      }

      const product = await productService.updateProduct(id, updateData);

      if (!product) {
        throw new NotFoundError("Product not found");
      }

      // Invalidate cache
      await redis.del("cache:/api/v1/products");
      await redis.del(`cache:/api/v1/products/${id}`);

      res.status(200).json({
        success: true,
        message: "Product updated successfully",
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const deleted = await productService.deleteProduct(id);

      if (!deleted) {
        throw new NotFoundError("Product not found");
      }

      // Invalidate cache
      await redis.del("cache:/api/v1/products");
      await redis.del(`cache:/api/v1/products/${id}`);

      res.status(200).json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
