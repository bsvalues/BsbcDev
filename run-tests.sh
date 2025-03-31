#!/bin/bash

# Set Node environment to test
export NODE_ENV=test

# Run Jest tests with ESM support and improved options
NODE_OPTIONS="--experimental-vm-modules --max-old-space-size=512" npx jest --testTimeout=5000 --no-cache --detectOpenHandles "$@"

# Display additional information if tests fail
if [ $? -ne 0 ]; then
  echo "Tests failed. Check error messages above."
  exit 1
fi