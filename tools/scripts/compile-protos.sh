#!/bin/bash

# Exit on error
set -e

# Change to project root
cd "$(dirname "$0")/../.."

# Create output directories
mkdir -p libs/core/proto/generated

# Compile proto files to TypeScript
echo "Compiling auth.proto..."
npx pbjs -t static-module -w commonjs -o libs/core/proto/generated/auth.js libs/core/proto/auth.proto
npx pbts -o libs/core/proto/generated/auth.d.ts libs/core/proto/generated/auth.js

echo "Compiling payment.proto..."
npx pbjs -t static-module -w commonjs -o libs/core/proto/generated/payment.js libs/core/proto/payment.proto
npx pbts -o libs/core/proto/generated/payment.d.ts libs/core/proto/generated/payment.js

echo "Proto files compiled successfully!"