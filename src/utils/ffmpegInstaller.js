const { exec, execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

/**
 * Install FFmpeg based on the operating system
 * @returns {Promise<boolean>} - True if installation succeeded, false otherwise
 */
const installFfmpeg = () => {
  return new Promise((resolve) => {
    console.log('Attempting to install FFmpeg automatically...');
    const platform = os.platform();
    
    try {
      if (platform === 'win32') {
        installFfmpegWindows()
          .then(success => resolve(success))
          .catch(() => resolve(false));
      } else if (platform === 'darwin') {
        installFfmpegMac()
          .then(success => resolve(success))
          .catch(() => resolve(false));
      } else if (platform === 'linux') {
        installFfmpegLinux()
          .then(success => resolve(success))
          .catch(() => resolve(false));
      } else {
        console.error(`Unsupported platform: ${platform}`);
        console.log('Please install FFmpeg manually: https://ffmpeg.org/download.html');
        resolve(false);
      }
    } catch (error) {
      console.error('Error during FFmpeg installation:', error);
      resolve(false);
    }
  });
};

/**
 * Install FFmpeg on Windows using npm-ffmpeg
 * @returns {Promise<boolean>}
 */
const installFfmpegWindows = () => {
  return new Promise((resolve, reject) => {
    console.log('Installing FFmpeg for Windows...');
    exec('npm install @ffmpeg-installer/ffmpeg --no-save', (error) => {
      if (error) {
        console.error('Failed to install FFmpeg via npm:', error.message);
        reject(error);
        return;
      }
      
      try {
        // Update PATH to include ffmpeg location
        const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
        const ffmpegDir = path.dirname(ffmpegPath);
        
        console.log(`FFmpeg installed at: ${ffmpegPath}`);
        
        // Setting path for current session
        process.env.PATH = `${ffmpegDir}${path.delimiter}${process.env.PATH}`;
        console.log('FFmpeg added to PATH for current session');
        
        resolve(true);
      } catch (err) {
        console.error('Error configuring FFmpeg path:', err);
        reject(err);
      }
    });
  });
};

/**
 * Install FFmpeg on macOS using Homebrew
 * @returns {Promise<boolean>}
 */
const installFfmpegMac = () => {
  return new Promise((resolve, reject) => {
    // Check if Homebrew is installed
    exec('which brew', (error) => {
      if (error) {
        console.log('Homebrew not found. Installing FFmpeg via npm...');
        // Fall back to npm installer if Homebrew not available
        installFfmpegWithNpm()
          .then(success => resolve(success))
          .catch(err => reject(err));
        return;
      }
      
      console.log('Installing FFmpeg with Homebrew...');
      exec('brew install ffmpeg', (error) => {
        if (error) {
          console.error('Failed to install FFmpeg with Homebrew:', error.message);
          // Try npm as a fallback
          installFfmpegWithNpm()
            .then(success => resolve(success))
            .catch(err => reject(err));
          return;
        }
        
        console.log('FFmpeg installed successfully with Homebrew');
        resolve(true);
      });
    });
  });
};

/**
 * Install FFmpeg on Linux using apt/apt-get/yum
 * @returns {Promise<boolean>}
 */
const installFfmpegLinux = () => {
  return new Promise((resolve, reject) => {
    // Try to detect package manager
    const packageManagers = [
      { cmd: 'apt-get', installCmd: 'apt-get -y install ffmpeg' },
      { cmd: 'apt', installCmd: 'apt -y install ffmpeg' },
      { cmd: 'yum', installCmd: 'yum -y install ffmpeg' },
      { cmd: 'dnf', installCmd: 'dnf -y install ffmpeg' },
      { cmd: 'zypper', installCmd: 'zypper install -y ffmpeg' },
    ];
    
    let packageManagerFound = false;
    
    for (const pm of packageManagers) {
      try {
        execSync(`which ${pm.cmd}`);
        packageManagerFound = true;
        console.log(`Installing FFmpeg with ${pm.cmd}...`);
        
        try {
          execSync(pm.installCmd);
          console.log(`FFmpeg installed successfully with ${pm.cmd}`);
          resolve(true);
          return;
        } catch (installError) {
          console.error(`Failed to install FFmpeg with ${pm.cmd}:`, installError.message);
        }
      } catch (e) {
        // This package manager is not available, try next one
      }
    }
    
    if (!packageManagerFound) {
      console.log('No supported package manager found. Installing FFmpeg via npm...');
      installFfmpegWithNpm()
        .then(success => resolve(success))
        .catch(err => reject(err));
    } else {
      console.error('Failed to install FFmpeg with system package managers');
      reject(new Error('Failed to install FFmpeg'));
    }
  });
};

/**
 * Install FFmpeg using npm as a fallback method
 * @returns {Promise<boolean>}
 */
const installFfmpegWithNpm = () => {
  return new Promise((resolve, reject) => {
    console.log('Installing FFmpeg via npm...');
    exec('npm install @ffmpeg-installer/ffmpeg --no-save', (error) => {
      if (error) {
        console.error('Failed to install FFmpeg via npm:', error.message);
        reject(error);
        return;
      }
      
      try {
        const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
        console.log(`FFmpeg installed at: ${ffmpegPath}`);
        
        // Add to path for current session
        const ffmpegDir = path.dirname(ffmpegPath);
        process.env.PATH = `${ffmpegDir}${path.delimiter}${process.env.PATH}`;
        console.log('FFmpeg added to PATH for current session');
        
        resolve(true);
      } catch (err) {
        console.error('Error configuring FFmpeg path:', err);
        reject(err);
      }
    });
  });
};

module.exports = {
  installFfmpeg
};
