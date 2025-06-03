# Media Buyer Dashboard Guide

## Overview

Media Buyers now have access to specialized functionality for managing calendar events and assigning design tasks to designers. This feature enables Media Buyers to coordinate projects and manage design workflows efficiently.

## Features

### 🗓️ Calendar Management
- **Full Calendar Access**: View, create, edit, and delete calendar events
- **Event Creation**: Add new events with title, description, start/end times
- **Event Editing**: Modify existing events directly from the calendar
- **Interactive Calendar**: Click dates to create new events, click events to edit them

### 🎨 Task Assignment to Designers
- **Designer-Only Assignment**: Tasks can only be assigned to employees with "Designer" position
- **Task Creation**: Create detailed design tasks with title, description, and initial status
- **Task Tracking**: Monitor assigned tasks with progress visibility
- **Status Management**: Set initial task status (Not Started, On Hold, In Progress, Complete)

## Access Control

### Who Can Access?
- **Media Buyers**: Full access to calendar and task assignment features
- **Administrators**: Full access to all functionality (can also use this feature)
- **Other Roles**: No access to Media Buyer dashboard

### Calendar Permissions
- **Media Buyers & Admins**: Can create, edit, and delete events
- **Other Users**: Can only view events (in the general Events page)

## How to Use

### Accessing the Dashboard
1. Login as a Media Buyer or Administrator
2. Navigate to "Media Buyer Tasks" in the sidebar menu
3. Choose between "Calendar & Events" and "Design Tasks" tabs

### Managing Calendar Events

#### Creating New Events
1. Go to the "Calendar & Events" tab
2. Click on any date in the calendar OR click the "Add Event" button
3. Fill in the event details:
   - **Title**: Event name (required)
   - **Description**: Additional details (optional)
   - **Start Date & Time**: When the event begins (required)
   - **End Date & Time**: When the event ends (optional)
4. Click "Create Event"

#### Editing Events
1. Click on an existing event in the calendar
2. Modify the event details
3. Click "Update Event" to save changes
4. Use "Delete" button to remove the event

### Assigning Tasks to Designers

#### Creating Design Tasks
1. Go to the "Design Tasks" tab
2. Click "Assign Task" button
3. Fill in the task details:
   - **Task Title**: Brief description of the design work (required)
   - **Description**: Detailed requirements and specifications
   - **Assign to Designer**: Select from available designers (required)
   - **Initial Status**: Set starting status for the task
4. Click "Assign Task"

#### Monitoring Tasks
- View all tasks you've assigned in the "Design Tasks" tab
- See task progress, assigned designer, and creation date
- Progress bars show completion percentage
- Status badges indicate current task state

## Navigation Structure

```
Media Buyer Dashboard
├── Calendar & Events Tab
│   ├── Interactive Calendar View
│   ├── Add Event Button
│   └── Event Creation/Edit Dialog
└── Design Tasks Tab
    ├── Assigned Tasks List
    ├── Assign Task Button
    └── Task Assignment Dialog
```

## Task Status Types

- **Not Started**: Task has been assigned but work hasn't begun
- **On Hold**: Task is paused or waiting for input
- **In Progress**: Designer is actively working on the task
- **Complete**: Task has been finished

## Integration with Existing System

### Notifications
- Designers receive notifications when assigned new tasks
- Task updates trigger appropriate notifications
- Event creation sends notifications to all users

### Permissions
- Media Buyer role integrates with existing role-based access control
- Calendar events visible to all users in the general Events page
- Tasks appear in designers' task lists

### Database
- Events stored in `events` table with full audit trail
- Tasks stored in `tasks` table with assignment tracking
- All activities logged with creator/updater information

## Best Practices

### For Media Buyers
1. **Detailed Descriptions**: Provide comprehensive task descriptions for designers
2. **Realistic Deadlines**: Set appropriate event times and task expectations
3. **Regular Monitoring**: Check task progress regularly
4. **Clear Communication**: Use descriptive titles and detailed descriptions

### For Administrators
1. **Role Assignment**: Ensure users have correct Media Buyer role/position
2. **Designer Management**: Maintain up-to-date designer list
3. **System Monitoring**: Monitor task assignment patterns and workload

## Troubleshooting

### Common Issues

#### Cannot Access Media Buyer Dashboard
- **Solution**: Verify user has "Media Buyer" position or "admin" role
- **Check**: User profile in Admin > Employees

#### No Designers Available for Assignment
- **Solution**: Ensure there are users with "Designer" position
- **Check**: Employee list has active designers

#### Events Not Saving
- **Solution**: Check required fields (Title, Start Date)
- **Check**: Network connectivity and permissions

#### Tasks Not Appearing for Designers
- **Solution**: Verify designer user ID is correct
- **Check**: Task assignment in Admin > Tasks

## Technical Details

### Database Tables Used
- `events`: Calendar events storage
- `tasks`: Task assignments and tracking
- `users`: Employee information and roles
- `notifications`: System notifications

### API Endpoints
- Event management via `eventService`
- Task creation via `tasksApi`
- Employee lookup via `employeesApi`

### Security
- Role-based access control
- User authentication required
- Input validation and sanitization

## Future Enhancements

Potential improvements for future versions:
- Task deadline management
- Advanced filtering and search
- Bulk task operations
- Integration with external calendar systems
- Advanced reporting and analytics
- Task templates and workflows 