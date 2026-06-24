const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field: d.context?.key || 'unknown',
      message: d.message.replace(/['"]/g, ''),
    }));
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  req.body = value;
  next();
};

module.exports = validate;
