// Verify Check-in/Check-out Recording and Performance Submission
// Run this in browser console to verify the system is recording everything properly

(async function verifyCheckInOutRecording() {
  console.log('🔍 Verifying check-in/check-out recording and performance submission...');
  
  if (typeof supabase === 'undefined') {
    console.error('❌ Supabase not found. Make sure you are on the Noorcare app page.');
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
    
    console.log('📅 Checking data for:', today);
    console.log('📊 Performance month:', currentMonth);
    
    // 2. Check check_ins table (basic check-in/out records)
    console.log('\n🔍 Checking check_ins table...');
    const { data: checkIns, error: checkInError } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', user.id)
      .gte('check_in_time', today + 'T00:00:00')
      .order('check_in_time', { ascending: false })
      .limit(5);
    
    if (checkInError) {
      console.error('❌ Error fetching check-ins:', checkInError);
    } else {
      console.log(`✅ Found ${checkIns?.length || 0} check-in records for today:`);
      checkIns?.forEach((record, index) => {
        const checkInTime = new Date(record.check_in_time).toLocaleTimeString();
        const checkOutTime = record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : 'Not checked out';
        console.log(`   ${index + 1}. Check-in: ${checkInTime} | Check-out: ${checkOutTime}`);
      });
    }
    
    // 3. Check monthly_shifts table (detailed shift tracking)
    console.log('\n🔍 Checking monthly_shifts table (shift tracking)...');
    const { data: monthlyShift, error: monthlyShiftError } = await supabase
      .from('monthly_shifts')
      .select(`
        *,
        shifts:shift_id(name, start_time, end_time)
      `)
      .eq('user_id', user.id)
      .eq('work_date', today)
      .single();
    
    if (monthlyShiftError) {
      if (monthlyShiftError.code === 'PGRST116') {
        console.log('⚠️ No monthly shift record found for today');
        console.log('💡 This means shift tracking is not working properly');
      } else {
        console.error('❌ Error fetching monthly shift:', monthlyShiftError);
      }
    } else {
      console.log('✅ Monthly shift record found:');
      console.log(`   Shift: ${monthlyShift.shifts?.name || 'Unknown'} (${monthlyShift.shifts?.start_time} - ${monthlyShift.shifts?.end_time})`);
      console.log(`   Check-in: ${monthlyShift.check_in_time ? new Date(monthlyShift.check_in_time).toLocaleString() : 'Not recorded'}`);
      console.log(`   Check-out: ${monthlyShift.check_out_time ? new Date(monthlyShift.check_out_time).toLocaleString() : 'Not recorded'}`);
      console.log(`   Regular hours: ${monthlyShift.regular_hours || 0}h`);
      console.log(`   Overtime hours: ${monthlyShift.overtime_hours || 0}h`);
      
      // Calculate total hours
      if (monthlyShift.check_in_time && monthlyShift.check_out_time) {
        const totalMinutes = (new Date(monthlyShift.check_out_time) - new Date(monthlyShift.check_in_time)) / (1000 * 60);
        const totalHours = totalMinutes / 60;
        console.log(`   📊 Calculated total hours: ${totalHours.toFixed(2)}h`);
        console.log(`   📊 Recorded total: ${(monthlyShift.regular_hours + monthlyShift.overtime_hours).toFixed(2)}h`);
        
        if (Math.abs(totalHours - (monthlyShift.regular_hours + monthlyShift.overtime_hours)) > 0.1) {
          console.log('⚠️ WARNING: Calculated hours don\'t match recorded hours!');
        } else {
          console.log('✅ Hours calculation looks correct');
        }
      }
    }
    
    // 4. Check shift assignments
    console.log('\n🔍 Checking shift assignment for today...');
    const { data: assignment, error: assignmentError } = await supabase
      .from('shift_assignments')
      .select(`
        *,
        shifts:assigned_shift_id(name, start_time, end_time)
      `)
      .eq('employee_id', user.id)
      .eq('work_date', today)
      .single();
    
    if (assignmentError) {
      if (assignmentError.code === 'PGRST116') {
        console.log('⚠️ No shift assignment found for today');
        console.log('💡 This is why shift tracking might be unavailable');
      } else {
        console.error('❌ Error fetching shift assignment:', assignmentError);
      }
    } else {
      console.log('✅ Shift assignment found:');
      console.log(`   Assigned shift: ${assignment.shifts?.name || 'Unknown'}`);
      console.log(`   Shift time: ${assignment.shifts?.start_time} - ${assignment.shifts?.end_time}`);
      console.log(`   Is day off: ${assignment.is_day_off ? 'Yes' : 'No'}`);
    }
    
    // 5. Check performance dashboard (monthly summary)
    console.log('\n🔍 Checking performance dashboard...');
    const { data: performance, error: performanceError } = await supabase
      .from('admin_performance_dashboard')
      .select('*')
      .eq('employee_id', user.id)
      .eq('month_year', currentMonth)
      .single();
    
    if (performanceError) {
      if (performanceError.code === 'PGRST116') {
        console.log('⚠️ No performance record found for this month');
        console.log('💡 Performance data might not be automatically created yet');
      } else {
        console.error('❌ Error fetching performance data:', performanceError);
      }
    } else {
      console.log('✅ Performance record found:');
      console.log(`   Working days: ${performance.total_working_days}`);
      console.log(`   Delay minutes: ${performance.total_delay_minutes}`);
      console.log(`   Delay hours: ${performance.total_delay_hours}h`);
      console.log(`   Overtime hours: ${performance.total_overtime_hours}h`);
      console.log(`   Performance score: ${performance.average_performance_score}%`);
      console.log(`   Punctuality: ${performance.punctuality_percentage}%`);
      console.log(`   Status: ${performance.performance_status}`);
    }
    
    // 6. Summary and recommendations
    console.log('\n📊 SUMMARY:');
    
    const hasBasicCheckIn = checkIns && checkIns.length > 0;
    const hasShiftTracking = !monthlyShiftError;
    const hasShiftAssignment = !assignmentError;
    const hasPerformanceRecord = !performanceError;
    
    console.log(`   ✅ Basic check-in/out: ${hasBasicCheckIn ? 'WORKING' : 'NOT WORKING'}`);
    console.log(`   ✅ Shift tracking: ${hasShiftTracking ? 'WORKING' : 'NOT WORKING'}`);
    console.log(`   ✅ Shift assignment: ${hasShiftAssignment ? 'ASSIGNED' : 'NOT ASSIGNED'}`);
    console.log(`   ✅ Performance tracking: ${hasPerformanceRecord ? 'WORKING' : 'NOT WORKING'}`);
    
    // 7. Recommendations
    console.log('\n🔧 RECOMMENDATIONS:');
    
    if (!hasShiftAssignment) {
      console.log('❌ CRITICAL: No shift assigned for today');
      console.log('   • Go to Admin → Shift Management');
      console.log('   • Assign a Day Shift or Night Shift for today');
      console.log('   • This will enable proper shift tracking');
    }
    
    if (!hasShiftTracking) {
      console.log('❌ ISSUE: Shift tracking not working');
      console.log('   • Check if monthly_shifts table exists');
      console.log('   • Verify RLS policies allow access');
      console.log('   • Run the shift assignment SQL script');
    }
    
    if (!hasPerformanceRecord) {
      console.log('⚠️ INFO: No performance record for this month yet');
      console.log('   • Performance records are typically created automatically');
      console.log('   • You can manually create one in the Admin Performance Dashboard');
    }
    
    if (hasBasicCheckIn && hasShiftTracking && hasShiftAssignment) {
      console.log('✅ GOOD: All systems appear to be working correctly!');
      console.log('   • Check-ins and check-outs are being recorded');
      console.log('   • Shift tracking is operational');
      console.log('   • Performance calculations should work properly');
    }
    
    // 8. Test performance calculation for today
    if (monthlyShift && monthlyShift.check_in_time && monthlyShift.check_out_time && assignment && assignment.shifts) {
      console.log('\n🧮 Testing performance calculation for today:');
      
      const checkInTime = new Date(monthlyShift.check_in_time);
      const shiftStartTime = new Date(monthlyShift.check_in_time);
      const [startHour, startMin] = assignment.shifts.start_time.split(':');
      shiftStartTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
      
      const delayMinutes = Math.max(0, (checkInTime - shiftStartTime) / (1000 * 60));
      const performanceScore = delayMinutes <= 0 ? 100 : Math.max(0, 100 - (delayMinutes / 5));
      
      console.log(`   Scheduled start: ${assignment.shifts.start_time}`);
      console.log(`   Actual check-in: ${checkInTime.toLocaleTimeString()}`);
      console.log(`   Delay: ${delayMinutes.toFixed(1)} minutes`);
      console.log(`   Performance score: ${performanceScore.toFixed(1)}%`);
      
      if (delayMinutes > 0) {
        console.log(`   ⚠️ Late by ${delayMinutes.toFixed(1)} minutes`);
      } else {
        console.log(`   ✅ On time or early`);
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
})(); 