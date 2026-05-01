#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install root dependencies
npm install

# Build Frontend
cd frontend
npm install
npm run build
cd ..

# Build Backend
cd backend
npm install
npm run build
cd ..
