import Joi from "joi";

export const messageSchema = Joi.object({
  content: Joi.string().optional(),
  tempId: Joi.string().uuid().required(),
  file: Joi.string().uri(),
  fileType: Joi.string(),
  fileName: Joi.string(),
  fileSize: Joi.number(),
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
  memberId: Joi.string().required(),
});


export const starMessageSchema = Joi.object({
  messageId: Joi.string().required()
})