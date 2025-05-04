import request from "supertest";
import { app, server } from "../server";
import mongoose from "mongoose";
import Auth from "../models/auth.model";
import redisClient from "../config/redis";
import { initalizeImageWorker, queue } from "../utils/imageWorker";
import {
  queue as imageQueue,
  initalizeEmailWorker,
} from "../utils/emailWorker";
import { Worker } from "bullmq";

jest.setTimeout(60000);

let imageWorker: Worker;
let emailWorker: Worker;
beforeAll(async () => {
  imageWorker = initalizeImageWorker();
  emailWorker = initalizeEmailWorker();
  await mongoose.connect(process.env.MONGODB_URI as string);
});

describe("Test register endpoint", () => {
  it("should create user if all fields are valid", async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "Testerelee",
      email: "bakesales@gmail.com",
      password: "germainDefoee",
    });

    expect(res.statusCode).toBe(201);
  });

  it("should fail if email is missing", async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "Testerelee",
      password: "germainDefoee",
    });
    expect(res.statusCode).toBe(400);
  });

  it("should fail if the password is too short", async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "Testerelee",
      email: "swag@test.com",
      password: "ger",
    });
    expect(res.statusCode).toBe(400);
  });

  it("should fail if a user already exists", async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "Testerelee",
      email: "bakesales@gmail.com",
      password: "germainDefoee",
    });

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      success: false,
      message: "User already exists",
    });
  });
});

afterAll(async () => {
  await Auth.deleteMany({});
  await mongoose.connection.close();
  server.close();
  await redisClient.quit();
  imageWorker.close();
  await queue.close();
  emailWorker.close();
  await imageQueue.close();
});
