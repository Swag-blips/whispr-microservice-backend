import Joi from "joi";

export const notificationSchema = Joi.object({
  notificationIds: Joi.array().required(),
});
