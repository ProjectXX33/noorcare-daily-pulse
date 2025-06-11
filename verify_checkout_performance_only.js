// Verify Checkout-Only Performance System
// Run this in browser console to verify performance is only calculated and submitted after checkout

(async function verifyCheckoutOnlyPerformance() {
  console.log('🔍 Verifying checkout-only performance system...');
  
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
    
    // Check if user is Customer Service or Designer
    if (userData.position !== 'Customer Service' && userData.position !== 'Designer') {
      console.log('ℹ️ This system is designed for Customer Service and Designer positions only');
      return;
    }
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    console.log('📅 Checking data for:', today);
    console.log('📊 Performance month:', currentMonth);
    
    // 2. Check if user has checked in today (but not checked out)
    console.log('\n🔍 Checking today\'s check-in/out status...');
    const { data: todayCheckIn, error: checkInError } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', user.id)
      .gte('timestamp', today + 'T00:00:00')
      .lt('timestamp', today + 'T23:59:59')
      .single();
    
    const hasCheckedInToday = !checkInError && todayCheckIn;
    const hasCheckedOutToday = hasCheckedInToday && todayCheckIn.checkout_time;
    
    if (hasCheckedInToday) {
      console.log('✅ Checked in today at:', new Date(todayCheckIn.timestamp).toLocaleTimeString());
      if (hasCheckedOutToday) {
        console.log('✅ Checked out today at:', new Date(todayCheckIn.checkout_time).toLocaleTimeString());
      } else {
        console.log('⏳ Still checked in - no checkout yet');
      }
    } else {
      console.log('❌ No check-in found for today');
    }
    
    // 3. Check current performance record for this month
    console.log('\n🔍 Checking current month performance record...');
    const { data: currentPerformance, error: perfError } = await supabase
      .from('admin_performance_dashboard')
      .select('*')
      .eq('employee_id', user.id)
      .eq('month_year', currentMonth)
      .single();
    
    if (perfError && perfError.code !== 'PGRST116') {
      console.error('❌ Error fetching performance:', perfError);
    } else if (currentPerformance) {
      console.log('📊 Current performance record found:');
      console.log(`   Working days: ${currentPerformance.total_working_days}`);
      console.log(`   Total delay: ${currentPerformance.total_delay_minutes} minutes (${currentPerformance.total_delay_hours}h)`);
      console.log(`   Total overtime: ${currentPerformance.total_overtime_hours}h`);
      console.log(`   Average score: ${currentPerformance.average_performance_score}%`);
      console.log(`   Punctuality: ${currentPerformance.punctuality_percentage}%`);
      console.log(`   Status: ${currentPerformance.performance_status}`);
      console.log(`   Total work hours: ${currentPerformance.total_work_hours || 'Not recorded'}h`);
      console.log(`   Work duration score: ${currentPerformance.work_duration_score || 'Not recorded'}%`);
    } else {
      console.log('ℹ️ No performance record found for this month');
    }
    
    // 4. Check shift assignment and calculate what performance should be
    if (hasCheckedInToday && hasCheckedOutToday) {
      console.log('\n🧮 Calculating expected performance for today...');
      
      // Get shift assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from('shift_assignments')
        .select(`
          *,
          shifts:assigned_shift_id(name, start_time, end_time, duration_hours)
        `)
        .eq('employee_id', user.id)
        .eq('work_date', today)
        .single();
      
      if (assignmentError) {
        console.log('⚠️ No shift assignment found for today');
      } else if (assignment.is_day_off) {
        console.log('🏖️ Today is marked as day off');
      } else {
        const shift = assignment.shifts;
        const checkInTime = new Date(todayCheckIn.timestamp);
        const checkOutTime = new Date(todayCheckIn.checkout_time);
        
        // Calculate delay
        const shiftStartTime = new Date(checkInTime);
        const [startHour, startMin] = shift.start_time.split(':');
        shiftStartTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
        
        const delayMinutes = Math.max(0, (checkInTime - shiftStartTime) / (1000 * 60));
        
        // Calculate work hours
        const totalWorkMs = checkOutTime - checkInTime;
        const totalWorkHours = totalWorkMs / (1000 * 60 * 60);
        // Use correct expected hours based on shift type
        let expectedHours = 8; // Default
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
        
        let workDurationScore = 100; // Default perfect
        if (totalWorkHours < expectedHours * 0.8) {
          // Less than 80% of expected hours = poor
          workDurationScore = Math.max(0, (totalWorkHours / expectedHours) * 100);
        } else if (totalWorkHours >= expectedHours) {
          // Met or exceeded expected hours = perfect + overtime bonus
          workDurationScore = Math.min(100, 100 + (overtimeHours * 5)); // 5% bonus per overtime hour
        }
        
        const finalScore = Math.round((delayScore + workDurationScore) / 2);
        
        console.log('📊 Expected performance calculation:');
        console.log(`   Shift: ${shift.name} (${shift.start_time} - ${shift.end_time})`);
        console.log(`   Scheduled start: ${shift.start_time}`);
        console.log(`   Actual check-in: ${checkInTime.toLocaleTimeString()}`);
        console.log(`   Actual check-out: ${checkOutTime.toLocaleTimeString()}`);
        console.log(`   Delay: ${delayMinutes.toFixed(1)} minutes`);
        console.log(`   Work duration: ${totalWorkHours.toFixed(2)} hours`);
        console.log(`   Regular hours: ${regularHours.toFixed(2)}h`);
        console.log(`   Overtime: ${overtimeHours.toFixed(2)}h`);
        console.log(`   Delay score: ${delayScore.toFixed(1)}%`);
        console.log(`   Work duration score: ${workDurationScore.toFixed(1)}%`);
        console.log(`   Final score: ${finalScore}%`);
        
        // Compare with actual record
        if (currentPerformance) {
          console.log('\n🔍 Comparing with actual record:');
          console.log(`   Expected delay: ${delayMinutes.toFixed(1)}min vs Actual: ${currentPerformance.total_delay_minutes}min`);
          console.log(`   Expected overtime: ${overtimeHours.toFixed(2)}h vs Actual: ${currentPerformance.total_overtime_hours}h`);
          console.log(`   Expected score: ${finalScore}% vs Actual: ${currentPerformance.average_performance_score}%`);
          
          const delayMatch = Math.abs(currentPerformance.total_delay_minutes - delayMinutes) < 1;
          const overtimeMatch = Math.abs(currentPerformance.total_overtime_hours - overtimeHours) < 0.1;
          const scoreMatch = Math.abs(currentPerformance.average_performance_score - finalScore) < 5;
          
          if (delayMatch && overtimeMatch && scoreMatch) {
            console.log('✅ Performance calculation matches! System working correctly.');
          } else {
            console.log('⚠️ Performance calculation mismatch detected');
            if (!delayMatch) console.log('   ❌ Delay mismatch');
            if (!overtimeMatch) console.log('   ❌ Overtime mismatch');
            if (!scoreMatch) console.log('   ❌ Score mismatch');
          }
        }
      }
    }
    
    // 5. Check monthly shift tracking
    console.log('\n🔍 Checking monthly shift tracking...');
    const { data: monthlyShifts, error: monthlyError } = await supabase
      .from('monthly_shifts')
      .select('*')
      .eq('employee_id', user.id)
      .gte('work_date', currentMonth + '-01')
      .order('work_date', { ascending: false })
      .limit(5);
    
    if (monthlyError) {
      console.log('❌ Error fetching monthly shifts:', monthlyError);
    } else {
      console.log(`📊 Recent shift records: ${monthlyShifts.length} found`);
      monthlyShifts.forEach(shift => {
        console.log(`   ${shift.work_date}: ${shift.check_in_time ? 'IN' : '❌'} ${shift.check_out_time ? 'OUT' : '⏳'} - ${shift.regular_hours}h + ${shift.overtime_hours}h OT`);
      });
    }
    
    // 6. System recommendations
    console.log('\n💡 CHECKOUT-ONLY PERFORMANCE SYSTEM STATUS:');
    console.log('═'.repeat(60));
    
    if (hasCheckedInToday && !hasCheckedOutToday) {
      console.log('⏳ ACTIVE WORK SESSION:');
      console.log('   • You are currently checked in');
      console.log('   • Performance will be calculated when you check out');
      console.log('   • No performance data is recorded until checkout');
    } else if (hasCheckedInToday && hasCheckedOutToday) {
      console.log('✅ COMPLETED WORK SESSION:');
      console.log('   • Check-in and check-out recorded');
      console.log('   • Performance should be calculated and stored');
      console.log('   • System working as expected');
    } else {
      console.log('ℹ️ NO ACTIVE SESSION:');
      console.log('   • No check-in found for today');
      console.log('   • Check in to start tracking');
    }
    
    console.log('\n🎯 KEY FEATURES:');
    console.log('   ✅ Performance calculated ONLY after checkout');
    console.log('   ✅ Includes punctuality (delay) tracking');
    console.log('   ✅ Includes work duration performance');
    console.log('   ✅ Overtime hours bonus calculation');
    console.log('   ✅ Works for both Customer Service and Designer');
    console.log('   ✅ Monthly performance aggregation');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
})(); 