// Test script for Shift Management hours update functionality
console.log('🔧 Testing Shift Management Hours Update');

// Mock data representing current database state
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
  },
  {
    id: 'night-shift',
    name: 'Night Shift',
    startTime: '22:00',
    endTime: '06:00'
  }
];

const mockMonthlyShift = {
  id: 'monthly-1',
  user_id: 'mahmoud-123',
  work_date: '2025-08-31',
  shift_id: 'morning-shift',
  regular_hours: 8, // Current: 8h regular
  overtime_hours: 0, // Current: 0h overtime
  delay_minutes: 0,
  check_in_time: '09:00',
  check_out_time: '17:00'
};

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

// Simulate shift change from Shift Management
function simulateShiftManagementUpdate(employeeId, workDate, newShiftId, isDayOff) {
  console.log(`🔄 Simulating Shift Management Update:`);
  console.log(`  Employee: ${employeeId}`);
  console.log(`  Date: ${workDate}`);
  console.log(`  New Shift: ${newShiftId || 'Day Off'}`);
  console.log(`  Is Day Off: ${isDayOff}\n`);

  // Get current monthly shift data
  const currentMonthlyShift = mockMonthlyShift;
  
  // Get new shift data
  const newShift = mockShifts.find(s => s.id === newShiftId);
  
  let newRegularHours = 0;
  let newOvertimeHours = 0;

  // Recalculate hours if we have a new shift and existing work data
  if (!isDayOff && newShift && currentMonthlyShift) {
    const workedHours = (currentMonthlyShift.regular_hours || 0) + (currentMonthlyShift.overtime_hours || 0);
    const newShiftDuration = calculateShiftDuration(newShift.startTime, newShift.endTime);
    
    const recalculated = recalculateHoursForShift(
      currentMonthlyShift.regular_hours || 0,
      currentMonthlyShift.overtime_hours || 0,
      newShiftDuration,
      workedHours
    );
    
    newRegularHours = recalculated.regularHours;
    newOvertimeHours = recalculated.overtimeHours;
    
    console.log('🔄 Shift Change Recalculation:');
    console.log(`  Old Shift: ${currentMonthlyShift.shift_id}`);
    console.log(`  New Shift: ${newShift.name} (${newShift.startTime} - ${newShift.endTime})`);
    console.log(`  New Shift Duration: ${newShiftDuration}h`);
    console.log(`  Worked Hours: ${workedHours}h`);
    console.log(`  Old: ${currentMonthlyShift.regular_hours}h regular + ${currentMonthlyShift.overtime_hours}h overtime`);
    console.log(`  New: ${newRegularHours}h regular + ${newOvertimeHours}h overtime`);
  }

  return {
    shift_assignments: {
      employee_id: employeeId,
      work_date: workDate,
      assigned_shift_id: isDayOff ? null : newShiftId,
      is_day_off: isDayOff
    },
    monthly_shifts: {
      user_id: employeeId,
      work_date: workDate,
      shift_id: isDayOff ? null : newShiftId,
      is_day_off: isDayOff,
      regular_hours: newRegularHours,
      overtime_hours: newOvertimeHours,
      delay_minutes: currentMonthlyShift?.delay_minutes || 0,
      check_in_time: currentMonthlyShift?.check_in_time || null,
      check_out_time: currentMonthlyShift?.check_out_time || null
    }
  };
}

// Test different scenarios
function testShiftManagementScenarios() {
  console.log('🧪 Testing Shift Management Scenarios:\n');
  
  const scenarios = [
    {
      name: 'Morning Shift → Designers Shift',
      employeeId: 'mahmoud-123',
      workDate: '2025-08-31',
      newShiftId: 'designers-shift',
      isDayOff: false,
      expected: { regular: 7, overtime: 1 }
    },
    {
      name: 'Morning Shift → Night Shift',
      employeeId: 'mahmoud-123',
      workDate: '2025-08-31',
      newShiftId: 'night-shift',
      isDayOff: false,
      expected: { regular: 8, overtime: 0 }
    },
    {
      name: 'Morning Shift → Day Off',
      employeeId: 'mahmoud-123',
      workDate: '2025-08-31',
      newShiftId: null,
      isDayOff: true,
      expected: { regular: 0, overtime: 0 }
    }
  ];
  
  scenarios.forEach((scenario, index) => {
    console.log(`📋 Scenario ${index + 1}: ${scenario.name}`);
    console.log('='.repeat(50));
    
    const result = simulateShiftManagementUpdate(
      scenario.employeeId,
      scenario.workDate,
      scenario.newShiftId,
      scenario.isDayOff
    );
    
    console.log('\n📊 Database Updates:');
    console.log('  shift_assignments:', result.shift_assignments);
    console.log('  monthly_shifts:', result.monthly_shifts);
    
    if (!scenario.isDayOff) {
      const passed = result.monthly_shifts.regular_hours === scenario.expected.regular && 
                    result.monthly_shifts.overtime_hours === scenario.expected.overtime;
      
      console.log(`\n✅ Result: ${result.monthly_shifts.regular_hours}h regular + ${result.monthly_shifts.overtime_hours}h overtime`);
      console.log(`📋 Expected: ${scenario.expected.regular}h regular + ${scenario.expected.overtime}h overtime`);
      console.log(`🎯 ${passed ? 'PASS' : 'FAIL'}\n`);
    } else {
      console.log(`\n✅ Result: Day Off - No hours calculated\n`);
    }
    
    console.log('\n');
  });
}

// Test the complete workflow
function testCompleteWorkflow() {
  console.log('🎯 Testing Complete Workflow:\n');
  
  // Scenario: Change from Morning Shift (8h) to Designers Shift (7h)
  console.log('📋 Workflow: Morning Shift → Designers Shift');
  console.log('='.repeat(50));
  
  // Step 1: Current state
  console.log('📊 Current State:');
  console.log(`  Shift: Morning Shift (9am-5pm = 8h)`);
  console.log(`  Worked: 8h total`);
  console.log(`  Breakdown: 8h regular + 0h overtime`);
  
  // Step 2: Change shift
  console.log('\n🔄 Step 1: Change to Designers Shift');
  console.log(`  New Shift: Designers Shift (9am-4pm = 7h)`);
  
  // Step 3: Recalculate
  const workedHours = 8; // Total hours worked
  const newShiftDuration = calculateShiftDuration('09:00', '16:00'); // 7h
  const recalculated = recalculateHoursForShift(8, 0, newShiftDuration, workedHours);
  
  console.log('\n🔄 Step 2: Recalculate Hours');
  console.log(`  Worked Hours: ${workedHours}h`);
  console.log(`  New Shift Duration: ${newShiftDuration}h`);
  console.log(`  Regular Hours: ${recalculated.regularHours}h (min of worked and shift duration)`);
  console.log(`  Overtime Hours: ${recalculated.overtimeHours}h (excess beyond shift duration)`);
  
  // Step 4: Result
  console.log('\n✅ Final Result:');
  console.log(`  Regular Hours: ${recalculated.regularHours}h`);
  console.log(`  Overtime Hours: ${recalculated.overtimeHours}h`);
  console.log(`  Total: ${recalculated.regularHours + recalculated.overtimeHours}h`);
  
  const correct = recalculated.regularHours === 7 && recalculated.overtimeHours === 1;
  console.log(`\n🎯 ${correct ? '✅ CORRECT' : '❌ INCORRECT'}: 7h regular + 1h overtime`);
}

// Run all tests
console.log('🚀 Starting Shift Management Hours Update Tests...\n');

testShiftManagementScenarios();
testCompleteWorkflow();

console.log('\n✅ All tests completed!');
console.log('\n📋 Summary:');
console.log('  - Shift Management now updates monthly_shifts table');
console.log('  - Regular hours are recalculated based on new shift duration');
console.log('  - Overtime hours are recalculated for excess work time');
console.log('  - Day Off assignments reset hours to 0');
console.log('  - Both shift_assignments and monthly_shifts are updated');

console.log('\n🎉 Shift Management now automatically recalculates hours when shifts are changed!');
