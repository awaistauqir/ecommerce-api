import { Resend } from "resend";
import { env } from "../config/env";

const resend = new Resend(env.RESEND_API_KEY);

export interface EmailVerificationPayload {
  userId: string;
  token: string;
  type: "verification" | "password_reset";
}

export class EmailService {
  /**
   * Send email verification email to a user
   */
  async sendVerificationEmail(
    to: string,
    name: string,
    verificationUrl: string
  ): Promise<void> {
    try {
      const { data, error } = await resend.emails.send({
        from: env.EMAIL_FROM,
        to: to,
        subject: "Verify Your Email Address",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Our Platform!</h2>
            <p>Hi ${name},</p>
            <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
            <a href="${verificationUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
              Verify Email
            </a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't create an account, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #999; font-size: 12px;">Best regards,<br>The Team</p>
          </div>
        `,
      });

      if (error) {
        console.error("Failed to send verification email:", error);
        throw new Error("Failed to send verification email");
      }

      console.log("Verification email sent successfully:", data?.id);
    } catch (error) {
      console.error("Error in sendVerificationEmail:", error);
      throw error;
    }
  }

  /**
   * Send password reset email to a user
   */
  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetUrl: string
  ): Promise<void> {
    try {
      const { data, error } = await resend.emails.send({
        from: env.EMAIL_FROM,
        to: to,
        subject: "Password Reset Request",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>Hi ${name},</p>
            <p>We received a request to reset your password. Click the button below to reset it:</p>
            <a href="${resetUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
              Reset Password
            </a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #999; font-size: 12px;">Best regards,<br>The Team</p>
          </div>
        `,
      });

      if (error) {
        console.error("Failed to send password reset email:", error);
        throw new Error("Failed to send password reset email");
      }

      console.log("Password reset email sent successfully:", data?.id);
    } catch (error) {
      console.error("Error in sendPasswordResetEmail:", error);
      throw error;
    }
  }
}

export const emailService = new EmailService();
