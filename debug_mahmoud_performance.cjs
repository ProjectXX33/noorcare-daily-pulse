const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jqywzekxfqtqhzmkjqhb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxeXd6ZWt4ZnF0cWh6bWtqcWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwMjY0MTIsImV4cCI6MjA0NzYwMjQxMn0.7i3H86m7lm_v8H9B0uojjMp8LJfHa-Xq4J7rkBepZeQ'
);

async function checkMahmoudPerformance() {
  console.log('🔍 DEBUGGING MAHMOUD ELREFAEY PERFORMANCE...\n');
  
  // 1. Get his performance dashboard data
  const { data: dashboardData } = await supabase
    .from('admin_performance_dashboard')
    .select('*')
    .eq('employee_name', 'Mahmoud Elrefaey')
    .order('month_year', { ascending: false });
    
  console.log('📊 Dashboard Performance Data:');
  dashboardData?.forEach((record, i) => {
    console.log(`Entry ${i + 1}:`);
    console.log(`  Month: ${record.month_year}`);
    console.log(`  Working Days: ${record.total_working_days}`);
    console.log(`  Delay Minutes: ${record.total_delay_minutes}`);
    console.log(`  Delay Hours: ${record.total_delay_hours}`);
    console.log(`  Performance Score: ${record.average_performance_score}%`);
    console.log(`  Punctuality: ${record.punctuality_percentage}%`);
    console.log(`  Status: ${record.performance_status}`);
    console.log('');
  });
  
  // 2. Get his user ID first
  const { data: userData } = await supabase
    .from('users')
    .select('id, name')
    .eq('name', 'Mahmoud Elrefaey')
    .single();
    
  if (!userData) {
    console.log('❌ User not found!');
    return;
  }
  
  console.log(`👤 User ID: ${userData.id}`);
  
  // 3. Get his recent check-ins
  const today = new Date().toISOString().split('T')[0];
  const { data: checkIns } = await supabase
    .from('check_ins')
    .select('id, timestamp, checkout_time')
    .eq('user_id', userData.id)
    .gte('timestamp', today + 'T00:00:00')
    .order('timestamp', { ascending: false });
    
  console.log('⏰ Today\'s Check-ins:');
  checkIns?.forEach((checkIn, i) => {
    const checkInTime = new Date(checkIn.timestamp);
    const checkOutTime = checkIn.checkout_time ? new Date(checkIn.checkout_time) : null;
    const duration = checkOutTime ? (checkOutTime - checkInTime) / (1000 * 60 * 60) : null;
    
    console.log(`Check-in ${i + 1}:`);
    console.log(`  Time: ${checkInTime.toLocaleTimeString()}`);
    console.log(`  Checkout: ${checkOutTime ? checkOutTime.toLocaleTimeString() : 'Not checked out'}`);
    console.log(`  Duration: ${duration ? duration.toFixed(2) + ' hours' : 'Ongoing'}`);
    console.log('');
  });
  
  // 4. Get his shift assignment for today
  const { data: shiftAssignment } = await supabase
    .from('shift_assignments')
    .select(`
      *,
      shifts:assigned_shift_id(name, start_time, end_time)
    `)
    .eq('employee_id', userData.id)
    .eq('work_date', today)
    .single();
    
  console.log('📋 Today\'s Shift Assignment:');
  if (shiftAssignment) {
    console.log(`  Shift: ${shiftAssignment.shifts?.name}`);
    console.log(`  Time: ${shiftAssignment.shifts?.start_time} - ${shiftAssignment.shifts?.end_time}`);
    console.log(`  Day Off: ${shiftAssignment.is_day_off}`);
  } else {
    console.log('  No shift assignment found for today');
  }
  console.log('');
  
  // 5. Calculate what his performance SHOULD be based on actual data
  if (checkIns?.[0] && checkIns[0].checkout_time && shiftAssignment?.shifts) {
    const checkInTime = new Date(checkIns[0].timestamp);
    const checkOutTime = new Date(checkIns[0].checkout_time);
    const shift = shiftAssignment.shifts;
    
    // Calculate expected shift start time
    const [startHour, startMin] = shift.start_time.split(':');
    const expectedStart = new Date(checkInTime);
    expectedStart.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
    
    // Calculate delay
    const delayMinutes = Math.max(0, (checkInTime - expectedStart) / (1000 * 60));
    
    // Calculate work duration
    const totalHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
    const expectedHours = shift.name.toLowerCase().includes('day') ? 7 : 8;
    
    // Calculate scores using the actual algorithm
    const delayScore = delayMinutes <= 0 ? 100 : Math.max(0, 100 - (delayMinutes / 5));
    
    let punctuality = 100;
    if (delayMinutes >= 60) {
      punctuality = 0;
    } else if (delayMinutes > 30) {
      punctuality = Math.max(0, 50 - (delayMinutes * 2));
    } else if (delayMinutes > 0) {
      punctuality = Math.max(0, 90 - (delayMinutes * 3));
    }
    
    let status = 'Excellent';
    if (punctuality < 50 || delayScore < 50) {
      status = 'Poor';
    } else if (punctuality < 70 || delayScore < 70) {
      status = 'Needs Improvement';
    } else if (punctuality < 85 || delayScore < 85) {
      status = 'Good';
    }
    
    console.log('🧮 CALCULATED PERFORMANCE (Today):');
    console.log(`  Expected Start: ${expectedStart.toLocaleTimeString()}`);
    console.log(`  Actual Check-in: ${checkInTime.toLocaleTimeString()}`);
    console.log(`  Delay: ${delayMinutes.toFixed(1)} minutes`);
    console.log(`  Work Duration: ${totalHours.toFixed(2)} hours`);
    console.log(`  Expected Hours: ${expectedHours} hours (${shift.name})`);
    console.log(`  Delay Score: ${delayScore.toFixed(1)}%`);
    console.log(`  Punctuality: ${punctuality.toFixed(1)}%`);
    console.log(`  Calculated Status: ${status}`);
    console.log('');
    
    // Show why he got Poor
    if (status === 'Poor') {
      console.log('❌ WHY HE GOT "POOR":');
      if (delayMinutes >= 60) {
        console.log(`  • Delay of ${delayMinutes.toFixed(1)} minutes (1+ hour) = 0% punctuality`);
      } else if (delayMinutes > 30) {
        console.log(`  • Delay of ${delayMinutes.toFixed(1)} minutes (30+ min) = Low punctuality`);
      }
      if (delayScore < 50) {
        console.log(`  • Delay score ${delayScore.toFixed(1)}% is below 50%`);
      }
      if (punctuality < 50) {
        console.log(`  • Punctuality ${punctuality.toFixed(1)}% is below 50%`);
      }
    } else if (status === 'Good' && dashboardData?.[0]?.performance_status === 'Poor') {
      console.log('🤔 DISCREPANCY FOUND:');
      console.log(`  • Calculated today: ${status}`);
      console.log(`  • Dashboard shows: ${dashboardData[0].performance_status}`);
      console.log('  • This suggests old/incorrect data in dashboard');
    }
  }
  
  // 6. Check work time config for reset time
  console.log('⏰ CHECKING WORK DAY RESET TIME:');
  const { data: workTimeConfig } = await supabase
    .from('work_time_config')
    .select('*')
    .eq('name', 'default')
    .single();
    
  if (workTimeConfig) {
    console.log(`  Current Reset Time: ${workTimeConfig.daily_reset_time}`);
    if (workTimeConfig.daily_reset_time === '09:00:00') {
      console.log('  ⚠️ Reset is at 9AM - you want 4AM!');
    } else if (workTimeConfig.daily_reset_time === '04:00:00') {
      console.log('  ✅ Reset is already at 4AM');
    }
  } else {
    console.log('  ❌ No work time config found');
  }
}

checkMahmoudPerformance().catch(console.error); 