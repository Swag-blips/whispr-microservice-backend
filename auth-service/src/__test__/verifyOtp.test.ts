import request from "supertest";
import { server } from "../server";
import mongoose from "mongoose";
import redisClient from "../config/redis";
import Auth from "../models/auth.model";
import { initalizeImageWorker, queue } from "../utils/imageWorker";
import {
  queue as imageQueue,
  initalizeEmailWorker,
} from "../utils/emailWorker";
import crypto from "crypto";
import { Worker } from "bullmq";

jest.setTimeout(60000);

let imageWorker: Worker;
let emailWorker: Worker;
beforeAll(async () => {
  imageWorker = initalizeImageWorker();
  emailWorker = initalizeEmailWorker();
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
  emailWorker.close();
  await queue.close();
  await imageQueue.close();
  imageWorker.close();
});
