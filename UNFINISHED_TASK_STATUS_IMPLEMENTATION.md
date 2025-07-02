# Unfinished Task Status Implementation Guide

## Overview
This document describes the implementation of the "Unfinished" task status feature, which provides administrators with the ability to lock tasks from employee modifications.

## Database Changes

### SQL Migration Required
Run the following SQL migration file in your Supabase database:

```bash
# Execute the migration file
psql -h your-supabase-host -p 5432 -U postgres -d postgres -f add_unfinished_task_status.sql
```

Or execute it directly in the Supabase SQL Editor:
```sql
-- Copy and paste the contents of add_unfinished_task_status.sql
```

### What the Migration Does

1. **Updates Task Status Constraint**: 
   - Old constraint: `('Not Started', 'On Hold', 'In Progress', 'Complete')`
   - New constraint: `('Not Started', 'On Hold', 'In Progress', 'Complete', 'Unfinished')`

2. **Creates Locked Tasks View**: 
   - `locked_tasks_view` - Admin monitoring view for all locked tasks
   - Includes task details and user information

3. **Tests the Implementation**: 
   - Creates and verifies a test task with "Unfinished" status
   - Ensures database accepts the new status value

## Frontend Implementation

### Components Updated

1. **Task Type Definitions** (`src/types/index.ts`)
   - Added 'Unfinished' to Task and TaskRecord interfaces

2. **Admin Interface** (`src/pages/AdminTasksPage.tsx`)
   - Added "Unfinished" option to status dropdowns
   - Red gradient styling for Unfinished status badges
   - Translation support (English: "Unfinished", Arabic: "غير مكتمل")

3. **Employee Interface** (`src/pages/EmployeeTasksPage.tsx`)
   - Lock detection with `isTaskLocked()` function
   - Disabled progress updates for locked tasks
   - Disabled comment additions for locked tasks
   - Visual lock indicators (🔒 icons and warning messages)

4. **Other Pages**:
   - **DesignerDashboard.tsx**: Added Unfinished status support
   - **MediaBuyerTasksPage.tsx**: Updated status types and styling

5. **Task Comments** (`src/components/TaskComments.tsx`)
   - Added `isLocked` prop to prevent comment additions
   - Conditional rendering based on lock status

### API Protection

**Task API** (`src/lib/tasksApi.ts`):
- **updateTask()**: Prevents progress/status updates on locked tasks
- **addTaskComment()**: Blocks comment additions to locked tasks
- Server-side validation with clear error messages

## Feature Specifications

### Locking Behavior
When a task status is set to "Unfinished":

✅ **Admins CAN**:
- View task details
- Edit task information
- Change task status (including unlock by changing status)
- Add comments
- Update progress

❌ **Employees CANNOT**:
- Update task progress
- Change task status
- Add comments
- Edit task details

### Visual Indicators

**Lock Status Badges**:
- Red background with white text
- Lock icon (🔒) displayed
- "Task Locked" text indicators

**Warning Messages**:
- Red-themed alert boxes explaining restrictions
- Clear messaging about why actions are disabled

**UI Restrictions**:
- Grayed-out disabled inputs
- Disabled buttons with lock icons
- Read-only mode indicators

## Usage Examples

### Setting a Task to Unfinished (Admin)
1. Open AdminTasksPage
2. Edit any existing task
3. Change status to "Unfinished"
4. Save changes
5. Task is now locked for employees

### Employee Experience with Locked Task
1. Employee opens locked task
2. Sees red "Task Locked" badge
3. Progress update controls are disabled
4. Comment section shows "Comments (Read Only)"
5. Warning messages explain restrictions

### Unlocking a Task (Admin)
1. Change task status from "Unfinished" to any other status
2. Task becomes editable for employees again

## Monitoring Locked Tasks

### Admin View
Use the `locked_tasks_view` in your database:

```sql
-- View all currently locked tasks
SELECT * FROM locked_tasks_view;
```

### API Query
Fetch locked tasks programmatically:

```typescript
const { data: lockedTasks } = await supabase
  .from('tasks')
  .select('*')
  .eq('status', 'Unfinished');
```

## Color Scheme

The "Unfinished" status uses a consistent red color scheme:

- **Gradient**: `bg-gradient-to-r from-red-500 to-red-600`
- **Text**: White text for contrast
- **Ring**: `ring-red-500/20` for subtle shadow effects
- **Alert Boxes**: Red backgrounds with appropriate text colors

## Error Handling

### Database Level
- CHECK constraint prevents invalid status values
- Clear PostgreSQL error messages for constraint violations

### API Level
- Specific error messages: "Cannot update task: Task is locked (Unfinished status)"
- Proper HTTP error codes and responses

### Frontend Level
- Toast notifications for lock-related errors
- Visual feedback before API calls
- Graceful degradation of UI functionality

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Tasks can be created with "Unfinished" status
- [ ] Employee UI properly locks controls for Unfinished tasks
- [ ] Admin UI allows full control over Unfinished tasks
- [ ] API properly rejects employee modifications to locked tasks
- [ ] Visual indicators display correctly
- [ ] Error messages are clear and helpful

## Deployment Notes

1. **Database First**: Run the SQL migration before deploying frontend changes
2. **Zero Downtime**: The migration is designed to be non-breaking
3. **Rollback**: To rollback, simply remove 'Unfinished' from the status constraint

## Support

For issues with this implementation:
1. Check database constraint is properly updated
2. Verify frontend components have isLocked prop handling
3. Test API endpoints with locked tasks
4. Review console logs for specific error messages 