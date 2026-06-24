const Joi = require('joi');

const applyLeaveSchema = Joi.object({
  type: Joi.string()
    .valid('CASUAL', 'SICK', 'HALF_DAY', 'EARLY_LEAVE', 'WFH', 'FIELD_VISIT')
    .required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  reason: Joi.string().min(5).max(1000).required(),
});

const reviewLeaveSchema = Joi.object({
  comments: Joi.string().max(500).optional().allow('', null),
});

const rejectLeaveSchema = Joi.object({
  comments: Joi.string().min(3).max(500).required(),
});

const updateBalanceSchema = Joi.object({
  casualTotal: Joi.number().integer().min(0).max(365).optional(),
  sickTotal: Joi.number().integer().min(0).max(365).optional(),
  halfDayTotal: Joi.number().integer().min(0).max(365).optional(),
  wfhTotal: Joi.number().integer().min(0).max(365).optional(),
});

module.exports = { applyLeaveSchema, reviewLeaveSchema, rejectLeaveSchema, updateBalanceSchema };
