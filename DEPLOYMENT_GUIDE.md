# 🚀 Deployment Guide

## Quick Deployment Commands

### 🔄 **Standard Deployment (Recommended)**
```bash
npm run deploy:ci
```
This runs: `npm ci` → `npm run build` → deploys to host

### 🆕 **Fresh Deployment (Clean Install)**
```bash
npm run deploy:fresh
```
This runs: removes `node_modules` → `npm ci` → `npm run build` → deploys

### 🧪 **Staging Deployment**
```bash
npm run deploy:ci-staging
```

## 📋 **What Happens During Deployment**

### 1. **Cache Clearing System** ✅
- **Service Worker** (`public/sw.js`) version incremented to `3.2.4`
- **ALL browser caches** are automatically cleared on every update
- **Login sessions preserved** (Supabase auth tokens kept safe)
- **Users see updates immediately** without manual refresh

### 2. **Notification Limit System** ✅  
- **Maximum 10 notifications** per user automatically enforced
- **Oldest notifications deleted** when limit exceeded
- **Database triggers** handle this automatically
- **Manual cleanup functions** available

### 3. **Build Process**
```bash
npm ci                    # Clean install dependencies
npm run build            # Build production bundle
node deploy-to-plesk.js  # Deploy to your host
```

## 🔧 **New Features Deployed**

### **Automatic Cache Clearing**
- Every update clears ALL caches
- Users stay logged in
- Updates show immediately
- No user action required

### **Notification Management**
- Max 10 notifications per user
- Automatic cleanup of old notifications
- Database-level enforcement
- Admin utilities available

## 🗄️ **Database Updates Required**

Run this SQL script in your database:
```bash
# Upload and run this file in your database
add_notification_limit_system.sql
```

This adds:
- Automatic notification limit triggers
- Cleanup functions
- Statistics views
- Admin utilities

## 🛠️ **Manual Utilities Available**

### **In Browser Console:**
```javascript
// Clear cache while keeping login
clearCacheKeepAuth()

// Clean up old notifications for all users
cleanupNotifications()

// Recalculate overtime hours
recalculateOvertime()
```

### **Database Queries:**
```sql
-- See notification statistics
SELECT * FROM get_notification_stats();

-- Clean up all user notifications
SELECT * FROM cleanup_all_user_notifications(10);

-- View users with too many notifications
SELECT * FROM users_with_excess_notifications;
```

## 📊 **Monitoring & Verification**

### **Check Cache Clearing:**
1. Deploy new version
2. Users should see toast: "App updated! Cache cleared successfully 🎉"
3. Page auto-refreshes after 2 seconds
4. Users remain logged in

### **Check Notification Limits:**
1. Create 15+ notifications for a test user
2. System should automatically keep only 10 newest
3. Check console logs for cleanup messages

## 🚨 **Troubleshooting**

### **Cache Issues:**
```javascript
// Force manual cache clear
clearCacheKeepAuth()
```

### **Notification Issues:**
```javascript
// Clean up notifications manually
cleanupNotifications()
```

### **Build Issues:**
```bash
# Clean reinstall
npm run deploy:fresh
```

## 📈 **Version History**

- **v3.2.4**: Added automatic cache clearing + notification limits
- **v3.2.3**: Previous version
- **Cache cleared on every update**
- **Login sessions preserved**

## ⚡ **Performance Impact**

### **Cache Clearing:**
- ✅ Faster update delivery
- ✅ No stale content issues  
- ✅ Users see changes immediately
- ✅ Login sessions preserved

### **Notification Limits:**
- ✅ Reduced database size
- ✅ Faster notification queries
- ✅ Better performance
- ✅ Automatic maintenance

## 🎯 **Success Indicators**

After deployment, you should see:

1. **Service Worker logs:** "ALL caches cleared successfully"
2. **User notifications:** "App updated! Cache cleared successfully 🎉"
3. **Database logs:** "Notification limit maintained"
4. **Users:** Stay logged in and see updates immediately

## 📞 **Support Commands**

```bash
# Check current version
npm run version:update

# Test update system  
npm run test:update-system

# Quick deploy without build
npm run quick-deploy

# Create deployment zip
npm run zip-deploy
```

---

**✅ Ready to deploy!** Use `npm run deploy:ci` for standard deployment with all new features. 