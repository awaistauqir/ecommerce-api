import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { userService } from "../users/users.service";
import { User } from "../users/users.model";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt";
import { env } from "../../config/env";
import { emailService } from "../../utils/email.service";
import {
  BadRequestError,
  ConflictError,
  AuthenticationError,
  TokenExpiredError,
  NotFoundError,
} from "../../utils/errors";

export class AuthController {
  // POST /api/v1/auth/register
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        throw new BadRequestError("Name, email, and password are required");
      }

      const user = await userService.createUser({ name, email, password });

      // Generate email verification token
      const verificationToken = await userService.generateEmailVerificationToken(user._id.toString());

      // Send verification email
      const frontendUrl = env.FRONTEND_URL;
      const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}&userId=${user._id}`;
      
      await emailService.sendVerificationEmail(user.email, user.name, verificationUrl);

      res.status(201).json({
        success: true,
        message: "User registered successfully. Please check your email to verify your account.",
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            isEmailVerified: user.isEmailVerified,
          },
        },
      });
    } catch (error: any) {
      if (error.message === "Email already registered") {
        throw new ConflictError("Email already registered");
      }
      next(error);
    }
  }

  // POST /api/v1/auth/login
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new BadRequestError("Email and password are required");
      }

      // 1. Find user by email (include password for comparison)
      const user = await User.findOne({ email }).select("+password");
      if (!user) {
        throw new AuthenticationError("Invalid email or password");
      }

      // 2. Check if email is verified (optional - remove if you don't want to enforce this)
      if (!user.isEmailVerified) {
        throw new AuthenticationError("Please verify your email before logging in");
      }

      // 3. Compare the plain-text password with the stored hash
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new AuthenticationError("Invalid email or password");
      }

      // 4. Generate tokens
      const tokenPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // 5. Store the refresh token in the database (hashed)
      user.refreshToken = await bcrypt.hash(refreshToken, 10);
      await user.save();

      // 6. Send refresh token as an HTTP-only cookie (secure, can't be read by JS)
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true, // JavaScript cannot access this cookie
        secure: env.NODE_ENV === "production", // HTTPS only in production
        sameSite: "strict", // Prevents CSRF attacks
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      });

      // 7. Send access token in the response body
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
      // 1. Get refresh token from the cookie
      const refreshToken = req.cookies?.refreshToken;

      if (!refreshToken) {
        throw new AuthenticationError(
          "No refresh token found. Please login again."
        );
      }

      // 2. Verify the refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // 3. Find the user and check if the stored refresh token matches
      const user = await User.findById(decoded.userId);
      if (!user || !user.refreshToken) {
        throw new AuthenticationError(
          "Invalid refresh token. Please login again."
        );
      }

      const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isValid) {
        throw new AuthenticationError(
          "Refresh token has been revoked. Please login again."
        );
      }

      // 4. Generate a NEW access token
      const newAccessToken = generateAccessToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      res.status(200).json({
        success: true,
        data: { accessToken: newAccessToken },
      });
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        throw new TokenExpiredError("Refresh token expired. Please login again.");
      }
      next(error);
    }
  }

  // POST /api/v1/auth/logout
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken;

      if (refreshToken) {
        const decoded = verifyRefreshToken(refreshToken);
        await User.findByIdAndUpdate(decoded.userId, {
          refreshToken: undefined,
        });
      }

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

      if (!token) {
        throw new BadRequestError("Verification token is required");
      }

      const user = await userService.verifyEmail(token as string);

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

      if (!email) {
        throw new BadRequestError("Email is required");
      }

      const user = await userService.resendVerificationEmail(email);

      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Generate new verification token
      const verificationToken = await userService.generateEmailVerificationToken(user._id.toString());

      // Send verification email
      const frontendUrl = env.FRONTEND_URL;
      const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}&userId=${user._id}`;

      await emailService.sendVerificationEmail(user.email, user.name, verificationUrl);

      res.status(200).json({
        success: true,
        message: "Verification email sent successfully. Please check your inbox.",
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/auth/forgot-password
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        throw new BadRequestError("Email is required");
      }

      const resetToken = await userService.generatePasswordResetToken(email);

      // Always return success to prevent email enumeration
      if (!resetToken) {
        return res.status(200).json({
          success: true,
          message: "If an account exists with this email, a password reset link has been sent.",
        });
      }

      // Send password reset email
      const user = await userService.findByEmail(email);
      const frontendUrl = env.FRONTEND_URL;
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${email}`;

      await emailService.sendPasswordResetEmail(email, user!.name, resetUrl);

      res.status(200).json({
        success: true,
        message: "If an account exists with this email, a password reset link has been sent.",
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/auth/reset-password
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        throw new BadRequestError("Token and new password are required");
      }

      const user = await userService.resetPassword(token, password);

      res.status(200).json({
        success: true,
        message: "Password reset successfully. You can now log in with your new password.",
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
