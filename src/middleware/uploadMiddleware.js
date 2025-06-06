const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { createError } = require('../utils/errorUtils');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads'));
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

// Configure file filter for video types
const fileFilter = (req, file, cb) => {
  // Check if the file is a video
  const allowedMimeTypes = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/webm',
    'video/ogg'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(createError(400, 'Only video files are allowed'), false);
  }
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || 100000000, 10) // Default 100MB
  }
});

// Middleware that handles the upload
const uploadMiddleware = (req, res, next) => {
  const uploadSingle = upload.single('video');

  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer error (e.g., file too large)
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(createError(400, `File too large. Maximum size is ${process.env.MAX_FILE_SIZE / 1000000}MB`));
      }
      return next(createError(400, err.message));
    } else if (err) {
      // Other errors
      return next(err);
    }
    
    // File uploaded successfully
    next();
  });
};

module.exports = {
  uploadMiddleware
};
