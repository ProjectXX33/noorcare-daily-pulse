// Debug script to investigate working days calculation issues
// Run with: node debug_working_days_performance.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://lqgwefbscqtbsrmfqhsf.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZ3dlZmJzY3F0YnNybWZxaHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwMjQyNTgsImV4cCI6MjA0NzYwMDI1OH0.2XBHmlGDN3Rr6t6X6a-bUMGhQR3yb9FCk2sXBkiO4Yo'
);

async function debugWorkingDaysCalculation() {
  console.log('🔍 Debugging Working Days Calculation Issues');
  console.log('=' .repeat(60));

  try {
    const currentMonth = '2025-06';
    const monthStart = `${currentMonth}-01`;
    const nextMonth = currentMonth.split('-');
    const nextMonthDate = new Date(parseInt(nextMonth[0]), parseInt(nextMonth[1]), 1);
    const monthEnd = nextMonthDate.toISOString().split('T')[0];

    console.log(`📅 Analyzing month: ${currentMonth} (${monthStart} to ${monthEnd})`);
    console.log('');

    // 1. Check monthly_shifts data
    console.log('1️⃣ Checking monthly_shifts table...');
    const { data: monthlyShifts, error: shiftsError } = await supabase
      .from('monthly_shifts')
      .select(`
        *,
        users:user_id(name, position)
      `)
      .gte('work_date', monthStart)
      .lt('work_date', monthEnd)
      .order('user_id, work_date');

    if (shiftsError) {
      console.error('❌ Error fetching monthly shifts:', shiftsError);
      return;
    }

    console.log(`📊 Found ${monthlyShifts.length} monthly shift records`);
    
    // Group shifts by employee
    const employeeShifts = {};
    for (const shift of monthlyShifts) {
      const userId = shift.user_id;
      const userName = shift.users?.name || 'Unknown';
      
      if (!employeeShifts[userId]) {
        employeeShifts[userId] = {
          name: userName,
          position: shift.users?.position,
          shifts: [],
          uniqueDates: new Set(),
          totalDelayMinutes: 0,
          totalOvertimeHours: 0
        };
      }
      
      employeeShifts[userId].shifts.push(shift);
      employeeShifts[userId].uniqueDates.add(shift.work_date);
      employeeShifts[userId].totalDelayMinutes += shift.delay_minutes || 0;
      employeeShifts[userId].totalOvertimeHours += shift.overtime_hours || 0;
    }

    // 2. Analyze each employee's data
    console.log('\n2️⃣ Employee Analysis:');
    console.log('-'.repeat(80));
    
    for (const [userId, data] of Object.entries(employeeShifts)) {
      const workingDays = data.uniqueDates.size;
      const datesArray = Array.from(data.uniqueDates).sort();
      
      console.log(`\n👤 ${data.name} (${data.position})`);
      console.log(`   📅 Working Days: ${workingDays}`);
      console.log(`   📆 Dates: [${datesArray.join(', ')}]`);
      console.log(`   ⏰ Total Delay: ${data.totalDelayMinutes} minutes`);
      console.log(`   🕐 Total Overtime: ${data.totalOvertimeHours} hours`);
      console.log(`   📋 Shift Records: ${data.shifts.length}`);
      
      // Show each shift record
      data.shifts.forEach((shift, index) => {
        console.log(`      ${index + 1}. ${shift.work_date}: ${shift.delay_minutes || 0}min delay, ${shift.overtime_hours || 0}h overtime`);
      });
      
      // Check for potential duplicates
      if (data.shifts.length > workingDays) {
        console.log(`   ⚠️  POTENTIAL ISSUE: ${data.shifts.length} shift records but only ${workingDays} unique dates!`);
      }
    }

    // 3. Check performance dashboard records
    console.log('\n3️⃣ Checking performance dashboard records...');
    const { data: performanceRecords, error: perfError } = await supabase
      .from('admin_performance_dashboard')
      .select('*')
      .eq('month_year', currentMonth)
      .order('employee_name');

    if (perfError) {
      console.error('❌ Error fetching performance records:', perfError);
      return;
    }

    console.log(`📊 Found ${performanceRecords.length} performance records`);
    
    for (const record of performanceRecords) {
      const employeeData = Object.values(employeeShifts).find(emp => emp.name === record.employee_name);
      const actualWorkingDays = employeeData ? employeeData.uniqueDates.size : 0;
      
      console.log(`\n📈 ${record.employee_name}:`);
      console.log(`   Dashboard Shows: ${record.total_working_days} working days`);
      console.log(`   Actual Data: ${actualWorkingDays} working days`);
      console.log(`   Worked Dates: ${record.worked_dates || 'Not set'}`);
      
      if (record.total_working_days !== actualWorkingDays) {
        console.log(`   🚨 MISMATCH DETECTED!`);
        console.log(`      Expected: ${actualWorkingDays} days`);
        console.log(`      Dashboard: ${record.total_working_days} days`);
        console.log(`      Difference: ${actualWorkingDays - record.total_working_days} days`);
      } else {
        console.log(`   ✅ Working days calculation is correct`);
      }
    }

    // 4. Check check_ins table for comparison
    console.log('\n4️⃣ Cross-checking with check_ins table...');
    const { data: checkIns, error: checkInsError } = await supabase
      .from('check_ins')
      .select(`
        *,
        users:user_id(name, position)
      `)
      .gte('timestamp', monthStart)
      .lt('timestamp', monthEnd + 'T23:59:59')
      .not('checkout_time', 'is', null)
      .order('user_id, timestamp');

    if (checkInsError) {
      console.error('❌ Error fetching check-ins:', checkInsError);
      return;
    }

    console.log(`📊 Found ${checkIns.length} completed check-ins`);
    
    // Group check-ins by employee and date
    const employeeCheckIns = {};
    for (const checkIn of checkIns) {
      const userId = checkIn.user_id;
      const userName = checkIn.users?.name || 'Unknown';
      const checkInDate = new Date(checkIn.timestamp).toISOString().split('T')[0];
      
      if (!employeeCheckIns[userId]) {
        employeeCheckIns[userId] = {
          name: userName,
          position: checkIn.users?.position,
          uniqueDates: new Set(),
          checkIns: []
        };
      }
      
      employeeCheckIns[userId].uniqueDates.add(checkInDate);
      employeeCheckIns[userId].checkIns.push({
        date: checkInDate,
        checkIn: new Date(checkIn.timestamp).toLocaleTimeString(),
        checkOut: new Date(checkIn.checkout_time).toLocaleTimeString()
      });
    }

    // Compare with monthly_shifts
    console.log('\n5️⃣ Comparing check-ins vs monthly_shifts:');
    console.log('-'.repeat(80));
    
    for (const [userId, checkInData] of Object.entries(employeeCheckIns)) {
      const shiftData = employeeShifts[userId];
      const checkInDays = checkInData.uniqueDates.size;
      const shiftDays = shiftData ? shiftData.uniqueDates.size : 0;
      
      console.log(`\n👤 ${checkInData.name}`);
      console.log(`   Check-ins: ${checkInDays} unique days`);
      console.log(`   Monthly shifts: ${shiftDays} unique days`);
      
      if (checkInDays !== shiftDays) {
        console.log(`   🚨 DATA INCONSISTENCY!`);
        console.log(`      Check-in dates: [${Array.from(checkInData.uniqueDates).sort().join(', ')}]`);
        console.log(`      Shift dates: [${shiftData ? Array.from(shiftData.uniqueDates).sort().join(', ') : 'None'}]`);
      } else {
        console.log(`   ✅ Data is consistent`);
      }
    }

    // 6. Recommendations
    console.log('\n6️⃣ Recommendations:');
    console.log('-'.repeat(40));
    
    let issuesFound = false;
    
    for (const [userId, data] of Object.entries(employeeShifts)) {
      const performanceRecord = performanceRecords.find(p => p.employee_name === data.name);
      const actualWorkingDays = data.uniqueDates.size;
      
      if (performanceRecord && performanceRecord.total_working_days !== actualWorkingDays) {
        console.log(`\n🔧 Fix needed for ${data.name}:`);
        console.log(`   - Update total_working_days from ${performanceRecord.total_working_days} to ${actualWorkingDays}`);
        console.log(`   - Update worked_dates to: [${Array.from(data.uniqueDates).sort().join(', ')}]`);
        issuesFound = true;
      }
    }
    
    if (!issuesFound) {
      console.log('\n✅ No issues found! All working days calculations are correct.');
    } else {
      console.log('\n💡 Run the performance dashboard "Re-record All" function to fix these issues.');
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error);
  }
}

// Run the debug script
debugWorkingDaysCalculation().then(() => {
  console.log('\n🏁 Debug analysis complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script crashed:', error);
  process.exit(1);
}); 