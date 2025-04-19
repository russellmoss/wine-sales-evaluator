#!/bin/bash

# Define environment variables
STORAGE_DIR=${RENDER_STORAGE_DIR:-/opt/render/project/src/.render/storage}
JOBS_DIR=${STORAGE_DIR}/jobs
PDFS_DIR=${STORAGE_DIR}/pdfs
RUBRICS_DIR=${STORAGE_DIR}/rubrics

echo "========== Render Setup Script =========="
echo "Starting setup for Wine Sales Evaluator"
echo "Current user: $(whoami)"
echo "Current directory: $(pwd)"
echo "Storage directory: $STORAGE_DIR"
echo "Jobs directory: $JOBS_DIR"
echo "PDFs directory: $PDFS_DIR"
echo "Rubrics directory: $RUBRICS_DIR"

# Create storage directory if it doesn't exist
if [ ! -d "$STORAGE_DIR" ]; then
  echo "Creating storage directory: $STORAGE_DIR"
  mkdir -p "$STORAGE_DIR"
  if [ $? -ne 0 ]; then
    echo "ERROR: Failed to create storage directory: $STORAGE_DIR"
    echo "Trying alternative location..."
    STORAGE_DIR="/tmp/storage"
    JOBS_DIR=${STORAGE_DIR}/jobs
    PDFS_DIR=${STORAGE_DIR}/pdfs
    RUBRICS_DIR=${STORAGE_DIR}/rubrics
    echo "New storage directory: $STORAGE_DIR"
    mkdir -p "$STORAGE_DIR"
  else
    echo "Storage directory created successfully"
  fi
else
  echo "Storage directory already exists"
  ls -la "$STORAGE_DIR"
fi

# Create jobs directory if it doesn't exist
if [ ! -d "$JOBS_DIR" ]; then
  echo "Creating jobs directory: $JOBS_DIR"
  mkdir -p "$JOBS_DIR"
  if [ $? -ne 0 ]; then
    echo "ERROR: Failed to create jobs directory: $JOBS_DIR"
  else
    echo "Jobs directory created successfully"
  fi
else
  echo "Jobs directory already exists"
fi

# Create PDFs directory if it doesn't exist
if [ ! -d "$PDFS_DIR" ]; then
  echo "Creating PDFs directory: $PDFS_DIR"
  mkdir -p "$PDFS_DIR"
  if [ $? -ne 0 ]; then
    echo "ERROR: Failed to create PDFs directory: $PDFS_DIR"
  else
    echo "PDFs directory created successfully"
  fi
else
  echo "PDFs directory already exists"
fi

# Create rubrics directory if it doesn't exist
if [ ! -d "$RUBRICS_DIR" ]; then
  echo "Creating rubrics directory: $RUBRICS_DIR"
  mkdir -p "$RUBRICS_DIR"
  if [ $? -ne 0 ]; then
    echo "ERROR: Failed to create rubrics directory: $RUBRICS_DIR"
  else
    echo "Rubrics directory created successfully"
  fi
else
  echo "Rubrics directory already exists"
fi

# Set permissions recursively
echo "Setting permissions on $STORAGE_DIR"
chmod -R 777 "$STORAGE_DIR"
if [ $? -ne 0 ]; then
  echo "WARNING: Failed to set permissions on $STORAGE_DIR"
  echo "Trying alternative permissions..."
  chmod -R 755 "$STORAGE_DIR"
  if [ $? -ne 0 ]; then
    echo "ERROR: Failed to set alternative permissions on $STORAGE_DIR"
  else
    echo "Alternative permissions set successfully"
  fi
else
  echo "Permissions set successfully"
fi

# Show directory contents and permissions
echo "Directory contents and permissions:"
ls -la "$STORAGE_DIR"
ls -la "$JOBS_DIR"
ls -la "$PDFS_DIR"
ls -la "$RUBRICS_DIR"

# Export the actual storage directory for the application to use
export RENDER_STORAGE_DIR="$STORAGE_DIR"
echo "Exported RENDER_STORAGE_DIR=$RENDER_STORAGE_DIR"

echo "Setup complete!"
echo "=======================================" 