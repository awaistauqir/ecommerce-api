/**
 * Base Application Error Class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly for proper inheritance
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * HTTP 400 Bad Request
 * Used for invalid input, missing fields, malformed requests
 */
export class BadRequestError extends AppError {
  constructor(message: string = "Bad request", code?: string) {
    super(message, 400, code || "BAD_REQUEST");
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * HTTP 401 Unauthorized
 * Used when user is not authenticated
 */
export class UnauthorizedError extends AppError {
  constructor(
    message: string = "Unauthorized access",
    code?: string
  ) {
    super(message, 401, code || "UNAUTHORIZED");
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * HTTP 403 Forbidden
 * Used when user is authenticated but lacks permission
 */
export class ForbiddenError extends AppError {
  constructor(
    message: string = "Access forbidden",
    code?: string
  ) {
    super(message, 403, code || "FORBIDDEN");
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * HTTP 404 Not Found
 * Used when requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(
    message: string = "Resource not found",
    code?: string
  ) {
    super(message, 404, code || "NOT_FOUND");
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * HTTP 409 Conflict
 * Used for duplicate resources, email already exists, etc.
 */
export class ConflictError extends AppError {
  constructor(
    message: string = "Resource conflict",
    code?: string
  ) {
    super(message, 409, code || "CONFLICT");
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * HTTP 422 Unprocessable Entity
 * Used for validation errors
 */
export class ValidationError extends AppError {
  constructor(
    message: string = "Validation failed",
    code?: string
  ) {
    super(message, 422, code || "VALIDATION_ERROR");
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * HTTP 429 Too Many Requests
 * Used for rate limiting
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = "Too many requests, please try again later",
    code?: string
  ) {
    super(message, 429, code || "RATE_LIMIT_EXCEEDED");
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * HTTP 500 Internal Server Error
 * Used for unexpected server errors (non-operational)
 */
export class InternalServerError extends AppError {
  constructor(
    message: string = "Internal server error",
    code?: string
  ) {
    super(message, 500, code || "INTERNAL_SERVER_ERROR", false);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

/**
 * HTTP 503 Service Unavailable
 * Used when external services are down (database, third-party APIs)
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    message: string = "Service temporarily unavailable",
    code?: string
  ) {
    super(message, 503, code || "SERVICE_UNAVAILABLE", false);
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/**
 * Payment/Stripe specific errors
 */
export class PaymentError extends AppError {
  constructor(
    message: string = "Payment processing failed",
    code?: string
  ) {
    super(message, 402, code || "PAYMENT_FAILED");
    Object.setPrototypeOf(this, PaymentError.prototype);
  }
}

/**
 * Authentication specific errors
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string = "Authentication failed",
    code?: string
  ) {
    super(message, 401, code || "AUTHENTICATION_FAILED");
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Token expired error
 */
export class TokenExpiredError extends AppError {
  constructor(
    message: string = "Token has expired",
    code?: string
  ) {
    super(message, 401, code || "TOKEN_EXPIRED");
    Object.setPrototypeOf(this, TokenExpiredError.prototype);
  }
}

/**
 * Invalid token error
 */
export class InvalidTokenError extends AppError {
  constructor(
    message: string = "Invalid token",
    code?: string
  ) {
    super(message, 401, code || "INVALID_TOKEN");
    Object.setPrototypeOf(this, InvalidTokenError.prototype);
  }
}
