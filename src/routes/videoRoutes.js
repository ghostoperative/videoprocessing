const express = require('express');
const { processVideoController, getVideoController } = require('../controllers/videoController');
const { uploadMiddleware } = require('../middleware/uploadMiddleware');

const router = express.Router();

// Process video route
router.post('/process', uploadMiddleware, processVideoController);

// Get processed video route
router.get('/video/:id', getVideoController);

module.exports = router;
