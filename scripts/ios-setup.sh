#!/bin/bash
# Run on macOS after: (1) cloning the repo, (2) creating .env.local (see README/notes).
# Installs deps, builds the web app, syncs to iOS, and opens Xcode.
set -e

echo "==> Installing dependencies..."
npm install

echo "==> Building web app..."
npm run build

echo "==> Syncing to iOS..."
npx cap sync ios

echo "==> Opening Xcode..."
npx cap open ios

echo ""
echo "Done. In Xcode:"
echo "  1. Select the 'App' target -> Signing & Capabilities"
echo "  2. Tick 'Automatically manage signing', pick your Team (Apple ID)"
echo "  3. Choose a simulator (or your plugged-in iPhone) at the top"
echo "  4. Press the Run (play) button"
