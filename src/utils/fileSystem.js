const fs = require('fs');
const path = require('path');

/**
 * Create necessary directories if they don't exist
 */
const setupDirectories = () => {
  const uploadDir = path.join(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads');
  const processedDir = path.join(__dirname, '../../', process.env.PROCESSED_DIR || 'processed');
  const publicDir = path.join(__dirname, '../../public');
  
  // Create upload directory if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Created upload directory: ${uploadDir}`);
  }
  
  // Create processed directory if it doesn't exist
  if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
    console.log(`Created processed directory: ${processedDir}`);
  }

  // Create public directory if it doesn't exist
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log(`Created public directory: ${publicDir}`);
    
    // Create index.html file if it doesn't exist
    const indexPath = path.join(publicDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
      createIndexHtml(indexPath);
      console.log(`Created index.html file: ${indexPath}`);
    }
  }
};

/**
 * Creates a default index.html file for the application
 * @param {string} filePath - Path where to create the index.html file
 */
const createIndexHtml = (filePath) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FFmpeg Video Processing API</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 20px;
            margin-top: 20px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        button {
            background-color: #4CAF50;
            color: white;
            padding: 10px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover {
            background-color: #45a049;
        }
        #result {
            margin-top: 20px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #f9f9f9;
            display: none;
        }
        progress {
            width: 100%;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <h1>FFmpeg Video Processing API</h1>
    <p>Upload a video to process its duration metadata and re-encode if needed.</p>
    
    <div class="container">
        <form id="uploadForm" enctype="multipart/form-data">
            <div class="form-group">
                <label for="videoFile">Select Video File:</label>
                <input type="file" id="videoFile" name="video" accept="video/*" required>
            </div>
            <button type="submit">Process Video</button>
        </form>
        <progress id="uploadProgress" value="0" max="100" style="display: none;"></progress>
    </div>

    <div id="result"></div>

    <script>
        document.getElementById('uploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData();
            const fileInput = document.getElementById('videoFile');
            
            if (fileInput.files.length === 0) {
                alert('Please select a video file');
                return;
            }
            
            formData.append('video', fileInput.files[0]);
            
            const resultDiv = document.getElementById('result');
            resultDiv.style.display = 'none';
            
            const progressBar = document.getElementById('uploadProgress');
            progressBar.style.display = 'block';
            progressBar.value = 0;
            
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/api/process', true);
                
                xhr.upload.onprogress = function(e) {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        progressBar.value = percentComplete;
                    }
                };
                
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        const response = JSON.parse(xhr.responseText);
                        resultDiv.innerHTML = \`
                            <h3>Processing Successful</h3>
                            <p><strong>Video ID:</strong> \${response.videoId}</p>
                            <p><strong>Download URL:</strong> <a href="\${response.downloadUrl}" target="_blank">\${response.downloadUrl}</a></p>
                        \`;
                        resultDiv.style.display = 'block';
                    } else {
                        const error = JSON.parse(xhr.responseText);
                        resultDiv.innerHTML = \`<h3>Error</h3><p>\${error.message || 'An error occurred'}</p>\`;
                        resultDiv.style.display = 'block';
                    }
                    progressBar.style.display = 'none';
                };
                
                xhr.onerror = function() {
                    resultDiv.innerHTML = '<h3>Error</h3><p>Request failed</p>';
                    resultDiv.style.display = 'block';
                    progressBar.style.display = 'none';
                };
                
                xhr.send(formData);
                
            } catch (error) {
                resultDiv.innerHTML = \`<h3>Error</h3><p>\${error.message}</p>\`;
                resultDiv.style.display = 'block';
                progressBar.style.display = 'none';
            }
        });
    </script>
</body>
</html>`;

  fs.writeFileSync(filePath, html);
};

module.exports = {
  setupDirectories
};
