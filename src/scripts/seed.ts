import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { User } from "../features/users/users.model";
import { Product } from "../features/products/products.model";
import { generateUniqueSlug } from "../utils/slug";
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

    // 4. Create Initial Products (ensure slugs are set and images conform to schema)
    const productSeed = [
      {
        name: "Mechanical Keyboard",
        description: "RGB Cherry MX Blue switches with durable aluminum frame",
        price: 120.5,
        category: "Electronics",
        stock: 15,
        images: ["https://example.com/images/mech-keyboard.jpg"],
      },
      {
        name: "Ergonomic Mouse",
        description: "Wireless vertical mouse designed for comfort",
        price: 45.0,
        category: "Electronics",
        stock: 30,
        images: ["https://example.com/images/ergonomic-mouse.jpg"],
      },
      {
        name: "Standing Desk",
        description: "Electric height-adjustable desk with memory presets",
        price: 350.0,
        category: "Furniture",
        stock: 5,
        images: ["https://example.com/images/standing-desk.jpg"],
      },
    ];

    // Generate unique slugs and set imageUrl fallback for compatibility
    for (const p of productSeed) {
      // Ensure slug uniqueness using the same utility the model uses
      // (pre-save hook is bypassed by insertMany)
      // eslint-disable-next-line no-await-in-loop
      // @ts-ignore - dynamic assignment for seeding
      p.slug = await generateUniqueSlug(Product, p.name);
      // set backwards-compatible imageUrl if images present
      if (p.images && p.images.length > 0) (p as any).imageUrl = p.images[0];
    }

    const products = await Product.insertMany(productSeed);
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
