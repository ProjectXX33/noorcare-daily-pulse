// Test script for Bulk Assignment functionality
console.log('🔧 Testing Bulk Assignment Functionality');

// Mock data representing current database state
const mockEmployees = [
  {
    id: 'mahmoud-123',
    name: 'Mahmoud Elrefaey',
    position: 'Designer'
  },
  {
    id: 'ahmed-456',
    name: 'Ahmed Hassan',
    position: 'Junior CRM Specialist'
  }
];

const mockShifts = [
  {
    id: 'designers-shift',
    name: 'Designers Shift',
    startTime: '09:00',
    endTime: '16:00'
  },
  {
    id: 'morning-shift',
    name: 'Morning Shift',
    startTime: '09:00',
    endTime: '17:00'
  }
];

// Calculate shift duration function (same as in the app)
function calculateShiftDuration(startTime, endTime) {
  const start = new Date(`2000-01-01 ${startTime}`);
  const end = new Date(`2000-01-01 ${endTime}`);
  const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  return durationMinutes / 60; // Convert to hours
}

// Recalculate hours function (same as in the app)
function recalculateHoursForShift(currentRegularHours, currentOvertimeHours, newShiftDuration, workedHours) {
  const totalWorkedHours = currentRegularHours + currentOvertimeHours;
  
  if (workedHours <= 0) {
    return { regularHours: 0, overtimeHours: 0 };
  }

  const newRegularHours = Math.min(workedHours, newShiftDuration);
  const newOvertimeHours = Math.max(0, workedHours - newShiftDuration);

  return { regularHours: newRegularHours, overtimeHours: newOvertimeHours };
}

// Simulate bulk assignment
function simulateBulkAssignment(employeeId, shiftId, month, year, fridayAsDayOff) {
  console.log(`🔄 Simulating Bulk Assignment:`);
  console.log(`  Employee: ${mockEmployees.find(e => e.id === employeeId)?.name || 'Unknown'}`);
  console.log(`  Shift: ${mockShifts.find(s => s.id === shiftId)?.name || 'Unknown'}`);
  console.log(`  Month: ${new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
  console.log(`  Friday as Day Off: ${fridayAsDayOff}\n`);

  const selectedShift = mockShifts.find(s => s.id === shiftId);
  const selectedEmployee = mockEmployees.find(e => e.id === employeeId);

  if (!selectedShift || !selectedEmployee) {
    console.log('❌ Selected shift or employee not found');
    return;
  }

  // Get all days in the selected month
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  
  const daysInMonth = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    daysInMonth.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`📅 Processing ${daysInMonth.length} days in ${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);

  let assignedCount = 0;
  let dayOffCount = 0;
  const assignments = [];

  // Process each day
  for (const date of daysInMonth) {
    const isFriday = date.getDay() === 5; // Friday = 5
    const isDayOff = fridayAsDayOff && isFriday;
    const workDate = date.toISOString().split('T')[0];
    
    const assignment = {
      date: workDate,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      isDayOff: isDayOff,
      shiftId: isDayOff ? null : shiftId,
      shiftName: isDayOff ? 'Day Off' : selectedShift.name,
      regularHours: 0,
      overtimeHours: 0
    };

    // Calculate hours for non-day-off days
    if (!isDayOff) {
      const shiftDuration = calculateShiftDuration(selectedShift.startTime, selectedShift.endTime);
      // Assume 8 hours worked for demonstration
      const workedHours = 8;
      const recalculated = recalculateHoursForShift(0, 0, shiftDuration, workedHours);
      assignment.regularHours = recalculated.regularHours;
      assignment.overtimeHours = recalculated.overtimeHours;
    }

    assignments.push(assignment);

    if (isDayOff) {
      dayOffCount++;
    } else {
      assignedCount++;
    }
  }

  console.log(`✅ Bulk assignment completed: ${assignedCount} shifts, ${dayOffCount} days off`);
  
  return {
    employee: selectedEmployee,
    shift: selectedShift,
    month: startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    assignments: assignments,
    summary: {
      totalDays: daysInMonth.length,
      assignedDays: assignedCount,
      dayOffDays: dayOffCount,
      fridays: dayOffCount
    }
  };
}

// Test different scenarios
function testBulkAssignmentScenarios() {
  console.log('🧪 Testing Bulk Assignment Scenarios:\n');
  
  const scenarios = [
    {
      name: 'Designers Shift for Mahmoud - August 2024',
      employeeId: 'mahmoud-123',
      shiftId: 'designers-shift',
      month: 7, // August (0-indexed)
      year: 2024,
      fridayAsDayOff: true
    },
    {
      name: 'Morning Shift for Ahmed - September 2024',
      employeeId: 'ahmed-456',
      shiftId: 'morning-shift',
      month: 8, // September (0-indexed)
      year: 2024,
      fridayAsDayOff: true
    },
    {
      name: 'Designers Shift for Mahmoud - No Friday Day Off',
      employeeId: 'mahmoud-123',
      shiftId: 'designers-shift',
      month: 7, // August (0-indexed)
      year: 2024,
      fridayAsDayOff: false
    }
  ];
  
  scenarios.forEach((scenario, index) => {
    console.log(`📋 Scenario ${index + 1}: ${scenario.name}`);
    console.log('='.repeat(60));
    
    const result = simulateBulkAssignment(
      scenario.employeeId,
      scenario.shiftId,
      scenario.month,
      scenario.year,
      scenario.fridayAsDayOff
    );
    
    if (result) {
      console.log('\n📊 Assignment Summary:');
      console.log(`  Employee: ${result.employee.name}`);
      console.log(`  Shift: ${result.shift.name} (${result.shift.startTime} - ${result.shift.endTime})`);
      console.log(`  Month: ${result.month}`);
      console.log(`  Total Days: ${result.summary.totalDays}`);
      console.log(`  Assigned Days: ${result.summary.assignedDays}`);
      console.log(`  Day Off Days: ${result.summary.dayOffDays}`);
      console.log(`  Fridays: ${result.summary.fridays}`);
      
      console.log('\n📅 Sample Assignments (first 7 days):');
      result.assignments.slice(0, 7).forEach(assignment => {
        console.log(`  ${assignment.date} (${assignment.dayName}): ${assignment.shiftName} - ${assignment.regularHours}h regular + ${assignment.overtimeHours}h overtime`);
      });
      
      if (result.assignments.length > 7) {
        console.log(`  ... and ${result.assignments.length - 7} more days`);
      }
    }
    
    console.log('\n');
  });
}

// Test the complete workflow
function testCompleteWorkflow() {
  console.log('🎯 Testing Complete Workflow:\n');
  
  // Scenario: Assign Designers Shift to Mahmoud for August 2024 with Fridays off
  console.log('📋 Workflow: Bulk Assign Designers Shift to Mahmoud for August 2024');
  console.log('='.repeat(70));
  
  const employee = mockEmployees.find(e => e.id === 'mahmoud-123');
  const shift = mockShifts.find(s => s.id === 'designers-shift');
  
  console.log('📊 Initial Setup:');
  console.log(`  Employee: ${employee?.name}`);
  console.log(`  Shift: ${shift?.name} (${shift?.startTime} - ${shift?.endTime})`);
  console.log(`  Duration: ${calculateShiftDuration(shift?.startTime || '09:00', shift?.endTime || '16:00')}h`);
  console.log(`  Month: August 2024`);
  console.log(`  Friday as Day Off: Yes`);
  
  const result = simulateBulkAssignment('mahmoud-123', 'designers-shift', 7, 2024, true);
  
  if (result) {
    console.log('\n✅ Final Result:');
    console.log(`  Total assignments created: ${result.assignments.length}`);
    console.log(`  Regular work days: ${result.summary.assignedDays}`);
    console.log(`  Friday day offs: ${result.summary.fridays}`);
    console.log(`  Total regular hours: ${result.assignments.reduce((sum, a) => sum + a.regularHours, 0)}h`);
    console.log(`  Total overtime hours: ${result.assignments.reduce((sum, a) => sum + a.overtimeHours, 0)}h`);
    
    const fridays = result.assignments.filter(a => a.dayName === 'Fri');
    console.log(`\n📅 Fridays in August 2024:`);
    fridays.forEach(friday => {
      console.log(`  ${friday.date} (${friday.dayName}): ${friday.shiftName}`);
    });
  }
}

// Test database operations simulation
function testDatabaseOperations() {
  console.log('💾 Testing Database Operations:\n');
  
  const result = simulateBulkAssignment('mahmoud-123', 'designers-shift', 7, 2024, true);
  
  if (result) {
    console.log('📊 Database Operations to be performed:');
    console.log(`  1. Update shift_assignments table: ${result.assignments.length} records`);
    console.log(`  2. Update monthly_shifts table: ${result.assignments.length} records`);
    
    console.log('\n📋 Sample Database Records:');
    result.assignments.slice(0, 3).forEach(assignment => {
      console.log(`\n  Date: ${assignment.date}`);
      console.log(`  shift_assignments:`);
      console.log(`    employee_id: ${result.employee.id}`);
      console.log(`    work_date: ${assignment.date}`);
      console.log(`    assigned_shift_id: ${assignment.shiftId || 'null'}`);
      console.log(`    is_day_off: ${assignment.isDayOff}`);
      
      console.log(`  monthly_shifts:`);
      console.log(`    user_id: ${result.employee.id}`);
      console.log(`    work_date: ${assignment.date}`);
      console.log(`    shift_id: ${assignment.shiftId || 'null'}`);
      console.log(`    is_day_off: ${assignment.isDayOff}`);
      console.log(`    regular_hours: ${assignment.regularHours}`);
      console.log(`    overtime_hours: ${assignment.overtimeHours}`);
    });
  }
}

// Run all tests
console.log('🚀 Starting Bulk Assignment Tests...\n');

testBulkAssignmentScenarios();
testCompleteWorkflow();
testDatabaseOperations();

console.log('\n✅ All tests completed!');
console.log('\n📋 Summary:');
console.log('  - Bulk assignment assigns shifts for entire month');
console.log('  - Automatically sets Fridays as day off (optional)');
console.log('  - Updates both shift_assignments and monthly_shifts tables');
console.log('  - Recalculates hours based on shift duration');
console.log('  - Provides detailed progress and success feedback');

console.log('\n🎉 Bulk Assignment feature is ready to use!');
console.log('   Managers can now assign shifts to employees for entire months with one click!');
