# Team Shifts Shift Change Feature

## 🎯 **Overview**

The Team Shifts page now includes **automatic shift change functionality** that allows admins and managers to change shift assignments and automatically recalculate Regular Hours and Overtime Hours based on the new shift duration.

## ✨ **Key Features**

### **1. Shift Change Dropdowns**
- **Location**: Team Shifts page table
- **Access**: Admins, Customer Retention Managers, and Content Creative Managers
- **Functionality**: Click on any shift in the table to change it via dropdown

### **2. Automatic Hours Recalculation**
When you change a shift assignment, the system automatically:
- Calculates the new shift duration (e.g., 9am-4pm = 7 hours)
- Recalculates Regular Hours (up to shift duration)
- Recalculates Overtime Hours (anything beyond shift duration)
- Updates both `shift_assignments` and `monthly_shifts` tables

### **3. Visual Feedback**
- **Loading Spinner**: Shows when a shift is being updated
- **Success Toast**: Confirms the shift change
- **Real-time Updates**: Table refreshes automatically

## 🔄 **How It Works**

### **Example Scenario:**
**Before Change:**
- Employee: Mahmoud Elrefaey
- Shift: Morning Shift (9am-5pm = 8 hours)
- Hours: 7h Regular + 1h Overtime = 8h total

**After Change to Custom Shift (9am-4pm = 7 hours):**
- Shift: Custom Shift (9am-4pm = 7 hours)
- Hours: 7h Regular + 1h Overtime = 8h total
- **Result**: Hours remain the same, but 1h is now classified as overtime

### **Recalculation Logic:**
```javascript
// Calculate new shift duration
const newShiftDuration = calculateShiftDuration(newShift.startTime, newShift.endTime);

// Recalculate hours
const newRegularHours = Math.min(workedHours, newShiftDuration);
const newOvertimeHours = Math.max(0, workedHours - newShiftDuration);
```

## 📊 **Test Results**

All functionality has been tested and verified:

### **Shift Duration Calculation:**
- ✅ 9:00-17:00 = 8.0h
- ✅ 9:00-16:00 = 7.0h  
- ✅ 22:00-06:00 = 8.0h (overnight)
- ✅ 8:00-14:00 = 6.0h

### **Hours Recalculation:**
- ✅ Morning Shift (8h) → Custom Shift (7h): 7h regular + 1h overtime
- ✅ Morning Shift (8h) → Custom Shift (6h): 6h regular + 2h overtime
- ✅ Custom Shift (7h) → Morning Shift (8h): 7h regular + 0h overtime

## 🛠 **Technical Implementation**

### **Files Modified:**
- `src/pages/TeamShiftsPage.tsx`: Added shift change functionality

### **New Functions:**
1. **`calculateShiftDuration()`**: Calculates shift duration from start/end times
2. **`recalculateHoursForShift()`**: Recalculates regular/overtime hours
3. **`handleShiftChange()`**: Main function for updating shifts and hours

### **Database Updates:**
- Updates `shift_assignments` table with new shift assignment
- Updates `monthly_shifts` table with recalculated hours
- Maintains check-in/check-out times and delay minutes

## 🎮 **How to Use**

### **For Admins/Managers:**

1. **Navigate** to Team Shifts page
2. **Find** the employee and date you want to change
3. **Click** on the shift dropdown in the table
4. **Select** the new shift from the dropdown
5. **Wait** for the loading spinner to complete
6. **Verify** the hours have been recalculated correctly

### **Example Workflow:**
```
1. Mahmoud has Morning Shift (8h) showing 7h Regular + 1h Overtime
2. Click on "Morning Shift" dropdown
3. Select "Custom Shift (9am-4pm)"
4. System calculates: 7h duration
5. System recalculates: 7h Regular + 1h Overtime
6. Hours remain the same, but classification is updated
```

## 🔍 **Benefits**

### **For Management:**
- ✅ **Real-time Updates**: No need to manually recalculate hours
- ✅ **Accurate Reporting**: Hours are always correctly classified
- ✅ **Time Savings**: Automatic recalculation saves manual work
- ✅ **Consistency**: All shift changes follow the same logic

### **For Employees:**
- ✅ **Accurate Hours**: Regular and overtime hours are always correct
- ✅ **Fair Compensation**: Overtime is properly calculated
- ✅ **Transparency**: Clear breakdown of hours worked

## 🚨 **Important Notes**

### **What Gets Updated:**
- ✅ Shift assignment in `shift_assignments` table
- ✅ Regular hours in `monthly_shifts` table
- ✅ Overtime hours in `monthly_shifts` table
- ✅ Shift ID in `monthly_shifts` table

### **What Stays the Same:**
- ✅ Check-in time
- ✅ Check-out time
- ✅ Delay minutes
- ✅ Break time
- ✅ Total worked hours (only classification changes)

### **Permissions:**
- ✅ Admins can change any shift
- ✅ Customer Retention Managers can change their team's shifts
- ✅ Content Creative Managers can change their team's shifts
- ❌ Regular employees cannot change shifts

## 🧪 **Testing**

Run the test script to verify functionality:
```bash
node test_team_shifts_shift_change.js
```

This will test:
- Shift duration calculations
- Hours recalculation logic
- Complete workflow scenarios

## 📈 **Future Enhancements**

Potential improvements for future versions:
- Bulk shift changes for multiple employees
- Shift change history tracking
- Automatic notifications when shifts are changed
- Integration with payroll calculations
- Shift change approval workflow

---

**Version**: 1.0  
**Date**: January 2025  
**Status**: ✅ Implemented and Tested
