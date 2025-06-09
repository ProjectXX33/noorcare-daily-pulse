#!/bin/bash

# Build and Deploy Script for Plesk Hosting
# Usage: ./build-and-deploy.sh

echo "🏗️  Building NoorHub application..."

# Build the application
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    echo "🚀 Deploying to Plesk hosting..."
    
    # Deploy using FTP script
    node deploy-to-plesk.js
    
    if [ $? -eq 0 ]; then
        echo "🎉 Deployment completed successfully!"
        echo "🌐 Your app is live at: https://noorreport.nooralqmar.com/"
        
        # Optional: Open the site in browser
        # open https://noorreport.nooralqmar.com/  # macOS
        # start https://noorreport.nooralqmar.com/ # Windows
        
    else
        echo "❌ Deployment failed!"
        exit 1
    fi
else
    echo "❌ Build failed!"
    exit 1
fi 