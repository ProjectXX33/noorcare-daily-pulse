// Debug Checkout Performance Recording
// Run this in browser console to debug why performance isn't being recorded after checkout

(async function debugCheckoutPerformance() {
  console.log('🔍 Debugging checkout performance recording...');
  
  if (typeof supabase === 'undefined') {
    console.error('❌ Supabase not found. Make sure you are on the Noorcare app page at localhost:8081');
    return;
  }
  
  try {
    // 1. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Auth error or no user logged in');
      return;
    }
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role, position')
      .eq('id', user.id)
      .single();
    
    if (userError) {
      console.error('❌ Error fetching user data:', userError);
      return;
    }
    
    console.log('👤 User:', userData.name, `(${userData.position})`);
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    // 2. Check recent check-ins with checkout times
    console.log('\n🔍 Checking recent check-ins with checkouts...');
    const { data: recentCheckIns, error: checkInError } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', user.id)
      .not('checkout_time', 'is', null)
      .order('timestamp', { ascending: false })
      .limit(3);
    
    if (checkInError) {
      console.error('❌ Error fetching check-ins:', checkInError);
      return;
    }
    
    if (!recentCheckIns || recentCheckIns.length === 0) {
      console.log('❌ No completed check-ins found (with checkout times)');
      console.log('💡 You need to check in and then check out to test performance recording');
      return;
    }
    
    console.log(`✅ Found ${recentCheckIns.length} completed check-ins:`);
    recentCheckIns.forEach((checkIn, index) => {
      const checkInTime = new Date(checkIn.timestamp);
      const checkOutTime = new Date(checkIn.checkout_time);
      const duration = (checkOutTime - checkInTime) / (1000 * 60 * 60); // hours
      
      console.log(`   ${index + 1}. ${checkInTime.toLocaleDateString()} ${checkInTime.toLocaleTimeString()} → ${checkOutTime.toLocaleTimeString()} (${duration.toFixed(2)}h)`);
    });
    
    // 3. Check if performance dashboard has records
    console.log('\n🔍 Checking performance dashboard records...');
    const { data: performanceRecords, error: perfError } = await supabase
      .from('admin_performance_dashboard')
      .select('*')
      .eq('employee_id', user.id)
      .order('month_year', { ascending: false });
    
    if (perfError) {
      console.error('❌ Error fetching performance records:', perfError);
    } else {
      console.log(`📊 Found ${performanceRecords.length} performance records:`);
      performanceRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.month_year}: ${record.total_working_days} days, ${record.average_performance_score}% score, ${record.total_overtime_hours}h OT`);
      });
    }
    
    // 4. Check monthly shifts records
    console.log('\n🔍 Checking monthly shifts records...');
    const { data: monthlyShifts, error: monthlyError } = await supabase
      .from('monthly_shifts')
      .select('*')
      .eq('user_id', user.id)
      .order('work_date', { ascending: false })
      .limit(5);
    
    if (monthlyError) {
      console.error('❌ Error fetching monthly shifts:', monthlyError);
    } else {
      console.log(`📊 Found ${monthlyShifts.length} monthly shift records:`);
      monthlyShifts.forEach((shift, index) => {
        console.log(`   ${index + 1}. ${shift.work_date}: IN ${shift.check_in_time ? '✅' : '❌'} OUT ${shift.check_out_time ? '✅' : '❌'} - ${shift.regular_hours || 0}h + ${shift.overtime_hours || 0}h OT`);
      });
    }
    
    // 5. Check shift assignments
    console.log('\n🔍 Checking shift assignments...');
    const { data: assignments, error: assignmentError } = await supabase
      .from('shift_assignments')
      .select(`
        *,
        shifts:assigned_shift_id(name, start_time, end_time, duration_hours)
      `)
      .eq('employee_id', user.id)
      .gte('work_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 7 days
      .order('work_date', { ascending: false });
    
    if (assignmentError) {
      console.error('❌ Error fetching shift assignments:', assignmentError);
    } else {
      console.log(`📅 Found ${assignments.length} shift assignments in last 7 days:`);
      assignments.forEach((assignment, index) => {
        const shift = assignment.shifts;
        console.log(`   ${index + 1}. ${assignment.work_date}: ${assignment.is_day_off ? '🏖️ Day Off' : `${shift?.name || 'Unknown'} (${shift?.start_time}-${shift?.end_time})`}`);
      });
    }
    
    // 6. Test performance calculation manually for the most recent checkout
    if (recentCheckIns.length > 0) {
      const latestCheckIn = recentCheckIns[0];
      console.log('\n🧮 Manual performance calculation for latest checkout...');
      
      const checkInTime = new Date(latestCheckIn.timestamp);
      const checkOutTime = new Date(latestCheckIn.checkout_time);
      const workDate = checkInTime.toISOString().split('T')[0];
      
      // Get shift assignment for this date
      const { data: assignment, error: assignmentError } = await supabase
        .from('shift_assignments')
        .select(`
          *,
          shifts:assigned_shift_id(name, start_time, end_time, duration_hours)
        `)
        .eq('employee_id', user.id)
        .eq('work_date', workDate)
        .single();
      
      if (assignmentError || !assignment || assignment.is_day_off) {
        console.log('⚠️ No shift assignment or day off for this date');
        console.log('💡 This might be why performance wasn\'t recorded');
      } else {
        const shift = assignment.shifts;
        console.log('✅ Shift assignment found:', shift.name);
        
        // Calculate delay
        const shiftStartTime = new Date(checkInTime);
        const [startHour, startMin] = shift.start_time.split(':');
        shiftStartTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
        const delayMinutes = Math.max(0, (checkInTime - shiftStartTime) / (1000 * 60));
        
        // Calculate work hours
        const totalWorkMs = checkOutTime - checkInTime;
        const totalWorkHours = totalWorkMs / (1000 * 60 * 60);
        // Use correct expected hours based on shift type
        let expectedHours = 8; // Default to night shift
        if (shift.name && shift.name.toLowerCase().includes('day')) {
          expectedHours = 7; // Day shift is 7 hours
        } else if (shift.name && shift.name.toLowerCase().includes('night')) {
          expectedHours = 8; // Night shift is 8 hours
        } else {
          expectedHours = shift.duration_hours || 8;
        }
        const regularHours = Math.min(totalWorkHours, expectedHours);
        const overtimeHours = Math.max(0, totalWorkHours - expectedHours);
        
        // Calculate performance scores
        const delayScore = delayMinutes <= 0 ? 100 : Math.max(0, 100 - (delayMinutes / 5));
        const workDurationScore = totalWorkHours >= expectedHours ? 100 : Math.max(0, (totalWorkHours / expectedHours) * 100);
        const finalScore = Math.round((delayScore * 0.6) + (workDurationScore * 0.3) + Math.min(10, overtimeHours * 2));
        
        console.log('📊 Expected performance data:');
        console.log(`   Check-in: ${checkInTime.toLocaleTimeString()}`);
        console.log(`   Check-out: ${checkOutTime.toLocaleTimeString()}`);
        console.log(`   Shift: ${shift.name} (${shift.start_time}-${shift.end_time})`);
        console.log(`   Delay: ${delayMinutes.toFixed(1)} minutes`);
        console.log(`   Work duration: ${totalWorkHours.toFixed(2)} hours`);
        console.log(`   Regular: ${regularHours.toFixed(2)}h, Overtime: ${overtimeHours.toFixed(2)}h`);
        console.log(`   Delay score: ${delayScore.toFixed(1)}%`);
        console.log(`   Work duration score: ${workDurationScore.toFixed(1)}%`);
        console.log(`   Final score: ${finalScore}%`);
        
        // Check if this data exists in performance dashboard
        const expectedMonth = checkInTime.toISOString().slice(0, 7);
        const { data: existingPerf, error: existingError } = await supabase
          .from('admin_performance_dashboard')
          .select('*')
          .eq('employee_id', user.id)
          .eq('month_year', expectedMonth)
          .single();
        
        if (existingError && existingError.code !== 'PGRST116') {
          console.error('❌ Error checking existing performance:', existingError);
        } else if (existingPerf) {
          console.log('\n✅ Performance record found in dashboard:');
          console.log(`   Working days: ${existingPerf.total_working_days}`);
          console.log(`   Average score: ${existingPerf.average_performance_score}%`);
          console.log(`   Total delay: ${existingPerf.total_delay_minutes} minutes`);
          console.log(`   Total overtime: ${existingPerf.total_overtime_hours}h`);
          console.log(`   Status: ${existingPerf.performance_status}`);
        } else {
          console.log('\n❌ NO performance record found in dashboard!');
          console.log('💡 This confirms the issue - checkout performance is not being recorded');
        }
      }
    }
    
    // 7. Check RLS policies on admin_performance_dashboard
    console.log('\n🔍 Testing admin_performance_dashboard access...');
    
    try {
      // Test insert permission
      const testRecord = {
        employee_id: user.id,
        employee_name: userData.name,
        month_year: '2024-01',
        total_working_days: 1,
        total_delay_minutes: 0,
        total_delay_hours: 0,
        total_overtime_hours: 0,
        average_performance_score: 100,
        punctuality_percentage: 100,
        performance_status: 'Excellent'
      };
      
      console.log('🧪 Testing insert permission...');
      const { data: insertTest, error: insertError } = await supabase
        .from('admin_performance_dashboard')
        .insert([testRecord])
        .select();
      
      if (insertError) {
        console.error('❌ Insert permission denied:', insertError.message);
        console.log('💡 This is likely the root cause! RLS policy prevents employee from inserting performance data');
      } else {
        console.log('✅ Insert permission works');
        
        // Clean up test record
        await supabase
          .from('admin_performance_dashboard')
          .delete()
          .eq('id', insertTest[0].id);
        console.log('🧹 Test record cleaned up');
      }
    } catch (error) {
      console.error('❌ RLS test failed:', error);
    }
    
    // 8. Recommendations
    console.log('\n💡 DIAGNOSIS AND RECOMMENDATIONS:');
    console.log('═'.repeat(60));
    
    if (recentCheckIns.length === 0) {
      console.log('❌ ISSUE: No completed check-ins found');
      console.log('   • Check in and check out to test the system');
      console.log('   • Make sure you have a shift assigned for today');
    } else if (performanceRecords.length === 0) {
      console.log('❌ CRITICAL ISSUE: Performance data not being recorded');
      console.log('   • Check RLS policies on admin_performance_dashboard table');
      console.log('   • Verify employees can insert their own performance data');
      console.log('   • Check for JavaScript errors during checkout process');
    } else {
      console.log('✅ SYSTEM APPEARS TO BE WORKING');
      console.log('   • Performance data is being recorded');
      console.log('   • Check-in/checkout flow is operational');
    }
    
    console.log('\n🔧 TROUBLESHOOTING STEPS:');
    console.log('1. Check browser console for errors during checkout');
    console.log('2. Verify shift assignment exists for work days');
    console.log('3. Test RLS policies on admin_performance_dashboard');
    console.log('4. Check if recordCheckOutPerformance function is being called');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
})(); 