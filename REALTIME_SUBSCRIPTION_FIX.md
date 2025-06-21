# Realtime Subscription Fix - Multiple Subscriptions Error

## Problem
Getting error: `Uncaught tried to subscribe multiple times. 'subscribe' can only be called a single time per channel instance`

This error occurs when multiple components try to subscribe to the same channel name, or when a component re-subscribes without properly cleaning up the previous subscription.

## Root Causes & Solutions

### 1. Notification Components Conflict ✅ FIXED
**Problem:** Both `SidebarNavigation.tsx` and `NotificationsMenu.tsx` were using generic channel names causing conflicts.

**Solution:** Used unique, user-specific channel names:
- `SidebarNavigation`: `sidebar-notifications-${user.id}`
- `NotificationsMenu`: `notifications-menu-${user.id}`

### 2. Shift Management Components Conflict ✅ FIXED
**Problem:** Both components were using the same channel name `'shift_assignments_changes'` causing conflicts.

**Solution:** Used component-specific channel names:
- `AdminShiftManagement`: `admin-shift-mgmt-${Date.now()}`
- `WorkShiftTimer`: `work-shift-timer-${user.id}`

### 3. Check-In Components Conflict ✅ FIXED
**Problem:** Multiple check-in related components were subscribing to the same `check_ins` table:
- `CheckInContext`: Using `'check-ins-realtime'` and `'public:check_ins'` 
- `CheckInButton`: Using `'shift_assignments_${user.id}'`
- `WorkShiftTimer`: Using `'work-shift-timer-${user.id}'` for `check_ins` table

**Root Cause:** Multiple subscriptions to the same table (`check_ins`) even with different channel names caused Supabase conflicts.

**Solution:** Staggered subscription initialization with delays:
- `SidebarNavigation`: `sidebar-notifications-${user.id}` for notifications (no delay)
- `CheckInContext`: `simple-checkin-${user.id}-${timestamp}` for check_ins (1 second delay)
- `CheckInButton`: `checkin-button-${user.id}` for shift_assignments (1.5 second delay)
- `WorkShiftTimer`: `work-shift-timer-${user.id}` for shift_assignments & monthly_shifts (2 second delay)
- `CheckInContext` (work reports): `checkin-context-global-reports` for work_reports table (no delay)

## Best Practices Applied

### ✅ Unique Channel Names
```typescript
// ❌ Bad: Generic names
.channel('notifications')
.channel('shift_assignments')
.channel('check-ins-realtime')

// ✅ Good: Component + user-specific names
const channelName = `component-name-${user.id}`;
.channel(channelName)
```

### ✅ Proper Cleanup
```typescript
useEffect(() => {
  if (!user?.id) return; // Guard clause

  const subscription = supabase
    .channel(channelName)
    .on(...)
    .subscribe();

  return () => {
    if (subscription) {
      subscription.unsubscribe();
    }
  };
}, [user?.id]); // Minimal dependencies
```

### ✅ Dependency Management
```typescript
// ❌ Bad: Too many dependencies causing re-subscriptions
}, [user, checkIns, workReports, ...]);

// ✅ Good: Minimal dependencies
}, [user?.id]);
```

## Components Fixed

1. **SidebarNavigation.tsx** - Unique notification channels
2. **NotificationsMenu.tsx** - User-specific channels
3. **AdminShiftManagement.tsx** - Timestamp-based channels
4. **WorkShiftTimer.tsx** - User-specific channels
5. **CheckInContext.tsx** - Component-specific global and user channels
6. **CheckInButton.tsx** - User-specific shift assignment channels

## Testing
- ✅ No more "tried to subscribe multiple times" errors
- ✅ Real-time updates working correctly
- ✅ Proper cleanup on component unmount
- ✅ Check-in page working without subscription conflicts 