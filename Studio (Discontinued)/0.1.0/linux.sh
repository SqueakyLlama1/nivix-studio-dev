#!/bin/bash

# ©2025 Nivix Technology
# DO NOT DISTRIBUTE
# Illegal distribution is punishable by law

echo "(c) 2025 Nivix Technology"
echo "DO NOT DISTRIBUTE"
echo "Illegal distribution is punishable by law"
echo

# --- Add these lines to initialize NVM within the script ---
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # Load nvm if available
# Optional: use a specific Node.js version
# nvm use v24.11.0 >/dev/null 2>&1
# -----------------------------------------------------------

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js was not found. Install it here:"
    echo "https://nodejs.org/en/download"
    read -p "Press [Enter] to continue..."
    exit 1
fi

# Check for node_modules
if [ ! -d "node_modules" ]; then
    echo "node_modules folder not found."
    echo "Installing dependencies..."
    npm install

    if [ $? -ne 0 ]; then
        echo
        echo "npm install failed! Please check your package.json or internet connection."
        read -p "Press [Enter] to continue..."
        exit 1
    fi
fi

# Run the runtime script
echo
echo "Starting runtime.js..."
node runtime.js