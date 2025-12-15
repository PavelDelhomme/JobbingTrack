const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let details = {};

  // Joi validation errors
  if (err.isJoi) {
    statusCode = 400;
    message = 'Invalid request data';
    details = {
      validationErrors: err.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }))
    };
  }
  // Prisma errors
  else if (err.code) {
    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Data conflict: resource already exists';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Resource not found';
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Foreign key constraint error';
        break;
      default:
        statusCode = 400;
        message = 'Database error';
    }
    details = { prismaCode: err.code, meta: err.meta };
  }
  // Custom errors
  else if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details || {};
  }

  // Error log
  logger.error('HTTP error', {
    statusCode,
    message,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    stack: err.stack,
    details
  });

  // Error response
  res.status(statusCode).json({
    success: false,
    message,
    details,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler };
