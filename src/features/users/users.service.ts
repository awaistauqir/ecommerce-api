import bcrypt from "bcryptjs";
import crypto from "crypto";
import { User, IUser } from "./users.model";
import { ConflictError } from "../../utils/errors";

export class UserService {
  async createUser(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<IUser> {
    // 1. Check if user already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new ConflictError("Email already registered");
    }

    // 2. Hash the password (10 salt rounds is the industry standard)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    // 3. Create and save the user with the hashed password
    const user = new User({
      ...data,
      password: hashedPassword,
    });

    return await user.save();
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email });
  }

  async findById(id: string): Promise<IUser | null> {
    return await User.findById(id);
  }

  /**
   * Generate email verification token and save to user
   */
  async generateEmailVerificationToken(userId: string): Promise<string> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Generate a random token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Hash the token before storing
    const hashedToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    // Set expiration time (1 hour)
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    return verificationToken;
  }

  /**
   * Verify email using token
   */
  async verifyEmail(token: string): Promise<IUser> {
    // Hash the token to compare with stored hash
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() }, // Token must not be expired
    });

    if (!user) {
      throw new Error("Invalid or expired verification token");
    }

    // Mark email as verified and clear token fields
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return user;
  }

  /**
   * Generate password reset token and save to user
   */
  async generatePasswordResetToken(email: string): Promise<string | null> {
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not for security
      return null;
    }

    // Generate a random token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash the token before storing
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set expiration time (1 hour)
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    return resetToken;
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<IUser> {
    // Hash the token to compare with stored hash
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }, // Token must not be expired
    });

    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear token fields
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = undefined; // Invalidate any existing refresh tokens
    await user.save();

    return user;
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<IUser | null> {
    const user = await User.findOne({ email });
    if (!user) {
      return null;
    }

    if (user.isEmailVerified) {
      throw new Error("Email is already verified");
    }

    return user;
  }
}

export const userService = new UserService();
