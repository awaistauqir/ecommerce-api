import { Product, IProduct } from "./products.model";
import {
  paginate,
  PaginationQuery,
  PaginatedResult,
} from "../../utils/pagination";
import { generateUniqueSlug } from "../../utils/slug.js";

export class ProductService {
  async createProduct(productData: Partial<IProduct>): Promise<IProduct> {
    const slug = await generateUniqueSlug(Product, productData.name || "");
    productData.slug = slug;
    const product = new Product(productData);
    return await product.save();
  }

  /**
   * Get all products with pagination, filtering, and search
   */
  async getAllProducts(
    query: PaginationQuery,
  ): Promise<PaginatedResult<IProduct>> {
    // Build filters from query
    const filters: any = {};

    // Add category filter if provided
    if (query.filters?.category) {
      filters.category = query.filters.category;
    }

    // Add price range filter
    if (
      query.filters?.minPrice !== undefined ||
      query.filters?.maxPrice !== undefined
    ) {
      filters.price = {};
      if (query.filters.minPrice !== undefined) {
        filters.price.$gte = query.filters.minPrice;
      }
      if (query.filters.maxPrice !== undefined) {
        filters.price.$lte = query.filters.maxPrice;
      }
    }

    // Add stock filter (only in-stock items)
    if (query.filters?.inStock) {
      filters.stock = { $gt: 0 };
    }

    // Use the generic pagination utility
    return await paginate(Product, {
      ...query,
      filters,
      sortBy: query.sortBy || "createdAt",
      searchFields: query.searchFields || ["name", "description"],
    });
  }

  async getProductById(id: string): Promise<IProduct | null> {
    return await Product.findById(id);
  }

  async getProductBySlug(slug: string): Promise<IProduct | null> {
    return await Product.findOne({ slug });
  }

  async updateProduct(
    id: string,
    updateData: Partial<IProduct>,
  ): Promise<IProduct | null> {
    return await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await Product.findByIdAndDelete(id);
    return !!result;
  }
}

export const productService = new ProductService();
