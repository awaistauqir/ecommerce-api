import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { UserService } from "./users.service";
import { User, IUser } from "./users.model";
import { ConflictError } from "../../utils/errors";

// Mock dependencies
vi.mock("./users.model");
vi.mock("bcryptjs");
vi.mock("crypto");

const mockedUser = User as unknown as jest.Mocked<typeof User>;
const mockedBcrypt = bcrypt as unknown as jest.Mocked<typeof bcrypt>;
const mockedCrypto = crypto as unknown as jest.Mocked<typeof crypto>;

describe("UserService", () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    vi.clearAllMocks();
  });

  describe("createUser", () => {
    it("should create a user successfully", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      };

      (mockedUser.findOne as vi.Mock).mockResolvedValue(null);
      (mockedBcrypt.hash as vi.Mock).mockResolvedValue("hashedPassword");

      const savedUser = { ...userData, _id: "123" } as IUser;
      (mockedUser.prototype.save as vi.Mock).mockResolvedValue(savedUser);

      const result = await userService.createUser(userData);

      expect(mockedUser.findOne).toHaveBeenCalledWith({ email: userData.email });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(mockedUser).toHaveBeenCalledWith({
        ...userData,
        password: "hashedPassword",
      });
      expect(result).toEqual(savedUser);
    });

    it("should throw ConflictError if user already exists", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      };

      (mockedUser.findOne as vi.Mock).mockResolvedValue({ _id: "123" } as IUser);

      await expect(userService.createUser(userData)).rejects.toThrow(
        ConflictError,
      );
      await expect(userService.createUser(userData)).rejects.toThrow(
        "Email already registered",
      );
    });
  });

  describe("findByEmail", () => {
    it("should return user by email", async () => {
      const email = "john@example.com";
      const user = { email, name: "John" } as IUser;

      (mockedUser.findOne as vi.Mock).mockResolvedValue(user);

      const result = await userService.findByEmail(email);

      expect(mockedUser.findOne).toHaveBeenCalledWith({ email });
      expect(result).toEqual(user);
    });

    it("should return null if user not found", async () => {
      (mockedUser.findOne as vi.Mock).mockResolvedValue(null);

      const result = await userService.findByEmail("nonexistent@example.com");

      expect(result).toBeNull();
    });
  });

  describe("findById", () => {
    it("should return user by id", async () => {
      const userId = "123";
      const user = { _id: userId, name: "John" } as IUser;

      (mockedUser.findById as vi.Mock).mockResolvedValue(user);

      const result = await userService.findById(userId);

      expect(mockedUser.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(user);
    });

    it("should return null if user not found", async () => {
      (mockedUser.findById as vi.Mock).mockResolvedValue(null);

      const result = await userService.findById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("generateEmailVerificationToken", () => {
    it("should generate and save verification token", async () => {
      const userId = "123";
      const user = {
        _id: userId,
        email: "john@example.com",
        save: vi.fn().mockResolvedValue({}),
      } as unknown as IUser;

      const rawToken = "rawtoken123";
      const hashedToken = "hashedtoken123";

      (mockedUser.findById as vi.Mock).mockResolvedValue(user);
      (mockedCrypto.randomBytes as unknown as vi.Mock).mockReturnValue({
        toString: () => rawToken,
      });
      (mockedCrypto.createHash as unknown as vi.Mock).mockReturnValue({
        update: () => ({ digest: () => hashedToken }),
      });

      const result = await userService.generateEmailVerificationToken(userId);

      expect(mockedUser.findById).toHaveBeenCalledWith(userId);
      expect(mockedCrypto.randomBytes).toHaveBeenCalledWith(32);
      expect(mockedCrypto.createHash).toHaveBeenCalledWith("sha256");
      expect(user.save).toHaveBeenCalled();
      expect(result).toBe(rawToken);
    });

    it("should throw error if user not found", async () => {
      (mockedUser.findById as vi.Mock).mockResolvedValue(null);

      await expect(
        userService.generateEmailVerificationToken("nonexistent"),
      ).rejects.toThrow("User not found");
    });
  });

  describe("verifyEmail", () => {
    it("should verify email successfully", async () => {
      const token = "validtoken";
      const hashedToken = "hashedtoken";
      const user = {
        _id: "123",
        email: "john@example.com",
        isEmailVerified: false,
        save: vi.fn().mockResolvedValue({}),
      } as unknown as IUser;

      (mockedCrypto.createHash as unknown as vi.Mock).mockReturnValue({
        update: () => ({ digest: () => hashedToken }),
      });
      (mockedUser.findOne as vi.Mock).mockResolvedValue(user);

      const result = await userService.verifyEmail(token);

      expect(mockedCrypto.createHash).toHaveBeenCalledWith("sha256");
      expect(mockedUser.findOne).toHaveBeenCalledWith({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: expect.any(Date) },
      });
      expect(user.isEmailVerified).toBe(true);
      expect(user.save).toHaveBeenCalled();
      expect(result).toEqual(user);
    });

    it("should throw error for invalid or expired token", async () => {
      (mockedUser.findOne as vi.Mock).mockResolvedValue(null);

      await expect(userService.verifyEmail("invalidtoken")).rejects.toThrow(
        "Invalid or expired verification token",
      );
    });
  });

  describe("generatePasswordResetToken", () => {
    it("should generate password reset token", async () => {
      const email = "john@example.com";
      const user = {
        email,
        save: vi.fn().mockResolvedValue({}),
      } as unknown as IUser;

      const rawToken = "rawresettoken";
      const hashedToken = "hashedresettoken";

      (mockedUser.findOne as vi.Mock).mockResolvedValue(user);
      (mockedCrypto.randomBytes as unknown as vi.Mock).mockReturnValue({
        toString: () => rawToken,
      });
      (mockedCrypto.createHash as unknown as vi.Mock).mockReturnValue({
        update: () => ({ digest: () => hashedToken }),
      });

      const result = await userService.generatePasswordResetToken(email);

      expect(mockedUser.findOne).toHaveBeenCalledWith({ email });
      expect(result).toBe(rawToken);
    });

    it("should return null if user not found", async () => {
      (mockedUser.findOne as vi.Mock).mockResolvedValue(null);

      const result = await userService.generatePasswordResetToken(
        "nonexistent@example.com",
      );

      expect(result).toBeNull();
    });
  });

  describe("resetPassword", () => {
    it("should reset password successfully", async () => {
      const token = "validtoken";
      const newPassword = "newpassword123";
      const hashedToken = "hashedtoken";
      const hashedPassword = "hashednewpassword";

      const user = {
        _id: "123",
        email: "john@example.com",
        save: vi.fn().mockResolvedValue({}),
      } as unknown as IUser;

      (mockedCrypto.createHash as unknown as vi.Mock).mockReturnValue({
        update: () => ({ digest: () => hashedToken }),
      });
      (mockedUser.findOne as vi.Mock).mockResolvedValue(user);
      (mockedBcrypt.hash as vi.Mock).mockResolvedValue(hashedPassword);

      const result = await userService.resetPassword(token, newPassword);

      expect(mockedCrypto.createHash).toHaveBeenCalledWith("sha256");
      expect(mockedUser.findOne).toHaveBeenCalledWith({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: expect.any(Date) },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(user.password).toBe(hashedPassword);
      expect(user.refreshToken).toBeUndefined();
      expect(user.save).toHaveBeenCalled();
      expect(result).toEqual(user);
    });

    it("should throw error for invalid or expired reset token", async () => {
      (mockedUser.findOne as vi.Mock).mockResolvedValue(null);

      await expect(
        userService.resetPassword("invalidtoken", "newpassword"),
      ).rejects.toThrow("Invalid or expired reset token");
    });
  });

  describe("resendVerificationEmail", () => {
    it("should return user if email is not verified", async () => {
      const email = "john@example.com";
      const user = {
        email,
        isEmailVerified: false,
      } as IUser;

      (mockedUser.findOne as vi.Mock).mockResolvedValue(user);

      const result = await userService.resendVerificationEmail(email);

      expect(mockedUser.findOne).toHaveBeenCalledWith({ email });
      expect(result).toEqual(user);
    });

    it("should return null if user not found", async () => {
      (mockedUser.findOne as vi.Mock).mockResolvedValue(null);

      const result = await userService.resendVerificationEmail(
        "nonexistent@example.com",
      );

      expect(result).toBeNull();
    });

    it("should throw error if email is already verified", async () => {
      const user = {
        email: "john@example.com",
        isEmailVerified: true,
      } as IUser;

      (mockedUser.findOne as vi.Mock).mockResolvedValue(user);

      await expect(
        userService.resendVerificationEmail("john@example.com"),
      ).rejects.toThrow("Email is already verified");
    });
  });
});
