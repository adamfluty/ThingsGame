#!/usr/bin/env bash
set -euo pipefail

# Quick build script for development - builds both client and server
# Usage: ./build.sh [--client-only|--server-only]

BUILD_CLIENT=true
BUILD_SERVER=true
WORKDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --client-only) BUILD_SERVER=false;;
    --server-only) BUILD_CLIENT=false;;
    *) echo "Unknown arg: $1" >&2; echo "Usage: $0 [--client-only|--server-only]" >&2; exit 1;;
  esac
  shift
done

echo "🔨 Building Fluty Things..."
echo "Working directory: $WORKDIR"
echo

cd "$WORKDIR"

if [ "$BUILD_CLIENT" = true ]; then
  echo "📦 Building client application..."
  cd client
  echo "  - Installing dependencies..."
  npm install --silent
  echo "  - Building React app..."
  npm run build
  echo "  ✅ Client build complete (dist/ updated)"
  cd ..
  echo
fi

if [ "$BUILD_SERVER" = true ]; then
  echo "🔧 Building server application..."
  cd server
  echo "  - Installing dependencies..."
  npm install --silent
  echo "  - Compiling TypeScript..."
  npm run build
  echo "  ✅ Server build complete (dist/ updated)"
  cd ..
  echo
fi

echo "🎉 Build complete!"

if [ "$BUILD_CLIENT" = true ] && [ "$BUILD_SERVER" = true ]; then
  echo "💡 To deploy: ./deploy.sh --skip-build"
elif [ "$BUILD_CLIENT" = true ]; then
  echo "💡 Client files ready in client/dist/"
elif [ "$BUILD_SERVER" = true ]; then
  echo "💡 Server files ready in server/dist/"
fi
