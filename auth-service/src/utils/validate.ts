import Joi from "joi";
import { AuthUser } from "../types/types";

export const registrationSchema = Joi.object({
  username: Joi.string().min(6).max(30).required().trim(),
  email: Joi.string().email().required().max(300).trim(),
  password: Joi.string().min(6).required().trim(),
  bio: Joi.string().trim(),
  avatar: Joi.string().base64(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().trim(),
  password: Joi.string().required().trim(),
});

export const otpSchema = Joi.object({
  email: Joi.string().email().required().trim(),
  otp: Joi.string().min(6).required().trim(),
});
export const validateRegistration = (data: AuthUser) => {
  return registrationSchema.validate(data);
};

export const resetPasswordSchema = Joi.object({
  newPassword: Joi.string().min(6).required(),
});
