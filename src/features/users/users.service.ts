import bcrypt from "bcryptjs";
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
}

export const userService = new UserService();
