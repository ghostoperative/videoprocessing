require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');

const videoRoutes = require('./routes/videoRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { setupDirectories } = require('./utils/fileSystem');
const { checkFfmpeg } = require('./utils/ffmpegCheck');

// Create necessary directories
setupDirectories();

// Check if FFmpeg is installed, attempt to install if not
console.log('Checking FFmpeg installation...');
checkFfmpeg().then(isInstalled => {
  if (!isInstalled) {
    console.error('ERROR: FFmpeg installation failed. Video processing will not work.');
    console.error('Please install FFmpeg manually: https://ffmpeg.org/download.html');
  } else {
    console.log('FFmpeg is ready for video processing');
  }
});

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Security headers with stricter settings for production
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    }
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
};

app.use(helmet(helmetOptions));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-KEY']
}));

// Request logging - use 'combined' format in production
app.use(morgan(isProduction ? 'combined' : 'dev'));

// Rate limiting - stricter in production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 60 : 100, // Limit each IP to fewer requests in production
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api', limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Key authentication middleware - only in production
if (isProduction && process.env.API_KEY) {
  app.use('/api', (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: Invalid API key'
      });
    }
    next();
  });
}

// Only serve static files in development 
// In production, you should use a proper web server like Nginx for this
if (!isProduction) {
  // Serve static files from the public directory
  app.use(express.static(path.join(__dirname, '../public')));
  
  // Root route that serves the HTML test page
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

// Routes
app.use('/api', videoRoutes);

// Serve static files from the processed directory with proper headers
app.use('/downloads', express.static(path.join(__dirname, '..', process.env.PROCESSED_DIR || 'processed'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
  }
}));

// Error handler middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  if (!isProduction) {
    console.log(`Open http://localhost:${PORT} in your browser to test the API`);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // In production, you might want to notify admins or log to a service
  if (isProduction) {
    // Implement proper logging here instead of exiting
    console.error('Server exiting due to uncaught exception');
  }
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  // In production, you might want to notify admins or log to a service
  if (isProduction) {
    // Implement proper logging here instead of exiting
    console.error('Server exiting due to unhandled rejection');
  }
  process.exit(1);
});
