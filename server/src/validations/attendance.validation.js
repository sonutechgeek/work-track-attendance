const Joi = require('joi');

const checkInSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  address: Joi.string().max(300).optional().allow('', null),
});

const checkOutSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  address: Joi.string().max(300).optional().allow('', null),
});

const updateAttendanceSchema = Joi.object({
  checkInTime: Joi.date().iso().optional(),
  checkOutTime: Joi.date().iso().optional(),
  status: Joi.string().valid('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'WFH', 'FIELD_VISIT').optional(),
  note: Joi.string().max(500).optional().allow('', null),
});

module.exports = { checkInSchema, checkOutSchema, updateAttendanceSchema };
