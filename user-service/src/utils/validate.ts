import Joi from "joi";

export const removeFriendSchema = Joi.object({
  friendId: Joi.string().required(),
});
