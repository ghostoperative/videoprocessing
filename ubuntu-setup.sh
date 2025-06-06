#!/bin/bash

# Ubuntu 24.04 LTS (2024) Production Setup Script for FFmpeg Video Processing Engine
# This script automates the deployment of the FFmpeg Video Processing Engine on Ubuntu Server
# Run as root or with sudo privileges

set -e # Exit immediately if a command exits with a non-zero status

# Color definitions for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║   FFmpeg Video Processing Engine - Ubuntu 24.04 Setup  ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run this script with sudo or as root${NC}"
  exit 1
fi

# Configuration variables - customize these
APP_USER="ffmpeg-app"
APP_DIR="/opt/ffmpeg-video-processor"
DOMAIN=""
EMAIL=""
NODE_VERSION="20"
APP_PORT="3000"
MAX_FILE_SIZE="100000000" # 100MB

# Function to prompt for values
prompt_for_value() {
  local prompt=$1
  local default=$2
  local var_name=$3
  local current_value=${!var_name}
  
  if [ -z "$current_value" ]; then
    read -p "$prompt [$default]: " input
    if [ -z "$input" ]; then
      eval "$var_name=\"$default\""
    else
      eval "$var_name=\"$input\""
    fi
  fi
}

# Prompt for configuration values
echo -e "${BLUE}Configuration Setup${NC}"
prompt_for_value "Enter domain name for the application" "api.example.com" DOMAIN
prompt_for_value "Enter email address for SSL notifications" "admin@example.com" EMAIL
prompt_for_value "Enter application port" "3000" APP_PORT
prompt_for_value "Enter maximum file size in bytes" "100000000" MAX_FILE_SIZE

# Update and install dependencies
echo -e "\n${BLUE}Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

# Install essential tools
echo -e "\n${BLUE}Installing essential tools...${NC}"
apt-get install -y curl wget gnupg2 ca-certificates lsb-release apt-transport-https git unzip

# Install FFmpeg
echo -e "\n${BLUE}Installing FFmpeg...${NC}"
apt-get install -y ffmpeg
ffmpeg -version

# Install Node.js
echo -e "\n${BLUE}Installing Node.js ${NODE_VERSION}...${NC}"
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
  echo -e "${GREEN}Node.js $(node -v) installed${NC}"
else
  echo -e "${GREEN}Node.js $(node -v) already installed${NC}"
fi

# Install PM2 globally
echo -e "\n${BLUE}Installing PM2...${NC}"
npm install -g pm2

# Create application user
echo -e "\n${BLUE}Creating application user...${NC}"
if ! id -u $APP_USER &>/dev/null; then
  useradd -m -s /bin/bash $APP_USER
  echo -e "${GREEN}User $APP_USER created${NC}"
else
  echo -e "${GREEN}User $APP_USER already exists${NC}"
fi

# Create application directory
echo -e "\n${BLUE}Creating application directory...${NC}"
mkdir -p $APP_DIR
mkdir -p $APP_DIR/uploads
mkdir -p $APP_DIR/processed
mkdir -p $APP_DIR/logs

# Set proper ownership and permissions
chown -R $APP_USER:$APP_USER $APP_DIR
chmod -R 755 $APP_DIR

# Clone or copy application code (this assumes the app code is in the current directory)
echo -e "\n${BLUE}Setting up application code...${NC}"
read -p "Deploy from git repository? (y/n) [n]: " deploy_from_git
if [[ $deploy_from_git == "y" || $deploy_from_git == "Y" ]]; then
  read -p "Enter git repository URL: " git_repo
  su - $APP_USER -c "git clone $git_repo $APP_DIR/app"
else
  # Copy from current directory (assuming script is run from the app directory)
  echo -e "${YELLOW}Copying application files from current directory...${NC}"
  cp -r ../ffmpeg-video-processing-engine/* $APP_DIR/app/
fi

# Navigate to app directory
cd $APP_DIR/app

# Install dependencies
echo -e "\n${BLUE}Installing Node.js dependencies...${NC}"
su - $APP_USER -c "cd $APP_DIR/app && npm install --production"

# Create .env file for production
echo -e "\n${BLUE}Creating production .env file...${NC}"
cat > $APP_DIR/app/.env <<EOL
NODE_ENV=production
PORT=$APP_PORT
UPLOAD_DIR=../uploads
PROCESSED_DIR=../processed
MAX_FILE_SIZE=$MAX_FILE_SIZE
BASE_URL=https://$DOMAIN
ALLOWED_ORIGINS=https://$DOMAIN
# Generate random API key
API_KEY=$(openssl rand -hex 32)
EOL

# Set proper permissions for .env
chown $APP_USER:$APP_USER $APP_DIR/app/.env
chmod 600 $APP_DIR/app/.env

# Setup PM2 for the application
echo -e "\n${BLUE}Setting up PM2 process manager...${NC}"
su - $APP_USER -c "cd $APP_DIR/app && PM2_HOME=$APP_DIR/.pm2 pm2 start src/server.js --name 'video-processor' --env production"
su - $APP_USER -c "PM2_HOME=$APP_DIR/.pm2 pm2 save"

# Generate PM2 startup script
echo -e "\n${BLUE}Setting up PM2 to start on system boot...${NC}"
env PM2_HOME=$APP_DIR/.pm2 pm2 startup systemd -u $APP_USER --hp /home/$APP_USER
systemctl enable pm2-$APP_USER

# Install Nginx
echo -e "\n${BLUE}Installing and configuring Nginx...${NC}"
apt-get install -y nginx

# Configure firewall if enabled
if command -v ufw &> /dev/null; then
  echo -e "\n${BLUE}Configuring firewall...${NC}"
  ufw allow 'Nginx Full'
  ufw allow ssh
  ufw --force enable
  ufw status
fi

# Install Certbot for SSL
echo -e "\n${BLUE}Installing Certbot for SSL...${NC}"
apt-get install -y certbot python3-certbot-nginx

# Create Nginx configuration
echo -e "\n${BLUE}Creating Nginx configuration...${NC}"
cat > /etc/nginx/sites-available/$DOMAIN <<EOL
server {
    listen 80;
    server_name $DOMAIN;

    # Redirect HTTP to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name $DOMAIN;
    
    # SSL configuration will be added by Certbot
    
    # Logging
    access_log /var/log/nginx/$DOMAIN.access.log;
    error_log /var/log/nginx/$DOMAIN.error.log;
    
    # Upload size limit
    client_max_body_size $(($MAX_FILE_SIZE / 1000000))M;
    
    # Proxy settings
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Increase timeouts for large uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOL

# Enable site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx

# Obtain SSL certificate
echo -e "\n${BLUE}Obtaining SSL certificate from Let's Encrypt...${NC}"
certbot --nginx --non-interactive --agree-tos -m $EMAIL -d $DOMAIN

# Setup logrotate for log files
echo -e "\n${BLUE}Setting up log rotation...${NC}"
cat > /etc/logrotate.d/ffmpeg-video-processor <<EOL
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $APP_USER $APP_USER
    sharedscripts
    postrotate
        PM2_HOME=$APP_DIR/.pm2 pm2 reloadLogs
    endscript
}
EOL

# Setup cron job to renew SSL certificates
echo -e "\n${BLUE}Setting up automated SSL renewal...${NC}"
echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'" | crontab -

# Set up basic monitoring (optional)
echo -e "\n${BLUE}Setting up basic monitoring...${NC}"
cat > $APP_DIR/app/monitor.sh <<EOL
#!/bin/bash
# Monitor script for FFmpeg Video Processing Engine

# Check if the application is running
if ! PM2_HOME=$APP_DIR/.pm2 pm2 status | grep -q "video-processor.*online"; then
    echo "video-processor is down! Restarting..."
    PM2_HOME=$APP_DIR/.pm2 pm2 restart video-processor
    echo "Service restarted at \$(date)" >> $APP_DIR/logs/restart.log
fi

# Check disk space
DISK_USAGE=\$(df -h / | grep / | awk '{print \$5}' | sed 's/%//')
if [ \$DISK_USAGE -gt 90 ]; then
    echo "WARNING: Disk usage is at \$DISK_USAGE%" >> $APP_DIR/logs/disk_warning.log
fi

# Check upload directory size
UPLOAD_SIZE=\$(du -sm $APP_DIR/uploads | awk '{print \$1}')
if [ \$UPLOAD_SIZE -gt 5000 ]; then
    echo "WARNING: Upload directory size is \$UPLOAD_SIZE MB" >> $APP_DIR/logs/disk_warning.log
fi
EOL

chmod +x $APP_DIR/app/monitor.sh
chown $APP_USER:$APP_USER $APP_DIR/app/monitor.sh

# Add monitor script to crontab
echo -e "\n${BLUE}Setting up monitoring cron job...${NC}"
(crontab -u $APP_USER -l 2>/dev/null || echo "") | { cat; echo "*/10 * * * * $APP_DIR/app/monitor.sh"; } | crontab -u $APP_USER -

# Cleanup
echo -e "\n${BLUE}Cleaning up...${NC}"
apt-get autoremove -y
apt-get clean

# Final instructions
echo -e "\n${GREEN}===== Installation Complete! =====${NC}"
echo -e "${YELLOW}Your FFmpeg Video Processing Engine is now running at https://$DOMAIN${NC}"
echo -e "${YELLOW}The API is secured with an API key: $(grep API_KEY $APP_DIR/app/.env | cut -d= -f2)${NC}"
echo -e "${YELLOW}Please make sure to keep this key secure!${NC}"
echo -e "\n${BLUE}Useful commands:${NC}"
echo -e "  - View application logs: ${CYAN}sudo su - $APP_USER -c \"PM2_HOME=$APP_DIR/.pm2 pm2 logs video-processor\"${NC}"
echo -e "  - Restart application: ${CYAN}sudo su - $APP_USER -c \"PM2_HOME=$APP_DIR/.pm2 pm2 restart video-processor\"${NC}"
echo -e "  - View Nginx logs: ${CYAN}sudo tail -f /var/log/nginx/$DOMAIN.error.log${NC}"
echo -e "  - Edit environment variables: ${CYAN}sudo nano $APP_DIR/app/.env${NC}"
echo -e "\nThank you for using FFmpeg Video Processing Engine!"
