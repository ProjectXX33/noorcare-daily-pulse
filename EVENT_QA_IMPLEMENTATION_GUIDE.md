# Event Q&A System Implementation Guide

## Overview
This guide provides comprehensive instructions for implementing the Q&A (Questions & Answers) system for events in your NoorCare Daily Pulse application.

## 🗄️ Database Schema Updates

### 1. Run SQL Migration
Execute the SQL file `add_event_qa_system.sql` in your Supabase SQL Editor:

```sql
-- This will create:
-- ✅ event_qa table with proper structure
-- ✅ Indexes for performance
-- ✅ Row Level Security (RLS) policies
-- ✅ Triggers for automatic timestamp updates
-- ✅ Helper views for easier queries
```

### 2. Database Table Structure
The new `event_qa` table includes:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `event_id` | UUID | Foreign key to events table |
| `question` | TEXT | The question content |
| `answer` | TEXT | The answer content (nullable) |
| `order_index` | INTEGER | Display order |
| `is_active` | BOOLEAN | Soft delete flag |
| `created_by` | UUID | User who created the question |
| `answered_by` | UUID | User who answered the question |
| `created_at` | TIMESTAMP | Question creation time |
| `updated_at` | TIMESTAMP | Last update time |
| `answered_at` | TIMESTAMP | When question was answered |

### 3. Permissions Model
- **Everyone**: Can view Q&A
- **All Users**: Can create questions
- **Question Creator**: Can edit/delete their own unanswered questions
- **Admins & Media Buyers**: Can answer questions and edit/delete any Q&A

## 🛠️ Implementation Files

### 1. Backend Service (`src/services/eventService.ts`)
**New Interfaces:**
- `EventQA` - Main Q&A data structure
- `CreateEventQAData` - For creating new questions
- `UpdateEventQAData` - For updating questions/answers

**New Methods:**
- `getEventQA(eventId)` - Get all Q&A for an event
- `createEventQA(qaData)` - Create a new question
- `updateEventQA(id, updates)` - Update question or add answer
- `deleteEventQA(id)` - Soft delete a Q&A
- `reorderEventQA(eventId, qaIds)` - Reorder Q&A items

### 2. Q&A Component (`src/components/EventQAComponent.tsx`)
A comprehensive React component that provides:
- ✅ Question creation form
- ✅ Answer interface for authorized users
- ✅ Edit/Delete functionality with proper permissions
- ✅ Real-time state management
- ✅ Beautiful UI with status indicators
- ✅ Mobile-responsive design

### 3. Events Page Integration (`src/pages/EventsPage.tsx`)
Updated to include:
- ✅ Q&A component in event dialog
- ✅ State management for Q&A updates
- ✅ Loading events with Q&A data

## 🎨 Features

### For All Users
- **View Q&A**: See all questions and answers for events
- **Ask Questions**: Add questions about any event
- **Edit Own Questions**: Modify questions before they're answered
- **Delete Own Questions**: Remove unanswered questions

### For Admins & Media Buyers
- **Answer Questions**: Provide answers to user questions
- **Moderate Q&A**: Edit or delete any Q&A items
- **Manage Content**: Full control over event Q&A

### UI Features
- **Status Indicators**: Visual indicators for answered/unanswered questions
- **User Attribution**: Shows who asked and who answered
- **Timestamps**: Clear creation and answer timestamps
- **Responsive Design**: Works on desktop and mobile
- **Permission-based UI**: Only shows relevant actions to each user

## 🔔 Notification System

The Q&A system includes automatic notifications:

### Question Created
- **Event Creator** gets notified when someone asks about their event
- **All Admins** get notified about new questions

### Question Answered
- **Question Author** gets notified when their question is answered

## 📱 Usage Instructions

### Creating a Question
1. Open any event in the events page
2. Scroll to the "Questions & Answers" section
3. Click "Add Question"
4. Enter your question and submit

### Answering Questions (Admins/Media Buyers)
1. Open the event dialog
2. Find the unanswered question
3. Click "Answer" button
4. Type your answer and submit

### Managing Q&A
- **Edit**: Click the edit icon on questions you can modify
- **Delete**: Click the trash icon on questions you can remove
- **View Only**: Questions show as read-only for users without permissions

## 🚀 Deployment Steps

1. **Run Database Migration**:
   ```sql
   -- Execute add_event_qa_system.sql in Supabase
   ```

2. **Update Backend**:
   - ✅ `src/services/eventService.ts` (already updated)

3. **Add Component**:
   - ✅ `src/components/EventQAComponent.tsx` (already created)

4. **Update Pages**:
   - ✅ `src/pages/EventsPage.tsx` (already updated)

5. **Test the System**:
   ```bash
   # Start your development server
   npm run dev
   
   # Test as different user types:
   # - Regular user (can ask questions)
   # - Admin (can answer questions)
   # - Media Buyer (can answer questions)
   ```

## ✅ Verification Checklist

### Database
- [ ] `event_qa` table created successfully
- [ ] Indexes are in place for performance
- [ ] RLS policies are active and working
- [ ] Triggers are functioning for timestamps

### Frontend
- [ ] Q&A component loads in event dialogs
- [ ] Users can create questions
- [ ] Admins/Media Buyers can answer questions
- [ ] Permissions are enforced correctly
- [ ] Notifications are working

### User Experience
- [ ] UI is responsive on mobile devices
- [ ] Loading states are handled properly
- [ ] Error messages are user-friendly
- [ ] Success feedback is provided

## 🐛 Troubleshooting

### Common Issues

1. **Q&A Component Not Loading**
   - Check if `EventQAComponent` import is correct
   - Verify `Badge` and `Separator` components are imported

2. **Permission Errors**
   - Verify RLS policies are enabled
   - Check user roles in database
   - Ensure auth context is working

3. **Database Errors**
   - Run verification queries from SQL file
   - Check foreign key constraints
   - Verify UUID generation is working

### Debug Steps
```javascript
// Check if user has correct permissions
console.log('User role:', user?.role);
console.log('User position:', user?.position);
console.log('Can edit Q&A:', user?.role === 'admin' || user?.position === 'Media Buyer');

// Check if Q&A data is loading
console.log('Event Q&A:', selectedEvent?.qa);

// Check database connection
// Run verification queries from SQL file
```

## 🔄 Future Enhancements

Potential improvements for the Q&A system:

1. **Rich Text Editor**: Allow formatting in questions/answers
2. **File Attachments**: Support images/documents in Q&A
3. **Q&A Templates**: Pre-defined questions for common events
4. **Voting System**: Let users upvote helpful questions
5. **Search & Filter**: Find specific Q&A items
6. **Export Function**: Download Q&A as PDF/Excel
7. **Real-time Updates**: Live Q&A during events
8. **Anonymous Questions**: Option to ask questions anonymously

## 📞 Support

If you encounter any issues during implementation:

1. Check the console for error messages
2. Verify database setup using verification queries
3. Test with different user permission levels
4. Review notification settings in browser

The Q&A system is now ready to enhance your events with interactive question and answer functionality! 🎉 