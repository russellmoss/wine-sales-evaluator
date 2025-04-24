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

# Create subdirectories
for dir in "$JOBS_DIR" "$PDFS_DIR" "$RUBRICS_DIR"; do
  if [ ! -d "$dir" ]; then
    echo "Creating directory: $dir"
    mkdir -p "$dir"
    if [ $? -ne 0 ]; then
      echo "ERROR: Failed to create directory: $dir"
    else
      echo "Directory created successfully"
    fi
  else
    echo "Directory already exists: $dir"
  fi
done

# Set proper permissions
echo "Setting permissions for storage directories"
chmod -R 755 "$STORAGE_DIR"
chown -R $(whoami):$(whoami) "$STORAGE_DIR"

# Initialize default rubric if needed
if [ ! -f "$RUBRICS_DIR/wine-sales-default.json" ]; then
  echo "Initializing default rubric"
  cp /opt/render/project/src/docs/wine-sales-rubric.json "$RUBRICS_DIR/wine-sales-default.json"
  if [ $? -ne 0 ]; then
    echo "ERROR: Failed to copy default rubric"
  else
    echo "Default rubric initialized successfully"
  fi
fi

echo "Setup completed successfully"
echo "=======================================" 