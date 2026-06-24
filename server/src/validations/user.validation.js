const Joi = require('joi');

const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({ 'string.pattern.base': 'Password must have uppercase, lowercase and a number' }),
  role: Joi.string().valid('ADMIN', 'MANAGER', 'EMPLOYEE').default('EMPLOYEE'),
  employeeId: Joi.string().max(20).optional().allow('', null),
  departmentId: Joi.number().integer().positive().optional().allow(null),
  managerId: Joi.number().integer().positive().optional().allow(null),
  phone: Joi.string().max(20).optional().allow('', null),
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().lowercase().optional(),
  role: Joi.string().valid('ADMIN', 'MANAGER', 'EMPLOYEE').optional(),
  employeeId: Joi.string().max(20).optional().allow('', null),
  departmentId: Joi.number().integer().positive().optional().allow(null),
  managerId: Joi.number().integer().positive().optional().allow(null),
  phone: Joi.string().max(20).optional().allow('', null),
  isActive: Joi.boolean().optional(),
});

const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().max(20).optional().allow('', null),
  avatar: Joi.string().uri().max(500).optional().allow('', null),
});

const assignManagerSchema = Joi.object({
  managerId: Joi.number().integer().positive().required().allow(null),
});

module.exports = { createUserSchema, updateUserSchema, updateProfileSchema, assignManagerSchema };
