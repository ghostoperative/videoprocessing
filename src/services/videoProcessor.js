const ffmpegPath = (() => {
  try {
    return require('@ffmpeg-installer/ffmpeg').path;
  } catch (e) {
    return null;
  }
})();

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { createError } = require('../utils/errorUtils');

// Use the installed FFmpeg path if available
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

/**
 * Process video file with FFmpeg
 * - Fixes duration metadata
 * - Re-encodes if needed
 * 
 * @param {string} inputPath - Path to input video file
 * @param {string} outputPath - Path to save processed video
 * @returns {Promise} - Promise resolving when processing is complete
 */
const processVideo = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      return reject(createError(400, 'Input video file not found'));
    }

    console.log(`Processing video from ${inputPath} to ${outputPath}`);

    // Properly configure FFmpeg command
    const command = ffmpeg(inputPath)
      .outputOptions([
        '-c:v', 'libx264',         // Use H.264 codec
        '-c:a', 'aac',             // Use AAC audio codec
        '-movflags', 'faststart',  // Optimize for web streaming
        '-metadata:s:v:0', 'rotate=0', // Remove rotation metadata if present
        '-pix_fmt', 'yuv420p'      // Ensure YUV 4:2:0 pixel format for compatibility
      ])
      .output(outputPath);

    command
      .on('start', (commandLine) => {
        console.log('FFmpeg processing started:', commandLine);
      })
      .on('progress', (progress) => {
        console.log(`Processing: ${Math.floor(progress.percent || 0)}% done`);
      })
      .on('error', (err) => {
        console.error('Error processing video:', err.message);
        // If output file was partially created, delete it
        if (fs.existsSync(outputPath)) {
          try {
            fs.unlinkSync(outputPath);
          } catch (e) {
            console.error('Failed to clean up partial output file:', e);
          }
        }
        reject(createError(500, 'Error processing video: ' + err.message));
      })
      .on('end', () => {
        console.log('FFmpeg processing completed');
        resolve(outputPath);
      })
      .run();
  });
};

module.exports = {
  processVideo
};
