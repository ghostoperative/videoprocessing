/**
 * Central error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error with stack trace for debugging
  console.error('Error occurred:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong';
  const status = err.status || 'error';

  // If there's a file in the request that wasn't processed due to an error,
  // clean it up to avoid filling the uploads directory
  if (req.file && req.file.path) {
    try {
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log(`Cleaned up uploaded file: ${req.file.path}`);
      }
    } catch (cleanupErr) {
      console.error('Error cleaning up file:', cleanupErr);
    }
  }

  res.status(statusCode).json({
    status,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = {
  errorHandler
};
