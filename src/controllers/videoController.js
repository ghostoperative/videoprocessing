const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { processVideo } = require('../services/videoProcessor');
const { createError } = require('../utils/errorUtils');

/**
 * Process uploaded video
 */
const processVideoController = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(createError(400, 'No video file uploaded'));
    }

    const videoFile = req.file;
    console.log('Uploaded file:', videoFile);

    // Generate unique ID for the video
    const videoId = uuidv4();
    
    // Make sure the filename doesn't have spaces or special characters
    const fileExtension = path.extname(videoFile.originalname);
    const sanitizedFilename = `${videoId}${fileExtension}`;
    
    // Get absolute paths
    const processedDir = path.resolve(__dirname, '../../', process.env.PROCESSED_DIR || 'processed');
    const outputPath = path.join(processedDir, sanitizedFilename);
    
    console.log(`Processing to: ${outputPath}`);

    // Process the video with FFmpeg
    await processVideo(videoFile.path, outputPath);

    // Delete the original uploaded file after successful processing
    try {
      fs.unlinkSync(videoFile.path);
    } catch (err) {
      console.error('Error deleting uploaded file:', err);
      // Non-fatal error, continue
    }

    // Generate download URL
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const downloadUrl = `${baseUrl}/downloads/${sanitizedFilename}`;

    res.status(200).json({
      success: true,
      videoId,
      downloadUrl,
      message: 'Video processed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get processed video by ID
 */
const getVideoController = (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find the file with the matching ID prefix in the processed directory
    const processedDir = path.resolve(__dirname, '../../', process.env.PROCESSED_DIR || 'processed');
    
    if (!fs.existsSync(processedDir)) {
      return next(createError(500, 'Processed directory not found'));
    }
    
    const files = fs.readdirSync(processedDir);
    const videoFile = files.find(file => file.startsWith(id));
    
    if (!videoFile) {
      return next(createError(404, 'Video not found'));
    }
    
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const downloadUrl = `${baseUrl}/downloads/${videoFile}`;
    
    res.status(200).json({
      success: true,
      videoId: id,
      downloadUrl,
      filename: videoFile
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  processVideoController,
  getVideoController
};
