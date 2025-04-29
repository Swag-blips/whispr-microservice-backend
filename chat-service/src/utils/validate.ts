import Joi from "joi";

export const messageSchema = Joi.object({
  senderId: Joi.string().required(),
  content: Joi.string().required(),
});

export const createGroupSchema = Joi.object({
  groupName: Joi.string().required().max(300),
  participants: Joi.array().required(),
  bio: Joi.string(),
});
