import bcrypt from "bcryptjs";
import { userService } from "../users/users.service";
import { User, IUser } from "../users/users.model";
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

export class AuthService {
  async register(data: { name?: string; email?: string; password?: string }): Promise<IUser> {
    const { name, email, password } = data;

    if (!name || !email || !password) {
      throw new BadRequestError("Name, email, and password are required");
    }

    try {
      const user = await userService.createUser({ name, email, password });

      // Generate email verification token
      const verificationToken = await userService.generateEmailVerificationToken(user._id.toString());

      // Send verification email
      const frontendUrl = env.FRONTEND_URL;
      const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}&userId=${user._id}`;
      
      await emailService.sendVerificationEmail(user.email, user.name, verificationUrl);

      return user;
    } catch (error: any) {
      if (error.message === "Email already registered") {
        throw new ConflictError("Email already registered");
      }
      throw error;
    }
  }

  async login(data: { email?: string; password?: string }): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const { email, password } = data;

    if (!email || !password) {
      throw new BadRequestError("Email and password are required");
    }

    // 1. Find user by email (include password for comparison)
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      throw new AuthenticationError("Invalid email or password");
    }

    // 2. Check if email is verified
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

    return { user, accessToken, refreshToken };
  }

  async refresh(refreshToken: string | undefined): Promise<string> {
    if (!refreshToken) {
      throw new AuthenticationError(
        "No refresh token found. Please login again."
      );
    }

    try {
      // Verify the refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Find the user and check if the stored refresh token matches
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

      // Generate a NEW access token
      const newAccessToken = generateAccessToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      return newAccessToken;
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        throw new TokenExpiredError("Refresh token expired. Please login again.");
      }
      throw error;
    }
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        await User.findByIdAndUpdate(decoded.userId, {
          refreshToken: undefined,
        });
      } catch (error) {
        // Suppress errors during logout
      }
    }
  }

  async verifyEmail(token: string | undefined): Promise<IUser> {
    if (!token) {
      throw new BadRequestError("Verification token is required");
    }

    return await userService.verifyEmail(token);
  }

  async resendVerification(email: string | undefined): Promise<IUser> {
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

    return user;
  }

  async forgotPassword(email: string | undefined): Promise<boolean> {
    if (!email) {
      throw new BadRequestError("Email is required");
    }

    const resetToken = await userService.generatePasswordResetToken(email);

    // If reset token is null, user wasn't found, but return false to let controller respond with generic success
    if (!resetToken) {
      return false;
    }

    // Send password reset email
    const user = await userService.findByEmail(email);
    const frontendUrl = env.FRONTEND_URL;
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${email}`;

    await emailService.sendPasswordResetEmail(email, user!.name, resetUrl);

    return true;
  }

  async resetPassword(token: string | undefined, password: string | undefined): Promise<IUser> {
    if (!token || !password) {
      throw new BadRequestError("Token and new password are required");
    }

    return await userService.resetPassword(token, password);
  }
}

export const authService = new AuthService();
