// Import required modules
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const fs = require('fs');

// Configure Next.js
const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 10000;

// Create the Next.js app instance
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Log startup information
console.log(`Starting server on port ${port}`);
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Render environment: ${process.env.RENDER === 'true' ? 'Yes' : 'No'}`);
console.log(`Storage directory: ${process.env.RENDER_STORAGE_DIR || '/var/data/jobs'}`);

// Ensure the storage directory exists
const storageDir = process.env.RENDER_STORAGE_DIR || '/var/data/jobs';
try {
  if (!fs.existsSync(storageDir)) {
    console.log(`Creating storage directory: ${storageDir}`);
    fs.mkdirSync(storageDir, { recursive: true });
    console.log(`Storage directory created successfully: ${storageDir}`);
  } else {
    console.log(`Storage directory already exists: ${storageDir}`);
    // Log the contents and permissions
    const stats = fs.statSync(storageDir);
    console.log(`Directory permissions: ${stats.mode}`);
    console.log(`Directory contents: ${fs.readdirSync(storageDir).join(', ') || 'empty'}`);
  }
} catch (error) {
  console.error(`Error with storage directory: ${error.message}`);
  console.error(error);
  // Don't exit process, continue starting the server
}

// Initialize and start the server
app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
}).catch(err => {
  console.error('Error starting server:', err);
  process.exit(1);
}); 