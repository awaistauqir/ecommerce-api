import { IProduct, Product } from "./products.model";

export class ProductService {
  // Create a new product
  async createProduct(productData: Partial<IProduct>): Promise<IProduct> {
    const product = new Product(productData);
    return await product.save();
  }

  // Get all products
  async getAllProducts(): Promise<IProduct[]> {
    return await Product.find().sort({ createdAt: -1 });
  }
}

// Export a single instance to be used by the controller
export const productService = new ProductService();
