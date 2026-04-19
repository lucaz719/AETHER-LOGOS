#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20

cd app
npm run build
BUILD_STATUS=$?

cd ..
if [ $BUILD_STATUS -eq 0 ]; then
  git add .
  git commit -m "feat: complete AETHER-LOGOS premium UI and deploy on localnet"
else
  echo "Build failed. Aborting commit."
fi
