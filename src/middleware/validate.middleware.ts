import { Request, Response, NextFunction } from "express";
import { z } from "zod";

type MiddlewareFunction = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void;

type ValidateInput = (
  schema: z.ZodObject<{
    body?: z.ZodTypeAny;
    query?: z.ZodTypeAny;
    params?: z.ZodTypeAny;
  }>,
) => MiddlewareFunction;

export const validate: ValidateInput =
  (schema): MiddlewareFunction =>
  (req, res, next) => {
    // Validate the input
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // If the validation fails, return a 400 status with the validation errors
    if (!result.success) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: result.error.issues.map((err) => ({
          field: err.path[err.path.length - 1],
          path: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
      });
    }

    // Call the next middleware or route handler
    next();
  };
