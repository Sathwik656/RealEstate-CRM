'use strict';
const { validationResult } = require('express-validator');

/**
 * Middleware to handle express-validator validation results.
 * If there are validation errors, it returns a 400 response with
 * a structured error list. Otherwise it calls next().
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => {
      return err.msg;
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages,
    });
  }

  next();
};

module.exports = validate;
