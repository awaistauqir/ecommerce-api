import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import app from "../../app";

import { generateAccessToken } from "../../utils/jwt";

let mongoServer: MongoMemoryServer;
let authToken: string;

beforeAll(async () => {
  // 1. Start the in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  authToken = generateAccessToken({
    userId: new mongoose.Types.ObjectId().toString(),
    email: "admin@example.com",
    role: "admin",
  });
});

afterAll(async () => {
  // 2. Clean up after all tests
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // 3. Clear the database between every single test for isolation
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("Products API Integration Tests", () => {
  it("should create a new product", async () => {
    const newProduct = {
      name: "Test Keyboard",
      description: "A test mechanical keyboard",
      price: 99.99,
      category: "Electronics",
      stock: 10,
    };

    const res = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${authToken}`)
      .send(newProduct);

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("_id");
    expect(res.body.data.name).toBe("Test Keyboard");
  });

  it("should get all products", async () => {
    // Seed the database
    await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Mouse",
        description: "Wireless mouse",
        price: 25.0,
        category: "Electronics",
        stock: 5,
      });

    const res = await request(app).get("/api/v1/products");

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
    expect(res.body.data.length).toBe(1);
  });
});
