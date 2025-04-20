import Joi from "joi";
import { AuthPayload } from "../../types/types";

export const validateRegistration = (data: AuthPayload) => {
  const schema = Joi.object({
    username: Joi.string().min(6).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    avatar: Joi.string(),
  });

  return schema.validate(data);
};
