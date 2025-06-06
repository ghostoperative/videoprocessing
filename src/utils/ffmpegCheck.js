const { exec } = require('child_process');
const { installFfmpeg } = require('./ffmpegInstaller');
const fs = require('fs');
const path = require('path');

/**
 * Check if FFmpeg is installed and working properly
 * Attempts to install FFmpeg if not found
 * @returns {Promise<boolean>} - True if FFmpeg is working, false otherwise
 */
const checkFfmpeg = async () => {
  return new Promise(async (resolve) => {
    // First, try to directly call ffmpeg
    exec('ffmpeg -version', async (error, stdout, stderr) => {
      if (error) {
        console.warn('FFmpeg is not installed or not in PATH');
        
        // Check if we might have it from npm
        try {
          const ffmpegInstallerPath = path.join(__dirname, '../../../node_modules/@ffmpeg-installer/ffmpeg');
          if (fs.existsSync(ffmpegInstallerPath)) {
            try {
              const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
              const ffmpegDir = path.dirname(ffmpegPath);
              
              // Add to path for current session
              process.env.PATH = `${ffmpegDir}${path.delimiter}${process.env.PATH}`;
              console.log(`Found FFmpeg at ${ffmpegPath}, added to PATH`);
              
              // Verify it works
              exec('ffmpeg -version', (verifyError, verifyStdout) => {
                if (!verifyError) {
                  console.log('FFmpeg is now available:');
                  console.log(verifyStdout.split('\n')[0]);
                  resolve(true);
                  return;
                }
              });
            } catch (moduleError) {
              console.warn('Error loading ffmpeg-installer module:', moduleError.message);
            }
          }
        } catch (e) {
          console.warn('No FFmpeg found in node modules');
        }
        
        // Try to install FFmpeg
        console.log('Attempting to install FFmpeg automatically...');
        const installed = await installFfmpeg();
        
        if (installed) {
          // Verify installation was successful
          exec('ffmpeg -version', (verifyError, verifyStdout) => {
            if (!verifyError) {
              console.log('FFmpeg installation successful:');
              console.log(verifyStdout.split('\n')[0]);
              resolve(true);
            } else {
              console.error('FFmpeg installation verification failed');
              console.error('Please install FFmpeg manually: https://ffmpeg.org/download.html');
              resolve(false);
            }
          });
        } else {
          console.error('Failed to install FFmpeg');
          console.error('Please install FFmpeg manually: https://ffmpeg.org/download.html');
          resolve(false);
        }
        return;
      }
      
      console.log('FFmpeg is installed:');
      console.log(stdout.split('\n')[0]); // Just show the first line with version info
      resolve(true);
    });
  });
};

module.exports = {
  checkFfmpeg
};
