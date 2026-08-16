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
import {
  BadRequestError,
  ConflictError,
  AuthenticationError,
  TokenExpiredError,
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

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: user,
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

      // 2. Compare the plain-text password with the stored hash
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new AuthenticationError("Invalid email or password");
      }

      // 3. Generate tokens
      const tokenPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // 4. Store the refresh token in the database (hashed)
      user.refreshToken = await bcrypt.hash(refreshToken, 10);
      await user.save();

      // 5. Send refresh token as an HTTP-only cookie (secure, can't be read by JS)
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true, // JavaScript cannot access this cookie
        secure: env.NODE_ENV === "production", // HTTPS only in production
        sameSite: "strict", // Prevents CSRF attacks
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      });

      // 6. Send access token in the response body
      res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
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
}

export const authController = new AuthController();
