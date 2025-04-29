import Joi from "joi";

export const messageSchema = Joi.object({
  senderId: Joi.string().required(),
  content: Joi.string().required(),
});
