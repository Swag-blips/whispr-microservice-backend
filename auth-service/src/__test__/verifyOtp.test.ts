import request from "supertest";
import { server } from "../server";
import mongoose from "mongoose";
import redisClient from "../config/redis";
import Auth from "../models/auth.model";
import { worker } from "../utils/imageWorker";
import crypto from "crypto";

jest.setTimeout(60000);

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI as string);
});
const generatedOtp = crypto.randomInt(100000, 999999);
const expiryTime = 5 * 60;

const data = {
  otp: generatedOtp,
  expiryTime,
  email: "bakrinolasupoayomide@gmail.com",
};

const otp = describe("verify otp route", () => {
  it("succeeds if the otp is correct", async () => {
    const user = await Auth.create({
      email: data.email,
      username: "jefffreyoe",
      password: "Bakesales02$",
    });
    await redisClient.set(
      `otp:${data.email}`,
      data.otp.toString(),
      "EX",
      data.expiryTime
    );

    const res = await request(server).post("/api/auth/verify-otp").send({
      otp: data.otp.toString(),
      email: data.email,
    });

    expect(res.statusCode).toBe(200);
  });

  it("fails if no otp and email", async () => {
    const res = await request(server).post("/api/auth/verify-otp").send({});
    expect(res.statusCode).toBe(400);
  });
});

afterAll(async () => {
  await mongoose.connection.close();
  server.close();
  await redisClient.quit();
  await Auth.deleteMany({});
  await worker.close();
});
