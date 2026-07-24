import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import app from "../../app";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("Auth API Integration Tests", () => {
  const testUser = {
    name: "Test User",
    email: "test@example.com",
    password: "password123",
  };

  it("should register a new user successfully", async () => {
    const res = await request(app).post("/api/v1/auth/register").send(testUser);

    expect(res.statusCode).toEqual(201);
    expect(res.body.data).not.toHaveProperty("password"); // Ensure password is hidden
  });

  it("should fail registration with invalid email (Zod Validation)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...testUser, email: "not-an-email" });

    expect(res.statusCode).toEqual(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].field).toBe("email");
  });

  it("should login successfully and return an access token", async () => {
    // 1. Register first
    await request(app).post("/api/v1/auth/register").send(testUser);

    // 2. Login
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty("accessToken");
    expect(res.headers["set-cookie"]).toBeDefined(); // Refresh token cookie exists
  });

  it("should fail login with wrong password", async () => {
    await request(app).post("/api/v1/auth/register").send(testUser);

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testUser.email, password: "wrongpassword" });

    expect(res.statusCode).toEqual(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("should block access to protected routes without a token", async () => {
    // Try to create a product (which is protected) without a token
    const res = await request(app).post("/api/v1/products").send({
      name: "Test",
      description: "Test",
      price: 10,
      category: "Test",
      stock: 1,
    });

    expect(res.statusCode).toEqual(401);
    expect(res.body.message).toContain("No token provided");
  });
});
