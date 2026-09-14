import { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service";
import { env } from "../../config/env";
import { ConflictError } from "../../utils/errors";

export class AuthController {
  // POST /api/v1/auth/register
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.register(req.body);

      res.status(201).json({
        success: true,
        message:
          "User registered successfully. Please check your email to verify your account.",
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            isEmailVerified: user.isEmailVerified,
          },
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message === "Email already registered"
      ) {
        throw new ConflictError("Email already registered");
      }
      next(error);
    }
  }

  // POST /api/v1/auth/login
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await authService.login(
        req.body,
      );

      // Send refresh token as an HTTP-only cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true, // JavaScript cannot access this cookie
        secure: env.NODE_ENV === "production", // HTTPS only in production
        sameSite: "strict", // Prevents CSRF attacks
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      });

      // Send access token in the response body
      res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
          },
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/auth/refresh
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      const accessToken = await authService.refresh(refreshToken);

      res.status(200).json({
        success: true,
        data: { accessToken },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/auth/logout
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      await authService.logout(refreshToken);

      // Clear the cookie
      res.clearCookie("refreshToken");

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/auth/verify-email
  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.query;
      const user = await authService.verifyEmail(token as string);

      res.status(200).json({
        success: true,
        message: "Email verified successfully. You can now log in.",
        data: {
          user: {
            id: user._id,
            email: user.email,
            isEmailVerified: user.isEmailVerified,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/auth/resend-verification
  async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await authService.resendVerification(email);

      res.status(200).json({
        success: true,
        message:
          "Verification email sent successfully. Please check your inbox.",
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/auth/forgot-password
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await authService.forgotPassword(email);

      // Always return success to prevent email enumeration
      res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/auth/reset-password
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;
      const user = await authService.resetPassword(token, password);

      res.status(200).json({
        success: true,
        message:
          "Password reset successfully. You can now log in with your new password.",
        data: {
          user: {
            id: user._id,
            email: user.email,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
