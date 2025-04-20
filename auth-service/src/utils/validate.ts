import Joi from "joi";

const schema = Joi.object({
  username: Joi.string().min(6).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  avatar: Joi.string(),
});

export default schema;
