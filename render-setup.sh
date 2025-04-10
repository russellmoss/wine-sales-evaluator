#!/bin/bash

# Define environment variables
STORAGE_DIR=${RENDER_STORAGE_DIR:-/var/data/jobs}
PARENT_DIR=$(dirname "$STORAGE_DIR")

echo "========== Render Setup Script =========="
echo "Starting setup for Wine Sales Evaluator"
echo "Current user: $(whoami)"
echo "Current directory: $(pwd)"
echo "Storage directory: $STORAGE_DIR"
echo "Parent directory: $PARENT_DIR"

# Create parent directory if it doesn't exist
if [ ! -d "$PARENT_DIR" ]; then
  echo "Creating parent directory: $PARENT_DIR"
  mkdir -p "$PARENT_DIR"
  if [ $? -ne 0 ]; then
    echo "ERROR: Failed to create parent directory: $PARENT_DIR"
    echo "Trying alternative location..."
    STORAGE_DIR="/tmp/jobs"
    echo "New storage directory: $STORAGE_DIR"
    mkdir -p "$STORAGE_DIR"
  else
    echo "Parent directory created successfully"
  fi
else
  echo "Parent directory already exists"
  ls -la "$PARENT_DIR"
fi

# Create storage directory if it doesn't exist
if [ ! -d "$STORAGE_DIR" ]; then
  echo "Creating storage directory: $STORAGE_DIR"
  mkdir -p "$STORAGE_DIR"
  if [ $? -ne 0 ]; then
    echo "ERROR: Failed to create storage directory: $STORAGE_DIR"
  else
    echo "Storage directory created successfully"
  fi
else
  echo "Storage directory already exists"
fi

# Set permissions
echo "Setting permissions on $STORAGE_DIR"
chmod -R 755 "$STORAGE_DIR"
if [ $? -ne 0 ]; then
  echo "WARNING: Failed to set permissions on $STORAGE_DIR"
else
  echo "Permissions set successfully"
fi

# Show directory contents and permissions
echo "Directory contents and permissions:"
ls -la "$STORAGE_DIR"

# Export the actual storage directory for the application to use
export RENDER_STORAGE_DIR="$STORAGE_DIR"
echo "Exported RENDER_STORAGE_DIR=$RENDER_STORAGE_DIR"

echo "Setup complete!"
echo "======================================" 