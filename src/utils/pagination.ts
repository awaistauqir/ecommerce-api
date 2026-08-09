import { Model, QueryFilter, SortOrder, Document } from "mongoose";

// Pagination query parameters
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  searchFields?: string[];
  filters?: Record<string, any>;
}

// Pagination metadata
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage?: number;
  prevPage?: number;
}

// Paginated response
export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Default configuration
export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 10,
  sortBy: "createdAt",
  sortOrder: "desc" as const,
};

/**
 * Generic pagination utility that works with any Mongoose model
 *
 * @example
 * const result = await paginate(Product, {
 *   page: 1,
 *   limit: 10,
 *   sortBy: 'name',
 *   sortOrder: 'asc',
 *   filters: { category: 'Electronics', price: { $gte: 50 } },
 *   search: 'keyboard',
 *   searchFields: ['name', 'description']
 * });
 */
export async function paginate<T extends Document>(
  model: Model<T>,
  query: PaginationQuery = {},
): Promise<PaginatedResult<T>> {
  const {
    page = DEFAULT_PAGINATION.page,
    limit = DEFAULT_PAGINATION.limit,
    sortBy = DEFAULT_PAGINATION.sortBy,
    sortOrder = DEFAULT_PAGINATION.sortOrder,
    search,
    searchFields,
    filters = {},
  } = query;

  // Validate page and limit
  const currentPage = Math.max(1, parseInt(String(page), 10));
  const itemsPerPage = Math.max(1, Math.min(parseInt(String(limit), 10), 100)); // Max 100 items per page

  // Calculate skip
  const skip = (currentPage - 1) * itemsPerPage;

  // Build filter object
  const filter: QueryFilter<T> = { ...filters };

  // Add search functionality if provided
  if (search && searchFields && searchFields.length > 0) {
    const searchRegex = new RegExp(search, "i"); // Case-insensitive search
    const searchConditions = searchFields.map((field) => ({
      [field]: searchRegex,
    }));
    filter.$or = searchConditions;
  }

  // Build sort object
  const sort: Record<string, SortOrder> = {};
  sort[sortBy] = sortOrder === "desc" ? -1 : 1;

  // Execute queries in parallel for performance
  const [data, totalItems] = await Promise.all([
    model.find(filter).sort(sort).skip(skip).limit(itemsPerPage).lean(), // Returns plain JS objects (faster, less memory)
    model.countDocuments(filter),
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const pagination: PaginationMeta = {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };

  // Add next/prev page numbers if they exist
  if (pagination.hasNextPage) {
    pagination.nextPage = currentPage + 1;
  }
  if (pagination.hasPrevPage) {
    pagination.prevPage = currentPage - 1;
  }

  return {
    data,
    pagination,
  };
}

/**
 * Helper to parse pagination query parameters from Express request
 * Ensures consistent parsing across all routes
 */
export function parsePaginationQuery(req: any): PaginationQuery {
  const query = req.query;

  return {
    page: query.page ? parseInt(query.page, 10) : undefined,
    limit: query.limit ? parseInt(query.limit, 10) : undefined,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder as "asc" | "desc" | undefined,
    search: query.search,
    filters: query.filters ? JSON.parse(query.filters) : undefined,
  };
}
