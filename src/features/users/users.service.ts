import bcrypt from "bcryptjs";
import { User, IUser } from "./users.model";
import { ConflictError, NotFoundError, AuthenticationError } from "../../utils/errors";

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

  async updateProfile(
    userId: string,
    data: { name?: string; email?: string }
  ): Promise<IUser> {
    // Check if email is being updated and if it's already taken
    if (data.email) {
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser && existingUser._id.toString() !== userId) {
        throw new ConflictError("Email already registered");
      }
    }

    const user = await User.findByIdAndUpdate(userId, data, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  }

  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<IUser> {
    // Find user with password field
    const user = await User.findById(userId).select("+password");
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError("Current password is incorrect");
    }

    // Hash and update new password
    const saltRounds = 10;
    user.password = await bcrypt.hash(newPassword, saltRounds);
    await user.save();

    return user;
  }
}

export const userService = new UserService();
