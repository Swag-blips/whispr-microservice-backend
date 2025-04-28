import Joi from "joi";

export const messageSchema = Joi.object({
  chatId: Joi.string().required(),
  senderId: Joi.string().required(),
  content: Joi.string().required(),
});
