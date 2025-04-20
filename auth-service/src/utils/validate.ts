import Joi from "joi";
import { AuthPayload } from "../../types/types";

export const registrationSchema = Joi.object({
  username: Joi.string().min(6).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  avatar: Joi.string(),
});
export const validateRegistration = (data: AuthPayload) => {
  return registrationSchema.validate(data);
};
