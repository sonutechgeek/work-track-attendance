const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(6).required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.pattern.base': 'Password must have uppercase, lowercase and a number',
    }),
});

module.exports = { loginSchema, changePasswordSchema };
