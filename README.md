# FFmpeg Video Processing Engine

A secure, production-ready Node.js Express API for processing videos using FFmpeg.

## Features

- Video upload handling with multipart/form-data
- FFmpeg processing: fixes duration metadata and re-encodes videos
- Secure downloadable URLs for processed videos
- File type and size validation
- UUID-based filenames for security
- CORS support for cross-domain requests
- Production-level security with Helmet
- Full error handling
- Rate limiting to prevent abuse

## Prerequisites

- Node.js (v14+)
- FFmpeg installed on your server

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ffmpeg-video-processing-engine.git
cd ffmpeg-video-processing-engine
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file based on the example:
```bash
cp .env.example .env
```

4. Edit `.env` file with your specific configuration

5. Start the server:
```bash
npm start
```

For development:
```bash
npm run dev
```

## Production Deployment

### Automatic Setup

1. Run the production setup script:
```bash
node setup-production.js
```

2. Follow the prompts to configure your production environment

3. Apply the production environment:
```bash
cp .env.production .env
```

4. Install only production dependencies:
```bash
npm install --production
```

### Manual Production Setup

1. Create a production environment file:
```bash
PORT=80
NODE_ENV=production
UPLOAD_DIR=uploads
PROCESSED_DIR=processed
MAX_FILE_SIZE=100000000
ALLOWED_ORIGINS=https://yourwebsite.com
BASE_URL=https://api.yourwebsite.com
API_KEY=your_secure_api_key
```

2. Set up a process manager like PM2:
```bash
npm install -g pm2
pm2 start src/server.js --name "video-processor" --env production
```

3. Configure PM2 to start on system boot:
```bash
pm2 startup
pm2 save
```

### Nginx Reverse Proxy Configuration

For production, it's recommended to use Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name api.yourwebsite.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.yourwebsite.com;
    
    # SSL certificates
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # Upload size limit
    client_max_body_size 100M;
    
    # Proxy settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for large uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

## API Endpoints

### POST /api/process

Upload and process a video file.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: Form data with 'video' field containing the video file

**Response:**
```json
{
  "success": true,
  "videoId": "5f8d3a9c-74ff-4046-b2c8-9f1d3c8a7b3f",
  "downloadUrl": "https://api.yourwebsite.com/downloads/5f8d3a9c-74ff-4046-b2c8-9f1d3c8a7b3f.mp4",
  "message": "Video processed successfully"
}
```

### GET /api/video/:id

Get information about a processed video.

**Request:**
- Method: GET
- URL Parameter: id (the video ID)

**Response:**
```json
{
  "success": true,
  "videoId": "5f8d3a9c-74ff-4046-b2c8-9f1d3c8a7b3f",
  "downloadUrl": "https://api.yourwebsite.com/downloads/5f8d3a9c-74ff-4046-b2c8-9f1d3c8a7b3f.mp4",
  "filename": "5f8d3a9c-74ff-4046-b2c8-9f1d3c8a7b3f.mp4"
}
```

## Integration with XML Templates

### Integration as a Backend Service

You can integrate this video processing engine with your existing XML template system by making API calls from your frontend to this backend service.

#### Example XML Integration:

```xml
<!-- Example XML Template with video processing integration -->
<template>
    <name>Video Processing Form</name>
    <elements>
        <element type="form" id="videoForm">
            <action>https://api.yourwebsite.com/api/process</action>
            <method>POST</method>
            <encoding>multipart/form-data</encoding>
            <fields>
                <field type="file" name="video" label="Select Video" accept="video/*" />
                <field type="submit" label="Process Video" />
            </fields>
        </element>
        <element type="script">
            <![CDATA[
                function handleVideoSubmit(event) {
                    event.preventDefault();
                    
                    const formData = new FormData(document.getElementById('videoForm'));
                    
                    // Display loading state in your XML template
                    updateTemplateState('loading');
                    
                    fetch('https://api.yourwebsite.com/api/process', {
                        method: 'POST',
                        body: formData,
                        headers: {
                            'X-API-KEY': 'your_api_key_here' // If using API key auth
                        }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // Update your XML template with the video result
                            updateTemplateWithVideo(data.videoId, data.downloadUrl);
                        } else {
                            // Handle error in your XML template
                            showErrorInTemplate(data.message);
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        showErrorInTemplate('Failed to process video');
                    });
                }
                
                // Add event listener to your form
                document.getElementById('videoForm').addEventListener('submit', handleVideoSubmit);
            ]]>
        </element>
    </elements>
</template>
```

### Option 2: Embed the API in Your Existing Application

If you already have an XML template engine/application, you can integrate this video processing engine as a module:

1. Install this package in your existing application:
```bash
npm install --save ./path/to/ffmpeg-video-processing-engine
```

2. Import and use it in your application:
```javascript
const { processVideo } = require('ffmpeg-video-processing-engine');

// In your XML template handler
app.post('/process-video-from-template', uploadMiddleware, async (req, res) => {
    try {
        const result = await processVideo(req.file.path, outputPath);
        
        // Update your XML template with the result
        const xmlResponse = generateXmlResponse({
            videoId: result.videoId,
            downloadUrl: result.downloadUrl
        });
        
        res.send(xmlResponse);
    } catch (error) {
        // Handle error
        res.status(500).send(generateXmlError(error.message));
    }
});
```

## Security Considerations

- All uploaded files use UUID-based filenames to prevent path traversal attacks
- File type validation restricts uploads to video files only
- File size limits prevent server overload
- CORS configuration restricts which domains can access the API
- Rate limiting prevents abuse
- HTTP security headers are set using Helmet

## License

[MIT License](LICENSE)
