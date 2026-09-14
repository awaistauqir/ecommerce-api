import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProductService } from "./products.service";
import { Product, IProduct } from "./products.model";
import { paginate, PaginationQuery, PaginatedResult } from "../../utils/pagination";
import { generateUniqueSlug } from "../../utils/slug.js";

// Mock dependencies
vi.mock("./products.model");
vi.mock("../../utils/pagination");
vi.mock("../../utils/slug.js");

const mockedProduct = Product as unknown as typeof Product & {
  prototype: { save: ReturnType<typeof vi.fn> };
  findById: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  findByIdAndUpdate: ReturnType<typeof vi.fn>;
  findByIdAndDelete: ReturnType<typeof vi.fn>;
};
const mockedPaginate = paginate as unknown as ReturnType<typeof vi.fn>;
const mockedGenerateUniqueSlug = generateUniqueSlug as unknown as ReturnType<
  typeof vi.fn
>;

describe("ProductService", () => {
  let productService: ProductService;

  beforeEach(() => {
    productService = new ProductService();
    vi.clearAllMocks();
  });

  describe("createProduct", () => {
    it("should create a product successfully", async () => {
      const productData = {
        name: "Test Product",
        description: "A test product",
        price: 99.99,
      };

      const generatedSlug = "test-product";
      const savedProduct = {
        ...productData,
        slug: generatedSlug,
        _id: "123",
      } as IProduct;

      (mockedGenerateUniqueSlug as ReturnType<typeof vi.fn>).mockResolvedValue(
        generatedSlug,
      );
      (mockedProduct.prototype.save as ReturnType<typeof vi.fn>).mockResolvedValue(
        savedProduct,
      );

      const result = await productService.createProduct(productData);

      expect(mockedGenerateUniqueSlug).toHaveBeenCalledWith(
        Product,
        productData.name,
      );
      expect(mockedProduct).toHaveBeenCalledWith({
        ...productData,
        slug: generatedSlug,
      });
      expect(result).toEqual(savedProduct);
    });

    it("should handle empty product name", async () => {
      const productData = {
        description: "A test product",
        price: 99.99,
      };

      const generatedSlug = "product-123";
      const savedProduct = {
        ...productData,
        slug: generatedSlug,
        _id: "123",
      } as IProduct;

      (mockedGenerateUniqueSlug as ReturnType<typeof vi.fn>).mockResolvedValue(
        generatedSlug,
      );
      (mockedProduct.prototype.save as ReturnType<typeof vi.fn>).mockResolvedValue(
        savedProduct,
      );

      const result = await productService.createProduct(productData);

      expect(mockedGenerateUniqueSlug).toHaveBeenCalledWith(Product, "");
      expect(result).toEqual(savedProduct);
    });
  });

  describe("getAllProducts", () => {
    it("should return paginated products with default options", async () => {
      const query: PaginationQuery = {
        page: 1,
        limit: 10,
      };

      const paginatedResult: PaginatedResult<IProduct> = {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };

      (mockedPaginate as ReturnType<typeof vi.fn>).mockResolvedValue(
        paginatedResult,
      );

      const result = await productService.getAllProducts(query);

      expect(mockedPaginate).toHaveBeenCalledWith(Product, {
        ...query,
        filters: {},
        sortBy: "createdAt",
        searchFields: ["name", "description"],
      });
      expect(result).toEqual(paginatedResult);
    });

    it("should filter by category", async () => {
      const query: PaginationQuery = {
        page: 1,
        limit: 10,
        filters: {
          category: "Electronics",
        },
      };

      const paginatedResult: PaginatedResult<IProduct> = {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };

      (mockedPaginate as ReturnType<typeof vi.fn>).mockResolvedValue(
        paginatedResult,
      );

      await productService.getAllProducts(query);

      expect(mockedPaginate).toHaveBeenCalledWith(Product, {
        ...query,
        filters: { category: "Electronics" },
        sortBy: "createdAt",
        searchFields: ["name", "description"],
      });
    });

    it("should filter by price range", async () => {
      const query: PaginationQuery = {
        page: 1,
        limit: 10,
        filters: {
          minPrice: 50,
          maxPrice: 100,
        },
      };

      const paginatedResult: PaginatedResult<IProduct> = {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };

      (mockedPaginate as ReturnType<typeof vi.fn>).mockResolvedValue(
        paginatedResult,
      );

      await productService.getAllProducts(query);

      expect(mockedPaginate).toHaveBeenCalledWith(Product, {
        ...query,
        filters: {
          price: {
            $gte: 50,
            $lte: 100,
          },
        },
        sortBy: "createdAt",
        searchFields: ["name", "description"],
      });
    });

    it("should filter by inStock", async () => {
      const query: PaginationQuery = {
        page: 1,
        limit: 10,
        filters: {
          inStock: true,
        },
      };

      const paginatedResult: PaginatedResult<IProduct> = {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };

      (mockedPaginate as ReturnType<typeof vi.fn>).mockResolvedValue(
        paginatedResult,
      );

      await productService.getAllProducts(query);

      expect(mockedPaginate).toHaveBeenCalledWith(Product, {
        ...query,
        filters: { stock: { $gt: 0 } },
        sortBy: "createdAt",
        searchFields: ["name", "description"],
      });
    });

    it("should use custom sortBy and searchFields", async () => {
      const query: PaginationQuery = {
        page: 1,
        limit: 10,
        sortBy: "price",
        searchFields: ["name"],
      };

      const paginatedResult: PaginatedResult<IProduct> = {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };

      (mockedPaginate as ReturnType<typeof vi.fn>).mockResolvedValue(
        paginatedResult,
      );

      await productService.getAllProducts(query);

      expect(mockedPaginate).toHaveBeenCalledWith(Product, {
        ...query,
        filters: {},
        sortBy: "price",
        searchFields: ["name"],
      });
    });
  });

  describe("getProductById", () => {
    it("should return product by id", async () => {
      const productId = "123";
      const product = { _id: productId, name: "Test Product" } as IProduct;

      (mockedProduct.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        product,
      );

      const result = await productService.getProductById(productId);

      expect(mockedProduct.findById).toHaveBeenCalledWith(productId);
      expect(result).toEqual(product);
    });

    it("should return null if product not found", async () => {
      (mockedProduct.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      const result = await productService.getProductById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getProductBySlug", () => {
    it("should return product by slug", async () => {
      const slug = "test-product";
      const product = { slug, name: "Test Product" } as IProduct;

      (mockedProduct.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(
        product,
      );

      const result = await productService.getProductBySlug(slug);

      expect(mockedProduct.findOne).toHaveBeenCalledWith({ slug });
      expect(result).toEqual(product);
    });

    it("should return null if product not found", async () => {
      (mockedProduct.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      const result = await productService.getProductBySlug("nonexistent-slug");

      expect(result).toBeNull();
    });
  });

  describe("updateProduct", () => {
    it("should update product successfully", async () => {
      const productId = "123";
      const updateData = { name: "Updated Product", price: 149.99 };
      const updatedProduct = {
        _id: productId,
        ...updateData,
      } as IProduct;

      (
        mockedProduct.findByIdAndUpdate as ReturnType<typeof vi.fn>
      ).mockResolvedValue(updatedProduct);

      const result = await productService.updateProduct(productId, updateData);

      expect(mockedProduct.findByIdAndUpdate).toHaveBeenCalledWith(
        productId,
        updateData,
        {
          new: true,
          runValidators: true,
        },
      );
      expect(result).toEqual(updatedProduct);
    });

    it("should return null if product not found", async () => {
      (
        mockedProduct.findByIdAndUpdate as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      const result = await productService.updateProduct("nonexistent", {
        name: "Updated",
      });

      expect(result).toBeNull();
    });
  });

  describe("deleteProduct", () => {
    it("should delete product successfully", async () => {
      const productId = "123";
      const deletedProduct = { _id: productId } as IProduct;

      (
        mockedProduct.findByIdAndDelete as ReturnType<typeof vi.fn>
      ).mockResolvedValue(deletedProduct);

      const result = await productService.deleteProduct(productId);

      expect(mockedProduct.findByIdAndDelete).toHaveBeenCalledWith(productId);
      expect(result).toBe(true);
    });

    it("should return false if product not found", async () => {
      (
        mockedProduct.findByIdAndDelete as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      const result = await productService.deleteProduct("nonexistent");

      expect(result).toBe(false);
    });
  });
});
