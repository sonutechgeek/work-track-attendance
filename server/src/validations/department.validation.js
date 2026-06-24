const Joi = require('joi');

const createDepartmentSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).optional().allow('', null),
  headId: Joi.number().integer().positive().optional().allow(null),
});

const updateDepartmentSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(500).optional().allow('', null),
  headId: Joi.number().integer().positive().optional().allow(null),
  isActive: Joi.boolean().optional(),
});

module.exports = { createDepartmentSchema, updateDepartmentSchema };
