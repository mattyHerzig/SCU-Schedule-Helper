#!/bin/bash

# Remove the old dist directory
rm -rf dist

# Create a new dist directory
mkdir dist

# Copy the necessary files
cp -r images popup tab ratings service_worker.js content.js manifest.json dist

# Package the dist directory
cd dist
zip -r ../SCU-Schedule-Helper.zip .