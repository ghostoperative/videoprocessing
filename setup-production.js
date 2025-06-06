#!/usr/bin/env node

/**
 * Production setup script for FFmpeg Video Processing Engine
 * - Creates necessary directories
 * - Checks for FFmpeg installation
 * - Validates environment variables
 * - Sets up proper permissions
 * - Creates production-ready .env file
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

console.log(`${colors.cyan}╔════════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.cyan}║     FFmpeg Video Processing Engine - Setup Script      ║${colors.reset}`);
console.log(`${colors.cyan}╚════════════════════════════════════════════════════════╝${colors.reset}`);

// Function to check if ffmpeg is installed
function checkFfmpeg() {
  try {
    console.log(`\n${colors.blue}Checking FFmpeg installation...${colors.reset}`);
    const result = execSync('ffmpeg -version').toString();
    console.log(`${colors.green}✓ FFmpeg is installed: ${colors.reset}${result.split('\n')[0]}`);
    return true;
  } catch (error) {
    console.log(`${colors.yellow}FFmpeg not found in system PATH.${colors.reset}`);
    
    try {
      // Check if it's available from npm installation
      const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
      console.log(`${colors.green}✓ FFmpeg is available via npm at: ${colors.reset}${ffmpegPath}`);
      return true;
    } catch (npmError) {
      console.log(`${colors.yellow}FFmpeg not found in npm packages either.${colors.reset}`);
      console.log(`${colors.blue}The application will attempt to install FFmpeg automatically when it runs.${colors.reset}`);
      console.log(`${colors.yellow}If that fails, please install FFmpeg manually: https://ffmpeg.org/download.html${colors.reset}`);
      return false;
    }
  }
}

// Function to create necessary directories
function createDirectories(uploadDir, processedDir) {
  console.log(`\n${colors.blue}Creating necessary directories...${colors.reset}`);
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`${colors.green}✓ Created upload directory: ${colors.reset}${uploadDir}`);
  } else {
    console.log(`${colors.green}✓ Upload directory already exists: ${colors.reset}${uploadDir}`);
  }
  
  if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
    console.log(`${colors.green}✓ Created processed directory: ${colors.reset}${processedDir}`);
  } else {
    console.log(`${colors.green}✓ Processed directory already exists: ${colors.reset}${processedDir}`);
  }

  // Set proper permissions (Unix-like systems only)
  if (process.platform !== 'win32') {
    try {
      execSync(`chmod 755 ${uploadDir}`);
      execSync(`chmod 755 ${processedDir}`);
      console.log(`${colors.green}✓ Set directory permissions to 755${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}✗ Failed to set directory permissions${colors.reset}`);
    }
  }

  return true;
}

// Function to validate URL format
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

// Function to create .env file for production
async function createEnvFile() {
  console.log(`\n${colors.blue}Setting up production environment variables...${colors.reset}`);
  
  const envPath = path.join(__dirname, '.env.production');
  
  // Ask for configuration values
  const askQuestion = (question, defaultValue) => {
    return new Promise(resolve => {
      rl.question(`${question} ${defaultValue ? `(default: ${defaultValue})` : ''}: `, (answer) => {
        resolve(answer || defaultValue);
      });
    });
  };

  const port = await askQuestion('Enter the port number for the server', '3000');
  const uploadDir = await askQuestion('Enter the upload directory path', 'uploads');
  const processedDir = await askQuestion('Enter the processed directory path', 'processed');
  const maxFileSize = await askQuestion('Enter the maximum file size in bytes', '100000000'); // 100MB
  
  let baseUrl = await askQuestion('Enter the base URL for your application (include https:// for production)');
  while (!isValidUrl(baseUrl)) {
    console.log(`${colors.red}Invalid URL format. Include http:// or https://${colors.reset}`);
    baseUrl = await askQuestion('Enter the base URL for your application (include https:// for production)');
  }
  
  const allowedOrigins = await askQuestion('Enter allowed origins (comma separated URLs)', baseUrl);
  
  // Generate random API key for security
  const apiKey = crypto.randomBytes(32).toString('hex');
  
  // Create .env content
  const envContent = `NODE_ENV=production
PORT=${port}
UPLOAD_DIR=${uploadDir}
PROCESSED_DIR=${processedDir}
MAX_FILE_SIZE=${maxFileSize}
ALLOWED_ORIGINS=${allowedOrigins}
BASE_URL=${baseUrl}
API_KEY=${apiKey}`;

  // Write .env.production file
  fs.writeFileSync(envPath, envContent);
  console.log(`${colors.green}✓ Created production environment file: ${colors.reset}.env.production`);
  
  return { uploadDir, processedDir };
}

// Main setup function
async function setup() {
  const ffmpegInstalled = checkFfmpeg();
  if (!ffmpegInstalled) {
    console.log(`${colors.yellow}The application will attempt to install FFmpeg automatically on first run.${colors.reset}`);
    
    const installNow = await askQuestion('Would you like to install FFmpeg now? (y/n)', 'y');
    
    if (installNow.toLowerCase() === 'y') {
      console.log(`${colors.blue}Installing FFmpeg via npm...${colors.reset}`);
      try {
        execSync('npm install @ffmpeg-installer/ffmpeg --no-save', { stdio: 'inherit' });
        console.log(`${colors.green}✓ FFmpeg installed successfully via npm${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}Failed to install FFmpeg automatically${colors.reset}`);
        console.log(`${colors.yellow}The application will try again on startup${colors.reset}`);
      }
    }
  }

  const { uploadDir, processedDir } = await createEnvFile();
  
  const directoriesCreated = createDirectories(
    path.join(__dirname, uploadDir),
    path.join(__dirname, processedDir)
  );

  if (directoriesCreated) {
    console.log(`\n${colors.green}=== Setup Complete ===${colors.reset}`);
    console.log(`\n${colors.magenta}Next Steps:${colors.reset}`);
    console.log(`1. Copy .env.production to .env: ${colors.cyan}cp .env.production .env${colors.reset}`);
    console.log(`2. Install dependencies: ${colors.cyan}npm install --production${colors.reset}`);
    console.log(`3. Start the server: ${colors.cyan}NODE_ENV=production npm start${colors.reset}`);
    console.log(`\n${colors.magenta}For PM2 deployment:${colors.reset}`);
    console.log(`${colors.cyan}pm2 start src/server.js --name "video-processor" --env production${colors.reset}\n`);
  }

  rl.close();
}

// Run setup
setup();
