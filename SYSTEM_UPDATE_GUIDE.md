# System Update & Refresh Guide

## Overview
This system provides automatic update detection and refresh functionality for all users after deployment. It ensures everyone gets the latest version without manual intervention.

## 🚀 Quick Deployment

### Option 1: Enhanced Deployment (Recommended)
```bash
npm run deploy:refresh
```

### Option 2: Manual Steps
```bash
# On server
git pull origin main
npm ci
npm run build

# Then run the refresh script
node deploy-with-refresh.js
```

### Option 3: Traditional Deployment
```bash
# Use existing deployment script
./build-and-deploy.sh
```

## 🔄 How It Works

### 1. **Automatic Update Detection**
- `AutoRefreshManager` component checks for updates every 2 minutes
- Compares current `update-trigger.txt` with stored version
- Shows update prompt when new version is detected

### 2. **Service Worker Cache Management**
- Automatically updates service worker version
- Clears old caches to prevent conflicts
- Forces fresh asset loading

### 3. **User Notification System**
- **PWA Users**: Full-screen update prompt with instructions
- **Browser Users**: Toast notification with refresh button
- **Mobile Users**: Notification to close and reopen app

### 4. **Smart Cache Clearing**
- Preserves user preferences (theme, language, etc.)
- Clears application data for fresh start
- Maintains authentication state

## 📱 User Experience

### PWA Users
1. Automatic update prompt appears
2. Click "Refresh Now" button
3. App automatically restarts with new version

### Browser Users
1. Toast notification appears: "🚀 System Update Available!"
2. Click "Refresh Now" in toast
3. Page reloads with cache bypass

### Mobile Users
1. Notification appears in app
2. Close app completely
3. Reopen from home screen/app drawer

## 🛠️ Technical Components

### Core Files
- `src/components/AutoRefreshManager.tsx` - Main update detection component
- `update-sw-version.js` - Service worker version updater
- `deploy-with-refresh.js` - Enhanced deployment script
- `public/update-trigger.txt` - Update detection trigger file

### Integration Points
- `MainLayout.tsx` - Includes AutoRefreshManager
- `public/sw.js` - Service worker with cache management
- `public/version.json` - Version information for PWA checker

## 🔧 Configuration

### Update Check Interval
```typescript
// In MainLayout.tsx
<AutoRefreshManager checkInterval={2 * 60 * 1000} /> // 2 minutes
```

### Preserved Data Keys
```typescript
const preserveKeys = [
  'theme', 
  'language', 
  'preferredLanguage',
  'chatSoundEnabled',
  'notificationPreferences',
  'last-update-trigger'
];
```

## 📊 Monitoring & Debugging

### Console Logs
```javascript
// Check for update detection
console.log('[AutoRefresh] Update detected:', { current, last });

// Monitor service worker updates
console.log('[SW] Installing version', APP_VERSION);

// Track cache clearing
console.log('[SW] Deleting old cache:', cacheName);
```

### Storage Inspection
```javascript
// Check last known trigger
localStorage.getItem('last-update-trigger');

// Check current app version
localStorage.getItem('app-version');
```

## 🚨 Troubleshooting

### Users Not Getting Updates
1. Check `public/update-trigger.txt` exists and has new timestamp
2. Verify service worker is active: DevTools > Application > Service Workers
3. Clear browser cache manually: Ctrl+Shift+Delete

### PWA Not Updating
1. Ensure PWA is properly installed
2. Check PWA manifest and service worker registration
3. Force refresh: Close app completely and reopen

### Cache Issues
1. Clear all browser data for the domain
2. Unregister service worker in DevTools
3. Hard refresh: Ctrl+F5 or Cmd+Shift+R

## 🎯 Best Practices

### For Developers
1. Always use `npm run deploy:refresh` for production deployments
2. Test update flow in development environment first
3. Monitor console logs for update detection issues
4. Keep `update-trigger.txt` in version control

### For Users
1. Allow notifications for update alerts
2. Keep PWA updated for best experience
3. Close and reopen mobile apps when prompted
4. Use hard refresh if automatic update fails

## 📈 Performance Impact

### Minimal Overhead
- Update checks: ~1KB network request every 2 minutes
- Cache clearing: Only when update detected
- Background processing: Minimal CPU usage

### Network Optimization
- Cache-busting parameters prevent stale data
- Efficient file size checks
- Graceful fallbacks for network errors

## 🔐 Security Considerations

### Data Preservation
- User authentication preserved during updates
- Personal preferences maintained
- Sensitive data cleared appropriately

### Update Verification
- Timestamp-based update detection
- No external dependencies for core functionality
- Secure service worker implementation

## 📝 Deployment Checklist

- [ ] Run `npm run deploy:refresh`
- [ ] Verify `update-trigger.txt` has new timestamp
- [ ] Check service worker updated in DevTools
- [ ] Test update prompt appears for existing users
- [ ] Confirm cache clearing works properly
- [ ] Validate preserved data remains intact

## 🎉 Success Indicators

### Deployment Success
- ✅ Build completed without errors
- ✅ Service worker version updated
- ✅ Update trigger file created
- ✅ Files deployed to server

### User Update Success
- ✅ Update prompt appears automatically
- ✅ Refresh completes without errors
- ✅ New version visible in app
- ✅ User preferences preserved

---

**Need Help?** Check the console logs for detailed information about the update process, or contact the development team for assistance. 