import Joi from "joi";

export const messageSchema = Joi.object({
  content: Joi.string().required(),
});

export const createGroupSchema = Joi.object({
  groupName: Joi.string().required().min(5).max(300),
  participants: Joi.array().required(),
  bio: Joi.string(),
});

export const addToGroupSchema = Joi.object({
  participants: Joi.array().required(),
});

export const removeFromGroupSchema = Joi.object({
  memberId: Joi.string(),
});

  

 