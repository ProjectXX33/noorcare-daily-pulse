#!/bin/bash

# Enhanced Build and Deploy Script for Plesk Hosting
# Usage: ./build-and-deploy.sh

echo "🏗️  Building NoorHub application..."

# Update version first
echo "📝 Updating version..."
node build-version.js

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
        
        echo "🔄 Triggering system refresh..."
        
        # Create cache-busting update trigger
        echo "$(date +%s)" > public/update-trigger.txt
        
        # Update service worker version
        node update-sw-version.cjs
        
        # Send notification to all connected clients (if notification system is available)
        curl -X POST "https://noorreport.nooralqmar.com/api/admin/broadcast-update" \
             -H "Content-Type: application/json" \
             -d '{"message":"System updated! Please refresh your app.","version":"'$(cat public/version.json | grep version | cut -d'"' -f4)'"}' \
             2>/dev/null || echo "⚠️  Could not send broadcast notification (optional)"
        
        echo ""
        echo "🔔 IMPORTANT: To ensure all users get the update:"
        echo "   1. PWA users will get automatic update prompts"
        echo "   2. Browser users should refresh (Ctrl+F5 or Cmd+Shift+R)"
        echo "   3. Mobile users should close and reopen the app"
        echo ""
        echo "✨ All systems updated and ready!"
        
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