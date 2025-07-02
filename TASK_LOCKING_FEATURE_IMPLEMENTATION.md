# Task Locking Feature Implementation Guide

## Overview

This document describes the implementation of the **Task Locking Feature**, which provides administrators with the ability to explicitly lock any task, preventing employees from editing, updating progress, or commenting on locked tasks.

## Key Features

- **Explicit Locking**: Admins can lock/unlock any task using a dedicated switch
- **Automatic Status Management**: Locked tasks automatically get "Unfinished" status, unlocked tasks get "On Hold" status
- **Employee Protection**: Locked tasks are completely read-only for employees
- **Database Integrity**: Uses a dedicated `is_locked` boolean column for reliable locking

## Database Changes

### New Column: `is_locked`

The `tasks` table now includes a new boolean column:

```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
```

### Migration Script

Run the migration script to add the new column:

```bash
# Apply the migration
psql -h your-supabase-host -p 5432 -U postgres -d postgres -f add_is_locked_to_tasks.sql
```

The migration script:
1. Adds the `is_locked` column with default value `FALSE`
2. Sets existing "Unfinished" tasks to have `is_locked = TRUE`
3. Verifies the table structure
4. Provides completion confirmation

## Frontend Implementation

### Type Definitions

Updated `src/types/index.ts`:

```typescript
export interface Task {
  // ... existing properties
  isLocked?: boolean;
}

export type TaskRecord = {
  // ... existing properties
  is_locked?: boolean;
}
```

### Admin Interface (`AdminTasksPage.tsx`)

**New Features:**
- **Lock Task Switch**: Toggle switch in the edit task dialog
- **Automatic Status Management**: When locked, status becomes "Unfinished"; when unlocked, status becomes "On Hold"
- **Visual Feedback**: Clear indication of lock state

**Implementation:**
```typescript
// State includes isLocked property
const [editingTask, setEditingTask] = useState({
  // ... existing properties
  isLocked: false,
});

// Lock switch in edit dialog
<div className="flex items-center space-x-2 rounded-lg border p-4 shadow-sm bg-background">
  <Switch
    id="lock-task"
    checked={editingTask.isLocked}
    onCheckedChange={(checked) => setEditingTask({ ...editingTask, isLocked: checked })}
  />
  <Label htmlFor="lock-task" className="flex flex-col space-y-1">
    <span className="font-medium">Lock Task</span>
    <span className="text-xs text-muted-foreground">
      When locked, the task status becomes "Unfinished" and employees cannot edit it.
    </span>
  </Label>
</div>
```

### Employee Interface (`EmployeeTasksPage.tsx`)

**Lock Detection:**
```typescript
// Updated helper function
const isTaskLocked = (task: EnhancedTask) => {
  return task.isLocked === true;
};
```

**UI Restrictions:**
- Progress update controls are disabled
- Comment form is hidden
- Clear visual indicators show locked state
- Warning messages explain the lock

**Visual Indicators:**
- 🔒 Lock icon
- Red warning banners
- "Task Locked" badges
- Disabled form controls

## Backend Implementation

### API Updates (`src/lib/tasksApi.ts`)

**Task Update Logic:**
```typescript
// Handle task locking
if (updates.isLocked === true) {
  dbUpdates.is_locked = true;
  dbUpdates.status = 'Unfinished';
} else if (updates.isLocked === false) {
  dbUpdates.is_locked = false;
  dbUpdates.status = 'On Hold'; // Revert to default status
}
```

**Comment Protection:**
```typescript
// Check if task is locked before allowing comments
const { data: taskStatusData, error: statusError } = await supabase
  .from('tasks')
  .select('is_locked')
  .eq('id', taskId)
  .single();

if (taskStatusData.is_locked) {
  throw new Error('Cannot add comment: Task is locked.');
}
```

**Data Mapping:**
```typescript
// Include isLocked in returned task objects
const updatedTask: Task = {
  // ... existing properties
  isLocked: data.is_locked,
};
```

## Usage Instructions

### For Administrators

1. **Lock a Task:**
   - Open the task edit dialog
   - Toggle the "Lock Task" switch to ON
   - Save the task
   - The task status will automatically change to "Unfinished"

2. **Unlock a Task:**
   - Open the task edit dialog
   - Toggle the "Lock Task" switch to OFF
   - Save the task
   - The task status will automatically change to "On Hold"

### For Employees

**Locked Task Behavior:**
- Cannot update progress
- Cannot add comments
- Cannot modify any task details
- Clear visual indicators show the task is locked
- Warning messages explain why actions are disabled

**Visual Indicators:**
- 🔒 Lock icon in task details
- Red warning banners
- "Task Locked" status badges
- Disabled form controls with explanatory text

## Security Features

### Server-Side Protection

1. **API Validation**: All task updates check the `is_locked` status before processing
2. **Comment Protection**: Comments are blocked for locked tasks at the API level
3. **Status Enforcement**: Locked tasks automatically get "Unfinished" status

### Client-Side Protection

1. **UI Disabling**: All interactive elements are disabled for locked tasks
2. **Visual Feedback**: Clear indicators show when tasks are locked
3. **Error Handling**: Graceful error messages when locked tasks are accessed

## Migration from Previous System

### Backward Compatibility

- Existing "Unfinished" status tasks are automatically marked as locked
- All existing functionality continues to work
- No data loss during migration

### Data Consistency

The migration ensures:
- All existing "Unfinished" tasks have `is_locked = TRUE`
- All other tasks have `is_locked = FALSE`
- Database constraints remain valid

## Testing Checklist

### Admin Functionality
- [ ] Can lock any task using the switch
- [ ] Locked tasks show "Unfinished" status
- [ ] Unlocked tasks show "On Hold" status
- [ ] Lock state persists after page refresh
- [ ] Can unlock previously locked tasks

### Employee Functionality
- [ ] Locked tasks show lock indicators
- [ ] Progress update controls are disabled
- [ ] Comment form is hidden for locked tasks
- [ ] Clear warning messages are displayed
- [ ] Cannot bypass lock through direct API calls

### Database Integrity
- [ ] `is_locked` column exists and has correct default
- [ ] Existing "Unfinished" tasks are properly migrated
- [ ] Lock state is correctly saved and retrieved
- [ ] API calls respect the lock status

## Troubleshooting

### Common Issues

1. **Migration Errors:**
   - Ensure database supports `BOOLEAN` type
   - Check for existing column conflicts
   - Verify database permissions

2. **Lock Not Working:**
   - Check if `is_locked` column exists
   - Verify API is receiving the correct `isLocked` value
   - Ensure frontend is passing the property correctly

3. **UI Not Updating:**
   - Clear browser cache
   - Check for JavaScript errors
   - Verify component re-renders after state changes

### Debug Commands

```sql
-- Check if is_locked column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'is_locked';

-- Check locked tasks
SELECT id, title, status, is_locked 
FROM tasks 
WHERE is_locked = TRUE;

-- Verify migration
SELECT COUNT(*) as total_tasks,
       COUNT(CASE WHEN status = 'Unfinished' THEN 1 END) as unfinished_tasks,
       COUNT(CASE WHEN is_locked = TRUE THEN 1 END) as locked_tasks
FROM tasks;
```

## Future Enhancements

### Potential Improvements

1. **Bulk Operations**: Lock/unlock multiple tasks at once
2. **Lock History**: Track when and who locked/unlocked tasks
3. **Conditional Locking**: Auto-lock tasks based on certain conditions
4. **Lock Notifications**: Notify employees when their tasks are locked
5. **Lock Scheduling**: Schedule automatic locking/unlocking

### API Extensions

```typescript
// Potential new API endpoints
export const bulkLockTasks = async (taskIds: string[], isLocked: boolean) => { /* ... */ };
export const getLockHistory = async (taskId: string) => { /* ... */ };
export const scheduleTaskLock = async (taskId: string, lockAt: Date) => { /* ... */ };
```

## Conclusion

The Task Locking Feature provides administrators with powerful control over task management while ensuring employees cannot modify locked tasks. The implementation is secure, user-friendly, and maintains data integrity throughout the system.

The feature seamlessly integrates with the existing task management system and provides clear visual feedback to all users about the lock state of tasks. 