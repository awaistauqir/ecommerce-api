import { Request, Response, NextFunction } from "express";
import { PaginationQuery, DEFAULT_PAGINATION } from "../utils/pagination";

/**
 * Middleware to validate and sanitize pagination query parameters
 * Adds validated pagination params to req.pagination
 */
export function paginationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const query = req.query;

  // Parse and validate page
  let page = DEFAULT_PAGINATION.page;
  if (query.page) {
    const parsedPage = parseInt(query.page as string, 10);
    if (!isNaN(parsedPage) && parsedPage >= 1) {
      page = parsedPage;
    }
  }

  // Parse and validate limit (max 100)
  let limit = DEFAULT_PAGINATION.limit;
  if (query.limit) {
    const parsedLimit = parseInt(query.limit as string, 10);
    if (!isNaN(parsedLimit) && parsedLimit >= 1) {
      limit = Math.min(parsedLimit, 100); // Cap at 100
    }
  }

  // Validate sort order
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  // Build pagination object
  const pagination: PaginationQuery = {
    page,
    limit,
    sortBy: query.sortBy as string,
    sortOrder,
    search: query.search as string,
  };

  // Attach to request object
  (req as any).pagination = pagination;

  next();
}
