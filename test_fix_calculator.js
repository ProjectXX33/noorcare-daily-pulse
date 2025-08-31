// Test script for Fix Calculator functionality
console.log('🔧 Testing Fix Calculator Functionality');

// Mock data representing current database state
const mockMonthlyShifts = [
  {
    id: 'shift-1',
    work_date: '2025-08-31',
    user_id: 'mahmoud-123',
    shift_id: 'designers-shift',
    regular_hours: 8, // Incorrect - should be 7
    overtime_hours: 0, // Incorrect - should be 1
    delay_minutes: 0,
    shifts: {
      name: 'Designers Shift',
      start_time: '09:00',
      end_time: '16:00'
    }
  },
  {
    id: 'shift-2',
    work_date: '2025-08-30',
    user_id: 'mahmoud-123',
    shift_id: 'morning-shift',
    regular_hours: 7, // Incorrect - should be 8
    overtime_hours: 1, // Incorrect - should be 0
    delay_minutes: 0,
    shifts: {
      name: 'Morning Shift',
      start_time: '09:00',
      end_time: '17:00'
    }
  },
  {
    id: 'shift-3',
    work_date: '2025-08-29',
    user_id: 'mahmoud-123',
    shift_id: null,
    is_day_off: true,
    regular_hours: 0,
    overtime_hours: 0,
    delay_minutes: 0,
    shifts: null
  }
];

// Calculate shift duration function (same as in the app)
function calculateShiftDuration(startTime, endTime) {
  const start = new Date(`2000-01-01 ${startTime}`);
  const end = new Date(`2000-01-01 ${endTime}`);
  const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  return durationMinutes / 60; // Convert to hours
}

// Fix Calculator function (simplified version)
function fixCalculator(shifts) {
  console.log('🔧 Starting Fix Calculator...');
  console.log(`📊 Found ${shifts.length} shifts to recalculate\n`);

  let updatedCount = 0;
  let errorCount = 0;

  for (const shift of shifts) {
    try {
      // Skip day offs
      if (shift.is_day_off) {
        console.log(`⏭️ Skipping day off: ${shift.work_date}`);
        continue;
      }

      // Skip if no shift assigned
      if (!shift.shift_id || !shift.shifts) {
        console.log(`⏭️ Skipping no shift: ${shift.work_date}`);
        continue;
      }

      const shiftData = shift.shifts;
      const workedHours = (shift.regular_hours || 0) + (shift.overtime_hours || 0);
      
      // Calculate expected hours from assigned shift
      const expectedHours = calculateShiftDuration(shiftData.start_time, shiftData.end_time);
      
      // Recalculate regular and overtime hours
      let newRegularHours = 0;
      let newOvertimeHours = 0;

      if (workedHours > 0) {
        newRegularHours = Math.min(workedHours, expectedHours);
        newOvertimeHours = Math.max(0, workedHours - expectedHours);
      }

      // Calculate new delay minutes based on missing work
      let newDelayMinutes = 0;
      if (workedHours < expectedHours) {
        const missingHours = expectedHours - workedHours;
        newDelayMinutes = missingHours * 60;
      }

      console.log(`🔄 Recalculating ${shift.work_date}:`);
      console.log(`  Shift: ${shiftData.name} (${shiftData.start_time} - ${shiftData.end_time})`);
      console.log(`  Expected Hours: ${expectedHours}h`);
      console.log(`  Worked Hours: ${workedHours}h`);
      console.log(`  Old: ${shift.regular_hours}h regular + ${shift.overtime_hours}h overtime`);
      console.log(`  New: ${newRegularHours}h regular + ${newOvertimeHours}h overtime`);
      console.log(`  Old Delay: ${shift.delay_minutes}min`);
      console.log(`  New Delay: ${newDelayMinutes}min`);
      console.log(`  ✅ Updated successfully\n`);

      updatedCount++;

    } catch (error) {
      console.error(`❌ Error processing shift ${shift.id}:`, error);
      errorCount++;
    }
  }

  console.log(`✅ Fix Calculator completed: ${updatedCount} updated, ${errorCount} errors`);
  return { updatedCount, errorCount };
}

// Test the fix calculator
function testFixCalculator() {
  console.log('🧪 Testing Fix Calculator with Mock Data:\n');
  
  // Show before state
  console.log('📊 BEFORE Fix Calculator:');
  mockMonthlyShifts.forEach(shift => {
    if (!shift.is_day_off && shift.shifts) {
      console.log(`  ${shift.work_date}: ${shift.shifts.name} - ${shift.regular_hours}h regular + ${shift.overtime_hours}h overtime`);
    } else if (shift.is_day_off) {
      console.log(`  ${shift.work_date}: Day Off`);
    }
  });
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Run fix calculator
  const result = fixCalculator(mockMonthlyShifts);
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Show expected after state
  console.log('📊 AFTER Fix Calculator (Expected Results):');
  mockMonthlyShifts.forEach(shift => {
    if (!shift.is_day_off && shift.shifts) {
      const expectedHours = calculateShiftDuration(shift.shifts.start_time, shift.shifts.end_time);
      const workedHours = (shift.regular_hours || 0) + (shift.overtime_hours || 0);
      const newRegularHours = Math.min(workedHours, expectedHours);
      const newOvertimeHours = Math.max(0, workedHours - expectedHours);
      
      console.log(`  ${shift.work_date}: ${shift.shifts.name} - ${newRegularHours}h regular + ${newOvertimeHours}h overtime`);
    } else if (shift.is_day_off) {
      console.log(`  ${shift.work_date}: Day Off`);
    }
  });
  
  return result;
}

// Test specific scenarios
function testSpecificScenarios() {
  console.log('\n🎯 Testing Specific Scenarios:\n');
  
  const scenarios = [
    {
      name: 'Designers Shift (7h) with 8h worked',
      shift: { name: 'Designers Shift', start_time: '09:00', end_time: '16:00' },
      worked: 8,
      expected: { regular: 7, overtime: 1 }
    },
    {
      name: 'Morning Shift (8h) with 7h worked',
      shift: { name: 'Morning Shift', start_time: '09:00', end_time: '17:00' },
      worked: 7,
      expected: { regular: 7, overtime: 0 }
    },
    {
      name: 'Designers Shift (7h) with 6h worked',
      shift: { name: 'Designers Shift', start_time: '09:00', end_time: '16:00' },
      worked: 6,
      expected: { regular: 6, overtime: 0 }
    }
  ];
  
  scenarios.forEach(scenario => {
    const expectedHours = calculateShiftDuration(scenario.shift.start_time, scenario.shift.end_time);
    const newRegularHours = Math.min(scenario.worked, expectedHours);
    const newOvertimeHours = Math.max(0, scenario.worked - expectedHours);
    
    const passed = newRegularHours === scenario.expected.regular && newOvertimeHours === scenario.expected.overtime;
    
    console.log(`  ${scenario.name}:`);
    console.log(`    Expected Hours: ${expectedHours}h`);
    console.log(`    Worked Hours: ${scenario.worked}h`);
    console.log(`    Result: ${newRegularHours}h regular + ${newOvertimeHours}h overtime`);
    console.log(`    Expected: ${scenario.expected.regular}h regular + ${scenario.expected.overtime}h overtime`);
    console.log(`    ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  });
}

// Run all tests
console.log('🚀 Starting Fix Calculator Tests...\n');

const result = testFixCalculator();
testSpecificScenarios();

console.log('\n✅ All tests completed!');
console.log('\n📋 Summary:');
console.log(`  - Fix Calculator processed ${result.updatedCount} shifts`);
console.log(`  - Errors: ${result.errorCount}`);
console.log(`  - Designers Shift will be corrected from 8h to 7h regular + 1h overtime`);
console.log(`  - Morning Shift will be corrected from 7h to 8h regular + 0h overtime`);
console.log(`  - All calculations now use real shift durations from database`);

console.log('\n🎉 The Fix Calculator will correct all existing data to use proper shift durations!');
