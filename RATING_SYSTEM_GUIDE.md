# Employee & Task Rating System Guide

## Overview

The Employee & Task Rating System allows administrators to rate both employees and tasks using a 5-star rating system with optional comments. This system helps track performance and provides feedback to employees.

## Features

### ✅ Employee Rating System
- **Admin-only access**: Only users with admin role can rate employees
- **5-star rating scale**: Simple 1-5 star rating system with visual feedback
- **Optional comments**: Ability to add comments explaining the rating
- **Rating history**: View previous ratings and update them if needed
- **Average ratings**: Automatically calculates average rating for each employee
- **Employee dashboard display**: Employees can see their latest and average ratings

### ✅ Task Rating System
- **Admin-only access**: Only admins can rate tasks
- **5-star rating scale**: Consistent rating system across the platform
- **Optional comments**: Detailed feedback on task quality
- **Rating history**: Track rating changes over time
- **Average ratings**: Displays average task rating
- **Task list integration**: Ratings shown in task management views

### ✅ Security Features
- **Row Level Security (RLS)**: Database-level security policies
- **Admin-only rating creation**: Only admins can create/update ratings
- **Audit trail**: Tracks who rated what and when
- **Employee visibility**: Employees can only see their own ratings

## Database Schema

### Employee Ratings Table
```sql
CREATE TABLE employee_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT,
    rated_by UUID NOT NULL REFERENCES users(id),
    rated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Task Ratings Table
```sql
CREATE TABLE task_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT,
    rated_by UUID NOT NULL REFERENCES users(id),
    rated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Usage Instructions

### For Administrators

#### Rating Employees
1. **Navigate to Admin Employees Page**
   - Go to the admin panel
   - Click on "Employees" section

2. **Rate an Employee**
   - Find the employee in the table
   - Click the "Actions" dropdown
   - Select "Rate Employee"
   - Choose a rating (1-5 stars)
   - Optionally add a comment
   - Click "Submit Rating"

3. **Update Previous Rating**
   - Open the rating modal for an employee
   - If a previous rating exists, click "Update"
   - Modify the rating and/or comment
   - Click "Update Rating"

#### Rating Tasks
1. **Navigate to Admin Tasks Page**
   - Go to the admin panel
   - Click on "Tasks" section

2. **Rate a Task**
   - Find the task in the table
   - Click the actions dropdown (three dots)
   - Select "Rate Task"
   - Choose a rating (1-5 stars)
   - Optionally add a comment about task quality
   - Click "Submit Rating"

### For Employees

#### Viewing Your Ratings
1. **Dashboard Overview**
   - Your latest or average rating appears as a dashboard card
   - Color-coded: Green (4-5 stars), Yellow (3 stars), Red (1-2 stars)

2. **Detailed Rating View**
   - If you have ratings, a "Performance Rating" card appears
   - Shows your average rating and latest rating details
   - Displays who rated you and when
   - Shows any comments from your manager

## Star Rating Color System

- **5 Stars**: Gold (Excellent)
- **4 Stars**: Gold (Good)
- **3 Stars**: Light Gold (Average)
- **2 Stars**: Orange (Below Average)
- **1 Star**: Red (Poor)

## API Functions

### Employee Rating Functions
```typescript
// Rate an employee
rateEmployee(employeeId: string, rating: number, comment?: string)

// Update existing rating
updateEmployeeRating(ratingId: string, rating: number, comment?: string)

// Get all ratings for an employee
getEmployeeRatings(employeeId: string)

// Get latest rating
getLatestEmployeeRating(employeeId: string)

// Get average rating
getEmployeeAverageRating(employeeId: string)

// Delete a rating
deleteEmployeeRating(ratingId: string)
```

### Task Rating Functions
```typescript
// Rate a task
rateTask(taskId: string, rating: number, comment?: string)

// Update existing rating
updateTaskRating(ratingId: string, rating: number, comment?: string)

// Get all ratings for a task
getTaskRatings(taskId: string)

// Get latest rating
getLatestTaskRating(taskId: string)

// Get average rating
getTaskAverageRating(taskId: string)

// Delete a rating
deleteTaskRating(ratingId: string)
```

## Components

### Core Components
- `StarRating.tsx`: Reusable star rating component
- `RateEmployeeModal.tsx`: Modal for rating employees
- `RateTaskModal.tsx`: Modal for rating tasks

### Usage Example
```tsx
<StarRating
  rating={4.5}
  onRatingChange={(rating) => setRating(rating)}
  readonly={false}
  size="lg"
  showValue={true}
/>
```

## Setup Instructions

### 1. Database Setup
Run the SQL script to create the rating tables:
```bash
# Execute the create_rating_system.sql file in your Supabase dashboard
```

### 2. Update Types
The TypeScript types have been updated to include rating information in User and Task interfaces.

### 3. Import Components
```tsx
import RateEmployeeModal from '@/components/RateEmployeeModal';
import RateTaskModal from '@/components/RateTaskModal';
import StarRating from '@/components/StarRating';
import { getEmployeeAverageRating, rateEmployee } from '@/lib/ratingsApi';
```

## Security Considerations

### Row Level Security Policies
- Employees can only view their own ratings
- Only admins can create, update, or delete ratings
- Task ratings are visible to task assignees and creators

### Data Protection
- All rating operations require authentication
- Audit trail maintained for all rating activities
- Comments are stored securely with proper access controls

## Future Enhancements

### Possible Improvements
1. **Rating Analytics Dashboard**: Visual charts showing rating trends
2. **Performance Goals**: Set rating targets and track progress
3. **Notification System**: Notify employees when they receive new ratings
4. **Rating Categories**: Break down ratings by different performance areas
5. **Export Reports**: Generate rating reports for HR purposes
6. **Rating Reminders**: Remind admins to rate employees periodically

### Notification Integration
```typescript
// Example: Send notification when employee is rated
await sendNotification({
  userId: employeeId,
  title: "New Performance Rating",
  message: `You received a ${rating}-star rating from ${ratedByName}`,
  relatedTo: "rating",
  relatedId: ratingId
});
```

## Troubleshooting

### Common Issues

1. **Rating not showing**
   - Check if user has admin permissions
   - Verify database connection
   - Check RLS policies

2. **Can't update rating**
   - Ensure user is admin
   - Check if rating exists
   - Verify foreign key constraints

3. **Performance issues**
   - Database indexes are created for rating queries
   - Consider pagination for large rating lists

### Support
For technical issues or feature requests, check the application logs and database policies. The rating system is designed to be secure, scalable, and user-friendly.

---

## Implementation Status: ✅ COMPLETE

All features have been implemented and are ready for use:
- ✅ Database tables and security policies
- ✅ TypeScript types and interfaces
- ✅ API functions for all rating operations
- ✅ UI components for rating interaction
- ✅ Admin interfaces for rating employees and tasks
- ✅ Employee dashboard integration
- ✅ Star rating visual system
- ✅ Security and audit trail 