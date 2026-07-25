import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { User } from "../features/users/users.model";
import { Product } from "../features/products/products.model";
import { logger } from "../utils/logger";

async function seedDatabase() {
  try {
    logger.info("Connecting to database for seeding...");
    await mongoose.connect(env.MONGO_URI);
    logger.info("Connected. Clearing existing data...");

    // 1. Clear existing data for a clean slate
    await User.deleteMany({});
    await Product.deleteMany({});

    // 2. Hash a default password for all seeded users
    const defaultPassword = await bcrypt.hash("password123", 10);

    // 3. Create Users (1 Admin, 1 Customer)
    const users = await User.insertMany([
      {
        name: "Super Admin",
        email: "admin@example.com",
        password: defaultPassword,
        role: "admin",
      },
      {
        name: "John Customer",
        email: "customer@example.com",
        password: defaultPassword,
        role: "customer",
      },
    ]);
    logger.info(
      `✅ Created ${users.length} users (Password for all: 'password123')`,
    );

    // 4. Create Initial Products
    const products = await Product.insertMany([
      {
        name: "Mechanical Keyboard",
        description: "RGB Cherry MX Blue switches",
        price: 120.5,
        category: "Electronics",
        stock: 15,
      },
      {
        name: "Ergonomic Mouse",
        description: "Wireless vertical mouse",
        price: 45.0,
        category: "Electronics",
        stock: 30,
      },
      {
        name: "Standing Desk",
        description: "Electric height-adjustable desk",
        price: 350.0,
        category: "Furniture",
        stock: 5,
      },
    ]);
    logger.info(`✅ Created ${products.length} products`);

    logger.info("🎉 Database seeding completed successfully!");

    // Exit the script cleanly
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "❌ Seeding failed");
    process.exit(1);
  }
}

seedDatabase();
