import request from "supertest";
import { server } from "../server";
import mongoose from "mongoose";
import redisClient from "../config/redis";
import Auth from "../models/auth.model";
import { worker } from "../utils/imageWorker";

jest.setTimeout(60000);

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI as string);
});

const userDetails = {
  email: "coderblip@gmail.com",
  username: "JerrySpeinfield",
  password: "Test@test02",
};
describe("Login route", () => {
  it("should send otp when details are correct", async () => {
    const user = await Auth.create({
      email: userDetails.email,
      username: userDetails.username,
      password: userDetails.password,
    });
    const res = await request(server).post("/api/auth/login").send({
      email: userDetails.email,
      password: userDetails.password,
    });

    expect(res.statusCode).toBe(200);
  });

  it("should fail if username is missing", async () => {
    const res = await request(server).post("/api/auth/login").send({
      password: userDetails.password,
    });

    expect(res.statusCode).toBe(400);
  });

  it("should fail if the username is too short", async () => {
    const res = await request(server).post("/api/auth/login").send({
      username: "abia",
      password: userDetails.password,
    });

    expect(res.statusCode).toBe(400);
  });
});

afterAll(async () => {
  await Auth.deleteMany({});
  await mongoose.connection.close();
  server.close();
  await redisClient.quit();
  await worker.close();
});
