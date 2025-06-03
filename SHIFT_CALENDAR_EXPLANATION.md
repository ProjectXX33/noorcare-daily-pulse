# Shift Calendar System Explanation

## How the Shift Calendar Works

The **Shifts Management Page** provides a comprehensive view of employee work shifts with several key components:

### 📅 **Calendar Month Selector**
- **Purpose**: Select which month to view shift data for
- **Default**: Current month (e.g., "June 2025")
- **Function**: Changes the data displayed in the table below
- **User Action**: Click the calendar button to pick a different month

### 🎯 **Current Implementation**
```
Month: [June 2025] [Today Button]
Employee Filter: [All Employees ▼]
```

### 📊 **Summary Cards** (4 key metrics)
1. **Total Regular Hours** (🕐) - Normal working hours within shift times
2. **Total Overtime Hours** (📈) - Hours worked beyond normal shift duration  
3. **Total Working Days** (👥) - Number of days with check-ins
4. **Average Hours/Day** (🕐) - Total hours divided by working days

### 📋 **Detailed Shift Table**
Shows daily breakdown with columns:
- **Date** - Calendar date
- **Shift** - Day Shift (9AM-4PM) or Night Shift (4PM-12AM)
- **Check In** - Actual check-in time
- **Check Out** - Actual check-out time  
- **Regular Hours** - Hours within shift duration (max 7 hours)
- **Overtime Hours** - Hours beyond shift duration
- **Total Hours** - Regular + Overtime

### 🔄 **How Data Updates**
1. **Check-in Detection**: System automatically detects if check-in is for Day or Night shift
2. **Hour Calculation**: When checking out, system calculates:
   - If worked ≤ 7 hours = All regular hours
   - If worked > 7 hours = 7 regular + remaining as overtime
3. **Real-time Updates**: Page updates automatically when check-ins/outs occur

### 👑 **Admin Features**
- **View All Employees**: See shifts for all Customer Service staff
- **Filter by Employee**: Select specific employee to view
- **Weekly Shift Assignment**: Assign employees to day/night shifts for upcoming weeks

### 👤 **Employee Features**  
- **View Own Shifts**: See personal shift history
- **Monthly Overview**: Track personal hours and overtime
- **Shift Status**: See assigned shift type (day/night)

### 🔧 **Calendar Functionality**
- **Month Navigation**: Click calendar to go to previous/future months
- **Today Button**: Quick return to current month
- **Data Filtering**: Only shows data for selected month
- **No Future Data**: Can't see shifts for future months (no data exists yet)

### ❓ **Why "No shift data for selected period"?**
This message appears when:
1. **No check-ins** for the selected month
2. **Future month** selected (no data exists yet)
3. **Employee filter** applied but that employee has no shifts
4. **Database issue** (user not assigned to Customer Service position)

### 🎯 **Expected Behavior**
- **Current Month**: Should show any check-ins/shifts for this month
- **Past Months**: Shows historical shift data
- **Future Months**: Will be empty until check-ins occur
- **Filter Changes**: Updates table immediately when employee filter changes

### 🛠 **Admin Weekly Assignment**
Admins can assign Customer Service employees to specific shifts for upcoming weeks:
- **Day Shift**: 9AM - 4PM (7 hours)
- **Night Shift**: 4PM - 12AM (8 hours)  
- **Assignment**: Per employee, per week (Monday-Sunday)
- **Override**: Check-in time determines actual shift if different from assignment 