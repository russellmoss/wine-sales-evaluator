const path = require('path');

// Get the server from the standalone build
const server = require('./.next/standalone/server.js');

// Get port from environment variable or default to 3000
const port = process.env.PORT || 3000;

// Log startup information
console.log(`Starting server on port ${port}`);
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Render environment: ${process.env.RENDER === 'true' ? 'Yes' : 'No'}`);
console.log(`Storage directory: ${process.env.RENDER_STORAGE_DIR || '/var/data/jobs'}`);

// Start the server
server.listen(port, (err) => {
  if (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
  console.log(`> Ready on port ${port}`);
}); 